import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useToast } from '@/hooks/use-toast';

interface JoinLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinLibraryDialog({ open, onOpenChange }: JoinLibraryDialogProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { user } = useAuth();
  const { refetch } = useLibrary();
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!user || !inviteCode.trim()) return;

    setIsJoining(true);
    try {
      const { data, error } = await supabase.rpc('use_invite_link', {
        invite_code: inviteCode.trim(),
        joining_user_id: user.id,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.error_message || 'Failed to join library');
      }

      toast({
        title: 'Successfully joined library',
        description: 'You can now access books from this library.',
      });

      // Refresh libraries list
      await refetch();

      setInviteCode('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error joining library',
        description: error instanceof Error ? error.message : 'Invalid invite code',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Library</DialogTitle>
          <DialogDescription>
            Enter the invite code shared with you to join a library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inviteCode.trim()) {
                  handleJoin();
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={!inviteCode.trim() || isJoining}>
            {isJoining ? 'Joining...' : 'Join Library'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
