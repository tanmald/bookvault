import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Loader2, Check, X, UserPlus } from 'lucide-react';

export default function JoinInvite() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'joining' | 'success' | 'error'>('loading');
  const [inviteOwner, setInviteOwner] = useState<{ display_name: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setStatus('invalid');
      return;
    }

    checkInvite();
  }, [code]);

  const checkInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('invite_links')
        .select(`
          *,
          owner:profiles!invite_links_owner_id_fkey(display_name)
        `)
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setStatus('invalid');
        setError(t('joinInvite.notExist'));
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setStatus('invalid');
        setError(t('joinInvite.expired'));
        return;
      }

      // Check max uses
      if (data.max_uses && data.uses_count >= data.max_uses) {
        setStatus('invalid');
        setError(t('joinInvite.maxUses'));
        return;
      }

      setInviteOwner(data.owner as unknown as { display_name: string | null });
      setStatus('valid');
    } catch (err) {
      setStatus('invalid');
      setError(t('joinInvite.checkError'));
    }
  };

  const handleJoin = async () => {
    if (!user || !code) return;

    setStatus('joining');

    try {
      // Use atomic database function to prevent race conditions
      const { data, error: rpcError } = await supabase
        .rpc('use_invite_link', {
          invite_code: code,
          joining_user_id: user.id
        });

      if (rpcError) throw rpcError;

      const result = data?.[0];
      
      if (!result) {
        throw new Error(t('joinInvite.processError'));
      }

      if (!result.success) {
        // Handle specific error cases
        if (result.error_message === 'Já és amigo deste utilizador') {
          toast({ title: t('joinInvite.alreadyFriend') });
          navigate('/friends');
          return;
        }
        
        if (result.error_message === 'Não podes usar o teu próprio convite') {
          toast({
            variant: 'destructive',
            title: t('joinInvite.ownInvite'),
          });
          navigate('/');
          return;
        }
        
        throw new Error(result.error_message || t('joinInvite.acceptError'));
      }

      setStatus('success');
      toast({ title: t('joinInvite.friendCreated') });

      setTimeout(() => navigate('/friends'), 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
      toast({
        variant: 'destructive',
        title: t('joinInvite.acceptError'),
        description: err.message,
      });
    }
  };

  if (authLoading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ownerName = inviteOwner?.display_name || t('joinInvite.aUser');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-accent" />
            <span className="text-3xl font-semibold tracking-tight">BookVault</span>
          </div>
        </div>

        <Card>
          {status === 'invalid' || status === 'error' ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                  <X className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle>{t('joinInvite.invalidTitle')}</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/">{t('joinInvite.goToLibrary')}</Link>
                </Button>
              </CardContent>
            </>
          ) : status === 'success' ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <Check className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>{t('joinInvite.welcome')}</CardTitle>
                <CardDescription>
                  {t('joinInvite.welcomeDesc').replace('{name}', ownerName)}
                </CardDescription>
              </CardHeader>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <UserPlus className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>{t('joinInvite.inviteTitle')}</CardTitle>
                <CardDescription>
                  {t('joinInvite.inviteDesc').replace('{name}', ownerName)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      {t('joinInvite.needAccount')}
                    </p>
                    <div className="flex gap-3">
                      <Button asChild variant="outline" className="flex-1">
                        <Link to={`/login?redirect=/join/${code}`}>{t('joinInvite.login')}</Link>
                      </Button>
                      <Button asChild className="flex-1">
                        <Link to={`/register?redirect=/join/${code}`}>{t('joinInvite.createAccount')}</Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    onClick={handleJoin}
                    disabled={status === 'joining'}
                    className="w-full"
                  >
                    {status === 'joining' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('joinInvite.accepting')}
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        {t('joinInvite.acceptInvite')}
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
