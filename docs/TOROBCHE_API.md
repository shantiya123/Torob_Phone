# Torobche API

Torobche is available only to authenticated customer and store accounts. Staff
and anonymous requests are rejected. The backend stores the latest validated
QuerySet per user; the frontend owns visible transcript history in browser
`sessionStorage`.

## Send a conversational update

`POST /api/search/`

```json
{"message": "حداقل رم را روی ۸ گیگ قرار بده"}
```

GapGPT is parsed as `{ "message": "...", "queryset": {...} }`. Only the
nested QuerySet is validated and filtered. A response contains ordinary DRF
pagination plus `message`, `queryset`, `ordering`, and optional warnings.

```json
{
  "message": "حداقل رم را روی ۸ گیگابایت قرار دادم.",
  "queryset": {"...": "complete validated QuerySet"},
  "count": 0,
  "next": null,
  "previous": null,
  "results": [],
  "ordering": "newest",
  "warning": null
}
```

Zero results are successful. Provider fallback preserves previous state and
returns `warning_code: "llm_interpretation_unavailable"`.

## State and reset

- `GET /api/search/state/` returns the requesting user's QuerySet,
  `has_active_filters`, and `updated_at`.
- `POST /api/search/reset/` idempotently stores the canonical all-null
  QuerySet without deleting unrelated user data.

## Personalized explanation

`GET /api/catalog/device-variants/<variant-id>/explanation/` returns a
transient Persian explanation grounded in the variant, saved QuerySet, and
lowest active offer price. It stores no generated text. Without active
Torobche context, it returns `409` and `code: "torobche_context_required"`.
