import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReadingGoal, type ReadingGoal } from '@/hooks/useReadingGoal';

interface ReadingGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGoal?: ReadingGoal | null;
}

export function ReadingGoalDialog({ open, onOpenChange, initialGoal }: ReadingGoalDialogProps) {
  const { t } = useLanguage();
  const { upsertGoal } = useReadingGoal();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [target, setTarget] = useState(12);

  useEffect(() => {
    if (initialGoal) {
      setYear(initialGoal.year);
      setTarget(initialGoal.target);
    } else {
      setYear(currentYear);
      setTarget(12);
    }
  }, [initialGoal, currentYear, open]);

  const handleSave = () => {
    if (target < 1 || target > 999) return;
    upsertGoal.mutate({ year, target }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const yearOptions = [currentYear, currentYear + 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialGoal ? t('goals.editGoal') : t('goals.setGoal')}
          </DialogTitle>
          <DialogDescription>
            {initialGoal ? t('goals.editGoal') : t('goals.setGoal')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="year">{t('goals.yearLabel')}</Label>
            <Select
              value={year.toString()}
              onValueChange={(value) => setYear(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('goals.yearLabel')} />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="target">{t('goals.targetLabel')}</Label>
            <Input
              id="target"
              type="number"
              min={1}
              max={999}
              value={target}
              onChange={(e) => setTarget(parseInt(e.target.value) || 0)}
              placeholder="24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={upsertGoal.isPending || target < 1 || target > 999}
          >
            {upsertGoal.isPending ? t('profile.saving') : t('goals.saveGoal')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
