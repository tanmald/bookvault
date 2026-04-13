import { useState } from 'react';
import { Target, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReadingGoal } from '@/hooks/useReadingGoal';
import { ReadingGoalDialog } from './ReadingGoalDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ReadingGoalCard() {
  const { t } = useLanguage();
  const { goal, booksRead, isLoading, deleteGoal } = useReadingGoal();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="h-24 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const getGoalStatus = () => {
    if (!goal) return null;

    if (booksRead >= goal.target) return { status: 'completed', diff: 0 };

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const expectedProgress = dayOfYear / 365;
    const actualProgress = booksRead / goal.target;

    if (actualProgress >= expectedProgress) {
      return { status: 'ahead', diff: Math.max(0, Math.round((actualProgress - expectedProgress) * goal.target)) };
    } else {
      return { status: 'behind', diff: Math.max(0, Math.round((expectedProgress - actualProgress) * goal.target)) };
    }
  };

  const handleDelete = () => {
    if (goal) {
      deleteGoal.mutate(goal.id, { onSuccess: () => setDeleteDialogOpen(false) });
    }
  };

  const status = getGoalStatus();

  return (
    <>
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('goals.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!goal ? (
            <div className="text-center py-6">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('goals.emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('goals.emptyDesc').replace('{year}', currentYear.toString())}
              </p>
              <Button onClick={() => setDialogOpen(true)}>{t('goals.setGoal')}</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold">
                  {t('goals.progress')
                    .replace('{current}', booksRead.toString())
                    .replace('{total}', goal.target.toString())}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDialogOpen(true)}
                    disabled={deleteGoal.isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={deleteGoal.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Progress value={Math.min(100, (booksRead / goal.target) * 100)} className="h-2" />

              {status && (
                <p className="text-sm text-muted-foreground">
                  {status.status === 'completed' && t('goals.completed')}
                  {status.status === 'ahead' && t('goals.ahead').replace('{count}', status.diff.toString())}
                  {status.status === 'behind' && t('goals.behind').replace('{count}', status.diff.toString())}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ReadingGoalDialog open={dialogOpen} onOpenChange={setDialogOpen} initialGoal={goal} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goals.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('goals.deleteWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGoal.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteGoal.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGoal.isPending ? t('profile.saving') : t('goals.deleteGoal')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
