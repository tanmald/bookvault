import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useLibraries } from '@/hooks/useLibraries';
import { useToast } from '@/hooks/use-toast';

interface CreateLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLibraryDialog({ open, onOpenChange }: CreateLibraryDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { createLibrary } = useLibraries();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createLibrary.mutateAsync({ name, description });
      toast({
        title: 'Library created',
        description: `${name} has been created successfully.`,
      });
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create library',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Library</DialogTitle>
            <DialogDescription>
              Create a new library to organize your books
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Library Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Book Collection"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your library..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || createLibrary.isPending}>
              Create Library
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
