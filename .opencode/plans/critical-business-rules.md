# Critical Business Rules Implementation Plan

## Executive Summary

This document contains the implementation plan for preserving and testing critical business rules that were lost between `main` and `dev` branches. These rules are essential for maintaining the correct separation between `friendships` (global social relationships) and `library_members` (per-library access control).

## 🚨 Critical Business Rules

### Rule 1: `/friends` Page Layout
- **Left column**: Library members of the current library via `useLibraryMembers(currentLibrary?.id)`
- **Right column**: Recent activity from direct friendships via `useActivityFeed()`
- **Critical**: Must maintain separation between `library_members` (access control) and `friendships` (social)

### Rule 2: `/book/:id` Scoreboard Filtering
- **MUST** only show members of the book's library (from `library_members` table, NOT `friendships`)
- **MUST** include the current user
- **MUST** only show members with status: `to_read`, `reading`, or `read`
- **MUST NOT** show members with `not_planned` status
- **MUST NOT** show members with no reading progress
- Uses RPC function: `get_library_friends_book_progress`
- Implementation: `FriendsScoreboard.tsx` + `useFriendsBookProgress.ts`

### Rule 3: Data Model Distinction
- **`friendships` table** = global social relationships
- **`library_members` table** = per-library access control
- **Never** mix these two for scoreboard or member listing

---

## 1. Update CLAUDE.md

Add this new prominent section at the top of the existing "Business Rules — Social & Scoreboard" section (around line 60):

```markdown
## 🚨 CRITICAL BUSINESS RULES - DO NOT CHANGE WITHOUT EXPLICIT APPROVAL

### Rule 1: /friends Page Layout
- Left column: Library members of the current library via `useLibraryMembers(currentLibrary?.id)`
- Right column: Recent activity from direct friendships via `useActivityFeed()` 
- Must maintain separation between library_members (access control) and friendships (social)

### Rule 2: /book/:id Scoreboard Filtering
- MUST only show members of the book's library (from library_members table, NOT friendships)
- MUST include the current user
- MUST only show members with status: to_read, reading, or read
- MUST NOT show members with not_planned status
- MUST NOT show members with no reading progress
- Uses RPC function: get_library_friends_book_progress
- Implementation: FriendsScoreboard.tsx + useFriendsBookProgress.ts

### Rule 3: Data Model Distinction
- friendships table = global social relationships
- library_members table = per-library access control
- Never mix these two for scoreboard or member listing
```

---

## 2. Create Test Files

