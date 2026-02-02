import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useLibraries } from '@/hooks/useLibraries';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Database } from '@/integrations/supabase/types';

type Library = Database['public']['Tables']['libraries']['Row'];

interface EditLibraryDialogProps {
  library: Library | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLibraryDialog({ library, open, onOpenChange }: EditLibraryDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { updateLibrary } = useLibraries();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (library) {
      setName(library.name);
      setDescription(library.description || '');
    }
  }, [library]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!library) return;

    try {
      await updateLibrary.mutateAsync({
        id: library.id,
        updates: { name, description: description || null },
      });
      toast({
        title: t('libraries.updated'),
        description: t('libraries.updatedDesc'),
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('libraries.updateError'),
        description: error instanceof Error ? error.message : 'Failed to update library',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('libraries.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('libraries.editDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">{t('libraries.name')}</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('libraries.namePlaceholder')}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-description">{t('libraries.description')}</Label>
              <Textarea
                id="edit-description"
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
            <Button type="submit" disabled={!name || updateLibrary.isPending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
