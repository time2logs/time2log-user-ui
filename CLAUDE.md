# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build (runs lint first via prebuild)
bun run check        # TypeScript + Svelte type check
bun run check:watch  # Type check in watch mode
bun run lint         # Prettier + ESLint check
bun run format       # Auto-format with Prettier
bun run test         # Run unit tests once
bun run test:unit    # Run unit tests in watch mode
```

## Architecture

This is a **SvelteKit** time-logging app (Node adapter) backed by **Supabase** (auth + Postgres). Users log work activities and absences, linked to a curriculum taxonomy, and are invited via token-based onboarding.

### Supabase clients (server-side)

Three client instances are set up in `src/hooks.server.ts` and exposed via `event.locals`:

| Local            | Key used                   | Schema  | Purpose                                                   |
| ---------------- | -------------------------- | ------- | --------------------------------------------------------- |
| `supabase`       | `SUPABASE_PUBLISHABLE_KEY` | `app`   | Standard RLS-protected client                             |
| `supabaseAdmin`  | `SUPABASE_PUBLISHABLE_KEY` | `admin` | Admin schema, still RLS-protected                         |
| `supabaseSecret` | `SUPABASE_SECRET_KEY`      | `admin` | Bypasses RLS — only for auth admin ops and invite lookups |

Browser-side clients live in `src/lib/supabaseClient.ts`.

### Auth & onboarding flow

1. Admin invites a user → Supabase creates an `auth.users` entry + an invite record
2. User visits `/onboarding?invite_token=...`
3. `supabaseSecret` validates the token via `get_invite_details()` RPC (no session needed)
4. User sets password + profile info → `supabaseSecret.auth.admin.updateUserById()`
5. User signs in → `accept_invite()` RPC creates team membership
6. Protected routes check `safeGetSession()` in `+page.server.ts`

Incomplete onboarding and missing sessions redirect to `/login` or `/onboarding`.

### State management

`src/lib/activityStorage.ts` and `src/lib/absenceStorage.ts` are Svelte writable stores with async CRUD methods that call Supabase directly from the browser. They're loaded on component mount via `$effect()`. There is no server-side data fetching for these — they hit Supabase client-side with the user's RLS-scoped credentials.

### i18n

Paraglide JS is used for i18n. The base locale is **de-ch**; also supported: `en`, `it`, `fr`.

- Message files: `messages/{locale}.json`
- Auto-generated runtime at `src/lib/paraglide/` — **do not edit manually**
- Import and use as: `import * as m from '$lib/paraglide/messages.js'` → `m.some_key()`

### Key constraints (activity validation)

- Hours per entry: min 1, max 10
- Hours per day: max 10
- Absences block activity logging for the same date
- Recurrence rules for absences use the `rrule` library; `rrule` is marked as SSR-external in `vite.config.ts`

### Code style

- **Tabs** for indentation, single quotes, print width 100 (enforced by Prettier)
- Tailwind v4 — no `tailwind.config.ts` with custom theme; use standard utility classes
- UI components in `src/lib/components/ui/` follow the bits-ui / shadcn-svelte pattern

### Environment variables

```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # sb_publishable_... (was: anon key)
SUPABASE_SECRET_KEY=               # sb_secret_... (was: service_role key)
```
