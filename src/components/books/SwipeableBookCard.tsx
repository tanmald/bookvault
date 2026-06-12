import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, CircleDashed } from 'lucide-react';
import { BookCard } from './BookCard';
import { useReadingProgress, ReadingStatus } from '@/hooks/useReadingProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import { TranslationKey } from '@/lib/i18n/translations';
import { cn } from '@/lib/utils';
import type { Book } from '@/hooks/useBooks';
import type { ReadingProgress } from '@/hooks/useReadingProgress';

interface SwipeableBookCardProps {
  book: Book;
  progress?: ReadingProgress;
  compact?: boolean;
  mini?: boolean;
  onMovedToRead?: () => void;
}

const THRESHOLD = 80;
const MAX_DRAG = 120;

const STATUS_ORDER: ReadingStatus[] = ['not_planned', 'to_read', 'reading', 'read'];

const statusActionBg: Record<ReadingStatus, string> = {
  not_planned: 'bg-destructive/80 text-destructive-foreground',
  to_read: 'bg-muted text-muted-foreground',
  reading: 'bg-accent text-accent-foreground',
  read: 'bg-primary text-primary-foreground',
};

const statusIconMap: Record<ReadingStatus, React.ReactNode> = {
  not_planned: <CircleDashed className="h-5 w-5" />,
  to_read: <Clock className="h-5 w-5" />,
  reading: <BookOpen className="h-5 w-5" />,
  read: <CheckCircle className="h-5 w-5" />,
};

const statusLabelKey: Record<ReadingStatus, TranslationKey> = {
  not_planned: 'status.notPlanned',
  to_read: 'status.toRead',
  reading: 'status.reading',
  read: 'status.read',
};

export function SwipeableBookCard({ book, progress, compact, mini, onMovedToRead }: SwipeableBookCardProps) {
  const { updateProgress } = useReadingProgress();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [translateX, setTranslateX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const isTouchDevice = 'ontouchstart' in window;

  const currentStatus = (progress?.status ?? 'to_read') as ReadingStatus;
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const nextStatus = currentIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIndex + 1] : null;
  const prevStatus = currentIndex > 0 ? STATUS_ORDER[currentIndex - 1] : null;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx > 0 && !nextStatus) return;
    if (dx < 0 && !prevStatus) return;
    setTranslateX(Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx)));
  };

  const handleTouchEnd = () => {
    setDragging(false);
    if (translateX >= THRESHOLD && nextStatus) {
      updateProgress.mutate({ bookId: book.id, status: nextStatus });
      if (nextStatus === 'read') onMovedToRead?.();
    } else if (translateX <= -THRESHOLD && prevStatus) {
      updateProgress.mutate({ bookId: book.id, status: prevStatus });
    }
    setTranslateX(0);
  };

  const handleBookClick = () => navigate(`/book/${book.id}`);

  if (!isTouchDevice) {
    return <BookCard book={book} progress={progress} compact={compact} mini={mini} />;
  }

  const swipeRightActive = translateX > 20 && nextStatus;
  const swipeLeftActive = translateX < -20 && prevStatus;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {nextStatus && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center gap-1.5 px-4 transition-opacity',
            statusActionBg[nextStatus],
            swipeRightActive ? 'opacity-100' : 'opacity-0'
          )}
        >
          {statusIconMap[nextStatus]}
          <span className="text-xs font-medium">{t(statusLabelKey[nextStatus])}</span>
        </div>
      )}
      {prevStatus && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center gap-1.5 px-4 transition-opacity',
            statusActionBg[prevStatus],
            swipeLeftActive ? 'opacity-100' : 'opacity-0'
          )}
        >
          {statusIconMap[prevStatus]}
          <span className="text-xs font-medium">{t(statusLabelKey[prevStatus])}</span>
        </div>
      )}
      <div
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform 0.3s ease',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <BookCard
          book={book}
          progress={progress}
          compact={compact}
          mini={mini}
          disableLink={true}
          onBookClick={handleBookClick}
        />
      </div>
    </div>
  );
}
