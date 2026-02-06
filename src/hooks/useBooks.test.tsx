import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
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

// Helper to setup test user and library within a test
async function setupTestUserAndLibrary(email: string) {
  // Create test user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password: "TestPass123!",
    options: {
      data: {
        display_name: "Test Owner",
      },
    },
  });

  let userId: string;
  if (signUpError) {
    // User might already exist, try signing in
    const { data: signInData } = await supabase.auth.signInWithPassword({
      email,
      password: "TestPass123!",
    });
    userId = signInData.user!.id;
  } else {
    userId = signUpData.user!.id;
  }
  
  // Create test library
  const { data: library, error: libError } = await supabase
    .from("libraries")
    .insert({
      name: "Test Personal Library",
      description: "A test library for personal use",
      is_public: false,
      allow_member_uploads: true,
      created_by: userId,
    })
    .select()
    .single();

  if (libError) throw libError;
  
  // Add user as library member (required for RLS policies)
  const { error: memberError } = await supabase
    .from("library_members")
    .insert({
      library_id: library!.id,
      user_id: userId,
      role: "admin",
    });
  
  if (memberError) throw memberError;
  
  return { userId, libraryId: library!.id };
}

describe("useBooks", () => {
  let testLibraryId: string;
  let testUserId: string;
  let testEmail: string;

  beforeEach(async () => {
    await cleanupTestData();
    await signOutUser();
    
    // Generate unique email for this test
    testEmail = `test-owner-${Date.now()}@test.local`;
  });

  afterEach(async () => {
    await cleanupTestData();
    await signOutUser();
  });

  describe("fetching books", () => {
    it("should fetch books for a library", async () => {
      // Setup user and library first
      const { userId, libraryId } = await setupTestUserAndLibrary(`test-fetch-${Date.now()}@test.local`);
      testUserId = userId;
      testLibraryId = libraryId;

      // Create a book directly
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

      // Now render the hook with the library ID
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      expect(result.current.books).toHaveLength(1);
      expect(result.current.books[0].title).toBe(testBooks.book1.title);
    });

    it("should return empty array when no books", async () => {
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      // Setup user and library
      const { userId, libraryId } = await setupTestUserAndLibrary(`test-empty-${Date.now()}@test.local`);
      testUserId = userId;
      testLibraryId = libraryId;

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      expect(result.current.books).toHaveLength(0);
    });

    it("should respect pagination limit", async () => {
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      // Setup user and library
      const { userId, libraryId } = await setupTestUserAndLibrary(`test-page-${Date.now()}@test.local`);
      testUserId = userId;
      testLibraryId = libraryId;

      // Wait for auth to be ready
      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Create more than 100 books
      const books = Array.from({ length: 105 }, (_, i) => ({
        title: `Book ${i}`,
        author: "Test Author",
        library_id: testLibraryId,
        owner_id: testUserId,
        file_url: "https://example.com/book.pdf",
        file_type: "application/pdf",
      }));

      await act(async () => {
        const { error } = await supabase.from("books").insert(books);
        expect(error).toBeNull();
      });

      // Refetch to get the new books
      await act(async () => {
        await result.current.refetch();
      });

      // Should be limited to 100
      expect(result.current.books.length).toBeLessThanOrEqual(100);
      expect(result.current.hasMore).toBe(true);
    });

    it("should load all books when requested", async () => {
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      // Setup user and library
      const { userId, libraryId } = await setupTestUserAndLibrary(`test-all-${Date.now()}@test.local`);
      testUserId = userId;
      testLibraryId = libraryId;

      // Create 105 books
      const books = Array.from({ length: 105 }, (_, i) => ({
        title: `Book ${i}`,
        author: "Test Author",
        library_id: testLibraryId,
        owner_id: testUserId,
        file_url: "https://example.com/book.pdf",
        file_type: "application/pdf",
      }));

      await act(async () => {
        const { error } = await supabase.from("books").insert(books);
        expect(error).toBeNull();
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Load all books
      await act(async () => {
        result.current.loadAllBooks();
      });

      await waitFor(() => expect(result.current.isLoadingAll).toBe(false), { timeout: 5000 });

      expect(result.current.books.length).toBe(105);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe("createBook", () => {
    it("should create a new book", async () => {
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      // Setup user and library
      const { userId, libraryId } = await setupTestUserAndLibrary(`test-create-${Date.now()}@test.local`);
      testUserId = userId;
      testLibraryId = libraryId;

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      let newBook: any;
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

      // Should update the list
      await waitFor(() => expect(result.current.books).toHaveLength(1));
    });

    it("should fail without authentication", async () => {
      await signOutUser();

      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      await expect(
        act(async () => {
          await result.current.createBook.mutateAsync({
            title: "Test Book",
            library_id: testLibraryId,
            file_url: "https://example.com/book.pdf",
            file_type: "application/pdf",
          });
        })
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("updateBook", () => {
    it("should update book with optimistic UI", async () => {
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      // Setup user and library
      const { userId, libraryId } = await setupTestUserAndLibrary(`test-update-${Date.now()}@test.local`);
      testUserId = userId;
      testLibraryId = libraryId;

      // Create a book first
      let bookId: string;
      await act(async () => {
        const { data, error } = await supabase
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
        
        expect(error).toBeNull();
        bookId = data!.id;
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Update the book
      let updatedBook: any;
      await act(async () => {
        updatedBook = await result.current.updateBook.mutateAsync({
          id: bookId!,
          title: "Updated Title",
        });
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
      const { result } = renderHook(() => useBooks(testLibraryId), {
        wrapper: createWrapper(),
      });

      // Setup user and library
      const { userId, libraryId } = await setupTestUserAndLibrary(`test-delete-${Date.now()}@test.local`);
      testUserId = userId;
      testLibraryId = libraryId;

      // Create a book first
      let bookId: string;
      await act(async () => {
        const { data, error } = await supabase
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
        
        expect(error).toBeNull();
        bookId = data!.id;
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 5000 });

      // Delete the book
      await act(async () => {
        await result.current.deleteBook.mutateAsync(bookId!);
      });

      // Should remove from list
      await waitFor(() => expect(result.current.books).toHaveLength(0));
    });
  });
});
