import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  cover_url?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  language?: string;
}

export interface AddBookFileInput {
  book_id: string;
  language: string;
  file_url: string;
  file_type: string;
  file_size?: number;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'pt', name: 'Português' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code.toUpperCase();
}

export function useBooks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const booksQuery = useQuery({
    queryKey: ['books', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          genre:genres(id, name, slug),
          book_files(id, book_id, language, file_url, file_type, file_size, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Book[];
    },
    enabled: !!user,
  });

  const createBook = useMutation({
    mutationFn: async (input: CreateBookInput) => {
      if (!user) throw new Error('Not authenticated');

      const { language = 'pt', file_url, file_type, file_size, ...bookData } = input;

      // Create the book record (without file columns - they're now deprecated)
      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          owner_id: user.id,
          ...bookData,
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
        // Don't fail the whole operation, the book was created
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Livro atualizado!' });
    },
    onError: (error) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Livro removido!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover livro',
        description: error.message,
      });
    },
  });

  return {
    books: booksQuery.data ?? [],
    isLoading: booksQuery.isLoading,
    error: booksQuery.error,
    createBook,
    addBookFile,
    deleteBookFile,
    updateBook,
    deleteBook,
    refetch: booksQuery.refetch,
  };
}
