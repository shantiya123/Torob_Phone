# Frontend Tech Stack

## Status

This document records the frontend technology and architecture decisions that have been agreed upon.

It does not define page inventory, user flows, visual design details, or implementation task groups. Those are documented separately.

---

## Project Context

The frontend is the user-facing interface for an existing Django backend API.

The frontend is responsible for:

- rendering pages
- navigation
- user interaction
- forms
- presenting backend data
- loading, error, success, and empty states
- responsive behavior
- frontend accessibility
- animation and visual feedback

The Django backend remains responsible for:

- business rules
- permissions
- canonical validation
- filtering rules
- ranking
- inventory
- pricing
- orders
- wallet behavior
- persistent data

The frontend must not become a second business backend.

---

## Language

### Decision

Use **TypeScript**.

### Reason

TypeScript provides:

- typed API contracts
- safer component interfaces
- clearer feature boundaries
- better editor and coding-agent support
- easier refactoring
- fewer runtime mistakes caused by incorrect response shapes

Type definitions should represent backend API contracts, but they must not be treated as a replacement for backend validation.

---

## UI Foundation

### Decision

Use **React** through Next.js.

React components are responsible for presentation, interaction, composition, and local interface behavior.

---

## Framework

### Decision

Use **Next.js**.

### Reason

The project includes public marketplace pages such as products, stores, offers, comparisons, and search or discovery pages.

These pages may benefit from:

- server rendering
- metadata generation
- structured routing
- public discoverability
- reusable layouts
- route-level loading and error handling

Next.js must not duplicate Django business logic.

---

## Routing

### Decision

Use the **Next.js App Router**.

The Pages Router must not be introduced unless a specific technical dependency makes it unavoidable.

### App Router responsibilities

The `app` directory owns:

- routes
- layouts
- metadata
- loading boundaries
- error boundaries
- not-found behavior
- page composition

The `app` directory should remain thin. Pages should compose feature modules rather than contain large amounts of API, form, or feature logic.

---

## Rendering Model

### Decision

Use Server Components by default and Client Components only where interaction requires them.

### Server Components are appropriate for

- public page structure
- public product data
- store details
- offer lists
- metadata
- non-interactive page composition

### Client Components are appropriate for

- forms
- filters
- authentication state
- basket interaction
- dashboards
- animated interactive elements
- browser-only APIs
- user-driven mutations

The project should not convert complete pages into Client Components without a specific reason.

---

## Backend Communication

### Decision

The frontend communicates directly with the Django REST API.

Next.js Route Handlers will not be used as a general API proxy or Backend-for-Frontend layer.

### Communication model

```text
Browser / Next.js frontend
            ↓
       Django REST API
            ↓
 Django services and database
```

### Rules

- Django remains the public business API.
- The frontend must not mirror Django endpoints in Next.js.
- Route Handlers may be introduced later only for a specific technical need.
- Missing API functionality should become a backend requirement rather than duplicated frontend logic.
- CORS and cookie behavior must be configured deliberately during deployment.

---

## Authentication

### Decision

Continue using **JWT authentication**.

Use:

- a short-lived access token stored in frontend memory
- a refresh token stored in an `HttpOnly` cookie
- refresh-token rotation
- refresh-token invalidation or blacklisting on logout

### Login flow

1. The user submits credentials.
2. Django verifies them.
3. Django returns a short-lived access token.
4. Django sets the refresh token in an `HttpOnly` cookie.
5. The frontend keeps the access token in memory.
6. The frontend requests the current user profile.

### Authenticated requests

```text
Authorization: Bearer <access-token>
```

### Refresh flow

1. An authenticated request fails because the access token expired.
2. The frontend calls the refresh endpoint.
3. The browser sends the refresh cookie automatically.
4. Django validates and rotates the refresh token.
5. Django returns a new access token.
6. The frontend retries the original request once.

### Logout flow

1. The frontend calls the logout endpoint.
2. Django invalidates the refresh token.
3. Django clears the refresh cookie.
4. The frontend removes the access token from memory.
5. User-specific frontend state is cleared.

### Security rules

- Do not store access tokens in `localStorage`.
- The refresh cookie must be `HttpOnly`.
- The refresh cookie must be `Secure` in production.
- Use an appropriate `SameSite` policy.
- A failed refresh must end the authenticated session.
- A request may be retried only once after refresh.
- Frontend role awareness is for user experience only.
- Django remains the final authorization authority.
- Decoded JWT claims must not be treated as authoritative permission checks.

### Backend contract requirement

The existing JWT backend may require a small adjustment so that:

- login sets the refresh cookie
- refresh reads the refresh token from the cookie
- logout clears and invalidates the refresh token
- only the access token is returned to normal frontend JavaScript

---

## HTTP and Server-State Handling

### Decision

Use native **`fetch`** as the HTTP transport.

Do not introduce TanStack Query or another client-side server-state library initially.

### Reason

The project prioritizes:

- design quality
- pagination
- clear user flows
- understandable architecture
- controlled implementation complexity

A global server-state library is not currently necessary to demonstrate high-level frontend capability.

### API architecture

