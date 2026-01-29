import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  isbn: string | null;
  created_at: string;
  updated_at: string;
  genre?: { id: string; name: string; slug: string } | null;
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
  isbn?: string;
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
          genre:genres(id, name, slug)
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

      const { data, error } = await supabase
        .from('books')
        .insert({
          owner_id: user.id,
          ...input,
        })
        .select(`
          *,
          genre:genres(id, name, slug)
        `)
        .single();

      if (error) throw error;
      return data as Book;
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

  const updateBook = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Book> & { id: string }) => {
      const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          genre:genres(id, name, slug)
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
    updateBook,
    deleteBook,
    refetch: booksQuery.refetch,
  };
}
