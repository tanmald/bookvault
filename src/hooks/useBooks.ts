import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import posthog from '@/lib/posthog';

const INITIAL_BOOKS_LIMIT = 100;

// Re-export from languages lib for backward compatibility
export { SUPPORTED_LANGUAGES, getLanguageName } from '@/lib/languages';
export type { LanguageCode } from '@/lib/languages';

export interface BookFile {
  id: string;
  book_id: string;
  language: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

export interface Book {
  id: string;
  owner_id: string;
  library_id: string;
  title: string;
  author: string | null;
  description: string | null;
  genre_id: string | null;
  year: number | null;
  isbn: string | null;
  cover_url: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  series_name: string | null;
  series_position: number | null;
  created_at: string;
  updated_at: string;
  genre?: { id: string; name: string; slug: string } | null;
  book_files?: BookFile[];
}

export interface CreateBookInput {
  title: string;
  author?: string;
  description?: string;
  genre_id?: string;
  year?: number;
  isbn?: string;
  cover_url?: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  language?: string;
  library_id: string;
  series_name?: string;
  series_position?: number;
}

export interface AddBookFileInput {
  book_id: string;
  language: string;
  file_url: string;
  file_type: string;
  file_size?: number;
}

export function useBooks(libraryId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [loadAll, setLoadAll] = useState(false);

  const booksQuery = useQuery({
    queryKey: ['books', user?.id, libraryId, loadAll],
    queryFn: async () => {
      let query = supabase
        .from('books')
        .select(`
          *,
          genre:genres(id, name, slug),
          book_files(id, book_id, language, file_url, file_type, file_size, created_at)
        `);

      // Filter by library if provided
      if (libraryId) {
        query = query.eq('library_id', libraryId);
      }

      query = query.order('created_at', { ascending: false});

      // Only apply limit if not loading all
      if (!loadAll) {
        query = query.limit(INITIAL_BOOKS_LIMIT + 1); // +1 to check if there are more
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Book[];
    },
    enabled: !!user,
  });

  // Check if there are more books beyond the initial limit
  const hasMore = !loadAll && (booksQuery.data?.length ?? 0) > INITIAL_BOOKS_LIMIT;

  // Return only the limited books if not loading all
  const books = hasMore
    ? booksQuery.data?.slice(0, INITIAL_BOOKS_LIMIT) ?? []
    : booksQuery.data ?? [];

  const createBook = useMutation({
    mutationFn: async (input: CreateBookInput) => {
      if (!user) throw new Error('Not authenticated');

      const { language = 'pt', file_url, file_type, file_size, library_id, ...bookData } = input;

      // Create the book record (without file columns - they're now deprecated)
      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          owner_id: user.id,
          library_id,
          ...bookData,
          isbn: input.isbn,
          // Keep file_url and file_type for backward compatibility
          file_url,
          file_type,
          file_size,
        })
        .select(`
          *,
          genre:genres(id, name, slug)
        `)
        .single();

      if (bookError) throw bookError;

      // Create the book file record only if a file was provided
      if (file_url && file_type) {
        const { error: fileError } = await supabase
          .from('book_files')
          .insert({
            book_id: book.id,
            language,
            file_url,
            file_type,
            file_size,
          });

        if (fileError) {
          console.error('Error creating book file:', fileError);
          // Warn user but don't fail - the book was created successfully
          toast({
            variant: 'destructive',
            title: t('toast.books.fileWarningTitle'),
            description: t('toast.books.fileWarningDesc'),
          });
        }
      }

      return book as Book;
    },
    onSuccess: (book) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: t('toast.books.added') });
      posthog.capture('book created', {
        book_id: book.id,
        title: book.title,
        author: book.author,
        file_type: book.file_type,
        genre_id: book.genre_id,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: t('toast.books.addError'),
        description: error.message,
      });
      posthog.captureException(error);
    },
  });

  const addBookFile = useMutation({
    mutationFn: async (input: AddBookFileInput) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('book_files')
        .insert({
          book_id: input.book_id,
          language: input.language,
          file_url: input.file_url,
          file_type: input.file_type,
          file_size: input.file_size,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BookFile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: t('toast.books.versionAdded') });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: t('toast.books.versionAddError'),
        description: error.message,
      });
    },
  });

  const deleteBookFile = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from('book_files')
        .delete()
        .eq('id', fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: t('toast.books.versionRemoved') });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: t('toast.books.versionRemoveError'),
        description: error.message,
      });
    },
  });

  const updateBook = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Book> & { id: string }) => {
      const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select('*, genre:genres(id, name, slug), book_files(id, book_id, language, file_url, file_type, file_size, created_at)')
        .maybeSingle();

      if (error) throw error;
      return data as Book;
    },
    onMutate: async ({ id, ...updates }) => {
      // Capture query key values at mutation start to ensure consistency
      const queryKey = ['books', user?.id, libraryId, loadAll] as const;
      
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['books'] });

      // Snapshot the previous value for rollback
      const previousBooks = queryClient.getQueryData<Book[]>(queryKey);

      // Optimistically update ALL book caches
      queryClient.setQueriesData<Book[]>(
        { queryKey: ['books'] },
        (old) => {
          if (!old) return old;
          return old.map((book) => (book.id === id ? { ...book, ...updates } : book));
        }
      );

      return { previousBooks, queryKey };
    },
    onSuccess: (data, _variables, context) => {
      // Update ALL book caches, not just the specific one
      // This ensures the library list and book details page stay in sync
      if (data) {
        queryClient.setQueriesData<Book[]>(
          { queryKey: ['books'] },
          (old) => {
            if (!old) return old;
            return old.map((book) => (book.id === data.id ? data : book));
          }
        );
      }

      toast({ title: t('toast.books.updated') });
    },
    onError: (error, _variables, context) => {
      // Rollback to previous value on error using captured queryKey
      if (context?.previousBooks && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousBooks);
      }
      // Also invalidate all book caches to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({
        variant: 'destructive',
        title: t('toast.books.updateError'),
        description: error.message,
      });
    },
  });

  const deleteBook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['books'] });

      // Snapshot the previous value
      const previousBooks = queryClient.getQueryData<Book[]>(['books', user?.id, libraryId, loadAll]);

      // Optimistically remove the book from cache
      if (previousBooks) {
        queryClient.setQueryData<Book[]>(['books', user?.id, libraryId, loadAll], (old) =>
          old?.filter((book) => book.id !== id)
        );
      }

      return { previousBooks };
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: t('toast.books.removed') });
      posthog.capture('book deleted', { book_id: id });
    },
    onError: (error, _id, context) => {
      // Rollback on error
      if (context?.previousBooks) {
        queryClient.setQueryData(['books', user?.id, libraryId, loadAll], context.previousBooks);
      }
      toast({
        variant: 'destructive',
        title: t('toast.books.removeError'),
        description: error.message,
      });
    },
  });

  return {
    books,
    isLoading: booksQuery.isLoading,
    error: booksQuery.error,
    hasMore,
    loadAllBooks: () => setLoadAll(true),
    isLoadingAll: loadAll && booksQuery.isLoading,
    createBook,
    addBookFile,
    deleteBookFile,
    updateBook,
    deleteBook,
    refetch: booksQuery.refetch,
    checkDuplicateByIsbn,
    checkDuplicateByTitleAuthor,
  };
}

