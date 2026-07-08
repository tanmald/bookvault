# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server at http://localhost:8080
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests once (Vitest)
npm run test:watch   # Run tests in watch mode
```

## 🚨 CRITICAL: Development Branch

**ALL development work MUST be done in the `DEV` branch. NEVER commit directly to `main`!**

- Create feature branches from `DEV`: `git checkout dev && git checkout -b feature/my-feature`
- Merge completed work into `DEV` via PR
- `main` branch is for production releases only

## Architecture Overview

BookVault is a social book library application built with React + TypeScript + Vite, using Supabase as the backend (auth, PostgreSQL database, real-time subscriptions).

### Tech Stack
- **Frontend**: React 18, React Router v6, TanStack React Query
- **UI**: shadcn/ui components (in `src/components/ui/`), Tailwind CSS, Radix UI primitives
- **Backend**: Supabase (auth, database, edge functions)
- **Theming**: next-themes for light/dark/system mode
- **i18n**: Custom context-based (Portuguese/English) in `src/lib/i18n/`

### Key Directories
- `src/pages/` - Route-level page components (Library, BookDetails, Profile, etc.)
- `src/components/` - Reusable components organized by domain (auth/, books/, layout/, upload/, ui/)
- `src/hooks/` - Custom React hooks for data fetching (useBooks, useReadingProgress, useFriends, etc.)
- `src/contexts/` - React Context providers (AuthContext, LanguageContext)
- `src/integrations/supabase/` - Supabase client and auto-generated types
- `supabase/` - Database migrations and edge functions

### State Management
1. **AuthContext** - User session via Supabase auth
2. **LanguageContext** - i18n with localStorage persistence
3. **ThemeProvider** (next-themes) - Theme switching with CSS class-based dark mode
4. **TanStack Query** - Server state and data fetching caching

### Routing Pattern
Protected routes use a `ProtectedRoute` wrapper that redirects unauthenticated users to `/login`. Public routes: `/login`, `/register`, `/join/:code`.

### Path Aliases
`@/*` maps to `src/*` (configured in tsconfig and vite.config.ts)

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>
```

## Edge Function

The `extract-metadata` edge function uses OpenAI (gpt-4o-mini) for AI-powered book genre and language detection. The `OPENAI_API_KEY` secret must be set in the Supabase dashboard.

## Business Rules — Social & Scoreboard

### 🚨 CRITICAL BUSINESS RULES - DO NOT CHANGE WITHOUT EXPLICIT APPROVAL

#### Rule 1: /friends Page Layout
- **Left column**: Library members of the current library via `useLibraryMembers(currentLibrary?.id)`
- **Right column**: Recent activity from direct friendships via `useActivityFeed()`
- **CRITICAL**: Must maintain separation between `library_members` (access control) and `friendships` (social)

#### Rule 2: /book/:id Scoreboard Filtering
- **MUST** only show members of the book's library (from `library_members` table, NOT `friendships`)
- **MUST** include the current user
- **MUST** only show members with status: `to_read`, `reading`, or `read`
- **MUST NOT** show members with `not_planned` status
- **MUST NOT** show members with no reading progress
- Uses RPC function: `get_library_friends_book_progress`
- Implementation: `FriendsScoreboard.tsx` + `useFriendsBookProgress.ts`

#### Rule 3: Data Model Distinction
- `friendships` table = global social relationships
- `library_members` table = per-library access control
- **Never mix these two for scoreboard or member listing**

---

### Data Model: `friendships` vs `library_members`
- **`friendships`**: Global social relationship between invite creator and joiner. Used for the activity feed.
- **`library_members`**: Per-library access control. Determines who belongs to which library.
- Both are created atomically when someone accepts an invite link (`use_invite_link` RPC).

### Friends Scoreboard (`/book/:id`)
- **MUST** show only members of the book's library (from `library_members`, NOT `friendships`).
- **MUST** include the current user.
- **MUST** only show members with status `to_read`, `reading`, or `read`.
- **MUST NOT** show members with `not_planned` status or no reading progress.
- Uses the `get_library_friends_book_progress` RPC function.

### Friends Page (`/friends`)
- Left column: Library members of the currently selected library (from `useLibraryMembers`).
- Right column: Recent activity from direct friendships (from `useActivityFeed` → `friendships` table).

## Edge Functions & Supabase Client

### Supabase Client (`src/integrations/supabase/client.ts`)
- **MUST NOT** add `Content-Type` or other headers to `global.headers` — global headers override auto-detected Content-Type for ALL requests, breaking FormData uploads to edge functions.
- The Supabase JS client already sets Content-Type correctly per request type.

### Edge Function Deployment
- **Utility functions** (no DB/user data access): deploy with `--no-verify-jwt`. Examples: `extract-metadata`, `fetch-cover`, `search-books`, `find-series`. The gateway must NOT verify the JWT (it breaks FormData uploads), and these functions must remain usable without requiring auth.
- **Exception — `extract-metadata` reads (but does not require) auth on purpose:** it must still deploy `--no-verify-jwt` and still parse files for anyone, but it now *reads* the token the Supabase client already attaches to gate the **billed OpenAI call** (`detectWithAI`) to authenticated users only. This prevents anonymous cost-drain. Do NOT "simplify" this back to always calling OpenAI, and do NOT flip the deployment to verify the JWT.
- When calling edge functions with FormData, do NOT set manual `Authorization` headers — let the Supabase client handle auth automatically.
- **CORS:** all four functions restrict `Access-Control-Allow-Origin` to the comma-separated `ALLOWED_ORIGINS` env var when set, falling back to `*` when unset. Set `ALLOWED_ORIGINS` (Supabase dashboard → Edge Functions → Secrets) to the app origin(s) in production.
- **`find-series`** (series/saga auto-detection): queries OpenLibrary's `series` field for the exact title+author first; if that specific edition has no series tag (common for translated/non-English editions), falls back to an author-only OpenLibrary search and takes the series name only if it's unambiguous (≥60% of that author's series-tagged works agree — an author with multiple series, e.g. Sarah J. Maas, must not have the wrong one guessed). If OpenLibrary has nothing at all, falls back to a Google Books author-search heuristic (title word-overlap) — note this heuristic only works when the query title shares words with the catalog (i.e. same language), so translated titles rely on the author-only OpenLibrary step instead. Heuristic results are only returned when ≥2 plausible companions are found — suppress rather than show a low-confidence guess. Free/unauthenticated APIs only, no API key required.

---

## Kanban Drag-and-Drop

The Kanban board uses **@dnd-kit** for drag-and-drop functionality:
- Drag books between columns to change their reading status instantly
- Supports mouse, touch (mobile), and keyboard navigation
- Integrates seamlessly with React Query optimistic updates
- Accessible: Keyboard users can use Space to pick up, Arrow keys to move, and Space to drop books
- Touch devices: Long-press (150ms) activates drag without interfering with scrolling

**Key components**:
- `BookKanban`: Main component with DndContext, sensors, and drag handlers
- `SortableBookCard`: Draggable wrapper for BookCard using `useSortable()` hook
- `DroppableColumn`: Drop zone wrapper for status columns
- Status changes are handled via `useReadingProgress().updateProgress` mutation with automatic rollback on errors
