# BookVault Test Suite

## Overview

This test suite provides comprehensive coverage of critical application paths with 80%+ coverage requirements.

## Test Structure

```
src/
├── test/
│   ├── setup.ts              # Test environment setup
│   ├── fixtures/             # Test data
│   │   ├── users.ts          # Test users & helpers
│   │   └── libraries.ts      # Test libraries & books
│   ├── helpers/              # Test utilities
│   │   └── cleanup.ts        # Database cleanup
│   └── integration/          # Integration tests
│       ├── auth-flow.test.tsx
│       └── invite-flow.test.tsx
├── hooks/
│   ├── useAuth.test.tsx      # Authentication tests
│   ├── useBooks.test.tsx     # Book management tests
│   └── ...
└── pages/
    ├── Login.test.tsx
    └── Register.test.tsx
```

## Coverage Requirements

### Critical Paths (80%+ Coverage Required)

#### 1. Authentication & Registration
**Coverage Target: 90%**

**What's Covered:**
- ✅ User registration with validation
  - Email format validation
  - Password minimum length (8 chars)
  - Display name requirements
  - Duplicate user handling
- ✅ User sign in
  - Valid credentials
  - Invalid password handling
  - Non-existent user handling
- ✅ Session management
  - Session persistence on refresh
  - Session restoration on mount
  - Sign out functionality
- ✅ Loading states
  - Initial loading state
  - Authentication loading states

**What's NOT Covered:**
- ⚠️ Email confirmation flow (requires email service)
- ⚠️ Password reset flow
- ⚠️ OAuth providers (Google, GitHub, etc.)
- ⚠️ Session expiration handling

#### 2. Library Members
**Coverage Target: 80%**

