import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useBooks } from '@/hooks/useBooks';
import { useGenres } from '@/hooks/useGenres';
import { getGenreTranslationKey } from '@/lib/i18n/translations';
import type { Book } from '@/hooks/useBooks';

interface EditBookMetadataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
}

export function EditBookMetadataDialog({ isOpen, onClose, book }: EditBookMetadataDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { updateBook } = useBooks();
  const { data: genres } = useGenres();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genreId, setGenreId] = useState('');
  const [year, setYear] = useState('');
  const [isbn, setIsbn] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [seriesPosition, setSeriesPosition] = useState('');
  const [titleError, setTitleError] = useState(false);

  // Reset form to the book's current values whenever the dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle(book.title ?? '');
      setAuthor(book.author ?? '');
      setGenreId(book.genre_id ?? '');
      setYear(book.year ? String(book.year) : '');
      setIsbn(book.isbn ?? '');
      setSeriesName(book.series_name ?? '');
      setSeriesPosition(book.series_position !== null ? String(book.series_position) : '');
      setTitleError(false);
    }
  }, [isOpen, book]);

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(true);
      return;
    }

    try {
      await updateBook.mutateAsync({
        id: book.id,
        title: trimmedTitle,
        author: author.trim() || null,
        genre_id: genreId || null,
        year: year ? parseInt(year, 10) : null,
        isbn: isbn.trim() || null,
        series_name: seriesName.trim() || null,
        series_position: seriesPosition ? parseFloat(seriesPosition) : null,
      });
      toast({ title: t('book.detailsUpdated'), variant: 'success' });
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('book.detailsUpdateError'),
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('book.editDetails')}</DialogTitle>
          <DialogDescription>{t('book.editDetailsDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-book-title">{t('upload.bookTitle')}</Label>
            <Input
              id="edit-book-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(false);
              }}
            />
            {titleError && (
              <p className="text-xs text-destructive">{t('book.titleRequired')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-book-author">{t('upload.author')}</Label>
            <Input
              id="edit-book-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-book-genre">{t('upload.genre')}</Label>
              <Select value={genreId} onValueChange={setGenreId}>
                <SelectTrigger id="edit-book-genre">
                  <SelectValue placeholder={t('upload.selectGenre')} />
                </SelectTrigger>
                <SelectContent>
                  {genres?.map((genre) => (
                    <SelectItem key={genre.id} value={genre.id}>
                      {t(getGenreTranslationKey(genre.slug))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-book-year">{t('upload.year')}</Label>
              <Input
                id="edit-book-year"
                type="number"
                min="1000"
                max={new Date().getFullYear()}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-book-isbn">{t('book.isbn')}</Label>
            <Input
              id="edit-book-isbn"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-book-series-name">{t('series.name')}</Label>
              <Input
                id="edit-book-series-name"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder={t('series.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-book-series-position">{t('series.position')}</Label>
              <Input
                id="edit-book-series-position"
                type="number"
                step="0.1"
                min="0"
                className="w-24"
                value={seriesPosition}
                onChange={(e) => setSeriesPosition(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('book.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={updateBook.isPending}>
            {updateBook.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('book.saving')}
              </>
            ) : (
              t('book.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
