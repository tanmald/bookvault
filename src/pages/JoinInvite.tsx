import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Loader2, Check, X, UserPlus } from 'lucide-react';

export default function JoinInvite() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
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
        setError('Este convite não existe ou já expirou.');
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setStatus('invalid');
        setError('Este convite já expirou.');
        return;
      }

      // Check max uses
      if (data.max_uses && data.uses_count >= data.max_uses) {
        setStatus('invalid');
        setError('Este convite já atingiu o número máximo de utilizações.');
        return;
      }

      setInviteOwner(data.owner as unknown as { display_name: string | null });
      setStatus('valid');
    } catch (err) {
      setStatus('invalid');
      setError('Erro ao verificar o convite.');
    }
  };

  const handleJoin = async () => {
    if (!user || !code) return;

    setStatus('joining');

    try {
      // Get invite
      const { data: invite, error: inviteError } = await supabase
        .from('invite_links')
        .select('id, owner_id')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (inviteError || !invite) {
        throw new Error('Convite não encontrado');
      }

      // Check if already friends
      const { data: existingFriendship } = await supabase
        .from('friendships')
        .select('id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .or(`user_id.eq.${invite.owner_id},friend_id.eq.${invite.owner_id}`)
        .maybeSingle();

      if (existingFriendship) {
        toast({ title: 'Já és amigo deste utilizador!' });
        navigate('/friends');
        return;
      }

      // Can't be friends with yourself
      if (invite.owner_id === user.id) {
        toast({
          variant: 'destructive',
          title: 'Não podes usar o teu próprio convite!',
        });
        navigate('/');
        return;
      }

      // Create friendship
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user_id: invite.owner_id,
          friend_id: user.id,
          invite_link_id: invite.id,
        });

      if (friendshipError) throw friendshipError;

      // Increment uses count
      await supabase
        .from('invite_links')
        .update({ uses_count: (await supabase.from('invite_links').select('uses_count').eq('id', invite.id).single()).data?.uses_count + 1 })
        .eq('id', invite.id);

      setStatus('success');
      toast({ title: 'Amizade criada com sucesso!' });

      setTimeout(() => navigate('/friends'), 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Erro ao aceitar convite',
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
                <CardTitle>Convite Inválido</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/">Ir para a Biblioteca</Link>
                </Button>
              </CardContent>
            </>
          ) : status === 'success' ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <Check className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Bem-vindo!</CardTitle>
                <CardDescription>
                  Agora és amigo de {inviteOwner?.display_name || 'um utilizador'} e podes ver a biblioteca dele.
                </CardDescription>
              </CardHeader>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <UserPlus className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Convite para Biblioteca</CardTitle>
                <CardDescription>
                  {inviteOwner?.display_name || 'Um utilizador'} convidou-te para acederes à biblioteca dele.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      Precisas de ter conta para aceitar este convite.
                    </p>
                    <div className="flex gap-3">
                      <Button asChild variant="outline" className="flex-1">
                        <Link to={`/login?redirect=/join/${code}`}>Entrar</Link>
                      </Button>
                      <Button asChild className="flex-1">
                        <Link to={`/register?redirect=/join/${code}`}>Criar Conta</Link>
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
                        A aceitar...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Aceitar Convite
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
