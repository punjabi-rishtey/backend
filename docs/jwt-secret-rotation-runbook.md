# JWT secret rotation runbook (names only)

This document describes how to rotate **`JWT_SECRET`** (member sessions) and **`ADMIN_JWT_SECRET`** (admin sessions) on a future maintenance window. It does **not** change Render environment variables or production values by itself.

## Current behavior (after chunk 4)

| Variable | Used for |
|----------|----------|
| `JWT_SECRET` | Member login tokens (`issuer` `pr-user`, `audience` `pr-user`) |
| `ADMIN_JWT_SECRET` | Admin login tokens (`issuer` `pr-admin`, `audience` `pr-admin`) |

Secrets must remain **different**. Startup fails if either is missing (except demo mode, where only `JWT_SECRET` is required). Weak or placeholder values log **warnings** at startup but do not block an already-configured server.

## What invalidates when you rotate

| Secret rotated | Effect |
|----------------|--------|
| `ADMIN_JWT_SECRET` | All existing admin JWTs fail verification. Admins must log in again. |
| `JWT_SECRET` | All existing member JWTs fail verification. Users must log in again. Active sessions in the `Session` collection no longer match valid tokens until users re-authenticate. |

There is no gradual or dual-signing period in the API today: one secret per audience at a time.

## Generate new values (offline)

On a trusted machine, generate independent random strings (for example 32+ bytes, base64- or hex-encoded). Store them in your password manager. **Do not** paste secrets into tickets, chat, or git.

Example (illustrative only — run locally):

```bash
openssl rand -base64 48
```

Run twice so `JWT_SECRET` and `ADMIN_JWT_SECRET` differ.

## Recommended order on Render (when approved)

1. **Announce** a short maintenance window if member re-login is required.
2. **Rotate `ADMIN_JWT_SECRET` first** (smaller blast radius: admin users only).
   - Set the new value on the Render web service (environment variable name: `ADMIN_JWT_SECRET`).
   - Trigger a deploy. Confirm `/health` and admin login with the new token.
   - Admins with old tokens receive 401 until they log in again.
3. **Rotate `JWT_SECRET` only when explicitly approved** (all members must re-login).
   - Set the new value on Render (`JWT_SECRET`).
   - Deploy. Confirm member login and a protected member route.
   - Optional follow-up: audit or prune stale `Session` rows after users re-authenticate (not automated in this repo).
4. **Verify** user and admin frontends after each step (CORS and API base URLs unchanged).

## What this chunk deliberately deferred

The following require changing live environment variables and a redeploy; they are **out of scope** for code-only PRs:

- Generating and installing a new production `JWT_SECRET`
- Forcing production member re-login by rotating `JWT_SECRET`
- Any Render dashboard changes or production redeploy solely for rotation
- Dual-key verification or zero-downtime rotation (not implemented)

See [`.env.example`](../.env.example) for local variable names and [`config/jwt.js`](../config/jwt.js) for startup checks and warnings.