# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a SvelteKit application for a time tracking and learning management system. It features a glassmorphism design system, dual authentication (Supabase for UI, custom API for backend), and internationalization support.

## Common Commands

```bash
# Development
npm run dev              # Start dev server (add --open to auto-open browser)

# Building
npm run build            # Production build
npm run preview          # Preview production build locally

# Code Quality
npm run check            # Type check with svelte-check
npm run check:watch      # Type check in watch mode
npm run lint             # Run ESLint and Prettier check
npm run format           # Format code with Prettier

# Testing
npm run test             # Run all tests once
npm run test:unit        # Run Vitest unit tests (watch mode by default)
```

## Architecture

### Dual Authentication System

The app uses two separate authentication mechanisms:

1. **Supabase Auth** (`src/lib/supabaseClient.ts`, `src/hooks.server.ts`):
   - Used for UI authentication and session management
   - Two schemas: `app` (main) and `admin` (admin operations)
   - Server-side clients created in `hooks.server.ts` and injected into `event.locals`
   - Client-side clients created in `supabaseClient.ts`

2. **Custom API Auth** (`src/lib/api.ts`):
   - Backend API uses Bearer token authentication
   - Token stored in localStorage as `access_token` and cookie as `supabase-auth-token`
   - Automatic 401 handling redirects to `/login`
   - Token management functions: `getAccessToken()`, `setToken()`, `clearToken()`

### Data Loading Pattern

Server-side loads follow SvelteKit conventions:
- `+layout.server.ts`: Root layout loads profile and curriculum data (available to all pages)
- `+page.server.ts`: Individual page loads handle route-level redirects and auth checks
- Data flows from server load functions to page components via `$props()` (Svelte 5 syntax)

### Database Access Patterns

- **Client-side** (`src/lib/supabaseClient.ts`): Direct Supabase queries from browser
- **Server-side** (`src/hooks.server.ts`): Use `locals.supabase` or `locals.supabaseAdmin`
- **API calls** (`src/lib/api.ts`): Backend API via `apiRequest()` function with Bearer tokens

### Key Components

- `src/lib/components/curriculum-tree.svelte`: Interactive tree view, builds hierarchical structure from flat node list using `parent_id` references
- `src/lib/components/glass-card.svelte` & `gradient-background.svelte`: Core design system components
- `src/lib/components/ui/`: Shadcn-style UI components built with Bits UI and Tailwind CSS

### Routing & Authentication Flow

1. Unauthenticated users hitting protected routes are redirected via `+page.server.ts` checks
2. `hooks.server.ts` injects Supabase clients into `event.locals` for all requests
3. `+layout.server.ts` loads user profile and curriculum data if session exists
4. 404 responses automatically redirect to `/login` (see `hooks.server.ts:48-50`)

### State Management

Uses Svelte 5 reactive runes:
- `$state()`: Component-level reactive state
- `$derived()`: Computed values
- `$props()`: Component props
- No external state management library

### Internationalization

- Uses Paraglide JS (`@inlang/paraglide-js`)
- Messages imported as `* as m from '$lib/paraglide/messages.js'`
- Strategy: `['localStorage', 'cookie', 'baseLocale']` (configured in `vite.config.ts`)
- Language switcher component: `src/lib/components/language-switcher.svelte`

### Styling

- Tailwind CSS v4 with Vite plugin (configured in `vite.config.ts`)
- Custom utility in `src/lib/utils.ts`: `cn()` function merges classes using `clsx` and `tailwind-merge`
- Design system: Glassmorphism with orange/rose gradient theme
- Icons: Lucide Svelte

## Environment Variables

Required (set in `.env` or via deployment platform):
```
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
VITE_API_BASE_URL=http://localhost:8080  # Optional, defaults shown
```

## Type Definitions

- `src/app.d.ts`: Extends `App.Locals` interface for Supabase client injection
- `src/lib/types.ts`: Core domain types (CurriculumNode, CurriculumTreeNode, Team, TeamMember)
