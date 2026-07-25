# Phone image URLs

`DeviceModel.image_url` is an optional direct displayable image URL shared by
all of that model's `DeviceVariant` records. Variant list/detail, search, and
offer serializers expose it as nullable `image_url`.

It is distinct from `source.url`, which remains the GSMArena specification
page URL and must never be used as an image source.

## Ingestion and backfill

The existing GSMArena listing collector already receives each card image's
`src`; TG011 retains it as `image_url` through normalization and import. The
additive migration `catalog.0003_devicemodel_image_url` leaves existing values
null. Imports do not erase a retained image when their source record lacks one.

Existing models can be processed explicitly, never automatically:

```powershell
python manage.py backfill_phone_images --dry-run
python manage.py backfill_phone_images
python manage.py backfill_phone_images --phone-id 12
```

The command processes missing values only. It uses a short timeout, public
HTTP(S)-only URL checks, no redirects, a response-size cap, `og:image`, then
the GSMArena main phone-photo element. A failure leaves the image null and
does not affect catalog import or APIs.

## Frontend

Current images are expected to use the GSMArena CDN hostname
`fdn.gsmarena.com`; the Next.js configuration should allow that exact host,
not a wildcard. When `image_url` is null or the remote image fails, the
frontend owns rendering its local placeholder. Images are shared across
variants and are not color, region, RAM, or storage specific.
