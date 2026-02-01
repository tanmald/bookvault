import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useInvites } from '@/hooks/useInvites';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useToast } from '@/hooks/use-toast';
import { Link2, Plus, Copy, Trash2, Loader2, Check, X } from 'lucide-react';

export default function Invites() {
  const { currentLibrary } = useLibrary();
  const { invites, isLoading, createInvite, deleteInvite } = useInvites(currentLibrary?.id);
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [maxUses, setMaxUses] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB');
  };

  const handleCreate = async () => {
    const expires = expiresInDays ? parseInt(expiresInDays) : undefined;
    const max = maxUses ? parseInt(maxUses) : undefined;

    await createInvite.mutateAsync({
      expiresInDays: expires,
      maxUses: max,
    });

    setDialogOpen(false);
    setExpiresInDays('7');
    setMaxUses('');
  };

  const copyLink = (code: string, id: string) => {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: t('invites.copied') });
  };

  const activeInvites = invites.filter((i) => i.is_active);
  const expiredInvites = invites.filter((i) => !i.is_active);

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">{t('invites.title')}</h1>
          <p className="text-muted-foreground">
            {t('invites.subtitle')}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('invites.newInvite')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('invites.createNew')}</DialogTitle>
              <DialogDescription>
                {t('invites.configOptions')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="expires">{t('invites.expiresInDays')}</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  max="365"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  placeholder={t('invites.expiresPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">{t('invites.maxUses')}</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder={t('invites.maxUsesPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreate} disabled={createInvite.isPending}>
                {createInvite.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                {t('invites.createLink')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">{t('invites.noInvites')}</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {t('invites.noInvitesDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {activeInvites.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Check className="h-5 w-5 text-accent" />
                {t('invites.active')} ({activeInvites.length})
              </h2>
              <div className="space-y-3">
                {activeInvites.map((invite) => (
                  <Card key={invite.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">
                            {invite.code}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {invite.uses_count}
                            {invite.max_uses ? ` / ${invite.max_uses}` : ''} {t('invites.uses')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {invite.expires_at
                            ? `${t('invites.expires')} ${formatDate(invite.expires_at)}`
                            : t('invites.noExpiry')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLink(invite.code, invite.id)}
                        >
                          {copiedId === invite.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInvite.mutate(invite.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {expiredInvites.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-muted-foreground">
                <X className="h-5 w-5" />
                {t('invites.expired')} ({expiredInvites.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {expiredInvites.map((invite) => (
                  <Card key={invite.id}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">
                            {invite.code}
                          </code>
                          <Badge variant="secondary" className="text-xs">
                            {invite.uses_count} {t('invites.uses')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('invites.createdAt')} {formatDate(invite.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteInvite.mutate(invite.id)}
                        className="text-muted-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
