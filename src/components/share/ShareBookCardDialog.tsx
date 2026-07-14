import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Share2, Type } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useReviews } from '@/hooks/useReviews';
import { useReadingSessions } from '@/hooks/useReadingSessions';
import { useReadingGoal } from '@/hooks/useReadingGoal';
import {
  buildShareText,
  computeBooksReadInYear,
  computeDaysToRead,
  downloadBlob,
  fetchImageAsDataUrl,
  generateCardImage,
  shareCardImage,
} from '@/lib/shareCard';
import { BookFinishedCard, CARD_WIDTH, CARD_HEIGHT } from './BookFinishedCard';
import posthog from '@/lib/posthog';

export interface ShareableBook {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
}

interface ShareBookCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: ShareableBook;
}

const CARD_FILENAME = 'bookvault-finished.png';

export function ShareBookCardDialog({ open, onOpenChange, book }: ShareBookCardDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { progress } = useReadingProgress();
  const { myReview } = useReviews(book.id);
  const { streak } = useReadingSessions();

  const bookProgress = progress.find((p) => p.book_id === book.id);
  const finishedAt = bookProgress?.finished_at ?? null;
  const days = computeDaysToRead(bookProgress?.started_at ?? null, finishedAt);
  const year = (finishedAt ? new Date(finishedAt) : new Date()).getFullYear();
  const { goal } = useReadingGoal(year);
  const booksThisYear = computeBooksReadInYear(progress, year);
  const goalPercent = goal ? Math.round((booksThisYear / goal.target) * 100) : null;

  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !book.cover_url) {
      setCoverDataUrl(null);
      return;
    }
    let active = true;
    fetchImageAsDataUrl(book.cover_url).then((dataUrl) => {
      if (active) setCoverDataUrl(dataUrl);
    });
    return () => {
      active = false;
    };
  }, [open, book.cover_url]);

  // Scale the fixed-size card down to fit the dialog; the capture still uses
  // the card's intrinsic 360x450 node, so preview and export match.
  useLayoutEffect(() => {
    if (!open) return;
    const el = previewRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CARD_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const shareText = buildShareText(t, { title: book.title, author: book.author, days });

  const withCardBlob = async (action: (blob: Blob) => Promise<void>) => {
    if (!cardRef.current || isGenerating) return;
    setIsGenerating(true);
    try {
      const blob = await generateCardImage(cardRef.current);
      await action(blob);
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('shareCard.errorDesc'),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = () =>
    withCardBlob(async (blob) => {
      const outcome = await shareCardImage(blob, CARD_FILENAME, {
        title: t('shareCard.dialogTitle'),
        text: shareText,
      });
      if (outcome === 'copied') {
        toast({
          title: t('shareCard.copiedTitle'),
          description: t('shareCard.copiedDesc'),
          variant: 'success',
        });
      } else if (outcome === 'downloaded') {
        toast({
          title: t('common.success'),
          description: t('shareCard.downloadedDesc'),
          variant: 'success',
        });
      }
      if (outcome !== 'cancelled') {
        posthog.capture('finished book card shared', { book_id: book.id, method: outcome });
      }
    });

  const handleDownload = () =>
    withCardBlob(async (blob) => {
      downloadBlob(blob, CARD_FILENAME);
      toast({
        title: t('common.success'),
        description: t('shareCard.downloadedDesc'),
        variant: 'success',
      });
      posthog.capture('finished book card shared', { book_id: book.id, method: 'download' });
    });

  const handleShareAsText = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: t('shareCard.dialogTitle'), text: shareText });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: t('shareCard.textCopiedTitle'),
        description: t('shareCard.textCopiedDesc'),
        variant: 'success',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shareCard.dialogTitle')}</DialogTitle>
        </DialogHeader>

        <div ref={previewRef} className="flex justify-center">
          <div
            style={{ width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }}
            className="overflow-hidden rounded-xl shadow-lg"
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <BookFinishedCard
                ref={cardRef}
                title={book.title}
                author={book.author}
                coverDataUrl={coverDataUrl}
                days={days}
                rating={myReview?.rating ?? null}
                booksThisYear={booksThisYear}
                streak={streak}
                goalPercent={goalPercent}
                goalTarget={goal?.target ?? null}
                finishedAt={finishedAt}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleShare} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? t('shareCard.generating') : t('shareCard.share')}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
              disabled={isGenerating}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('shareCard.download')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleShareAsText}>
              <Type className="mr-2 h-4 w-4" />
              {t('shareCard.shareAsText')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
