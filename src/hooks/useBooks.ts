import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  title: string;
  author: string | null;
  description: string | null;
  genre_id: string | null;
  year: number | null;
  cover_url: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
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
  file_url: string;
  file_type: string;
  file_size?: number;
  language?: string;
  library_id: string;
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

      // Create the book file record
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
          title: 'Aviso: erro ao criar versão do ficheiro',
          description: 'O livro foi criado, mas houve um problema ao registar a versão do ficheiro.',
        });
      }

      return book as Book;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Livro adicionado com sucesso!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar livro',
        description: error.message,
      });
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
      toast({ title: 'Versão adicionada com sucesso!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar versão',
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
      toast({ title: 'Versão removida!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover versão',
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
        .select(`
          *,
          genre:genres(id, name, slug),
          book_files(id, book_id, language, file_url, file_type, file_size, created_at)
        `)
        .single();

      if (error) throw error;
      return data as Book;
    },
    onMutate: async ({ id, ...updates }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['books'] });

      // Snapshot the previous value
      const previousBooks = queryClient.getQueryData<Book[]>(['books', user?.id, libraryId, loadAll]);

      // Optimistically update the cache
      if (previousBooks) {
        queryClient.setQueryData<Book[]>(['books', user?.id, libraryId, loadAll], (old) =>
          old?.map((book) => (book.id === id ? { ...book, ...updates } : book))
        );
      }

      return { previousBooks };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Livro atualizado!' });
    },
    onError: (error, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousBooks) {
        queryClient.setQueryData(['books', user?.id, libraryId, loadAll], context.previousBooks);
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar livro',
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Livro removido!' });
    },
    onError: (error, _id, context) => {
      // Rollback on error
      if (context?.previousBooks) {
        queryClient.setQueryData(['books', user?.id, libraryId, loadAll], context.previousBooks);
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao remover livro',
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
  };
}
