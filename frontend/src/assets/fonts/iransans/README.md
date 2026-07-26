# IranSans integration point

FE007 reserves this path for the licensed IranSans webfont files approved by
the product owner. No font binaries are bundled because the project does not
currently include a redistribution license.

When the licensed files are supplied, add the approved regular, medium,
demi-bold, and bold WOFF2 files here and register them with `@font-face` in
`src/styles/globals.css`. Keep the family name `IranSans` so the existing
`--font-body` token activates it without component changes.

Until then, the runtime uses the browser fallback chain:
`IranSans`, `IRANSansX`, `Tahoma`, `Arial`, `system-ui`, `sans-serif`.
