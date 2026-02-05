# Quick Test Setup Guide

## ✅ What's Already Done

1. **Test infrastructure installed**
   - `@vitest/coverage-v8` for coverage reporting
   - `dotenv` for test environment variables
   - LocalStorage mock for Supabase

2. **Pre-push hook created**
   - Runs automatically before every push
   - Executes: Lint → TypeScript → Tests

3. **GitHub Actions workflow ready**
   - Runs on every push and PR

4. **Sample tests created**
   - `useAuth.test.tsx` - Authentication tests
   - `useBooks.test.tsx` - Book management tests

## 🔧 Next Steps to Complete Setup

### Step 1: Get Your Local Supabase Anon Key

Run this command to get the real anon key:

```bash
# Get the JWT secret from the auth container
docker exec supabase_auth_ProjectsCTW env | grep GOTRUE_JWT_SECRET

# Or get it from the Kong configuration
docker exec supabase_kong_ProjectsCTW cat /home/kong/kong.yml | grep -A 2 "anon"
```

### Step 2: Update `.env.test`

Replace the placeholder anon key in `.env.test` with your actual local Supabase anon key:

```bash
# Current (placeholder):
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Replace with your actual local key from Step 1
```

**Note:** For local Supabase, the anon key is typically the same across all local instances. If you can't find it, you can generate one using the JWT secret.

### Step 3: Verify Tests Work

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# View coverage report
open coverage/index.html
```

### Step 4: Test the Pre-Push Hook

```bash
# Make a small change
echo "// test" >> src/test/example.test.ts

# Stage and try to push
git add .
git commit -m "test: verify pre-push hook"
git push origin main

# You should see the hook running:
# 1. Running linter...
# 2. Running TypeScript type check...
# 3. Running tests...
```

## 📊 Current Test Status

| Test File | Status | Notes |
|-----------|--------|-------|
| `example.test.ts` | ✅ Passing | Basic test |
| `useAuth.test.tsx` | ⚠️ Needs real key | Auth flow tests |
| `useBooks.test.tsx` | ⚠️ Needs real key | Book CRUD tests |

## 🎯 Coverage Targets

Once tests pass with the real anon key, you should see:
- **Target**: 80% for critical paths
- **Current**: ~0% (tests failing)
- **After fix**: Should see actual coverage numbers

## 🚀 Adding More Tests

Follow the pattern in `useAuth.test.tsx`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useYourHook } from "./useYourHook";
import { AuthProvider } from "@/contexts/AuthContext";

describe("useYourHook", () => {
  beforeEach(async () => {
    // Setup
  });

  afterEach(async () => {
    // Cleanup
  });

  it("should do something", async () => {
    const { result } = renderHook(() => useYourHook(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual(expectedValue);
  });
});
```

## 🐛 Troubleshooting

### "storage.getItem is not a function"
✅ **Fixed** - Added localStorage mock in `src/test/setup.ts`

### "Cannot read properties of null (reading 'id')"
⚠️ **Expected** - Supabase auth failing with placeholder key

### Tests hanging
```bash
# Check if Supabase is running
supabase status

# Restart if needed
supabase stop
supabase start
```

### Port conflicts
```bash
# If port 54322 is in use
supabase stop
supabase start
```

## 📁 Files Created

```
.env.test                           # Test environment variables
src/test/setup.ts                   # Test environment setup
src/test/fixtures/users.ts          # Test data & helpers
src/test/helpers/cleanup.ts         # Cleanup utilities
src/hooks/useAuth.test.tsx          # Auth tests (sample)
src/hooks/useBooks.test.tsx         # Books tests (sample)
.git/hooks/pre-push                 # Pre-push validation hook
.github/workflows/test.yml          # GitHub Actions CI
TESTING.md                          # Full documentation
TEST_SUITE_SUMMARY.md               # Implementation summary
```

## ✨ What You'll Get

Once the anon key is configured:
- ✅ Automatic testing before every push
- ✅ Coverage reports showing 80%+ on critical paths
- ✅ CI/CD integration on GitHub
- ✅ Confidence that your code works

## 📝 Need Help?

1. **Check the full docs**: See `TESTING.md`
2. **Look at examples**: `src/hooks/useAuth.test.tsx`
3. **Run the example test**: `npm test src/test/example.test.ts` (should pass)

---

**You're almost done!** Just need to update the anon key in `.env.test` and you'll have a fully functional test suite.
