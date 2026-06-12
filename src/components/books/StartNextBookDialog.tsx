import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Book } from '@/hooks/useBooks';

interface StartNextBookDialogProps {
  open: boolean;
  book: Book | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function StartNextBookDialog({ open, book, onConfirm, onDismiss }: StartNextBookDialogProps) {
  const { t } = useLanguage();

  if (!book) return null;

  const description = t('startNextBook.description').replace('{title}', book.title);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDismiss(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('startNextBook.title')}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {book.cover_url && (
          <div className="flex justify-center py-2">
            <img
              src={book.cover_url}
              alt={book.title}
              className="h-72 w-auto rounded object-cover shadow"
            />
          </div>
        )}
        <DialogFooter className="flex-row justify-center gap-3 sm:justify-center">
          <Button variant="outline" onClick={onDismiss}>{t('startNextBook.dismiss')}</Button>
          <Button onClick={onConfirm}>{t('startNextBook.confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
