# Copy Book to Library Feature - Implementation Plan

## Overview
Implement the "copiar para outra biblioteca" (copy book to another library) feature that allows users to copy books between libraries they have access to.

**Reference Commit:** `dca3eda` (main branch)
**Target Branch:** `dev`

---

## Files to Create

### 1. `src/hooks/useCopyBookToLibrary.ts`

Hook for copying books between libraries with progress preservation option.

```typescript
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
```

---

### 2. `src/components/books/CopyBookDialog.tsx`

Dialog component for selecting target library and copying the book.

```typescript
import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader2, Plus, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useCopyBookToLibrary } from '@/hooks/useCopyBookToLibrary';
import { useLibraries } from '@/hooks/useLibraries';
import { CreateLibraryDialog } from '@/components/library/CreateLibraryDialog';

interface CopyBookDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle: string;
  currentLibraryId: string;
  onSuccess?: () => void;
}

export function CopyBookDialog({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  currentLibraryId,
  onSuccess,
}: CopyBookDialogProps) {
  const { t } = useLanguage();
  const { libraries, refetch: refetchLibraries } = useLibrary();
  const { createLibrary } = useLibraries();
  const copyBook = useCopyBookToLibrary();
  
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('');
  const [copyProgress, setCopyProgress] = useState(true);
  const [showCreateLibrary, setShowCreateLibrary] = useState(false);
  const [newlyCreatedLibraryId, setNewlyCreatedLibraryId] = useState<string | null>(null);

  // Filter out current library
  const availableLibraries = libraries.filter(lib => lib.id !== currentLibraryId);

  // Auto-select newly created library
  useEffect(() => {
    if (newlyCreatedLibraryId) {
      setSelectedLibraryId(newlyCreatedLibraryId);
      setNewlyCreatedLibraryId(null);
    }
  }, [newlyCreatedLibraryId, libraries]);

  const handleCopy = async () => {
    if (!selectedLibraryId) return;

    await copyBook.mutateAsync({
      sourceBookId: bookId,
      targetLibraryId: selectedLibraryId,
      copyProgress,
    });

    onClose();
    onSuccess?.();
  };

  const handleCreateLibrarySuccess = async () => {
    // Refetch libraries to get the newly created one
    await refetchLibraries();
    setShowCreateLibrary(false);
    // The useEffect will auto-select the new library once it's in the list
  };

  // Watch for createLibrary success to select the new library
  useEffect(() => {
    if (createLibrary.isSuccess && createLibrary.data) {
      setNewlyCreatedLibraryId(createLibrary.data.id);
    }
  }, [createLibrary.isSuccess, createLibrary.data]);

  return (
    <>
      <Dialog open={isOpen && !showCreateLibrary} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              {t('copyBook.title')}
            </DialogTitle>
            <DialogDescription>
              {t('copyBook.description').replace('{title}', bookTitle)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {availableLibraries.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <Library className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">{t('copyBook.noLibraries')}</p>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateLibrary(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('copyBook.createNew')}
                </Button>
              </div>
            ) : (
              <>
                {/* Library Selection */}
                <div className="space-y-3">
                  <Label>{t('copyBook.selectLibrary')}</Label>
                  <RadioGroup
                    value={selectedLibraryId}
                    onValueChange={setSelectedLibraryId}
                    className="space-y-2"
                  >
                    {availableLibraries.map((library) => (
                      <div
                        key={library.id}
                        className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                        onClick={() => setSelectedLibraryId(library.id)}
                      >
                        <RadioGroupItem value={library.id} id={library.id} />
                        <Label
                          htmlFor={library.id}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{library.name}</span>
                            {library.description && (
                              <span className="text-sm text-muted-foreground truncate">
                                {library.description}
                              </span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Create New Library Option */}
                <Button
                  variant="outline"
                  onClick={() => setShowCreateLibrary(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('copyBook.createNew')}
                </Button>

                {/* Copy Progress Checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="copyProgress"
                    checked={copyProgress}
                    onCheckedChange={(checked) => setCopyProgress(checked as boolean)}
                  />
                  <Label
                    htmlFor="copyProgress"
                    className="text-sm font-normal cursor-pointer"
                  >
                    {t('copyBook.copyProgress')}
                  </Label>
                </div>

                {/* Copy Button */}
                <Button
                  onClick={handleCopy}
                  disabled={!selectedLibraryId || copyBook.isPending}
                  className="w-full"
                >
                  {copyBook.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('copyBook.copying')}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      {t('copyBook.copyButton')}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Library Dialog */}
      <CreateLibraryDialog
        open={showCreateLibrary}
        onOpenChange={(open) => {
          setShowCreateLibrary(open);
          if (!open) {
            handleCreateLibrarySuccess();
          }
        }}
      />
    </>
  );
}
```

---

## Files to Modify

### 1. `src/pages/BookDetails.tsx`

Add the Copy Book button and dialog integration.

**Add import:**
```typescript
import { useState } from 'react';
import { CopyBookDialog } from '@/components/books/CopyBookDialog';
import { useLibrary } from '@/contexts/LibraryContext';
```

