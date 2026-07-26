# Authentication foundation

FE004 owns session restoration and authentication UI. Django remains the
authority for credentials, permissions, account type, Store approval, Staff
status, and every protected resource.

## Token and cookie policy

- The short-lived access JWT exists only in the browser's in-memory token provider.
- The refresh token is an HttpOnly, Secure cookie owned by Django. JavaScript
  never reads, stores, or logs it.
- Refresh, login, registration, and logout use credentialed requests as required
  by the API contract.
- No middleware or authenticated Server Component is used in FE004.

## Session lifecycle and roles

`AuthProvider` starts in `initializing`, performs one refresh request, then
loads `/api/auth/me/`. A missing or invalid refresh cookie is a normal signed
out state. Unexpected failures become an explicit error state with retry.

Role resolution is deterministic: `is_staff === true` resolves to `staff` even
without an `AccountProfile`; otherwise `account_type` resolves to `store` or
`customer`; any other combination is rejected. `is_staff` and `is_superuser`
are read-only backend identity signals.

## Login, registration, and logout

Customer login posts the exact `{ username, password }` shape, keeps the access
token in memory, loads `/me`, and redirects only to a safe role-compatible
`next` path. Open redirects, protocol-relative URLs, and cross-role
destinations are discarded.

Customer registration validates `username`, `email`, `password`, and a
frontend-only `password_confirm`; the confirmation is never sent to Django.
Registration does not auto-login and returns to login with a confirmation
message.

Logout clears the in-memory token and local auth state even when Django is
unavailable. Errors are normalized without exposing response bodies or cookies.

## Guards and routes

`GuestOnly` protects `/login` and `/register`; `RequireAuth` protects signed-in
content; and `RequireRole` sends forbidden users to `/unauthorized`. FE004
placeholders are `/account`, `/store/dashboard`, and `/staff/store-reviews`.
They contain no final product or workspace features.

Forms use React Hook Form and Zod, preserve server field errors, support
keyboard submission, and keep mixed Persian/Latin credentials in LTR inputs
inside the structural Persian RTL shell.

FE005 adds the shared public header/footer around public and authenticated
non-auth routes. Auth pages intentionally keep the focused FE004 auth shell.
The header derives role actions from `AuthProvider` and never grants access;
role permissions remain backend-enforced.

## Local development

Use `.env.local` with the API base URL and run Django on
`http://127.0.0.1:8000`. Production must use HTTPS and the backend's Secure
cookie configuration.
