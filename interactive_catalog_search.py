"""Interactive local console for the stateful LLM-to-catalog filtering flow.

Example:
    python interactive_catalog_search.py --api-key "YOUR_KEY" --model "MODEL_ID"
"""

import argparse
import json
import os


def parse_arguments():
    parser = argparse.ArgumentParser(description="Interact with the stateful catalog filtering service.")
    parser.add_argument("--api-key", required=True, help="GapGpt API key. Avoid sharing it or committing it.")
    parser.add_argument("--model", required=True, help="GapGpt model identifier, for example the model name shown in its dashboard.")
    parser.add_argument(
        "--base-url",
        default="https://api.gapgpt.app/v1",
        help="OpenAI-compatible API base URL (default: https://api.gapgpt.app/v1).",
    )
    parser.add_argument("--limit", type=int, default=20, help="Maximum matching variants to print after each turn.")
    return parser.parse_args()


def print_candidates(candidates, limit):
    count = candidates.count()
    print(f"\nMatching variants: {count}")
    for variant in candidates[:limit]:
        print(
            f"- {variant.device_model.brand.name} {variant.device_model.model_name} "
            f"({variant.ram_gb}GB RAM / {variant.storage_gb}GB storage)"
        )
    if count > limit:
        print(f"  ... showing the first {limit} variants")


def main():
    args = parse_arguments()
    if args.limit < 1:
        raise SystemExit("--limit must be at least 1")

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Torob_Phone.settings")
    import django

    django.setup()

    from catalog.llm_provider import GapGptProvider, LLMProviderError
    from catalog.query_adapter import UnsupportedQuerySetFieldError
    from catalog.query_service import QuerySetModificationService
    from catalog.query_set import QuerySetValidationError

    provider = GapGptProvider(api_key=args.api_key, base_url=args.base_url, model=args.model)
    service = QuerySetModificationService(provider)

    print("Catalog search started. Type /help for commands; /quit exits.")
    while True:
        try:
            user_text = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            return

        if not user_text:
            continue
        if user_text.casefold() in {"/quit", "/exit", "quit", "exit"}:
            print("Goodbye.")
            return
        if user_text == "/help":
            print("Commands: /state, /reset, /quit. Any other text is sent as a query modification.")
            continue
        if user_text == "/state":
            print(json.dumps(service.current_query_set, ensure_ascii=False, indent=2))
            continue
        if user_text == "/reset":
            service = QuerySetModificationService(provider)
            print("QuerySet reset locally to the empty state.")
            continue

        try:
            result = service.process_user_query(user_text)
        except (LLMProviderError, QuerySetValidationError, UnsupportedQuerySetFieldError, ValueError) as exc:
            print(f"\nRequest was rejected: {exc}")
            print("The previous valid QuerySet is still active.")
            continue

        print("\nValidated QuerySet:")
        print(json.dumps(result.query_set, ensure_ascii=False, indent=2))
        print_candidates(result.candidates, args.limit)


if __name__ == "__main__":
    main()