```text
Page or component
        ↓
Feature service or hook
        ↓
Typed API client
        ↓
Native fetch
        ↓
Django API
```

### Shared API client responsibilities

The shared API client may handle:

- API base URL
- JSON serialization
- authorization headers
- access-token refresh coordination
- one retry after successful refresh
- normalized API errors
- request cancellation where useful

It must not contain business rules.

### Server Components

Server Components may call typed API functions directly for public data where server rendering or metadata provides value.

### Client Components

Client Components use:

- feature-specific API services
- small feature hooks
- local React state where appropriate

The project must not build a custom generalized caching framework.

### Future condition

A server-state library may be introduced later only if repeated cache synchronization and refetching become a demonstrated implementation problem.

---

## Pagination and Filtering

### Decision

Pagination, sorting, and filtering should be URL-driven.

```text
/products?page=3
/products?page=2&brand=Samsung&ordering=price
```

### Rules

- The URL is the source of truth for public list navigation.
- Page, filter, search, and ordering parameters are sent to Django.
- Django executes filtering, ordering, and pagination.
- The frontend presents the returned data.
- Frontend code must not recreate backend filtering or ranking rules.
- Pagination should support browser back and forward navigation.
- Paginated URLs should be shareable and refresh-safe.

---

## Styling

### Decision

Use **Tailwind CSS**.

### Design-system direction

Tailwind will be supported by project-specific design tokens for:

- colors
- typography
- spacing
- border radii
- shadows
- breakpoints
- interaction states
- animation timing

Tailwind utility classes should follow consistent component patterns rather than being treated as unstructured page-level styling.

### Full UI frameworks

Do not adopt a complete visual framework such as Material UI or Ant Design.

The public marketplace should have its own visual identity.

---

## Component Primitives

### Decision

Use **shadcn/ui selectively**.

shadcn/ui is a source of accessible, project-owned component primitives rather than the visual identity of the application.

### Suitable primitives

- dialog
- sheet or drawer
- dropdown menu
- select
- tabs
- tooltip
- popover
- toast
- form controls
- skeleton
- alert
- pagination primitives

### Rules

- Add components only when the project needs them.
- Do not install the complete component collection automatically.
- Generated source files are owned by the project.
- Components must be restyled according to `DESIGN.md`.
- Default shadcn styling must not define the marketplace appearance.
- Product-facing and domain-specific components remain custom.

Examples of custom components:

- product card
- phone specification panel
- product gallery
- store offer row
- comparison view
- AI search interface
- basket summary
- order status display
- seller dashboard card

---

## Animation

### Decision

Use a layered animation approach.

### Basic animation

Use CSS and Tailwind transitions for:

- hover states
- focus states
- button feedback
- color changes
- opacity changes
- simple dropdown transitions
- small state changes

### Advanced interface animation

Use **Motion for React** for:

- section entrances
- modals and drawers
- shared-layout transitions
- expandable comparison sections
- product galleries
- basket feedback
- controlled scroll interactions
- other meaningful interface motion

### Custom animation

Custom animations may be created for signature experiences such as:

- AI search processing
- product comparison
- product-to-detail transitions
- marketplace hero interactions
- phone specification visualization

Routine primitives should not be rebuilt as custom animation systems.

### External GitHub animation code

External animation code may be adapted only after reviewing:

- license
- attribution requirements
- dependencies
- accessibility
- performance
- compatibility with the design system
- maintenance quality

The project should record the source, license, and major modifications for adapted work.

### Accessibility

All non-essential motion must respect `prefers-reduced-motion`.

Animations must not:

- block user interaction
- delay access to important content
- create avoidable layout shift
- make navigation or pagination feel slow
- repeatedly distract the user
- hide required feedback

---

## Forms

### Decision

Use **React Hook Form** with **Zod** for standard and high-impact forms.

### Form categories

#### Simple interactions

Examples:

- search input
- sort selection
- quantity stepper
- simple confirmation action

Use local React state or URL parameters where sufficient.

#### Standard forms

Examples:

- login
- registration
- profile editing
- store editing
- offer creation and editing

Use React Hook Form and Zod.

#### High-impact forms

Examples:

- checkout
- order cancellation
- store suspension
- future financial actions

Use React Hook Form and Zod with:

- explicit submission states
- duplicate-submission protection
- confirmation where appropriate
- careful backend error presentation

### Validation boundary

Zod handles frontend structural and immediate UX validation.

Django remains authoritative for:

- business validation
- permissions
- stock rules
- pricing rules
- unique constraints
- order transitions
- final acceptance or rejection

Backend field errors and non-field errors must be mapped into the form experience.

Detailed form behavior belongs in `FORMS.md`.

---

## Testing

### Decision

Use a proportionate three-layer testing strategy.

### Unit testing

Use **Vitest** for:

- Zod schemas
- API error normalization
- pagination helpers
- query-string helpers
- formatting functions
- nontrivial pure utilities
- selected authentication utilities

### Component testing

Use **React Testing Library** for important interactive components and forms.

Tests should focus on visible user behavior rather than component internals.

### API mocking

Use **Mock Service Worker** for realistic API mocking in component tests.

Representative test responses should include:

- success
- validation error
- unauthorized
- forbidden
- not found
- server error
- empty paginated result

### End-to-end testing

Use **Playwright** for a limited set of critical flows:

- guest browsing
- product search and pagination
- authentication
- customer basket and order flow
- store offer management
- important error handling

End-to-end tests should normally use a real test backend and test database.

### Testing boundaries

Do not heavily test:

- Tailwind class names
- generated shadcn internals
- every animation frame
- backend business rules already tested by Django
- every page through unit tests
- arbitrary snapshot output

Frontend tests should verify that backend errors and permissions are represented correctly, not re-prove backend rules.

### Coverage philosophy

No arbitrary 100% coverage requirement.

The goal is:

- critical flows covered end to end
- reusable interactive components behaviorally tested
- nontrivial utilities unit tested

---

## Project Structure

### Decision

Use a **feature-oriented frontend architecture**.

```text
src/
├── app/
├── features/
├── components/
├── lib/
├── types/
├── config/
└── styles/
```

### `app/`

Owns:

- routes
- layouts
- metadata
- loading boundaries
- error boundaries
- not-found handling
- page composition

The folder remains thin.

### `features/`

Owns business-facing frontend modules, such as:

- auth
- catalog
- marketplace
- search
- comparison
- basket
- orders
- wallet
- account
- store dashboard
- admin

Feature folders are created only when implementation begins. Empty folder structures should not be generated in advance.

A feature may contain, as needed:

- API functions
- components
- hooks
- schemas
- types
- utilities

### `components/`

Contains only genuinely cross-feature UI.

Suggested areas:

- `ui`
- `layout`
- `feedback`
- `navigation`

Project-owned shadcn primitives live under `components/ui`.

Domain-specific components remain inside their feature.

### `lib/`

Contains technical infrastructure, such as:

- API client
- authentication mechanics
- normalized errors
- shared formatting
- reusable motion definitions

It must not contain backend business logic.

### `types/`

Contains only types genuinely shared across features, such as:

- pagination metadata
- normalized API error
- user role identifiers

Domain types remain inside their owning feature.

### `config/`

Contains static frontend presentation configuration, such as:

- site metadata
- navigation configuration
- feature flags

It must not become a hidden business-rule layer.

### `styles/`

Contains:

- global styles
- Tailwind integration
- design tokens
- global motion and accessibility styles

---

## Feature Dependency Rules

### Decision

Features are private by default.

External code may import from a feature only through its public root export.

### Preferred coordination

Route pages and dedicated composition components should coordinate multiple features.

```text
Product page
├── catalog
├── marketplace
└── basket
```

### Allowed direct dependencies

A feature may import another feature through its public API only when the dependency is:

- stable
- explicit
- meaningful
- non-circular

### Not allowed

- importing another feature's internal files
- circular feature imports
- shared components importing feature code
- `lib` importing feature or page components
- moving domain types into global folders merely to avoid dependency rules

### Public exports

A feature may expose a limited public API through its root `index.ts`.

Barrel files should be used mainly at feature boundaries and not indiscriminately across the project.

---

## Naming Conventions

Recommended conventions:

- folders and files: `kebab-case`
- React component identifiers: `PascalCase`
- hooks: `useSomething`
- Zod schemas: `somethingSchema`
- API functions: action-based names such as `getProducts`, `createOffer`, `cancelOrder`
- avoid unclear names such as `helpers.ts`, `common.ts`, or `misc.ts`

Each file should have a clear responsibility.

---

## Deployment Direction

### Current decision

The project will eventually use self-hosted container deployment.

The expected direction is:

- separate Next.js and Django containers
- Nginx as the public reverse proxy
- preferably one public origin
- PostgreSQL for the backend database
- Nginx routing application requests to Next.js and API requests to Django

Detailed decisions about Dockerfiles, Compose, Nginx configuration, SSL, static files, media files, production environment variables, health checks, and deployment workflow are intentionally postponed until the deployment phase.

---

## Coding-Agent Workflow

Codex, Fable, or another coding agent may implement the frontend from the approved architecture documents.

Agents should not make major product or architecture decisions independently.

The expected workflow is:

1. Architecture and acceptance criteria are documented.
2. One task group is assigned.
3. The agent implements only the approved scope.
4. Tests and screenshots are produced.
5. The implementation is reviewed.
6. Corrections are made before the next task group.

Agents may implement:

- components
- responsive layouts
- API integration
- forms
- documented animations
- tests
- accessibility requirements

They must not redefine page purpose, business boundaries, role behavior, visual direction, API contracts, animation intent, or architecture decisions unless explicitly asked to propose alternatives.

---

## Decisions Intentionally Deferred

The following topics are not finalized in this document:

- exact page inventory
- route names and route parameters
- public, customer, store, and admin page composition
- detailed user flows
- exact visual direction
- typography and color system
- component inventory
- detailed form behavior
- detailed animation specifications
- exact deployment configuration
- implementation task groups

These belong in:

- `PAGES.md`
- `WIRES.md`
- `DESIGN.md`
- `COMPONENTS.md`
- `FORMS.md`
- `FRONTEND_TASK_GROUPS.md`