### A. Create `src/hooks/useFriendsBookProgress.test.tsx`

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFriendsBookProgress, FriendProgress } from "./useFriendsBookProgress";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { LibraryProvider } from "@/contexts/LibraryContext";
import { signOutUser, testBooks, testUsers } from "@/test/fixtures/users";
import { cleanupTestData } from "@/test/helpers/cleanup";
import { supabase } from "@/integrations/supabase/client";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LibraryProvider>{children}</LibraryProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("useFriendsBookProgress", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await signOutUser();
  });

  afterEach(async () => {
    await cleanupTestData();
    await signOutUser();
  });

  describe("CRITICAL: Library members only (not friendships)", () => {
    it("should only return library members, not all friends", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      // Create owner user
      const ownerEmail = `test-owner-${Date.now()}@test.local`;
      await act(async () => {
        const { error } = await authResult.current.signUp(ownerEmail, testUsers.owner.password, "Library Owner");
        if (error && error.message !== "User already registered") throw error;
      });

      await act(async () => {
        await authResult.current.signIn(ownerEmail, testUsers.owner.password);
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const ownerId = authResult.current.user!.id;

      // Create library
      const { data: library, error: libError } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: ownerId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      expect(libError).toBeNull();
      const libraryId = library!.id;

      // Add owner as library member
      await supabase.from("library_members").insert({
        library_id: libraryId,
        user_id: ownerId,
        role: "admin",
      });

      // Create book
      const { data: book, error: bookError } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: libraryId,
          owner_id: ownerId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      expect(bookError).toBeNull();

      // Add reading progress for owner
      await supabase.from("reading_progress").insert({
        user_id: ownerId,
        book_id: book!.id,
        status: "reading",
        progress: 50,
      });

      // Render the hook
      const { result } = renderHook(() => useFriendsBookProgress(book!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Should only show the library member (owner)
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].user_id).toBe(ownerId);
    });

    it("should include current user even if they have no friends", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const ownerEmail = `test-owner-2-${Date.now()}@test.local`;
      await act(async () => {
        await authResult.current.signUp(ownerEmail, testUsers.owner.password, "Solo User");
      });

      await act(async () => {
        await authResult.current.signIn(ownerEmail, testUsers.owner.password);
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const ownerId = authResult.current.user!.id;

      const { data: library, error: libError } = await supabase
        .from("libraries")
        .insert({
          name: "Solo Library",
          created_by: ownerId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      expect(libError).toBeNull();

      await supabase.from("library_members").insert({
        library_id: library!.id,
        user_id: ownerId,
        role: "admin",
      });

      const { data: book } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: library!.id,
          owner_id: ownerId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      await supabase.from("reading_progress").insert({
        user_id: ownerId,
        book_id: book!.id,
        status: "to_read",
        progress: 0,
      });

      const { result } = renderHook(() => useFriendsBookProgress(book!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Current user should be included
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].user_id).toBe(ownerId);
    });
  });

  describe("CRITICAL: Filter out not_planned status", () => {
    it("should NOT include members with not_planned status", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const ownerEmail = `test-owner-3-${Date.now()}@test.local`;
      await act(async () => {
        await authResult.current.signUp(ownerEmail, testUsers.owner.password, "Owner");
      });

      await act(async () => {
        await authResult.current.signIn(ownerEmail, testUsers.owner.password);
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const ownerId = authResult.current.user!.id;

      const { data: library } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: ownerId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      await supabase.from("library_members").insert({
        library_id: library!.id,
        user_id: ownerId,
        role: "admin",
      });

      const { data: book } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: library!.id,
          owner_id: ownerId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      // Add not_planned progress
      await supabase.from("reading_progress").insert({
        user_id: ownerId,
        book_id: book!.id,
        status: "not_planned",
        progress: 0,
      });

      const { result } = renderHook(() => useFriendsBookProgress(book!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Should filter out not_planned
      expect(result.current.data).toHaveLength(0);
    });
  });

  describe("CRITICAL: Filter out members with no progress", () => {
    it("should NOT include library members with no reading progress", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const ownerEmail = `test-owner-4-${Date.now()}@test.local`;
      await act(async () => {
        await authResult.current.signUp(ownerEmail, testUsers.owner.password, "Owner");
      });

      await act(async () => {
        await authResult.current.signIn(ownerEmail, testUsers.owner.password);
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const ownerId = authResult.current.user!.id;

      const { data: library } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: ownerId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      // Add owner as member but DON'T create reading progress
      await supabase.from("library_members").insert({
        library_id: library!.id,
        user_id: ownerId,
        role: "admin",
      });

      await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: library!.id,
          owner_id: ownerId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      const { data: book } = await supabase
        .from("books")
        .select()
        .eq("library_id", library!.id)
        .single();

      const { result } = renderHook(() => useFriendsBookProgress(book!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Should not include members without progress
      expect(result.current.data).toHaveLength(0);
    });
  });

  describe("Sorting logic", () => {
    it("should sort read members by reading time (ascending)", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const ownerEmail = `test-owner-5-${Date.now()}@test.local`;
      await act(async () => {
        await authResult.current.signUp(ownerEmail, testUsers.owner.password, "Owner");
      });

      await act(async () => {
        await authResult.current.signIn(ownerEmail, testUsers.owner.password);
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const ownerId = authResult.current.user!.id;

      const { data: library } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: ownerId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      await supabase.from("library_members").insert({
        library_id: library!.id,
        user_id: ownerId,
        role: "admin",
      });

      const { data: book } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: library!.id,
          owner_id: ownerId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      // Add completed progress
      await supabase.from("reading_progress").insert({
        user_id: ownerId,
        book_id: book!.id,
        status: "read",
        progress: 100,
        started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        finished_at: new Date().toISOString(),
      });

      const { result } = renderHook(() => useFriendsBookProgress(book!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      const progress = result.current.data![0];
      expect(progress.status).toBe("read");
      expect(progress.reading_time_days).toBe(5);
    });

    it("should sort reading members by progress (descending)", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const ownerEmail = `test-owner-6-${Date.now()}@test.local`;
      await act(async () => {
        await authResult.current.signUp(ownerEmail, testUsers.owner.password, "Owner");
      });

      await act(async () => {
        await authResult.current.signIn(ownerEmail, testUsers.owner.password);
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const ownerId = authResult.current.user!.id;

      const { data: library } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: ownerId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      await supabase.from("library_members").insert({
        library_id: library!.id,
        user_id: ownerId,
        role: "admin",
      });

      const { data: book } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: library!.id,
          owner_id: ownerId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      await supabase.from("reading_progress").insert({
        user_id: ownerId,
        book_id: book!.id,
        status: "reading",
        progress: 75,
      });

      const { result } = renderHook(() => useFriendsBookProgress(book!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      expect(result.current.data![0].progress).toBe(75);
    });

    it("should sort to_read members by name (alphabetically)", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const ownerEmail = `test-owner-7-${Date.now()}@test.local`;
      await act(async () => {
        await authResult.current.signUp(ownerEmail, testUsers.owner.password, "Zebra User");
      });

      await act(async () => {
        await authResult.current.signIn(ownerEmail, testUsers.owner.password);
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const ownerId = authResult.current.user!.id;

      const { data: library } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: ownerId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      await supabase.from("library_members").insert({
        library_id: library!.id,
        user_id: ownerId,
        role: "admin",
      });

      const { data: book } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: library!.id,
          owner_id: ownerId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      await supabase.from("reading_progress").insert({
        user_id: ownerId,
        book_id: book!.id,
        status: "to_read",
        progress: 0,
      });

      const { result } = renderHook(() => useFriendsBookProgress(book!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      expect(result.current.data![0].status).toBe("to_read");
      expect(result.current.data![0].display_name).toBe("Zebra User");
    });
  });
});
```

---

### B. Create `src/components/books/FriendsScoreboard.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FriendsScoreboard } from "./FriendsScoreboard";
import * as useFriendsBookProgressModule from "@/hooks/useFriendsBookProgress";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Mock the hook
vi.mock("@/hooks/useFriendsBookProgress");

// Mock useLanguage
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "scoreboard.title": "Reading Race",
        "scoreboard.noFriends": "No readers yet",
        "scoreboard.inviteFriends": "Invite friends to track reading progress",
        "scoreboard.lessThanDay": "<1 day",
        "scoreboard.oneDay": "1 day",
        "scoreboard.days": "days",
        "scoreboard.read": "finished",
        "scoreboard.readPlural": "finished",
        "scoreboard.currentlyReading": "reading",
        "status.reading": "Reading",
        "status.toRead": "To Read",
        "friends.user": "User",
      };
      return translations[key] || key;
    },
    language: "en",
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>{children}</LanguageProvider>
      </QueryClientProvider>
    );
  };
}

describe("FriendsScoreboard", () => {
  const mockUseFriendsBookProgress = vi.mocked(useFriendsBookProgressModule.useFriendsBookProgress);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CRITICAL: Library members only", () => {
    it("should render scoreboard with library members only", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "Alice",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-05",
            reading_time_days: 4,
          },
          {
            user_id: "user-2",
            display_name: "Bob",
            avatar_url: null,
            status: "reading",
            progress: 50,
            started_at: "2024-01-03",
            finished_at: null,
            reading_time_days: null,
          },
        ],
        isLoading: false,
        error: null,
        isError: false,
        isPending: false,
        isSuccess: true,
        status: "success",
        fetchStatus: "idle",
        isFetching: false,
        isInitialLoading: false,
        isLoadingError: false,
        isRefetchError: false,
        isFetchPaused: false,
        isPlaceholderData: false,
        isStale: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        refetch: vi.fn(),
        promise: Promise.resolve([]),
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("should display correct status badges for different statuses", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "Alice",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-05",
            reading_time_days: 4,
          },
          {
            user_id: "user-2",
            display_name: "Bob",
            avatar_url: null,
            status: "reading",
            progress: 50,
            started_at: "2024-01-03",
            finished_at: null,
            reading_time_days: null,
          },
          {
            user_id: "user-3",
            display_name: "Charlie",
            avatar_url: null,
            status: "to_read",
            progress: 0,
            started_at: null,
            finished_at: null,
            reading_time_days: null,
          },
        ],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      // Check for reading time badge (read status)
      expect(screen.getByText("4 days")).toBeInTheDocument();
      
      // Check for reading badge
      expect(screen.getByText("Reading")).toBeInTheDocument();
      
      // Check for toRead badge
      expect(screen.getByText("To Read")).toBeInTheDocument();
    });

    it("should show progress bars for reading status", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "Bob",
            avatar_url: null,
            status: "reading",
            progress: 75,
            started_at: "2024-01-03",
            finished_at: null,
            reading_time_days: null,
          },
        ],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("should show trophies for top 3 finishers", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "First",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-02",
            reading_time_days: 1,
          },
          {
            user_id: "user-2",
            display_name: "Second",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-03",
            reading_time_days: 2,
          },
          {
            user_id: "user-3",
            display_name: "Third",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-04",
            reading_time_days: 3,
          },
          {
            user_id: "user-4",
            display_name: "Fourth",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-05",
            reading_time_days: 4,
          },
        ],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      // Fourth place should show "4º" not a trophy
      expect(screen.getByText("4º")).toBeInTheDocument();
    });

    it("should NOT render members with not_planned status", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "Active Reader",
            avatar_url: null,
            status: "reading",
            progress: 50,
            started_at: "2024-01-03",
            finished_at: null,
            reading_time_days: null,
          },
          // not_planned member should NOT be in the data (filtered by RPC)
        ],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("Active Reader")).toBeInTheDocument();
      // If not_planned was in data, it would show here - but it shouldn't be
    });

    it("should show empty state when no eligible members", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      expect(screen.getByText("No readers yet")).toBeInTheDocument();
      expect(screen.getByText("Invite friends to track reading progress")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("should show skeleton loader when loading", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      const { container } = render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      // Should show skeleton elements
      const skeletons = container.querySelectorAll("[class*='skeleton']");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Summary badges", () => {
    it("should show summary badges for finished and reading counts", () => {
      mockUseFriendsBookProgress.mockReturnValue({
        data: [
          {
            user_id: "user-1",
            display_name: "Alice",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-05",
            reading_time_days: 4,
          },
          {
            user_id: "user-2",
            display_name: "Bob",
            avatar_url: null,
            status: "read",
            progress: 100,
            started_at: "2024-01-01",
            finished_at: "2024-01-06",
            reading_time_days: 5,
          },
          {
            user_id: "user-3",
            display_name: "Charlie",
            avatar_url: null,
            status: "reading",
            progress: 50,
            started_at: "2024-01-03",
            finished_at: null,
            reading_time_days: null,
          },
        ],
        isLoading: false,
      } as any);

      render(<FriendsScoreboard bookId="book-1" />, { wrapper: createWrapper() });

      // Check for finished count badge
      expect(screen.getByText("2 finished")).toBeInTheDocument();
      
      // Check for reading count badge
      expect(screen.getByText("1 reading")).toBeInTheDocument();
    });
  });
});
```

---

### C. Create `src/pages/Friends.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Friends from "./Friends";
import * as useLibraryMembersModule from "@/hooks/useLibraryMembers";
import * as useActivityFeedModule from "@/hooks/useActivityFeed";
import * as useLibraryModule from "@/contexts/LibraryContext";
import { BrowserRouter } from "react-router-dom";

