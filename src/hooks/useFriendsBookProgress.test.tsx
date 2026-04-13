import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFriendsBookProgress } from "./useFriendsBookProgress";
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

      await supabase.from("library_members").insert({
        library_id: libraryId,
        user_id: ownerId,
        role: "admin",
      });

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

      await supabase.from("reading_progress").insert({
        user_id: ownerId,
        book_id: book!.id,
        status: "reading",
        progress: 50,
      });

      const { result } = renderHook(() => useFriendsBookProgress(book!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.status).toBe('success'), { timeout: 10000 });

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

      await waitFor(() => expect(result.current.status).toBe('success'), { timeout: 10000 });

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

      await supabase.from("reading_progress").insert({
        user_id: ownerId,
        book_id: book!.id,
        status: "not_planned",
        progress: 0,
      });

      const { result } = renderHook(() => useFriendsBookProgress(book!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.status).toBe('success'), { timeout: 10000 });

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

      await waitFor(() => expect(result.current.status).toBe('success'), { timeout: 10000 });

      expect(result.current.data).toHaveLength(0);
    });
  });
});
