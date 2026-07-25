# Store Catalog Browsing API

TG012 adds a read-only operational catalog browser for authenticated, non-staff Store users. It is separate from Torobche, marketplace search, and offer management.

## Endpoints

`GET /api/catalog/phones/?search=<text>&page=<number>` returns paginated catalog-eligible parent phones. `search` is optional and case-insensitively matches brand and model names. Results use the standard `count`, `next`, `previous`, and `results` pagination envelope, ordered by brand, model, then id.

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{
    "id": 12,
    "brand": "Samsung",
    "model": "Galaxy M47",
    "image_url": "https://example.test/galaxy-m47.jpg",
    "release_date": "2026-07-04"
  }]
}
```

`GET /api/catalog/phones/<id>/` returns one eligible parent phone and its available `DeviceVariant` records. A Store must select a variant, not the parent phone, when continuing to offer creation.

```json
{
  "id": 12,
  "brand": "Samsung",
  "model": "Galaxy M47",
  "image_url": "https://example.test/galaxy-m47.jpg",
  "release_date": "2026-07-04",
  "variants": [{"id": 31, "ram_gb": 8, "storage_gb": 128, "image_url": "https://example.test/galaxy-m47.jpg"}]
}
```

Both endpoints reject anonymous requests, Customer accounts, and staff accounts. They do not expose Store offer state or modify catalog, query-set, Torobche, or marketplace data. `image_url` is returned as `null` where no catalog image exists.
