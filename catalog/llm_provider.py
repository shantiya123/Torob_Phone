"""GapGpt-compatible OpenAI chat-completions provider."""

import json
import logging
import os
import socket
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from django.core.serializers.json import DjangoJSONEncoder
from .query_prompt import FULL_QUERY_MODIFICATION_PROMPT
from .provider_response import ProviderResponseError, parse_provider_query_response


class LLMProviderError(RuntimeError):
    pass


class LLMProviderTimeoutError(LLMProviderError):
    pass


logger = logging.getLogger(__name__)


class GapGptProvider:
    def __init__(self, api_key=None, base_url=None, model=None, timeout=20, retries=2, backoff=0.25):
        self.api_key = api_key if api_key is not None else os.getenv("GAPGPT_API_KEY")
        self.base_url = (base_url if base_url is not None else os.getenv("GAPGPT_BASE_URL", "https://api.gapgpt.app/v1")).rstrip("/")
        self.model = model if model is not None else os.getenv("GAPGPT_MODEL")
        self.timeout = timeout
        self.retries = retries
        self.backoff = backoff

    def modify(self, current_query_set, user_request):
        content = self._request_content(
            FULL_QUERY_MODIFICATION_PROMPT,
            {"current_query_set": current_query_set, "user_request": user_request},
        )
        try:
            return parse_provider_query_response(content)
        except ProviderResponseError as exc:
            raise LLMProviderError(str(exc)) from exc

    def generate_explanation(self, system_prompt, payload):
        """Use the existing client for untrusted, non-persistent text output."""
        content = self._request_content(system_prompt, payload)
        if not isinstance(content, str) or not content.strip():
            raise LLMProviderError("GapGpt returned an empty response")
        return content.strip()

    def _request_content(self, system_prompt, user_payload):
        if not self.api_key:
            raise LLMProviderError("GAPGPT_API_KEY is not configured")

        if not self.model:
            raise LLMProviderError("GAPGPT_MODEL is not configured")

        body = json.dumps(
            {
                "model": self.model,
                "temperature": 0,
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            user_payload,
                            cls=DjangoJSONEncoder,
                            ensure_ascii=False,
                        ),
                    },
                ],
            },
            ensure_ascii=False,
        ).encode("utf-8")

        request = Request(
            f"{self.base_url}/chat/completions",
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        last_error = None

        for attempt in range(self.retries + 1):
            try:
                with urlopen(request, timeout=self.timeout) as response:
                    response_payload = json.loads(
                        response.read().decode("utf-8")
                    )

                content = response_payload["choices"][0]["message"]["content"]
                return content

            except (TimeoutError, socket.timeout) as exc:
                last_error = exc
                error_class = LLMProviderTimeoutError

            except (HTTPError, URLError) as exc:
                if isinstance(exc, HTTPError):
                    logger.warning(
                        "GapGpt returned HTTP status %s.",
                        exc.code,
                    )
                else:
                    logger.warning(
                        "GapGpt connection failed: %s.",
                        type(exc.reason).__name__,
                    )

                last_error = exc
                error_class = LLMProviderError

            except (
                    KeyError,
                    IndexError,
                    TypeError,
                    json.JSONDecodeError,
            ) as exc:
                raise LLMProviderError(
                    "GapGpt returned an invalid response."
                ) from exc

            if attempt == self.retries:
                message = (
                    "GapGpt request timed out."
                    if error_class is LLMProviderTimeoutError
                    else "GapGpt request failed."
                )
                raise error_class(message) from last_error

            logger.warning(
                "GapGpt request attempt %s/%s failed; retrying.",
                attempt + 1,
                self.retries + 1,
            )
            time.sleep(self.backoff * (2 ** attempt))

        raise LLMProviderError("GapGpt request failed.")