# Torob Phone frontend

This directory contains the Next.js App Router frontend. FE001 provides only
the production foundation: strict TypeScript, Persian RTL structure, global
accessibility defaults, environment typing, quality tooling, and route
boundaries. Domain pages are added in later approved task groups.

## Local development

Use Node 24 and pnpm:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The Django API runs at `http://127.0.0.1:8000`; Next.js runs at
`http://localhost:3000`. Browser requests that use the backend refresh cookie
must include credentials; authentication is intentionally outside FE001.

No approved font asset was included in the source archive, so FE001 defines the
approved Persian fallback stack (`Vazirmatn`, `IRANSansX`, Tahoma, sans-serif)
without redistributing a font file. The final font asset decision belongs to
the design-system task.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test:run
pnpm test:e2e
pnpm check
pnpm build
```

No feature pages or API client are implemented in this task group.
