# Homepage

FE006 replaces the foundation placeholder with the public Torob Phone
Homepage. The page uses Server Components for structure and data and small
Client Components only for the abstract Hero composition, Torobche presence,
and Store-logo fallback behavior.

## Section architecture

1. Hero with the approved Torobche primary action and Stores secondary action.
2. Dedicated Torobche introduction with illustrative, non-interactive prompts.
3. Marketplace process: clarify need, identify an exact variant, compare public
   Offers.
4. Active Store discovery.
5. Final next-step call to action.

The backend does not expose a public catalog-list or Homepage aggregation
endpoint. `/api/catalog/phones/` is Store-only. FE006 therefore does not render
featured phones, starting prices, or global Offers and does not perform N+1
Offer requests.

## Data and caching

The Homepage performs one bounded request:

```text
GET /api/stores/?page_size=6
```

Only public `id`, `name`, `slug`, and `logo` fields are accepted through the
existing strict schema. The page uses a 60-second revalidation window. A Store
failure remains local to that section; the Hero, Torobche, process, and final
actions remain usable. Empty Store data receives an honest empty state.

## Visual and motion strategy

The Hero uses an abstract CSS device and marketplace-alignment composition
because no safely selectable public phone image exists. It contains no product
name, price, stock, rating, or commercial claim. Motion uses existing tokens,
communicates entry and relationship, and becomes static under reduced motion.

The current `public/icon.svg` remains the temporary Torob Phone/Torobche
fallback. Replace assets only inside `components/brand` and
`TorobchePresence` when approved logo and Rive files are delivered.

## Responsive and accessibility behavior

The page is mobile-first, uses one semantic `h1`, logical section headings,
native links, visible focus, stable image dimensions, and Persian RTL order.
Hero actions stack on narrow screens. Store cards use keyboard-accessible links
and contain no nested actions. No scroll hijacking, autoplay media, fake chat
input, or auto-rotating content is present.

## Local cookie topology

Development uses `http://localhost:3000` for Next.js and
`http://localhost:8000` for Django. Keeping the hostname identical preserves
the HttpOnly `SameSite=Lax` refresh-cookie contract. Do not mix `localhost` and
`127.0.0.1` in browser-facing URLs.
