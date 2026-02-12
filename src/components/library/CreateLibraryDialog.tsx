import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useLibraries } from '@/hooks/useLibraries';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibrary } from '@/contexts/LibraryContext';

interface CreateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLibraryDialog({ open, onOpenChange }: CreateLibraryDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { createLibrary } = useLibraries();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { setCurrentLibrary } = useLibrary();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createLibrary.mutateAsync({ name, description });
      toast({
        title: t('libraries.created'),
        description: t('libraries.createdDesc').replace('{name}', name),
      });
      setName('');
      setDescription('');
      onOpenChange(false);
      setCurrentLibrary(result);
      navigate('/');
    } catch (error) {
      toast({
        title: t('libraries.createError'),
        description: error instanceof Error ? error.message : t('libraries.createFailed'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('libraries.create')}</DialogTitle>
            <DialogDescription>
              {t('libraries.createDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">{t('libraries.name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('libraries.namePlaceholder')}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">{t('libraries.description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('libraries.descriptionPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!name || createLibrary.isPending}>
              {t('libraries.createButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
