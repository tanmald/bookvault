# BookVault - Improvement Plan

> Generated from comprehensive code review on 2026-01-30

## Summary

45+ issues identified across code quality, security, performance, and UX.

---

## CRITICAL (Fix Immediately)

### 1. Security: RLS Policy Gaps
- **books table**: Missing explicit SELECT policy for owner + friends
- **reading_progress table**: Missing "own records" policy
- **Files**: `supabase/migrations/` - need new migration

### 2. Bug: Silent Error on Book File Creation
- **File**: `src/hooks/useBooks.ts` (lines 118-121)
- **Issue**: File creation errors logged but user not notified
- **Fix**: Show error toast when file creation fails

### 3. Bug: Unsafe Base64 Parsing
- **File**: `src/pages/UploadBook.tsx` (lines 279-286)
- **Issue**: Assumes base64 string format without validation
- **Fix**: Add try-catch and format validation

### 4. TypeScript: Excessive `any` Types
- **Files**:
  - `src/pages/UploadBook.tsx` (line 320) - catch clause
  - `src/pages/JoinInvite.tsx` (line 116) - catch clause
  - `src/components/upload/FileUpload.tsx` (line 43)
- **Fix**: Use `unknown` with type guards

---

## HIGH PRIORITY (Next Sprint)

### 5. Performance: Multiple Sequential Queries
Hooks make 2-4 separate API calls when 1 would suffice:

| Hook | Current Calls | Recommended |
|------|---------------|-------------|
| `useFriends.ts` | 2 (friendships + profiles) | 1 with join |
| `useActivityFeed.ts` | 4 (friendships + progress + profiles + reviews) | 2 with joins |
| `useLibraryMembers.ts` | 2 (members + profiles) | 1 with join |
| `useFriendsBookProgress.ts` | 3 (friendships + profiles + progress) | 1 with join |

**Fix**: Use Supabase `.select('*, profile:profiles(*)')` relations

### 6. Performance: Missing Pagination
- **Files**: `src/hooks/useBooks.ts`, `src/hooks/useActivityFeed.ts`
- **Issue**: Loads all records into memory
- **Fix**: Add `.limit()` and implement infinite scroll

### 7. Performance: No Optimistic Updates
- **Files**: All mutation hooks (useBooks, useReadingProgress, useFriends)
- **Issue**: UI waits for server response
- **Fix**: Implement `onMutate` callbacks with rollback

### 8. Accessibility: No ARIA Labels
- **Files**: All interactive components
- **Issue**: Icon-only buttons have no accessible names
- **Fix**: Add `aria-label` to all icon buttons, use semantic HTML

### 9. Input Validation: Weak Password Requirements
- **File**: `src/pages/Register.tsx` (lines 46-53)
- **Issue**: Only 6 character minimum
- **Fix**: Require 8+ chars, mixed case, numbers

---

## MEDIUM PRIORITY (Technical Debt)

### 10. Code Quality: Complex Functions
- **File**: `src/pages/UploadBook.tsx`
  - `extractMetadata()`: 100+ lines - split into 3 functions
  - `handleSubmit()`: 127 lines - extract upload logic

### 11. Code Quality: 10 useState Hooks
- **File**: `src/pages/UploadBook.tsx` (lines 51-70)
- **Fix**: Consolidate into 2-3 state objects

### 12. React: Missing useEffect Dependencies
- **File**: `src/pages/JoinInvite.tsx` (line 29)
- **Issue**: `checkInvite` function not in deps array

### 13. Code Duplication: Mutation Patterns
- **Files**: All hooks
- **Issue**: Identical onSuccess/onError toast patterns
- **Fix**: Create `useMutationWithToast` wrapper hook

### 14. i18n: Hardcoded Strings
- **Files**: `src/components/books/BookKanban.tsx`, `src/pages/Library.tsx`
- **Fix**: Move to translation keys

### 15. UX: Missing Form Validation Feedback
- **Files**: Login, Register, UploadBook, Profile pages
- **Fix**: Add field-level error display, real-time validation

### 16. UX: Incomplete Loading States
- **Files**: All pages
- **Fix**: Add skeleton components for better perceived performance

---

## LOW PRIORITY (Polish)

### 17. Mobile Responsiveness
- `src/pages/UploadBook.tsx`: Two-column layout doesn't stack
- `src/pages/Friends.tsx`: Sidebar layout issues on tablets

### 18. TypeScript: Double Type Casting
- `src/hooks/useActivityFeed.ts` (lines 89, 98)
- `src/pages/JoinInvite.tsx` (line 63)

### 19. Component Organization
- `UploadBook.tsx` (603 lines) - extract forms
- `BookDetails.tsx` (363 lines) - extract sections

### 20. Create Reusable Components
- `EmptyState` - for empty lists
- `SelectFilter` - for filter dropdowns
- `FormField` - with integrated error display

---

## Quick Wins

1. Add `aria-label` to icon buttons in AppLayout
2. Fix `any` types in catch clauses
3. Add try-catch around base64 parsing
4. Create `src/lib/dateUtils.ts` for date formatting
5. Fix hardcoded strings in BookKanban.tsx
