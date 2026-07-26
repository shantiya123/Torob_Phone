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

FE002 adds the locked semantic design tokens and domain-neutral primitives under
`src/components/ui`. Run the development server and open `/dev/ui` to review
deterministic component states. It is intentionally not linked from product
navigation.

No font asset is redistributed in this repository. The approved Persian stack is
`Vazirmatn`, `IRANSansX`, Tahoma, sans-serif; licensed WOFF2 files can be added
later under `src/assets/fonts` with matching `@font-face` declarations.

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

No feature pages, API client, authentication, or backend changes are implemented
in this task group.
