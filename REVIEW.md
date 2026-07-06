# BookVault — Comprehensive Application Review

> Review date: 2026-07-05 · Scope: architecture, security, usability, and product/feature set.
> This document is a review; a companion migration in this same change closes the four most
> serious security issues (see [§2](#2-security) and *Applied fixes* at the end).

## ⏸️ Waiting on you: CI gate

The one remaining item from the quick-wins backlog (§7) needs your input before it can be done:
re-enabling `.github/workflows/test.yml.disabled`. Before flipping it on:
1. You need to add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as GitHub Actions
   secrets (Settings → Secrets and variables → Actions) — the workflow's `build` job reads them.
2. The workflow's branch triggers say `develop`, but this repo's actual branch is `dev` — that
   needs fixing so it triggers correctly.

Once the secrets are in place, tell me to go ahead and I'll fix the branch name and rename the
file to activate it. Everything else in this document (see *Applied fixes* at the end) is done.

---

## 1. Executive summary

BookVault is a genuinely well-built social book-library app. The data layer is thoughtful —
joins are pushed into Postgres RPCs to avoid N+1 round-trips, and the two hottest mutations
(`useBooks`, `useReadingProgress`) have real optimistic updates with snapshot/rollback. The UI is
fully bilingual (pt/en) with perfect key parity, strongly responsive on mobile, and has good empty
states and duplicate detection on upload.

The headline problems are **security regressions in the database layer**: a late "remote schema"
migration disabled row-level security on `library_members` and made every active invite code
publicly readable. These are exploitable by any authenticated (and, for invites, *any*) user and
are the reason this review ships with fixes rather than only recommendations. Secondary themes are
a disabled TypeScript safety net, no error boundaries, and user-facing toast messages that bypass
the otherwise-complete i18n.

**Strengths:** RPC-based data access · optimistic updates · i18n parity · mobile UX · dnd Kanban.
**Top risks:** RLS disabled on `library_members` · public invite codes · IDOR in the scoreboard
RPC · client-trusted identity in the invite RPC.

---

## 2. Security

Ranked by severity. The four items marked **[FIXED]** are addressed by
`supabase/migrations/20260705000000_fix_rls_security_regressions.sql` in this change.

### CRITICAL

**C1 — Privilege escalation via `library_members` [FIXED].**
`supabase/migrations/20260207185124_remote_schema.sql` (the last migration to touch the table)
runs `alter table public.library_members disable row level security` and ships
`library_members_insert WITH CHECK (true)` + `library_members_select USING (true)`. Any
authenticated user could `INSERT` a row making themselves `role='admin'` in **any** library, then —
because the books DELETE policy grants deletion to library admins — **delete every book in that
library**, and read all its members. Horizontal + vertical privilege escalation.
*Fix:* re-enable RLS; replace the open policies with membership/admin-scoped ones backed by a new
SECURITY DEFINER `is_library_member()` helper (mirrors the existing `is_library_admin()`), so the
policies don't self-reference and recurse.

**C2 — Public invite-code disclosure [FIXED].**
Same migration adds `create policy "Enable read access for all users" on invite_links for select to
public using (is_active = true)`. `to public` includes the `anon` role, so **anyone, even
unauthenticated,** can `SELECT *` from `invite_links` and enumerate every active `code`, `owner_id`,
and `library_id` — defeating the entire invite model.
*Fix:* drop the public policy; add a SECURITY DEFINER `get_invite_link_info(p_code)` RPC that
returns only `{valid, owner_display_name, expired, max_uses_reached}` for the public `/join/:code`
page. `src/pages/JoinInvite.tsx` now calls that RPC instead of reading the table directly.

### HIGH

**H1 — IDOR in `get_library_friends_book_progress` [FIXED].**
The RPC is SECURITY DEFINER, derives the library from `p_book_id`, and returns every member's
display name, avatar, reading status/progress/dates and full review text — but never checks that
the caller belongs to that library. Any authenticated user could iterate book UUIDs and harvest
other libraries' members' identities and reading habits, bypassing per-table RLS on
`reading_progress`/`reviews`.
*Fix:* guard with `is_library_member(v_library_id, auth.uid())` and return empty otherwise.

**H2 — `use_invite_link` trusts client-supplied `joining_user_id` [FIXED].**
The RPC added whatever user id the client passed to a library and forged a `friendships` row for
them — an impersonation / unwanted-membership vector.
*Fix:* ignore the parameter and derive the joining user from `auth.uid()` (with an auth-required
guard and an explicit "cannot use your own invite" check).

### Toast i18n [FIXED — quick win]
User-facing toast titles/descriptions across ~13 hook files were hardcoded (mostly Portuguese),
bypassing the otherwise-complete i18n — English users saw Portuguese success/error toasts. A
`toast.*` key namespace (full pt/en parity) was added to `src/lib/i18n/translations.ts` and every
hook now calls `t()` instead of hardcoding strings.

### MEDIUM (recommended, not yet applied)

- **M1 — `.env` / `.env.test` were tracked in git [FIXED].** Only the public Supabase anon key
  (low severity), but it exposed the project ref and created a path to accidentally committing a
  service-role or OpenAI key later. Ran `git rm --cached .env .env.test` and added `.env.test` to
  `.gitignore` (`.env` was already covered).
- **M2 — Edge functions unauthenticated, `CORS: *`, no rate limiting [PARTIALLY FIXED].** The
  billed OpenAI call in `extract-metadata` (`detectWithAI`) is now gated to authenticated users:
  the function still deploys `--no-verify-jwt` and still parses files for anyone, but it reads the
  token the Supabase client already attaches and only calls OpenAI when a valid *user* token is
  present — so anonymous/raw-anon-key callers can no longer drain the OpenAI budget. All three
  functions also switched `Access-Control-Allow-Origin: *` to an `ALLOWED_ORIGINS` allowlist
  (falls back to `*` when the env var is unset). **Still open:** `fetch-cover`/`search-books`
  remain usable as unauthenticated Google-Books/OpenLibrary proxies (free APIs, no billing — lower
  risk), and there's no true per-user request quota — the auth gate removes the anonymous
  cost-drain vector but a determined authenticated user isn't rate-limited. A per-user quota
  (KV/table) or Supabase-dashboard-level rate limiting would close the rest.
- **M3 — Invite codes used `Math.random()` [FIXED]** (`src/hooks/useInvites.ts`), not a CSPRNG.
  Now generated with `crypto.getRandomValues` using rejection sampling to avoid modulo bias. Codes
  are still generated client-side — the `code` column has a `UNIQUE` constraint, so a collision
  fails the insert cleanly rather than causing an access-control issue; moving generation
  server-side remains a nice-to-have, not a security requirement.

### LOW / informational

- **L1 — SSRF (low) [FIXED].** `fetch-cover`'s image fetches now go through a `safeFetch` helper
  that validates the target host up front (https-only, rejects loopback/private/link-local
  addresses) and re-validates the final resolved URL after redirects, so a redirect chain can't be
  used to reach an internal service. (Deno's `redirect: "manual"` returns an opaque response, so we
  follow normally and check `response.url` rather than inspecting each hop.)
- **L2 — Prompt injection: contained.** `extract-metadata` feeds uploaded text to OpenAI but forces
  output through an `enum`-constrained function tool and re-validates against the genre/language
  allow-lists. No action needed.
- **L3 — `covers`/`avatars` storage buckets are public** (world-readable). Acceptable for cover art;
  note that book *files* are correctly private/friend-gated.
- **L4 — Password policy is client-side only** (`length >= 8`). Configure a server-side minimum in
  Supabase auth settings.
- **L5 — `debug_user_access()` SECURITY DEFINER RPC shipped [FIXED]** in migrations. Was low risk
  (scoped to `auth.uid()`), but diagnostic RPCs shouldn't ship to production — dropped via
  `supabase/migrations/20260705010000_drop_debug_user_access.sql`.
- **L6 — AuthContext logged the user's email to console [FIXED]** (`src/contexts/AuthContext.tsx`).

**Clean:** no `eval`, no user-data `dangerouslySetInnerHTML` (the only one is shadcn's chart CSS,
not user-controlled), React auto-escaping covers user titles/reviews, and the login redirect is a
same-origin path — no XSS or open-redirect vectors found. No service-role key or private secret is
committed anywhere in the repo.

> **Note on `IMPROVEMENTS.md`:** it marks *"RLS Policy Gaps ✅ DONE — policies already complete"*
> (2026-01-30). That conclusion is **stale** — the later `remote_schema` migration regressed RLS.
> This review supersedes that line.

---

## 3. Architecture & code quality

- **TypeScript safety net is off.** `tsconfig.app.json` sets `strict:false`, `noImplicitAny:false`,
  `strictNullChecks:false`; ESLint disables `@typescript-eslint/no-unused-vars`. Null-safety and
  implicit-any go uncaught project-wide. Recommend enabling incrementally (start with
  `strictNullChecks` on new/changed files).
- **No error boundaries and no route lazy-loading [FIXED]** (`src/App.tsx`). Previously a render
  error in any route blanked the whole app, and every page shipped in one 1.23 MB (gzip 362 KB)
  bundle. Added a top-level `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) around the router
  outlet with a translated fallback UI, and converted every page import to `React.lazy` behind a
  `Suspense` boundary. The main bundle is now 558 KB (gzip 166 KB), with each page as its own chunk.
- **`LibraryContext` is hand-rolled `useState`** (with a side effect that migrates all of a user's
  books on first load, `src/contexts/LibraryContext.tsx:54`) while every other data domain uses
  React Query. Port it to React Query for consistency and cache coherence.
- **React Query had no default `staleTime` [PARTIALLY FIXED]** — data refetched aggressively on
  every mount/focus. Set a global 30s `staleTime` default in `src/App.tsx`. Invalidations are still
  coarse (whole `['books']` prefix) — narrowing those remains open.
- **User-feedback toasts were hardcoded (mostly Portuguese) [FIXED]** across ~13 hook files (e.g.
  `useBooks.ts`, `useLibraryMembers.ts`, `useReadingProgress.ts`), bypassing the complete i18n.
  Now routed through a new `toast.*` translation namespace (see above). A ready-made
  `useMutationWithToast.ts` helper still exists but is unused — adopt or delete it.
- **Dead weight [FIXED]:** removed `useMutationWithToast.ts` (unused), `components/auth/OnboardingChoice.tsx`
  (orphaned), `hooks/useNotPlannedVisibility.ts` (unused), both `types.ts.backup*` files, and the
  root `BOOKIE.txt` / `test-epub-cover.html` scratch files. Also removed the leftover debug
  `console.log`s in `Library.tsx`, `LibraryContext.tsx`, and the ones logging the user's
  email/signup response in `AuthContext.tsx` (L6). `console.error` calls in catch blocks were kept
  — they're legitimate error diagnostics, not debug cruft.
  Still open: `recharts` + `ui/chart.tsx` + `ui/pagination.tsx` remain installed but unrendered —
  intentionally kept, since §6 recommends building the stats page and pagination UI on top of them
  rather than removing them now.
- **Testing is thinner than it looks.** The Vitest config sets an 80% coverage threshold, but the 6
  test files are integration tests against a live Supabase that `skipIf` silently when no DB is
  configured — so the threshold is illusory in CI. There is no `typecheck` script and no CI gate.
  Add unit tests that don't need a DB, a `typecheck` npm script, and wire lint+typecheck+test into
  CI.
- **Mismatched genre taxonomies:** `extract-metadata` emits Portuguese genre slugs
  (`ficcao-cientifica`, `autoajuda`) while `search-books` emits English ones (`sci-fi`,
  `self-help`). Unify against the `genres` table's canonical slugs.
- **`UploadBook.tsx` (~919 lines)** mixes file upload, metadata extraction, duplicate detection, and
  form state. Decompose `extractMetadata()` and `handleSubmit()` into focused units/hooks.

---

## 4. UX & usability

- **Loading states are inconsistent** — real skeletons in Library/scoreboard/goal, but bare
  centered spinners in BookDetails, Profile, Friends, Invites, and Join. Standardize on skeletons.
- **Query errors are mostly unsurfaced** — activity feed, scoreboard, and book list render empty on
  error rather than showing a retry/error state. Add error UI (React Query `isError`).
- **Form validation is thin outside Register.** Upload/Invites/Profile rely on `required` +
  toast-on-submit. `zod` and `react-hook-form` are installed but unused on page forms — adopt them
  for inline validation.
- **Accessibility gaps:** icon-only buttons (Invites copy/delete, member-management dropdown, the
  star-rating buttons) lack `aria-label`; cover `<img>` `alt` is inconsistent; star ratings aren't
  announced as a group. Otherwise good: `sr-only` labels on the FAB, keyboard dnd sensor, label/id
  pairing on forms.
- **Dark mode** is well covered via `next-themes` + semantic tokens.
- **Missing conveniences:** no real pagination/infinite scroll (only "load first 100, then load
  all"); no PWA/offline; no undo on destructive actions (though confirm dialogs exist); no bulk
  actions; no export/import; no notifications.
- **BookDetails gaps:** the owner's **own** review/rating is never shown (only friends' are); there's
  no aggregate/average rating; no page-count or ISBN displayed; and there's no post-creation
  metadata-edit UI even though a working `updateBook` mutation already exists (only cover editing is
  wired).

---

## 5. Reading-progress & data model notes

- Statuses: `to_read | reading | read | not_planned`, one row per (user, book) via **upsert** — so
  **re-reads overwrite history** (no reading log).
- Progress is **percent-only** (0–100 slider); there is **no page-count** tracking anywhere.
- `started_at`/`finished_at` auto-set on transitions; only `finished_at` is user-editable.
- A separate `reading_sessions` table stores duration + optional `notes`, and computes
  today/weekly/streak — but the `notes` field is **never read back** in any UI, and sessions aren't
  tied to progress %.
- Reviews: 1–5 rating + optional text (≤200 chars), one per (user, book).

---

## 6. Suggested new features

Benchmarked against Goodreads / StoryGraph / Bookshelf / Oku and what readers typically want.
Roughly ordered by value-to-effort:

1. **Surface the owner's own review + an average rating on BookDetails**, and wire the existing
   `updateBook` mutation into a metadata-edit UI (title/author/genre/year). *Low effort, closes an
   obvious gap.*
2. **Page-count + position tracking** (pages read, auto-deriving %), not just a percent slider —
   the single most-requested capability for reading trackers.
3. **Re-read history / reading log** — allow multiple finish dates per book instead of overwriting.
4. **Real pagination / infinite scroll + server-side search** for large libraries (the current
   client-side filter only sees loaded books). The unused `ui/pagination.tsx` is a starting point.
5. **A reading-stats page using the already-installed `recharts`** — books/pages over time, genre
   breakdown, pace vs. goal. The dependency is present but nothing renders it today.
6. **Notifications** — "a friend finished a book", "invite accepted", new activity — in-app center
   plus optional email/web-push. Supabase Realtime is already available.
7. **Social depth:** comments / reactions on the activity feed; reading challenges or buddy-reads.
8. **Shelves / tags / collections + favorites** beyond the four Kanban statuses.
9. **Discovery / recommendations** from the library + Google Books (the `search-books` proxy exists).
10. **Export / import** (CSV, Goodreads import) and library backup.
11. **PWA** — installable, offline shelf, `theme-color`/manifest.
12. **"Currently reading" home widget** + quick "log session" straight from a book card (surfacing
    the `reading_sessions.notes` field that's currently written but never shown).

---

## 7. Quick wins backlog (low effort, high value)

~~Route toasts through `t()`~~ **[FIXED]** · ~~delete the dead files/`console.*` listed in §3~~
**[FIXED]** · ~~add a top-level error boundary + lazy routes~~ **[FIXED]** · ~~set a `QueryClient`
`staleTime`~~ **[FIXED]** · ~~`git rm --cached` the `.env` files~~ **[FIXED]** · ~~swap
`Math.random()` invite codes for a CSPRNG~~ **[FIXED, client-side]** · ~~drop
`debug_user_access()`~~ **[FIXED]** · ~~add a `typecheck` npm script~~ **[FIXED]** — a CI gate to
run it remains open (see note below).

> A disabled CI workflow already exists at `.github/workflows/test.yml.disabled` covering lint,
> `tsc --noEmit`, and a Supabase-backed test run. Re-enabling it (renaming off `.disabled`) would
> close the CI-gate item, but that's a call for the repo owner — enabling/changing CI pipelines
> wasn't done as part of this pass without an explicit go-ahead.

---

## Applied fixes in this change

- **New:** `supabase/migrations/20260705000000_fix_rls_security_regressions.sql` — closes C1, C2,
  H1, H2 (re-enables RLS with membership/admin-scoped policies, removes the public invite read and
  replaces it with a minimal `get_invite_link_info` RPC, authorizes the scoreboard RPC, and makes
  `use_invite_link` derive the caller from `auth.uid()`).
- **Changed:** `src/pages/JoinInvite.tsx` — validates invites via the new RPC instead of reading
  `invite_links` directly.
- **Changed:** `src/integrations/supabase/types.ts` — registers the `get_invite_link_info` RPC type.
- **New:** `toast.*` key namespace in `src/lib/i18n/translations.ts` (full pt/en parity), and 13
  hook files updated to call `t()` instead of hardcoding toast titles/descriptions.
- **Removed:** `useMutationWithToast.ts`, `OnboardingChoice.tsx`, `useNotPlannedVisibility.ts`,
  both `types.ts.backup*` files, and the root `BOOKIE.txt` / `test-epub-cover.html` scratch files —
  all confirmed unreferenced before deletion.
- **Changed:** `Library.tsx`, `LibraryContext.tsx`, `AuthContext.tsx` — removed leftover debug
  `console.log`s, including the ones logging the user's email/signup response.
- **New:** `src/components/ErrorBoundary.tsx` — top-level error boundary with a translated fallback
  UI (reload / go home). **Changed:** `src/App.tsx` — every page route now uses `React.lazy` behind
  a `Suspense` boundary, wrapped by the new `ErrorBoundary`.
- **Changed:** `src/App.tsx` — `QueryClient` now sets a 30s default `staleTime`.
- **Removed:** `.env` / `.env.test` untracked from git (`git rm --cached`); `.env.test` added to
  `.gitignore` (`.env` was already covered).
- **Changed:** `src/hooks/useInvites.ts` — invite codes now use `crypto.getRandomValues` with
  rejection sampling instead of `Math.random()`.
- **New:** `supabase/migrations/20260705010000_drop_debug_user_access.sql` — drops the unused
  `debug_user_access()` diagnostic RPC; removed its now-stale entry from
  `src/integrations/supabase/types.ts`.
- **New:** `typecheck` npm script (`tsc --noEmit`) in `package.json`.
- **Changed:** `supabase/functions/extract-metadata/index.ts` — gates the billed OpenAI call to
  authenticated users (reads the client-attached token; parsing stays open, deployment stays
  `--no-verify-jwt`). **Changed:** all three edge functions — `ALLOWED_ORIGINS` CORS allowlist.
  **Changed:** `supabase/functions/fetch-cover/index.ts` — `safeFetch` SSRF guard. `CLAUDE.md`
  updated to document the new `extract-metadata` auth-read exception and the `ALLOWED_ORIGINS` var.

> **Edge-function deploy notes:** these are Deno functions, not covered by the app's
> build/lint/typecheck (they were syntax-checked via esbuild only — there's no Deno in this
> environment to run them). On deploy: (1) set the `ALLOWED_ORIGINS` secret to the app origin(s);
> (2) redeploy all three with `--no-verify-jwt`; (3) smoke-test an upload while logged in (AI
> genre/language should still populate) and confirm cover fetching still returns results.

Everything else in this document is left as prioritized recommendations, not code changes.