// Duplicate detection functions

export interface DuplicateMatch {
  book: Book;
  similarity: number;
  matchType: 'title' | 'author' | 'both';
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter[i - 1] !== longer[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  
  return (longer.length - costs[longer.length]) / longer.length;
}

export async function checkDuplicateByIsbn(
  isbn: string | null | undefined,
  libraryId: string
): Promise<Book | null> {
  if (!isbn) return null;
  
  const normalizedIsbn = isbn.replace(/[-\s]/g, '');
  
  const { data, error } = await supabase
    .from('books')
    .select('*, genre:genres(id, name, slug), book_files(id, book_id, language, file_url, file_type, file_size, created_at)')
    .eq('library_id', libraryId)
    .not('isbn', 'is', null)
    .or(`isbn.eq.${normalizedIsbn},isbn.eq.${isbn}`)
    .maybeSingle();
  
  if (error) {
    console.error('Error checking ISBN duplicate:', error);
    return null;
  }
  
  return data as Book | null;
}

export async function checkDuplicateByTitleAuthor(
  title: string,
  author: string | null | undefined,
  libraryId: string,
  threshold: number = 0.85
): Promise<DuplicateMatch[]> {
  if (!title) return [];
  
  const normalizedTitle = normalizeText(title);
  const normalizedAuthor = author ? normalizeText(author) : '';
  
  const { data: allBooks, error } = await supabase
    .from('books')
    .select('*, genre:genres(id, name, slug), book_files(id, book_id, language, file_url, file_type, file_size, created_at)')
    .eq('library_id', libraryId);
  
  if (error) {
    console.error('Error checking title/author duplicate:', error);
    return [];
  }
  
  const matches: DuplicateMatch[] = [];
  
  for (const book of allBooks || []) {
    const bookTitleSimilarity = calculateSimilarity(normalizedTitle, normalizeText(book.title || ''));
    
    if (bookTitleSimilarity >= threshold) {
      let authorSimilarity = 0;
      if (book.author && author) {
        authorSimilarity = calculateSimilarity(normalizedAuthor, normalizeText(book.author));
      } else if (!book.author && !author) {
        authorSimilarity = 1;
      }
      
      const matchType: 'title' | 'author' | 'both' = 
        bookTitleSimilarity >= threshold && authorSimilarity >= threshold ? 'both' :
        bookTitleSimilarity >= threshold ? 'title' : 'author';
      
      const overallSimilarity = (bookTitleSimilarity * 0.7) + (authorSimilarity * 0.3);
      
      matches.push({
        book: book as Book,
        similarity: overallSimilarity,
        matchType,
      });
    }
  }
  
  return matches.sort((a, b) => b.similarity - a.similarity);
}
