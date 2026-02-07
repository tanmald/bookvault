import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Book, BookFile } from './useBooks';
import type { ReadingProgress } from './useReadingProgress';

interface CopyBookInput {
  sourceBookId: string;
  targetLibraryId: string;
  copyProgress: boolean;
}

export function useCopyBookToLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceBookId, targetLibraryId, copyProgress }: CopyBookInput) => {
      if (!user) throw new Error('Not authenticated');

      // 1. Fetch the source book with all details
      const { data: sourceBook, error: bookError } = await supabase
        .from('books')
        .select(`
          *,
          book_files(id, book_id, language, file_url, file_type, file_size, created_at),
          genre:genres(id, name, slug)
        `)
        .eq('id', sourceBookId)
        .single();

      if (bookError) throw bookError;
      if (!sourceBook) throw new Error('Book not found');

      // 2. Verify user is member of target library
      const { data: membership, error: membershipError } = await supabase
        .from('library_members')
        .select('id')
        .eq('library_id', targetLibraryId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;
      
      // Also check if user is the owner of the library
      const { data: library, error: libraryError } = await supabase
        .from('libraries')
        .select('created_by')
        .eq('id', targetLibraryId)
        .single();

      if (libraryError) throw libraryError;
      
      const isMember = !!membership || library.created_by === user.id;
      if (!isMember) {
        throw new Error('You are not a member of the target library');
      }

      // 3. Create new book record
      const { data: newBook, error: createError } = await supabase
        .from('books')
        .insert({
          owner_id: user.id,
          library_id: targetLibraryId,
          title: sourceBook.title,
          author: sourceBook.author,
          description: sourceBook.description,
          genre_id: sourceBook.genre_id,
          year: sourceBook.year,
          isbn: sourceBook.isbn,
          cover_url: sourceBook.cover_url,
          // Keep legacy fields for backward compatibility
          file_url: sourceBook.file_url,
          file_type: sourceBook.file_type,
          file_size: sourceBook.file_size,
        })
        .select(`
          *,
          genre:genres(id, name, slug)
        `)
        .single();

      if (createError) throw createError;

      // 4. Copy book_files (pointing to same storage files)
      const bookFiles = sourceBook.book_files as BookFile[] || [];
      if (bookFiles.length > 0) {
        const filesToCopy = bookFiles.map(file => ({
          book_id: newBook.id,
          language: file.language,
          file_url: file.file_url, // Same storage file
          file_type: file.file_type,
          file_size: file.file_size,
        }));

        const { error: filesError } = await supabase
          .from('book_files')
          .insert(filesToCopy);

        if (filesError) {
          console.error('Error copying book files:', filesError);
          // Don't fail - the book was created successfully
        }
      }

      // 5. Copy reading progress if requested
      if (copyProgress) {
        const { data: progress, error: progressError } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('book_id', sourceBookId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (progressError) {
          console.error('Error fetching progress:', progressError);
        } else if (progress) {
          // Cast status to any to handle potential type mismatch with database enum
          const progressStatus = progress.status as string;
          if (progressStatus !== 'not_planned') {
            const { error: copyProgressError } = await supabase
              .from('reading_progress')
              .insert({
                user_id: user.id,
                book_id: newBook.id,
                status: progressStatus as 'to_read' | 'reading' | 'read',
                progress: progress.progress,
                started_at: progress.started_at,
                finished_at: progress.finished_at,
              });

            if (copyProgressError) {
              console.error('Error copying progress:', copyProgressError);
            }
          }
        }
      }

      return newBook as Book;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({
        title: 'Livro copiado com sucesso!',
        description: 'O livro foi copiado para a biblioteca selecionada.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar livro',
        description: error instanceof Error ? error.message : 'Ocorreu um erro ao copiar o livro.',
      });
    },
  });
}