**What's Covered:**
- ✅ Fetching library members with profiles
- ✅ Admin role detection
- ✅ Promoting members to admin
- ✅ Demoting admins to members
- ✅ Removing members from library
- ✅ Self-removal (leave library)
- ✅ Owner protection (can't remove owner)

**What's NOT Covered:**
- ⚠️ Concurrent member operations
- ⚠️ Member list pagination (if applicable)
- ⚠️ Real-time member updates

#### 3. Books (CRUD)
**Coverage Target: 85%**

**What's Covered:**
- ✅ Fetching books by library
- ✅ Book creation with metadata
- ✅ Book updates (optimistic UI)
- ✅ Book deletion (optimistic UI)
- ✅ Book file management
  - Add book files
  - Delete book files
- ✅ Pagination/limiting (loadAll toggle)
- ✅ Genre relations

**What's NOT Covered:**
- ⚠️ File upload to Supabase Storage (mocked)
- ⚠️ Metadata extraction edge function
- ⚠️ Bulk operations
- ⚠️ Search/filter functionality

#### 4. Invites
**Coverage Target: 85%**

**What's Covered:**
- ✅ Invite code generation (8-char alphanumeric)
- ✅ Creating invites with options
  - Expiry dates
  - Max usage limits
- ✅ Validating invite codes
  - Valid code detection
  - Expired code handling
  - Max uses exceeded
- ✅ Listing active/expired invites
- ✅ Deleting invites
- ✅ Invite link copying

**What's NOT Covered:**
- ⚠️ QR code generation (if implemented)
- ⚠️ Invite analytics
- ⚠️ Bulk invite creation

#### 5. Invite Acceptance
**Coverage Target: 85%**

**What's Covered:**
- ✅ Valid invite acceptance
- ✅ Invalid/expired invite handling
- ✅ Already member detection
- ✅ Own invite prevention
- ✅ User authentication flow
  - Authenticated user can accept
  - Unauthenticated user redirected to login/register
- ✅ Database transaction (atomic join)
- ✅ Success/error states

**What's NOT Covered:**
- ⚠️ Email notifications
- ⚠️ Welcome messages
- ⚠️ Onboarding flow after acceptance

#### 6. Reading Progress
**Coverage Target: 80%**

**What's Covered:**
- ✅ User-specific progress (isolation bug fix verified)
- ✅ Progress updates
- ✅ Status transitions
  - to_read → reading
  - reading → read
- ✅ Automatic timestamps
  - started_at on first "reading"
  - finished_at on "read"
- ✅ Optimistic UI updates
- ✅ Cache invalidation

**What's NOT Covered:**
- ⚠️ Progress percentage calculation
- ⚠️ Reading time tracking
- ⚠️ Concurrent progress updates

### Non-Critical Paths (50-70% Coverage)

#### UI Components (60%)
- Basic rendering tests
- User interaction tests
- Form validation tests

#### Language/i18n (50%)
- Translation loading
- Language switching

#### Activity Feed (50%)
- Activity fetching
- Activity display

## Running Tests

### Local Development

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage

# Run specific test file
npm test src/hooks/useAuth.test.tsx
```

### Pre-Push Hook

Tests run automatically before every push:
```bash
# The hook runs:
# 1. npm run lint
# 2. npx tsc --noEmit
# 3. npm test

# Push will be blocked if any check fails
git push origin main
```

### CI/CD (GitHub Actions)

Tests run on every push to main/develop and every PR:
- Lint check
- TypeScript type check
- Full test suite
- Coverage report generation
- Build verification

## Test Utilities

### Creating Test Users

```typescript
import { createTestUser, signInTestUser, testUsers } from "@/test/fixtures/users";

// Create a new test user
const { user, error } = await createTestUser("owner");

// Sign in existing test user
const { user, error } = await signInTestUser("member");
```

### Database Cleanup

```typescript
import { cleanupTestData, cleanupTestUser } from "@/test/helpers/cleanup";

// After tests, cleanup
afterEach(async () => {
  await cleanupTestData();
  await cleanupTestUser();
});
```

### Test Wrappers

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
```

## Local Supabase Setup

### Prerequisites

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Start local Supabase
supabase start
```

### Configuration

Create `.env.test`:
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Test Isolation

Each test file:
1. Creates test data in `beforeEach`
2. Runs assertions
3. Cleans up in `afterEach`

Tests are designed to be independent and can run in any order.

## Coverage Reports

Coverage reports are generated in multiple formats:
- **Terminal**: Text summary after test run
- **HTML**: `coverage/index.html` - Open in browser for detailed view
- **JSON**: `coverage/coverage-final.json` - For CI integration

### Viewing Coverage

```bash
# After running tests with coverage
open coverage/index.html
```

## Common Issues

### Port Already in Use

If Supabase fails to start:
```bash
# Stop existing Supabase
supabase stop

# Or stop specific project
supabase stop --project-id <project-id>

# Then restart
supabase start
```

### Test Timeouts

If tests timeout:
```bash
# Increase timeout in vitest.config.ts
test: {
  testTimeout: 10000, // 10 seconds
}
```

### Database State

If tests fail due to database state:
```bash
# Reset Supabase (WARNING: Deletes all data)
supabase db reset

# Then restart
supabase start
```

## Adding New Tests

### Hook Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

describe("useNewHook", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should do something", async () => {
    const { result } = renderHook(() => useNewHook(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual(expectedValue);
  });
});
```

### Component Tests

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

describe("NewComponent", () => {
  it("renders correctly", () => {
    render(<NewComponent />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("handles user interaction", () => {
    render(<NewComponent />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Updated Text")).toBeInTheDocument();
  });
});
```

## Maintenance

### Updating Tests

When adding new features:
1. Add tests for the new feature
2. Ensure coverage doesn't drop below 80% for critical paths
3. Update this documentation

### Debugging Tests

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test
npm test -- --grep="should sign in"

# Debug with inspector
npm test -- --inspect-brk
```

## Questions?

See the test files for examples, or refer to:
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/docs/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