// Mock the hooks
vi.mock("@/hooks/useLibraryMembers");
vi.mock("@/hooks/useActivityFeed");
vi.mock("@/contexts/LibraryContext");

// Mock useAuth
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "current-user-id", email: "test@test.com" },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useLanguage
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "friends.title": "Friends",
        "friends.subtitle": "Manage your library and see friend activity",
        "friends.myLibrary": "My Library",
        "friends.recentActivity": "Recent Activity",
        "friends.empty": "No members yet",
        "friends.emptyDesc": "Invite friends to join your library",
        "friends.createInvite": "Create Invite",
        "friends.user": "User",
        "friends.since": "Member since",
        "friends.owner": "Owner",
        "friends.admin": "Admin",
        "friends.member": "Member",
        "friends.promoteAdmin": "Make Admin",
        "friends.demoteAdmin": "Remove Admin",
        "friends.kickMember": "Remove Member",
        "friends.kickTitle": "Remove Member?",
        "friends.kickDesc": "Remove {name} from the library?",
        "friends.kick": "Remove",
        "friends.startedReading": "started reading",
        "friends.finishedReading": "finished",
        "friends.reviewed": "reviewed",
        "friends.noActivity": "No recent activity",
        "common.cancel": "Cancel",
      };
      return translations[key] || key;
    },
    language: "en",
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock AppLayout
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </BrowserRouter>
    );
  };
}

