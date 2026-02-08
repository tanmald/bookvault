# Regenerate Supabase Types Plan

## Overview
Regenerate TypeScript types from Supabase to fix incorrect nullability annotations on `get_library_friends_book_progress` RPC function.

**Target Issue**: Lines 496-507 in `src/integrations/supabase/types.ts`
- `display_name: string` → should be `string | null`
- `avatar_url: string` → should be `string | null`
- `started_at: string` → should be `string | null`
- `finished_at: string` → should be `string | null`
- `review_id: string` → should be `string | null`
- `review_rating: number` → should be `number | null`
- `review_text: string` → should be `string | null`

---

## Step 1: Pre-flight Checks

### 1.1 Verify Supabase CLI Installation
```bash
# Check if supabase CLI is installed globally
which supabase

# Check version
supabase --version
```

**Expected output**: Path to supabase binary (e.g., `/opt/homebrew/bin/supabase`)

**If not installed**:
```bash
# macOS
brew install supabase/tap/supabase

# npm (alternative)
npm install -g supabase
```

### 1.2 Verify Authentication
```bash
# Check if logged in to Supabase
supabase projects list
```

**Expected**: List of your Supabase projects

**If not logged in**:
```bash
supabase login
# Follow the browser-based authentication flow
```

### 1.3 Extract PROJECT_ID
```bash
# From .env file
export PROJECT_ID=$(grep VITE_SUPABASE_PROJECT_ID .env | cut -d'"' -f2)
echo "PROJECT_ID: $PROJECT_ID"
```

**Expected**: `eifmhgcwecyyeehbmabg`

---

## Step 2: Backup Current Types

```bash
# Create backup with timestamp
cp src/integrations/supabase/types.ts src/integrations/supabase/types.ts.backup.$(date +%Y%m%d_%H%M%S)
```

---

## Step 3: Regenerate Types

### Option A: Using Global Supabase CLI
```bash
# Set the project ID
export PROJECT_ID="eifmhgcwecyyeehbmabg"

# Generate types
supabase gen types typescript --project-id "$PROJECT_ID" --schema public > src/integrations/supabase/types.ts
```

### Option B: Using npx (if not installed globally)
```bash
# Set the project ID
export PROJECT_ID="eifmhgcwecyyeehbmabg"

# Generate types
npx supabase gen types typescript --project-id "$PROJECT_ID" --schema public > src/integrations/supabase/types.ts
```

### Verify the file was updated
```bash
# Check file size and modification time
ls -lh src/integrations/supabase/types.ts

# Check line count
wc -l src/integrations/supabase/types.ts
```

---

## Step 4: Verification Steps

### 4.1 Check the Fixed Function Type
```bash
# View the get_library_friends_book_progress return type
grep -A 15 'get_library_friends_book_progress' src/integrations/supabase/types.ts | head -20
```

**Verify fields now have nullable types**:
- `display_name: string | null`
- `avatar_url: string | null`
- `started_at: string | null`
- `finished_at: string | null`
- `review_id: string | null`
- `review_rating: number | null`
- `review_text: string | null`

### 4.2 TypeScript Type Check
```bash
# Run TypeScript compiler without emitting files
npx tsc --noEmit
```

**Expected**: No type errors

### 4.3 Run Tests
```bash
# Run test suite
npm test
```

**Expected**: All tests pass

### 4.4 Run Linter
```bash
# Check for linting issues
npm run lint
```

**Expected**: No linting errors

---

## Step 5: Troubleshooting

### Issue: Regenerated types still have wrong nullability

This indicates the SQL function definition itself has incorrect return types.

#### 5.1 Check Current SQL Function Definition

Run this SQL in Supabase Dashboard (SQL Editor):

```sql
-- View the current function definition
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_library_friends_book_progress';
```

#### 5.2 View Full Function Source

```sql
-- Get the complete function definition
SELECT pg_get_functiondef(
    (SELECT oid FROM pg_proc WHERE proname = 'get_library_friends_book_progress')
);
```

#### 5.3 Fix the SQL Function

If the function returns non-nullable types, you need to modify the function. Here's the corrected version:

```sql
-- Drop existing function (be careful in production!)
DROP FUNCTION IF EXISTS get_library_friends_book_progress(uuid, uuid);

-- Recreate with correct return types
CREATE OR REPLACE FUNCTION get_library_friends_book_progress(
    p_user_id uuid,
    p_book_id uuid
)
RETURNS TABLE (
    friend_id uuid,
    display_name text,
    avatar_url text,
    status reading_status,
    progress integer,
    started_at timestamptz,
    finished_at timestamptz,
    review_id uuid,
    review_rating integer,
    review_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lm.user_id as friend_id,
        p.display_name,
        p.avatar_url,
        bp.status,
        bp.progress,
        bp.started_at,
        bp.finished_at,
        r.id as review_id,
        r.rating as review_rating,
        r.review_text
    FROM library_members lm
    JOIN profiles p ON p.id = lm.user_id
    JOIN books b ON b.library_id = lm.library_id
    LEFT JOIN book_progress bp ON bp.book_id = b.id AND bp.user_id = lm.user_id
    LEFT JOIN reviews r ON r.book_id = b.id AND r.user_id = lm.user_id
    WHERE b.id = p_book_id
    AND lm.user_id != p_user_id
    AND bp.status IN ('to_read', 'reading', 'read');
END;
$$;
```

**Note**: After modifying the SQL function, regenerate types again (Step 3).

---

## Step 6: Post-Regeneration

### 6.1 Clean Up Backup
```bash
# Remove backup file (optional)
rm src/integrations/supabase/types.ts.backup.*
```

### 6.2 Commit Changes
```bash
# Stage the updated types
git add src/integrations/supabase/types.ts

# Commit with descriptive message
git commit -m "fix(types): regenerate Supabase types for get_library_friends_book_progress

- Fix nullable fields in RPC return type:
  - display_name: string → string | null
  - avatar_url: string → string | null
  - started_at: string → string | null
  - finished_at: string → string | null
  - review_id: string → string | null
  - review_rating: number → number | null
  - review_text: string → string | null"
```

---

## Quick Reference Commands

```bash
# One-liner for regeneration
export PROJECT_ID="eifmhgcwecyyeehbmabg" && supabase gen types typescript --project-id "$PROJECT_ID" --schema public > src/integrations/supabase/types.ts

# Verify the fix
grep -A 15 'get_library_friends_book_progress' src/integrations/supabase/types.ts | grep -E '(display_name|avatar_url|review)'

# Run all checks
npx tsc --noEmit && npm test && npm run lint
```

---

## Appendix: Understanding the Issue

The TypeScript types are generated from the PostgreSQL function's return type definition. If the SQL function declares columns as `NOT NULL` or uses non-nullable types, the generated TypeScript will reflect that.

In PostgreSQL, when a function returns a table:
- `RETURNS TABLE(col text)` → generates `col: string | null`
- `RETURNS TABLE(col text NOT NULL)` → generates `col: string`

The fix requires either:
1. **Preferred**: Update the SQL function to remove `NOT NULL` constraints
2. **Workaround**: Manual type overrides (not recommended as they'll be overwritten on next generation)

---

## Rollback Plan

If something goes wrong:

```bash
# Restore from backup
cp src/integrations/supabase/types.ts.backup.* src/integrations/supabase/types.ts

# Or restore from git
git checkout src/integrations/supabase/types.ts
```
