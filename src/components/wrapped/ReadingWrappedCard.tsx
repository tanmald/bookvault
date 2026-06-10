import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Share2, Flame, TrendingUp } from 'lucide-react';
import { useReadingSessions } from '@/hooks/useReadingSessions';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useBooks } from '@/hooks/useBooks';
import { useReadingGoal } from '@/hooks/useReadingGoal';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReadingWrappedCardProps {
  year?: number;
}

export function ReadingWrappedCard({ year = new Date().getFullYear() }: ReadingWrappedCardProps) {
  const { t } = useLanguage();
  const { streak } = useReadingSessions();
  const { progress } = useReadingProgress();
  const { books } = useBooks();
  const { goal } = useReadingGoal(year);
  const [open, setOpen] = useState(false);

  const booksReadThisYear = progress.filter(p => {
    if (p.status !== 'read' || !p.finished_at) return false;
    return new Date(p.finished_at).getFullYear() === year;
  });

  const goalProgress = goal
    ? Math.round((booksReadThisYear.length / goal.target) * 100)
    : null;

  const shareText = [
    `📚 ${t('wrapped.shareTitle').replace('{year}', String(year))}`,
    '',
    `📖 ${booksReadThisYear.length} ${t('wrapped.booksRead')}`,
    `🔥 ${streak} ${t('wrapped.dayStreak')}`,
    goalProgress !== null
      ? `🎯 ${goalProgress}% ${t('wrapped.ofGoal').replace('{target}', String(goal!.target))}`
      : null,
    '',
    'BookVault',
  ]
    .filter(line => line !== null)
    .join('\n');

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t('wrapped.shareTitle').replace('{year}', String(year)), text: shareText });
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(shareText);
    }
  };

  return (
    <>
      <Card className="mb-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            {year} {t('wrapped.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-orange-600 mb-1">{booksReadThisYear.length}</div>
            <div className="text-muted-foreground">{t('wrapped.booksRead')}</div>
          </div>

          <div className="flex justify-center gap-6 mb-4 text-sm">
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-medium">{streak}</span>
              <span className="text-muted-foreground">{t('wrapped.dayStreak')}</span>
            </div>
            {goalProgress !== null && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="font-medium">{goalProgress}%</span>
                <span className="text-muted-foreground">{t('wrapped.ofGoal').replace('{target}', String(goal!.target))}</span>
              </div>
            )}
          </div>

          <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            {t('wrapped.shareButton')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('wrapped.shareTitle').replace('{year}', String(year))}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
              {shareText}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                {t('wrapped.share')}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigator.clipboard.writeText(shareText)}
              >
                {t('wrapped.copy')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