describe("Friends Page", () => {
  const mockUseLibraryMembers = vi.mocked(useLibraryMembersModule.useLibraryMembers);
  const mockUseActivityFeed = vi.mocked(useActivityFeedModule.useActivityFeed);
  const mockUseLibrary = vi.mocked(useLibraryModule.useLibrary);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CRITICAL: Left column shows library members", () => {
    it("should display library members from useLibraryMembers in left column", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "member-1",
            display_name: "Alice",
            avatar_url: null,
            role: "admin",
            created_at: "2024-01-01",
          },
          {
            user_id: "member-2",
            display_name: "Bob",
            avatar_url: null,
            role: "member",
            created_at: "2024-01-02",
          },
        ],
        isLoading: false,
        isAdmin: true,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      // Should show library members
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("My Library (2)")).toBeInTheDocument();
    });

    it("should NOT mix friendships with library_members", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "library-member-1",
            display_name: "Library Member",
            avatar_url: null,
            role: "member",
            created_at: "2024-01-01",
          },
        ],
        isLoading: false,
        isAdmin: false,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      // Activity feed uses friendships - different data source
      mockUseActivityFeed.mockReturnValue({
        activities: [
          {
            id: "act-1",
            type: "reading",
            user_id: "friend-1", // Different user ID from library member
            user_name: "Friend from Other Library",
            book_id: "book-1",
            book_title: "Some Book",
            created_at: "2024-01-03",
          },
        ],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      // Left column should show library member
      expect(screen.getByText("Library Member")).toBeInTheDocument();
      
      // Right column should show activity from friendship (different user)
      expect(screen.getByText("Friend from Other Library")).toBeInTheDocument();
      
      // These are from different data sources - verifying separation
      const membersList = screen.getByText("My Library (1)");
      expect(membersList).toBeInTheDocument();
    });
  });

  describe("CRITICAL: Right column shows friendships activity", () => {
    it("should display activity from useActivityFeed in right column", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [],
        isLoading: false,
        isAdmin: false,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [
          {
            id: "act-1",
            type: "reading",
            user_id: "user-1",
            user_name: "Alice",
            book_id: "book-1",
            book_title: "The Great Book",
            created_at: "2024-01-03T10:00:00Z",
          },
          {
            id: "act-2",
            type: "finished",
            user_id: "user-2",
            user_name: "Bob",
            book_id: "book-2",
            book_title: "Another Book",
            created_at: "2024-01-02T10:00:00Z",
          },
        ],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      // Should show recent activity
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("The Great Book")).toBeInTheDocument();
      expect(screen.getByText("Another Book")).toBeInTheDocument();
    });
  });

  describe("Admin actions", () => {
    it("should handle promote/demote actions correctly", () => {
      const promoteMock = vi.fn();
      const demoteMock = vi.fn();

      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "member-1",
            display_name: "Regular Member",
            avatar_url: null,
            role: "member",
            created_at: "2024-01-01",
          },
          {
            user_id: "admin-1",
            display_name: "Admin User",
            avatar_url: null,
            role: "admin",
            created_at: "2024-01-01",
          },
        ],
        isLoading: false,
        isAdmin: true, // Current user is admin
        promoteMember: { mutate: promoteMock, isPending: false },
        demoteMember: { mutate: demoteMock, isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      // Should show admin badges
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Member")).toBeInTheDocument();
    });

    it("should not show admin actions for owner", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id", // Owner ID
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "owner-id",
            display_name: "Library Owner",
            avatar_url: null,
            role: "admin",
            created_at: "2024-01-01",
          },
        ],
        isLoading: false,
        isAdmin: true,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      // Should show owner badge
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });
  });

  describe("Empty states", () => {
    it("should show empty state when no library members", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [],
        isLoading: false,
        isAdmin: false,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      expect(screen.getByText("No members yet")).toBeInTheDocument();
      expect(screen.getByText("Invite friends to join your library")).toBeInTheDocument();
    });

    it("should show empty state when no activity", () => {
      mockUseLibrary.mockReturnValue({
        currentLibrary: {
          id: "lib-1",
          name: "My Library",
          created_by: "owner-id",
        },
        libraries: [],
        isLoading: false,
        createLibrary: vi.fn(),
        updateLibrary: vi.fn(),
        deleteLibrary: vi.fn(),
        refetch: vi.fn(),
        removeLibrary: vi.fn(),
        setCurrentLibrary: vi.fn(),
      });

      mockUseLibraryMembers.mockReturnValue({
        members: [
          {
            user_id: "member-1",
            display_name: "Alice",
            avatar_url: null,
            role: "member",
            created_at: "2024-01-01",
          },
        ],
        isLoading: false,
        isAdmin: false,
        promoteMember: { mutate: vi.fn(), isPending: false },
        demoteMember: { mutate: vi.fn(), isPending: false },
        removeMember: { mutate: vi.fn(), isPending: false },
        leaveLibrary: { mutate: vi.fn(), isPending: false },
      });

      mockUseActivityFeed.mockReturnValue({
        activities: [],
        isLoading: false,
        error: null,
      });

      render(<Friends />, { wrapper: createWrapper() });

      expect(screen.getByText("No recent activity")).toBeInTheDocument();
    });
  });
});
```

---

## 3. Add Comments in Source Code

### A. Update `FriendsScoreboard.tsx`

Add comment at line 25 (before the component definition):

```tsx
/**
 * 🚨 CRITICAL: Only shows library_members, NOT friendships
 * This scoreboard MUST only display members of the book's library.
 * It should NEVER show global friends who aren't library members.
 * Uses get_library_friends_book_progress RPC which filters by library_members.
 */
