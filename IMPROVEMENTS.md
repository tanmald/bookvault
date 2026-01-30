# BookVault - Improvement Plan

> Generated from comprehensive code review on 2026-01-30

## Summary

45+ issues identified across code quality, security, performance, and UX.

---

## CRITICAL (Fix Immediately)

### ~~1. Security: RLS Policy Gaps~~ ✅ DONE
- Reviewed - policies already complete

### ~~2. Bug: Silent Error on Book File Creation~~ ✅ DONE
- **File**: `src/hooks/useBooks.ts`
- Added warning toast when file creation fails

### ~~3. Bug: Unsafe Base64 Parsing~~ ✅ DONE
- **File**: `src/pages/UploadBook.tsx`
- Added try-catch and format validation

### ~~4. TypeScript: Excessive `any` Types~~ ✅ DONE
- Fixed catch clauses to use `unknown` with type guards

---

## HIGH PRIORITY (Next Sprint)

### ~~5. Performance: Multiple Sequential Queries~~ ✅ DONE
Created RPC functions (`get_friends_with_profiles`, `get_library_members_with_profiles`) to reduce API calls:
- `useFriends.ts`: 2→1 query
- `useLibraryMembers.ts`: 2→1 query
- `useActivityFeed.ts`: 4→2 queries (1 RPC + 2 parallel)

### ~~6. Performance: Missing Pagination~~ ✅ DONE
- Added initial limit of 100 books with "Load all" button

### ~~7. Performance: No Optimistic Updates~~ ✅ DONE
- Added optimistic updates to useBooks (updateBook, deleteBook)
- Added optimistic updates to useReadingProgress (updateProgress)

### ~~8. Accessibility: No ARIA Labels~~ ✅ DONE
- Added ARIA labels to AppLayout icon buttons

### ~~9. Input Validation: Weak Password Requirements~~ ✅ DONE
- **File**: `src/pages/Register.tsx`
- Updated minimum to 8 characters with real-time feedback

---

## MEDIUM PRIORITY (Technical Debt)

### 10. Code Quality: Complex Functions
- **File**: `src/pages/UploadBook.tsx`
  - `extractMetadata()`: 100+ lines - split into 3 functions
  - `handleSubmit()`: 127 lines - extract upload logic

### 11. Code Quality: 10 useState Hooks
- **File**: `src/pages/UploadBook.tsx` (lines 51-70)
- **Fix**: Consolidate into 2-3 state objects

### ~~12. React: Missing useEffect Dependencies~~ ✅ DONE
- Moved `checkInvite` inside useEffect in JoinInvite.tsx

### ~~13. Code Duplication: Mutation Patterns~~ ✅ DONE
- Created `useMutationWithToast` wrapper hook

### ~~14. i18n: Hardcoded Strings~~ ✅ DONE
- Fixed BookKanban.tsx and Library.tsx to use translation keys
- Added kanban.noBooks, library.bookSingular, library.bookPlural, library.inCollection

### ~~15. UX: Missing Form Validation Feedback~~ ✅ DONE
- Added real-time validation to Register page (password match indicator)
- Submit button disabled until form is valid

### ~~16. UX: Incomplete Loading States~~ ✅ DONE
- Created BookCardSkeleton, BookGridSkeleton, BookKanbanSkeleton components
- Updated Library page to use skeleton loading states

---

## LOW PRIORITY (Polish)

### 17. Mobile Responsiveness
- `src/pages/UploadBook.tsx`: Two-column layout doesn't stack
- `src/pages/Friends.tsx`: Sidebar layout issues on tablets

### ~~18. TypeScript: Double Type Casting~~ ✅ DONE
- Created helper functions to handle Supabase relation types
- Fixed useActivityFeed.ts and JoinInvite.tsx

### 19. Component Organization
- `UploadBook.tsx` (603 lines) - extract forms
- `BookDetails.tsx` (363 lines) - extract sections

### ~~20. Create Reusable Components~~ ✅ PARTIAL
- Created `EmptyState` component with size variants
- Used in BookKanban, FriendsScoreboard
- (SelectFilter, FormField deferred - lower impact)

---

## Quick Wins

1. ~~Add `aria-label` to icon buttons in AppLayout~~ ✅ DONE
2. ~~Fix `any` types in catch clauses~~ ✅ DONE
3. ~~Add try-catch around base64 parsing~~ ✅ DONE
4. ~~Create `src/lib/dateUtils.ts` for date formatting~~ ✅ DONE
5. ~~Fix hardcoded strings in BookKanban.tsx~~ ✅ DONE
