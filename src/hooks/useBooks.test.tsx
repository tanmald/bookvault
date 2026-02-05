import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBooks } from "./useBooks";
import { AuthProvider } from "@/contexts/AuthContext";
import { LibraryProvider } from "@/contexts/LibraryContext";
import {
  createTestUser,
  signInTestUser,
  createTestLibrary,
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

describe("useBooks", () => {
  let testLibraryId: string;

  beforeEach(async () => {
    await cleanupTestData();
    
    // Create test user and library
    await createTestUser("owner");
    const { user } = await signInTestUser("owner");
    const { library } = await createTestLibrary("personal", user!.id);
    testLibraryId = library!.id;
  });

  afterEach(async () => {
    await cleanupTestData();
    await signOutUser();
  });

  describe("fetching books", () => {
    it("should fetch books for a library", async () => {
      // First create a book
      const { data: book } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: testLibraryId,
          owner_id: (await supabase.auth.getUser()).data.user!.id,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.books).toHaveLength(1);
      expect(result.current.books[0].title).toBe(testBooks.book1.title);
    });

    it("should return empty array when no books", async () => {
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.books).toHaveLength(0);
    });

    it("should respect pagination limit", async () => {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      const ownerId = user!.id;
      
      // Create more than 100 books
      const books = Array.from({ length: 105 }, (_, i) => ({
        title: `Book ${i}`,
        author: "Test Author",
        library_id: testLibraryId,
        owner_id: ownerId,
        file_url: "https://example.com/book.pdf",
        file_type: "application/pdf",
      }));

      await supabase.from("books").insert(books);

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should be limited to 100
      expect(result.current.books.length).toBeLessThanOrEqual(100);
      expect(result.current.hasMore).toBe(true);
    });

    it("should load all books when requested", async () => {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      const ownerId = user!.id;
      
      // Create 105 books
      const books = Array.from({ length: 105 }, (_, i) => ({
        title: `Book ${i}`,
        author: "Test Author",
        library_id: testLibraryId,
        owner_id: ownerId,
        file_url: "https://example.com/book.pdf",
        file_type: "application/pdf",
      }));

      await supabase.from("books").insert(books);

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Load all books
      result.current.loadAllBooks();

      await waitFor(() => expect(result.current.isLoadingAll).toBe(false));

      expect(result.current.books.length).toBe(105);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe("createBook", () => {
    it("should create a new book", async () => {
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const newBook = await result.current.createBook.mutateAsync({
        title: testBooks.book1.title,
        author: testBooks.book1.author,
        description: testBooks.book1.description,
        year: testBooks.book1.year,
        library_id: testLibraryId,
        file_url: "https://example.com/book.pdf",
        file_type: "application/pdf",
      });

      expect(newBook.title).toBe(testBooks.book1.title);
      expect(newBook.owner_id).toBe((await supabase.auth.getUser()).data.user!.id);

      // Should update the list
      await waitFor(() => expect(result.current.books).toHaveLength(1));
    });

    it("should fail without authentication", async () => {
      await signOutUser();

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await expect(
        result.current.createBook.mutateAsync({
          title: "Test Book",
          library_id: testLibraryId,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("updateBook", () => {
    it("should update book with optimistic UI", async () => {
      // Create a book first
      const { data: book } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: testLibraryId,
          owner_id: (await supabase.auth.getUser()).data.user!.id,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Update the book
      const updatedBook = await result.current.updateBook.mutateAsync({
        id: book!.id,
        title: "Updated Title",
      });

      expect(updatedBook.title).toBe("Updated Title");

      // Should update in list
      await waitFor(() => {
        expect(result.current.books[0].title).toBe("Updated Title");
      });
    });
  });

  describe("deleteBook", () => {
    it("should delete book with optimistic UI", async () => {
      // Create a book first
      const { data: book } = await supabase
        .from("books")
        .insert({
          ...testBooks.book1,
          library_id: testLibraryId,
          owner_id: (await supabase.auth.getUser()).data.user!.id,
          file_url: "https://example.com/book.pdf",
          file_type: "application/pdf",
        })
        .select()
        .single();

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Delete the book
      await result.current.deleteBook.mutateAsync(book!.id);

      // Should remove from list
      await waitFor(() => expect(result.current.books).toHaveLength(0));
    });
  });
});
