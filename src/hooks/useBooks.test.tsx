import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isSupabaseReachable } from "@/test/helpers/supabase-check";

const supabaseAvailable = await isSupabaseReachable();
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBooks } from "./useBooks";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { LibraryProvider } from "@/contexts/LibraryContext";
import {
  signOutUser,
  testBooks,
} from "@/test/fixtures/users";
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

describe.skipIf(!supabaseAvailable)("useBooks", () => {
  beforeEach(async () => {
    await cleanupTestData();
    await signOutUser();
  });

  afterEach(async () => {
    await cleanupTestData();
    await signOutUser();
  });

  describe("fetching books", () => {
    it("should fetch books for a library", async () => {
      // First render useAuth to sign in through AuthContext
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for auth initialization
      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      // Generate unique email
      const testEmail = `test-fetch-${Date.now()}@test.local`;
      
      // Sign up through AuthContext
      await act(async () => {
        const { error } = await authResult.current.signUp(testEmail, "TestPass123!", "Test Owner");
        if (error && error.message !== "User already registered") {
          throw error;
        }
      });

      // Sign in through AuthContext
      await act(async () => {
        const { error } = await authResult.current.signIn(testEmail, "TestPass123!");
        expect(error).toBeNull();
      });

      // Wait for user to be set
      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const testUserId = authResult.current.user!.id;

      // Create library
      const { data: library, error: libError } = await supabase
        .from("libraries")
        .insert({
          name: "Test Personal Library",
          description: "A test library for personal use",
          is_public: false,
          allow_member_uploads: true,
          created_by: testUserId,
        })
        .select()
        .single();

      expect(libError).toBeNull();
      const testLibraryId = library!.id;
      // Note: auto_add_library_creator trigger already adds creator as admin member

      // Create a book
      await act(async () => {
        const { error } = await supabase
          .from("books")
          .insert({
            ...testBooks.book1,
            library_id: testLibraryId,
            owner_id: testUserId,
            file_url: "https://example.com/book.pdf",
            file_type: "application/pdf",
          });
        expect(error).toBeNull();
      });

      // Now render useBooks hook - it will see the authenticated user
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      // Wait for books to load
      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
      await waitFor(() => expect(result.current.books.length).toBe(1), { timeout: 5000 });

      expect(result.current.books[0].title).toBe(testBooks.book1.title);
    });

    it("should return empty array when no books", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const testEmail = `test-empty-${Date.now()}@test.local`;
      
      await act(async () => {
        await authResult.current.signUp(testEmail, "TestPass123!", "Test Owner");
      });

      await act(async () => {
        await authResult.current.signIn(testEmail, "TestPass123!");
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const testUserId = authResult.current.user!.id;

      const { data: library, error: libError } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: testUserId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      expect(libError).toBeNull();
      
      await supabase.from("library_members").insert({
        library_id: library!.id,
        user_id: testUserId,
        role: "admin",
      });

      const { result } = renderHook(() => useBooks(library!.id), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      expect(result.current.books).toHaveLength(0);
    });

    it("should respect pagination limit", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const testEmail = `test-page-${Date.now()}@test.local`;
      
      await act(async () => {
        await authResult.current.signUp(testEmail, "TestPass123!", "Test Owner");
      });

      await act(async () => {
        await authResult.current.signIn(testEmail, "TestPass123!");
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const testUserId = authResult.current.user!.id;

      const { data: library, error: libError } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: testUserId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      expect(libError).toBeNull();
      const testLibraryId = library!.id;

      await supabase.from("library_members").insert({
        library_id: testLibraryId,
        user_id: testUserId,
        role: "admin",
      });

      // Create 105 books
      const books = Array.from({ length: 105 }, (_, i) => ({
        title: `Book ${i}`,
        author: "Test Author",
        library_id: testLibraryId,
        owner_id: testUserId,
        file_url: "https://example.com/book.pdf",
        file_type: "application/pdf",
      }));

      await supabase.from("books").insert(books);

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });
      await waitFor(() => expect(result.current.books.length).toBeGreaterThan(0), { timeout: 5000 });

      expect(result.current.books.length).toBeLessThanOrEqual(100);
      expect(result.current.hasMore).toBe(true);
    });

    it("should load all books when requested", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const testEmail = `test-all-${Date.now()}@test.local`;
      
      await act(async () => {
        await authResult.current.signUp(testEmail, "TestPass123!", "Test Owner");
      });

      await act(async () => {
        await authResult.current.signIn(testEmail, "TestPass123!");
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const testUserId = authResult.current.user!.id;

      const { data: library, error: libError } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: testUserId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      expect(libError).toBeNull();
      const testLibraryId = library!.id;

      await supabase.from("library_members").insert({
        library_id: testLibraryId,
        user_id: testUserId,
        role: "admin",
      });

      // Create 105 books
      const books = Array.from({ length: 105 }, (_, i) => ({
        title: `Book ${i}`,
        author: "Test Author",
        library_id: testLibraryId,
        owner_id: testUserId,
        file_url: "https://example.com/book.pdf",
        file_type: "application/pdf",
      }));

      await supabase.from("books").insert(books);

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      await act(async () => {
        result.current.loadAllBooks();
      });

      await waitFor(() => expect(result.current.isLoadingAll).toBe(false), { timeout: 5000 });
      await waitFor(() => expect(result.current.books.length).toBe(105), { timeout: 5000 });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe("createBook", () => {
    it("should create a new book", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const testEmail = `test-create-${Date.now()}@test.local`;
      
      await act(async () => {
        await authResult.current.signUp(testEmail, "TestPass123!", "Test Owner");
      });

      await act(async () => {
        await authResult.current.signIn(testEmail, "TestPass123!");
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const testUserId = authResult.current.user!.id;

      const { data: library, error: libError } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: testUserId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      expect(libError).toBeNull();
      const testLibraryId = library!.id;

      await supabase.from("library_members").insert({
        library_id: testLibraryId,
        user_id: testUserId,
        role: "admin",
      });

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      let newBook: { title: string } | null = null;
      await act(async () => {
        newBook = await result.current.createBook.mutateAsync({
          title: testBooks.book1.title,
          author: testBooks.book1.author,
          description: testBooks.book1.description,
          year: testBooks.book1.year,
          library_id: testLibraryId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        });
      });

      expect(newBook.title).toBe(testBooks.book1.title);
      await waitFor(() => expect(result.current.books).toHaveLength(1));
    });

    it("should fail without authentication", async () => {
      await signOutUser();

      const { result } = renderHook(() => useBooks("test-lib-id"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      await expect(
        act(async () => {
          await result.current.createBook.mutateAsync({
            title: "Test Book",
            library_id: "test-lib-id",
            file_url: "https://example.com/book.pdf",
            file_type: "application/pdf",
          });
        })
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("updateBook", () => {
    it("should update book with optimistic UI", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const testEmail = `test-update-${Date.now()}@test.local`;
      
      await act(async () => {
        await authResult.current.signUp(testEmail, "TestPass123!", "Test Owner");
      });

      await act(async () => {
        await authResult.current.signIn(testEmail, "TestPass123!");
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const testUserId = authResult.current.user!.id;

      const { data: library, error: libError } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: testUserId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      expect(libError).toBeNull();
      const testLibraryId = library!.id;

      await supabase.from("library_members").insert({
        library_id: testLibraryId,
        user_id: testUserId,
        role: "admin",
      });

      // Create a book first
      const { data: book, error: bookError } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: testLibraryId,
          owner_id: testUserId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      expect(bookError).toBeNull();

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      // Wait for auth to load in new wrapper and books to be fetched
      await waitFor(() => expect(result.current.books.length).toBeGreaterThan(0), { timeout: 10000 });

      let updatedBook: { title: string } | null = null;
      await act(async () => {
        updatedBook = await result.current.updateBook.mutateAsync({
          id: book!.id,
          title: "Updated Title",
        });
      });

      expect(updatedBook.title).toBe("Updated Title");
      await waitFor(() => expect(result.current.books[0].title).toBe("Updated Title"));
    });
  });

  describe("deleteBook", () => {
    it("should delete book with optimistic UI", async () => {
      const { result: authResult } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(authResult.current.loading).toBe(false), { timeout: 5000 });

      const testEmail = `test-delete-${Date.now()}@test.local`;
      
      await act(async () => {
        await authResult.current.signUp(testEmail, "TestPass123!", "Test Owner");
      });

      await act(async () => {
        await authResult.current.signIn(testEmail, "TestPass123!");
      });

      await waitFor(() => expect(authResult.current.user).not.toBeNull(), { timeout: 5000 });
      const testUserId = authResult.current.user!.id;

      const { data: library, error: libError } = await supabase
        .from("libraries")
        .insert({
          name: "Test Library",
          created_by: testUserId,
          is_public: false,
          allow_member_uploads: true,
        })
        .select()
        .single();

      expect(libError).toBeNull();
      const testLibraryId = library!.id;

      await supabase.from("library_members").insert({
        library_id: testLibraryId,
        user_id: testUserId,
        role: "admin",
      });

      // Create a book first
      const { data: book, error: bookError } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: testLibraryId,
          owner_id: testUserId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      expect(bookError).toBeNull();

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      await act(async () => {
        await result.current.deleteBook.mutateAsync(book!.id);
      });

      await waitFor(() => expect(result.current.books).toHaveLength(0));
    });
  });
});
