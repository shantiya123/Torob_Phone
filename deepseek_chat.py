"""
DeepSeek API Chat Script
-------------------------
Connects to the DeepSeek API and lets you send messages interactively,
receiving responses in return. Conversation history is kept in memory
so context carries over between messages.

Setup:
    pip install openai

Usage:
    Set your API key as an environment variable (recommended):
        export DEEPSEEK_API_KEY="your-key-here"      (Linux/macOS)
        set DEEPSEEK_API_KEY="your-key-here"          (Windows cmd)
        $env:DEEPSEEK_API_KEY="your-key-here"         (Windows PowerShell)

    Then run:
        python deepseek_chat.py
"""

import os
import sys
from openai import OpenAI

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
API_KEY = os.getenv("DEEPSEEK_API_KEY", "")  # or hardcode your key here (not recommended)
BASE_URL = "https://api.deepseek.com"        # DeepSeek's OpenAI-compatible endpoint
MODEL = "deepseek-chat"                      # or "deepseek-reasoner" for the reasoning model

SYSTEM_PROMPT = "You are a helpful assistant."


def get_client() -> OpenAI:
    if not API_KEY:
        print("ERROR: DEEPSEEK_API_KEY is not set.")
        print("Set it as an environment variable, or edit API_KEY in this script.")
        sys.exit(1)
    return OpenAI(api_key=API_KEY, base_url=BASE_URL)


def chat_loop():
    client = get_client()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    print("DeepSeek chat started. Type 'exit' or 'quit' to stop.\n")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break

        if user_input.lower() in ("exit", "quit"):
            print("Exiting.")
            break

        if not user_input:
            continue

        messages.append({"role": "user", "content": user_input})

        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                stream=False,
            )
        except Exception as e:
            print(f"[Error contacting DeepSeek API: {e}]\n")
            messages.pop()  # remove the last user message so it can be retried
            continue

        reply = response.choices[0].message.content
        print(f"\nDeepSeek: {reply}\n")

        messages.append({"role": "assistant", "content": reply})


def single_request(prompt: str) -> str:
    """Send a single one-off prompt (no conversation history) and return the reply."""
    client = get_client()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        stream=False,
    )
    return response.choices[0].message.content


if __name__ == "__main__":
    chat_loop()
