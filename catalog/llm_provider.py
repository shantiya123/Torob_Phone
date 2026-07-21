"""GapGpt-compatible OpenAI chat-completions provider."""

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .query_prompt import FULL_QUERY_MODIFICATION_PROMPT
from .query_set import QuerySetValidationError, validate_query_set


class LLMProviderError(RuntimeError):
    pass


class GapGptProvider:
    def __init__(self, api_key=None, base_url=None, model=None, timeout=20):
        self.api_key = api_key if api_key is not None else os.getenv("GAPGPT_API_KEY")
        self.base_url = (base_url if base_url is not None else os.getenv("GAPGPT_BASE_URL", "https://api.gapgpt.app/v1")).rstrip("/")
        self.model = model if model is not None else os.getenv("GAPGPT_MODEL")
        self.timeout = timeout

    def modify(self, current_query_set, user_request):
        if not self.api_key:
            raise LLMProviderError("GAPGPT_API_KEY is not configured")
        if not self.model:
            raise LLMProviderError("GAPGPT_MODEL is not configured")
        body = json.dumps({
            "model": self.model,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": FULL_QUERY_MODIFICATION_PROMPT},
                {"role": "user", "content": json.dumps({"current_query_set": current_query_set, "user_request": user_request})},
            ],
        }).encode("utf-8")
        request = Request(
            f"{self.base_url}/chat/completions", data=body,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}, method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
            content = payload["choices"][0]["message"]["content"]
        except (HTTPError, URLError, TimeoutError, KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise LLMProviderError(f"GapGpt request failed: {exc}") from exc
        if not isinstance(content, str) or not content.strip():
            raise LLMProviderError("GapGpt returned an empty response")
        try:
            return validate_query_set(json.loads(content))
        except (json.JSONDecodeError, QuerySetValidationError) as exc:
            raise LLMProviderError(f"GapGpt returned an invalid QuerySet: {exc}") from exc
