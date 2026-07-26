# Typography and UI foundation

FE007 keeps typography behind the existing design-token layer. The global
`--font-body` token is now ordered for IranSans and its Persian-safe fallbacks:

```css
"IranSans", "IRANSansX", Tahoma, Arial, system-ui, sans-serif
```

The repository contains no IranSans binaries. Adding unlicensed font files
would make redistribution unsafe, so `src/assets/fonts/iransans/README.md`
documents the integration point. Once the owner supplies licensed WOFF2 files,
register them with `@font-face` in `src/styles/globals.css`; no page or
component code needs to change.

Store and offer surfaces use the FE002 tokens and logical layout utilities.
Prices, dates, and route IDs are isolated with `dir="ltr"` where mixed Persian
and Latin content would otherwise be ambiguous.
