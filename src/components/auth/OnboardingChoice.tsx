import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BookOpen, Link2, Loader2, Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingChoice() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  
  const [libraryChoice, setLibraryChoice] = useState<'new' | 'join'>(initialCode ? 'join' : 'new');
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (libraryChoice === 'new') {
      toast({
        title: 'Bem-vindo ao BookVault!',
        description: 'A tua biblioteca está pronta para começar.',
      });
      navigate('/');
      return;
    }

    // Join existing library
    if (!inviteCode.trim()) {
      toast({
        variant: 'destructive',
        title: 'Código em falta',
        description: 'Introduz o código de convite para te juntares a uma biblioteca.',
      });
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Sessão não encontrada. Por favor, faz login novamente.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('use_invite_link', {
        invite_code: inviteCode.trim(),
        joining_user_id: user.id,
      });

      if (error) {
        throw error;
      }

      const result = data?.[0];

      if (!result?.success) {
        toast({
          variant: 'destructive',
          title: 'Código inválido',
          description: result?.error_message || 'Não foi possível usar este código de convite.',
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: 'Juntaste-te à biblioteca!',
        description: 'Agora tens acesso aos livros partilhados.',
      });
      navigate('/friends');
    } catch (error) {
      console.error('Error using invite:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao processar o convite. Tenta novamente.',
      });
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <BookOpen className="h-10 w-10 text-accent" />
            <span className="text-3xl font-semibold tracking-tight">BookVault</span>
          </div>
          <p className="text-muted-foreground">Como queres começar?</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Escolhe uma opção</CardTitle>
            <CardDescription>
              Podes criar a tua própria biblioteca ou juntar-te a uma existente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={libraryChoice}
              onValueChange={(value) => setLibraryChoice(value as 'new' | 'join')}
              className="space-y-3"
            >
              <div>
                <Label
                  htmlFor="new"
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                    libraryChoice === 'new' ? 'border-primary bg-muted/30' : 'border-border'
                  }`}
                >
                  <RadioGroupItem value="new" id="new" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Library className="h-5 w-5 text-primary" />
                      <span className="font-medium">Criar biblioteca nova</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Começa do zero com a tua própria coleção de livros
                    </p>
                  </div>
                </Label>
              </div>

              <div>
                <Label
                  htmlFor="join"
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                    libraryChoice === 'join' ? 'border-primary bg-muted/30' : 'border-border'
                  }`}
                >
                  <RadioGroupItem value="join" id="join" className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-primary" />
                      <span className="font-medium">Juntar-me a uma biblioteca</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tenho um código de convite de um amigo
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {libraryChoice === 'join' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="inviteCode">Código de convite</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Ex: AbC12345"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="font-mono tracking-wider normal-case"
                  style={{ textTransform: 'none' }}
                  autoComplete="off"
                />
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleContinue} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A processar...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>
              <Button variant="ghost" onClick={handleSkip} disabled={isLoading} className="w-full">
                Saltar por agora
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
