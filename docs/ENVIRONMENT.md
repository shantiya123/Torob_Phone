# Environment configuration

The project reads configuration from the process environment. Copy
`.env.example` for local reference, then load values using your chosen local
environment tool; Django does not load `.env` files automatically.

| Variable | Purpose | Development default |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Django cryptographic signing key | Development-only placeholder |
| `DJANGO_DEBUG` | Enables debug mode when `true`, `1`, `yes`, or `on` | `true` |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts | Empty |
| `GAPGPT_API_KEY` | GapGPT authentication credential | Unset; search falls back deterministically |
| `GAPGPT_BASE_URL` | GapGPT API base URL | `https://api.gapgpt.app/v1` |
| `GAPGPT_MODEL` | GapGPT model name | Unset; search falls back deterministically |

Use a strong unique `DJANGO_SECRET_KEY` and set `DJANGO_DEBUG=false` for any
non-development deployment. Never commit real keys or `.env` files.