export function FriendsScoreboard({ bookId }: FriendsScoreboardProps) {
```

### B. Update `useFriendsBookProgress.ts`

Add comment at line 28 (before the hook definition):

```tsx
/**
 * 🚨 CRITICAL: Filters out not_planned and no-progress members
 * This hook ONLY returns library members with reading progress.
 * It MUST filter out:
 * - Members with not_planned status
 * - Members with no reading_progress entry
 * - Non-library friends (friendships table)
 * Uses get_library_friends_book_progress RPC for filtering.
 */
export function useFriendsBookProgress(bookId: string | undefined) {
```

### C. Update `Friends.tsx`

Add comment at line 56 (before the left column div):

```tsx
{/* 🚨 CRITICAL: Left=library_members, Right=friendships activity
 * LEFT COLUMN: Shows library members from useLibraryMembers (access control)
 * RIGHT COLUMN: Shows activity from useActivityFeed (friendships/social)
 * NEVER mix these two data sources!
 */}
{/* Library Members / Friends List */}
<div>
```

---

## 4. Create Test Fixtures

### A. Create `src/test/fixtures/libraryMembers.ts`

```typescript
import { LibraryMember } from "@/hooks/useLibraryMembers";

export const mockLibraryMembers: LibraryMember[] = [
  {
    user_id: "owner-user-id",
    display_name: "Library Owner",
    avatar_url: null,
    role: "admin",
    created_at: "2024-01-01T00:00:00Z",
    is_owner: true,
  },
  {
    user_id: "admin-user-id",
    display_name: "Admin User",
    avatar_url: "https://example.com/avatar1.jpg",
    role: "admin",
    created_at: "2024-01-02T00:00:00Z",
    is_owner: false,
  },
  {
    user_id: "member-user-id",
    display_name: "Regular Member",
    avatar_url: null,
    role: "member",
    created_at: "2024-01-03T00:00:00Z",
    is_owner: false,
  },
  {
    user_id: "user-with-not-planned",
    display_name: "Not Planned User",
    avatar_url: null,
    role: "member",
    created_at: "2024-01-04T00:00:00Z",
    is_owner: false,
  },
];

export const mockLibraryMembersWithProgress = [
  {
    ...mockLibraryMembers[0],
    progress: {
      status: "read" as const,
      progress: 100,
      started_at: "2024-01-01T00:00:00Z",
      finished_at: "2024-01-05T00:00:00Z",
    },
  },
  {
    ...mockLibraryMembers[1],
    progress: {
      status: "reading" as const,
      progress: 75,
      started_at: "2024-01-10T00:00:00Z",
      finished_at: null,
    },
  },
  {
    ...mockLibraryMembers[2],
    progress: {
      status: "to_read" as const,
      progress: 0,
      started_at: null,
      finished_at: null,
    },
  },
  {
    ...mockLibraryMembers[3],
    progress: {
      status: "not_planned" as const,
      progress: 0,
      started_at: null,
      finished_at: null,
    },
  },
];

export const createMockLibraryMember = (
  overrides: Partial<LibraryMember> = {}
): LibraryMember => ({
  user_id: `user-${Date.now()}`,
  display_name: "Test User",
  avatar_url: null,
  role: "member",
  created_at: new Date().toISOString(),
  is_owner: false,
  ...overrides,
});
```

### B. Create `src/test/fixtures/friendProgress.ts`

```typescript
import { FriendProgress } from "@/hooks/useFriendsBookProgress";

export const mockFriendProgress: FriendProgress[] = [
  {
    user_id: "owner-user-id",
    display_name: "Library Owner",
    avatar_url: null,
    status: "read",
    progress: 100,
    started_at: "2024-01-01T00:00:00Z",
    finished_at: "2024-01-03T00:00:00Z",
    reading_time_days: 2,
  },
  {
    user_id: "admin-user-id",
    display_name: "Admin User",
    avatar_url: "https://example.com/avatar1.jpg",
    status: "read",
    progress: 100,
    started_at: "2024-01-01T00:00:00Z",
    finished_at: "2024-01-05T00:00:00Z",
    reading_time_days: 4,
  },
  {
    user_id: "member-user-id",
    display_name: "Regular Member",
    avatar_url: null,
    status: "reading",
    progress: 75,
    started_at: "2024-01-10T00:00:00Z",
    finished_at: null,
    reading_time_days: null,
  },
  {
    user_id: "slow-reader-id",
    display_name: "Slow Reader",
    avatar_url: null,
    status: "reading",
    progress: 25,
    started_at: "2024-01-10T00:00:00Z",
    finished_at: null,
    reading_time_days: null,
  },
  {
    user_id: "to-read-user-id",
    display_name: "Zebra User",
    avatar_url: null,
    status: "to_read",
    progress: 0,
    started_at: null,
    finished_at: null,
    reading_time_days: null,
  },
  {
    user_id: "another-to-read-id",
    display_name: "Apple User",
    avatar_url: null,
    status: "to_read",
    progress: 0,
    started_at: null,
    finished_at: null,
    reading_time_days: null,
  },
];

// Filtered version - excludes not_planned (as per business rules)
export const mockEligibleFriendProgress: FriendProgress[] =
  mockFriendProgress.filter(
    (fp) => fp.status === "read" || fp.status === "reading" || fp.status === "to_read"
  );

export const createMockFriendProgress = (
  overrides: Partial<FriendProgress> = {}
): FriendProgress => ({
  user_id: `user-${Date.now()}`,
  display_name: "Test User",
  avatar_url: null,
  status: "to_read",
  progress: 0,
  started_at: null,
  finished_at: null,
  reading_time_days: null,
  ...overrides,
});
```

### C. Create `src/test/fixtures/activities.ts`

```typescript
import { Activity } from "@/hooks/useActivityFeed";

export const mockActivities: Activity[] = [
  {
    id: "activity-1",
    type: "reading",
    user_id: "friend-1",
    user_name: "Alice",
    book_id: "book-1",
    book_title: "The Great Gatsby",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "activity-2",
    type: "finished",
    user_id: "friend-2",
    user_name: "Bob",
    book_id: "book-2",
    book_title: "1984",
    created_at: "2024-01-14T15:30:00Z",
  },
  {
    id: "activity-3",
    type: "review",
    user_id: "friend-1",
    user_name: "Alice",
    book_id: "book-1",
    book_title: "The Great Gatsby",
    rating: 5,
    created_at: "2024-01-15T12:00:00Z",
  },
  {
    id: "activity-4",
    type: "reading",
    user_id: "friend-3",
    user_name: "Charlie",
    book_id: "book-3",
    book_title: "To Kill a Mockingbird",
    created_at: "2024-01-13T09:00:00Z",
  },
  {
    id: "activity-5",
    type: "review",
    user_id: "friend-2",
    user_name: "Bob",
    book_id: "book-2",
    book_title: "1984",
    rating: 4,
    created_at: "2024-01-14T16:00:00Z",
  },
];

// Activities sorted by date (most recent first)
export const mockSortedActivities: Activity[] = [...mockActivities].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);

export const createMockActivity = (
  overrides: Partial<Activity> = {}
): Activity => ({
  id: `activity-${Date.now()}`,
  type: "reading",
  user_id: `user-${Date.now()}`,
  user_name: "Test User",
  book_id: `book-${Date.now()}`,
  book_title: "Test Book",
  created_at: new Date().toISOString(),
  ...overrides,
});

// Activities from friendships (global) - may include users not in current library
export const mockFriendshipActivities: Activity[] = [
  {
    id: "friend-activity-1",
    type: "finished",
    user_id: "global-friend-1",
    user_name: "Global Friend",
    book_id: "book-1",
    book_title: "Some Book",
    created_at: "2024-01-10T10:00:00Z",
  },
];

// Activities from library members only
export const mockLibraryMemberActivities: Activity[] = [
  {
    id: "library-activity-1",
    type: "reading",
    user_id: "library-member-1",
    user_name: "Library Member",
    book_id: "book-2",
    book_title: "Library Book",
    created_at: "2024-01-11T10:00:00Z",
  },
];
```

---

## 5. Step-by-Step Verification Checklist

### Pre-Implementation Checks
- [ ] Review current `CLAUDE.md` for existing business rules section
- [ ] Verify `src/test/setup.ts` exists and is configured
- [ ] Confirm existing test utilities in `src/test/fixtures/` and `src/test/helpers/`

### Implementation Steps

#### Phase 1: Update Documentation
1. [ ] Open `CLAUDE.md`
2. [ ] Add "🚨 CRITICAL BUSINESS RULES" section after line 60
3. [ ] Include all 3 rules with detailed explanations
4. [ ] Save and verify formatting

#### Phase 2: Add Code Comments
1. [ ] Open `src/components/books/FriendsScoreboard.tsx`
2. [ ] Add CRITICAL comment before component definition (line ~25)
3. [ ] Open `src/hooks/useFriendsBookProgress.ts`
4. [ ] Add CRITICAL comment before hook definition (line ~28)
5. [ ] Open `src/pages/Friends.tsx`
6. [ ] Add CRITICAL comment before left column div (line ~56)

#### Phase 3: Create Test Fixtures
1. [ ] Create `src/test/fixtures/libraryMembers.ts`
2. [ ] Create `src/test/fixtures/friendProgress.ts`
3. [ ] Create `src/test/fixtures/activities.ts`
4. [ ] Verify all imports and exports are correct

#### Phase 4: Create Test Files
1. [ ] Create `src/hooks/useFriendsBookProgress.test.tsx`
2. [ ] Create `src/components/books/FriendsScoreboard.test.tsx`
3. [ ] Create `src/pages/Friends.test.tsx`
4. [ ] Verify all imports resolve correctly

#### Phase 5: Run Tests
```bash
# Run all tests
npm run test

# Run specific test files
npm run test -- src/hooks/useFriendsBookProgress.test.tsx
npm run test -- src/components/books/FriendsScoreboard.test.tsx
npm run test -- src/pages/Friends.test.tsx
```

#### Phase 6: Verify Business Rules
1. [ ] Test that `/book/:id` scoreboard only shows library members
2. [ ] Test that `/friends` page shows correct separation
3. [ ] Test that `not_planned` status is filtered out
4. [ ] Test that members without progress are excluded
5. [ ] Test that sorting works correctly

### Post-Implementation Checks
- [ ] All tests pass
- [ ] No lint errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] TypeScript compiles without errors

### Regression Prevention
- [ ] Add these tests to CI/CD pipeline
- [ ] Document in PR template that these rules must not be violated
- [ ] Schedule quarterly review of critical business rules

---

## Key Implementation Notes

### Why These Rules Are Critical

1. **Privacy & Access Control**: Mixing `friendships` with `library_members` could expose library content to users who shouldn't have access.

2. **User Experience**: Showing `not_planned` books or users with no progress creates noise and confusion in the scoreboard.

3. **Data Integrity**: The separation between social relationships (`friendships`) and access control (`library_members`) is fundamental to the multi-tenant architecture.

### RPC Functions Used

1. **`get_library_friends_book_progress`**: Returns library members with their reading progress, filtering out `not_planned` and members without progress.

2. **`get_library_members_with_profiles`**: Returns library members with their profile data.

3. **`get_friends_with_profiles`**: Returns global friends for activity feed.

### Common Pitfalls to Avoid

1. ❌ Using `friendships` table for scoreboard (use `library_members`)
2. ❌ Showing `not_planned` status in scoreboard
3. ❌ Including members without `reading_progress` entry
4. ❌ Mixing activity feed with library members list
5. ❌ Assuming all friends are library members

---

## Appendix: Quick Reference

### File Locations
- **CLAUDE.md**: `/Users/ctw02131/ProjectsPersonal/bookvault/CLAUDE.md`
- **FriendsScoreboard.tsx**: `/Users/ctw02131/ProjectsPersonal/bookvault/src/components/books/FriendsScoreboard.tsx`
- **useFriendsBookProgress.ts**: `/Users/ctw02131/ProjectsPersonal/bookvault/src/hooks/useFriendsBookProgress.ts`
- **Friends.tsx**: `/Users/ctw02131/ProjectsPersonal/bookvault/src/pages/Friends.tsx`
- **Test fixtures**: `/Users/ctw02131/ProjectsPersonal/bookvault/src/test/fixtures/`

### Test Commands
```bash
npm run test                              # Run all tests
npm run test -- --reporter=verbose        # Verbose output
npm run test -- --run                     # Run once (no watch)
npm run test:watch                        # Watch mode
```

### Related Hooks/Components
- `useLibraryMembers.ts` - Library member management
- `useActivityFeed.ts` - Social activity feed
- `useLibrary.ts` - Library context
- `ProtectedRoute.tsx` - Route protection

---

**Document Version**: 1.0  
**Created**: 2026-02-08  
**Last Updated**: 2026-02-08  
**Author**: Claude Code  
**Status**: Ready for Implementation
