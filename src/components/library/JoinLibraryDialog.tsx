import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();

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
        throw new Error(result?.error_message || t('libraries.joinFailed'));
      }

      toast({
        title: t('libraries.joined'),
        description: t('libraries.joinedDesc'),
      });

      // Refresh libraries list
      await refetch();

      setInviteCode('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: t('libraries.joinError'),
        description: error instanceof Error ? error.message : t('libraries.invalidCode'),
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
          <DialogTitle>{t('libraries.join')}</DialogTitle>
          <DialogDescription>
            {t('libraries.joinDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="invite-code">{t('libraries.inviteCode')}</Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t('libraries.inviteCodePlaceholder')}
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
            {t('common.cancel')}
          </Button>
          <Button onClick={handleJoin} disabled={!inviteCode.trim() || isJoining}>
            {isJoining ? t('libraries.joining') : t('libraries.joinButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
