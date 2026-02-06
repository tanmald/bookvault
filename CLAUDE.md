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
