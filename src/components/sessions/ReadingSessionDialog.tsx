import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { useReadingSessions } from '@/hooks/useReadingSessions';
import { useBooks } from '@/hooks/useBooks';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReadingSessionDialogProps {
  children?: React.ReactNode;
}

export function ReadingSessionDialog({ children }: ReadingSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { t } = useLanguage();
  const { addSession, todaySession, weeklyTotal } = useReadingSessions();
  const { books } = useBooks();
  const { progress } = useReadingProgress();

  const activeBooks = books.filter(book => {
    const bookProgress = progress.find(p => p.book_id === book.id);
    return bookProgress?.status === 'reading' || bookProgress?.status === 'read';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration || parseInt(duration) <= 0) return;

    setIsSubmitting(true);
    try {
      await addSession.mutateAsync({
        durationMinutes: parseInt(duration),
        bookId: selectedBook || undefined,
        notes: notes || undefined,
      });
      setDuration('');
      setSelectedBook('');
      setNotes('');
      setOpen(false);
    } catch (error) {
      console.error('Error logging session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickOptions = [15, 30, 45, 60, 90];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Clock className="h-4 w-4" />
            {t('sessions.logButton')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('sessions.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('sessions.dialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">
                {todaySession ? `${todaySession.duration_minutes} min` : '0 min'}
              </span>{' '}
              {t('sessions.today')}
            </div>
            <div>
              <span className="font-medium text-foreground">{weeklyTotal} min</span>{' '}
              {t('sessions.thisWeek')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">{t('sessions.durationLabel')}</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="1440"
              placeholder="30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
            <div className="flex flex-wrap gap-2">
              {quickOptions.map((mins) => (
                <Button
                  key={mins}
                  type="button"
                  variant={duration === String(mins) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDuration(String(mins))}
                >
                  {mins} min
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book">{t('sessions.bookLabel')}</Label>
            <Select value={selectedBook} onValueChange={setSelectedBook}>
              <SelectTrigger>
                <SelectValue placeholder={t('sessions.bookPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {activeBooks.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {t('sessions.noBooks')}
                  </SelectItem>
                ) : (
                  activeBooks.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title} — {book.author}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('sessions.notesLabel')}</Label>
            <Textarea
              id="notes"
              placeholder={t('sessions.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !duration}>
              {isSubmitting ? t('profile.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
