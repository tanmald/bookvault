import { forwardRef } from 'react';
import { BookOpen, Flame, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 450;

export interface BookFinishedCardProps {
  title: string;
  author: string | null;
  coverDataUrl: string | null;
  days: number | null;
  rating: number | null;
  booksThisYear: number;
  streak: number;
  goalPercent: number | null;
  goalTarget: number | null;
  finishedAt: string | null;
}

// Rendered at a fixed 360x450 (4:5) and captured at pixelRatio 3 for a
// 1080x1350 PNG (Instagram portrait). Colors are hard-coded — never theme
// tokens — so the exported image is identical in light and dark mode.
export const BookFinishedCard = forwardRef<HTMLDivElement, BookFinishedCardProps>(
  function BookFinishedCard(
    { title, author, coverDataUrl, days, rating, booksThisYear, streak, goalPercent, goalTarget, finishedAt },
    ref
  ) {
    const { t, language } = useLanguage();
    const year = (finishedAt ? new Date(finishedAt) : new Date()).getFullYear();
    const heroIsDays = days !== null;
    const booksThisYearLabel = t('shareCard.booksThisYear').replace('{year}', String(year));
    const formattedDate = finishedAt
      ? new Date(finishedAt).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB')
      : null;

    return (
      <div
        ref={ref}
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        className="flex flex-col bg-gradient-to-br from-orange-500 via-red-500 to-purple-600 p-6 text-white"
      >
        <div className="flex items-start gap-4">
          {coverDataUrl ? (
            <img
              src={coverDataUrl}
              alt=""
              className="h-28 w-[4.7rem] shrink-0 rounded object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-28 w-[4.7rem] shrink-0 items-center justify-center rounded bg-white/20 shadow-lg">
              <BookOpen className="h-8 w-8" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
              {t('shareCard.finished')}
            </p>
            <p className="mt-1 text-xl font-bold leading-tight line-clamp-3">{title}</p>
            {author && <p className="mt-1 text-sm text-white/80 line-clamp-1">{author}</p>}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="text-7xl font-extrabold leading-none">
            {heroIsDays ? days : booksThisYear}
          </span>
          <span className="mt-2 text-sm font-medium uppercase tracking-widest text-white/80">
            {heroIsDays
              ? days === 1
                ? t('shareCard.dayToRead')
                : t('shareCard.daysToRead')
              : booksThisYearLabel}
          </span>
        </div>

        <div className="flex items-start justify-around gap-2">
          {heroIsDays && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold leading-none">{booksThisYear}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/80">
                {booksThisYearLabel}
              </span>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <span className="flex items-center gap-1 text-2xl font-bold leading-none">
              <Flame className="h-5 w-5" />
              {streak}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/80">
              {t('shareCard.dayStreak')}
            </span>
          </div>
          {rating !== null && (
            <div className="flex flex-col items-center gap-1">
              <span className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={
                      star <= rating ? 'h-5 w-5 fill-white text-white' : 'h-5 w-5 text-white/40'
                    }
                  />
                ))}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/80">
                {t('shareCard.myRating')}
              </span>
            </div>
          )}
        </div>

        {goalPercent !== null && goalTarget !== null && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${Math.min(100, goalPercent)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] uppercase tracking-wider text-white/80">
              {t('shareCard.goalProgress')
                .replace('{percent}', String(goalPercent))
                .replace('{target}', String(goalTarget))}
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-white/25 pt-3">
          <span className="text-sm font-extrabold tracking-wide">📚 BookVault</span>
          {formattedDate && <span className="text-xs text-white/80">{formattedDate}</span>}
        </div>
      </div>
    );
  }
);
