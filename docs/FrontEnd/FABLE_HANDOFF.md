# Fable Handoff — Torob Phone

## Visual direction

The approved concept is “The Living Lens” with the “Dark Precision” theme: dark graphite/black surfaces, controlled radish-red focus, Persian RTL typography, exact product evidence, and warmth supplied by Torobche rather than decoration.

Public discovery may be expressive and cinematic. Commerce must be calm and trustworthy. Store workflows must be fast and operational. Staff workflows must be sober and evidence-led.

## Torobche constraints

Torobche is a polished cute red radish with rich red body shading, green expressive leaves, readable eyes and mouth, and no robot parts, neon circuitry, or permanent halo. It must not invent backend facts or claims.

Fable may explore the character’s acting and author a Rive rig. The frontend maps normalized backend state to the rig. Rive must never decide API success, QuerySet content, price, stock, wallet, order, or review outcomes.

## Token usage

Use only the locked semantic tokens in `FRONTEND_DECISIONS.md`. Do not invent colors, type sizes, spacing, radii, shadows, or z-index values. Preserve Persian RTL and mixed-direction isolation.

## Motion

Shared vocabulary: `focus-in`, `focus-out`, `align`, `expand`, `collapse`, `transfer`, `settle`, `error-recover`. Detailed Torobche animation is intentionally a dedicated follow-up decision. Any authored motion must have a static/reduced-motion equivalent and must not block action.

Prohibited: permanent ambient loops, scroll hijacking, fake typing delays, false result choreography, 3D phone models, WebGL, neon glow everywhere, and motion that obscures exact Variant identity.

## Required states

Provide visual treatments for idle, greeting, attentive, submitting, thinking, understood, presenting, empty, warning, recovery, error, and reset. Every state must be explainable by normalized frontend state and must remain understandable without motion.

## Responsive expectations

Desktop may use a larger stage and spatial relationships. Mobile is a deliberate one-column composition with compact character stage, bottom sheets, reachable controls, safe-area padding, and no hover dependency.

## Handoff format

For each authored asset, deliver:

```text
asset name
purpose
dimensions and viewBox
format
transparent/background requirements
state names and transitions
reduced-motion fallback
responsive notes
license and ownership
known limitations
```

## Asset naming

Use lowercase kebab-case with the feature and state:

```text
torobche-character-idle.riv
torobche-character-thinking.riv
torobche-stage-focus-in.svg
```

Do not claim that a Rive asset exists until it is delivered and validated.

## Licensing and ownership

Fable must provide license/provenance information for every external or authored asset. Do not include restricted fonts, unlicensed imagery, or third-party animation code without permission.

## Fable must not change

- backend contracts or business truth;
- role permissions;
- the Dark Precision direction;
- Persian RTL behavior;
- semantic token values;
- accessibility requirements;
- reduced-motion requirements;
- exact Variant/data hierarchy;
- FE001 tooling or TypeScript strictness.

## Codex owns after handoff

Codex owns asset integration, state mapping, responsive composition, accessibility, reduced-motion behavior, performance controls, failure fallbacks, and tests. Codex does not silently redesign the character or invent missing states.