**Add to lucide-react imports:**
```typescript
import {
  ArrowLeft,
  ArrowRight,  // ADD THIS
  Trash2,
  BookOpen,
  Calendar,
  User,
  Tag,
  Loader2,
  Plus,
  Globe,
} from 'lucide-react';
```

**Add state and context inside BookDetails component:**
```typescript
export default function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { books, isLoading, deleteBook, deleteBookFile } = useBooks();
  const { progress, updateProgress } = useReadingProgress(id);
  
  // ADD THESE LINES:
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const { currentLibrary } = useLibrary();

  const book = books.find((b) => b.id === id);
  // ... rest of component
```

**Add Copy Book button before Delete button (around line 210):**
```typescript
          {/* Copy Book Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsCopyDialogOpen(true)}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            {t('copyBook.title')}
          </Button>

          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('book.delete')}
                </Button>
              </AlertDialogTrigger>
              {/* ... rest of delete dialog */}
```

**Add CopyBookDialog component at the end of the component (before closing AppLayout tag):**
```typescript
      {/* Copy Book Dialog */}
      <CopyBookDialog
        isOpen={isCopyDialogOpen}
        onClose={() => setIsCopyDialogOpen(false)}
        bookId={book?.id || ''}
        bookTitle={book?.title || ''}
        currentLibraryId={currentLibrary?.id || ''}
        onSuccess={() => {
          // Navigate to the selected library after successful copy
          if (currentLibrary) {
            navigate(`/?library=${currentLibrary.id}`);
          }
        }}
      />
    </AppLayout>
  );
}
```

---

### 2. `src/lib/i18n/translations.ts`

Add Portuguese and English translations for the copy book feature.

**Add to Portuguese section (pt) after line 208:**
```typescript
    // Copy Book
    'copyBook.title': 'Copiar para Biblioteca',
    'copyBook.description': 'Seleciona a biblioteca de destino para "{title}"',
    'copyBook.selectLibrary': 'Selecionar biblioteca',
    'copyBook.createNew': 'Criar nova biblioteca',
    'copyBook.copying': 'A copiar...',
    'copyBook.success': 'Livro copiado com sucesso!',
    'copyBook.copyButton': 'Copiar Livro',
    'copyBook.noLibraries': 'Não estás em nenhuma outra biblioteca',
    'copyBook.copyProgress': 'Copiar progresso atual de leitura',
```

**Add to English section (en) after line 600:**
```typescript
    // Copy Book
    'copyBook.title': 'Copy to Library',
    'copyBook.description': 'Select target library for "{title}"',
    'copyBook.selectLibrary': 'Select library',
    'copyBook.createNew': 'Create new library',
    'copyBook.copying': 'Copying...',
    'copyBook.success': 'Book copied successfully!',
    'copyBook.copyButton': 'Copy Book',
    'copyBook.noLibraries': "You're not in any other libraries",
    'copyBook.copyProgress': 'Copy current reading progress',
```

---

## Database Schema Requirements

Ensure the following database tables and relationships exist:

1. **books** table with columns:
   - `id`, `owner_id`, `library_id`, `title`, `author`, `description`
   - `genre_id`, `year`, `isbn`, `cover_url`
   - `file_url`, `file_type`, `file_size` (legacy support)
   - `created_at`, `updated_at`

2. **book_files** table with columns:
   - `id`, `book_id`, `language`, `file_url`, `file_type`, `file_size`, `created_at`

3. **reading_progress** table with columns:
   - `id`, `user_id`, `book_id`, `status`, `progress`
   - `started_at`, `finished_at`, `created_at`, `updated_at`

4. **libraries** table with columns:
   - `id`, `name`, `description`, `created_by`, `created_at`, `updated_at`
   - `is_default`, `is_public`, `allow_member_uploads`

5. **library_members** table with columns:
   - `id`, `library_id`, `user_id`, `role`, `joined_at`

---

## Implementation Notes

### Key Features:
1. **Ownership Transfer**: Books copied to a new library have the current user as owner (no trace of original uploader)
2. **Progress Copy**: Option to copy current reading progress (default: enabled)
3. **Storage Efficiency**: References same storage files (no file duplication)
4. **Library Selection**: Shows only libraries user has access to (excluding current)
5. **Create Library**: Option to create a new library directly from the dialog
6. **Not Planned Filter**: Progress with 'not_planned' status is not copied (dev branch feature)

### Status Handling:
The dev branch has a 'not_planned' status that should not be copied to the new library. Only 'to_read', 'reading', and 'read' statuses are preserved when copying progress.

### Post-Copy Navigation:
After successful copy, the app navigates to the target library view (`/?library={id}`) so the user can see the copied book.

---

## Testing Checklist

- [ ] Copy book to another existing library
- [ ] Copy book with progress enabled
- [ ] Copy book with progress disabled  
- [ ] Copy book and create new library from dialog
- [ ] Verify 'not_planned' status is not copied
- [ ] Verify user becomes owner of copied book
- [ ] Verify storage files are not duplicated
- [ ] Verify navigation to target library after copy
- [ ] Test error handling when user is not member of target library
- [ ] Test with book that has multiple file versions
