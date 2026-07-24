"""Orchestration layer for on-demand, non-persistent AI explanations."""

from catalog.llm_provider import GapGptProvider

from .explanation_prompt import EXPLANATION_SYSTEM_PROMPT


class ExplanationService:
    def __init__(self, provider=None):
        self.provider = provider or GapGptProvider()

    def explain(self, user_filter, product):
        return self.provider.generate_explanation(
            EXPLANATION_SYSTEM_PROMPT,
            {"user_filter": user_filter, "product": product},
        )
