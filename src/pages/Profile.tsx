import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useBooks } from '@/hooks/useBooks';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { Loader2, Save, BookOpen, BookMarked, Check } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile } = useProfile();
  const { books } = useBooks();
  const { progress } = useReadingProgress();

  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
      });
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate({
      display_name: formData.display_name.trim() || null,
      bio: formData.bio.trim() || null,
    });
  };

  // Stats
  const totalBooks = books.length;
  const booksReading = progress.filter((p) => p.status === 'reading').length;
  const booksRead = progress.filter((p) => p.status === 'read').length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">O Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gere as tuas informações pessoais
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-2xl font-semibold">{totalBooks}</span>
              <span className="text-sm text-muted-foreground">Livros</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <BookMarked className="h-8 w-8 text-accent mb-2" />
              <span className="text-2xl font-semibold">{booksReading}</span>
              <span className="text-sm text-muted-foreground">A Ler</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Check className="h-8 w-8 text-accent mb-2" />
              <span className="text-2xl font-semibold">{booksRead}</span>
              <span className="text-sm text-muted-foreground">Lidos</span>
            </CardContent>
          </Card>
        </div>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações</CardTitle>
            <CardDescription>
              Atualiza os teus dados de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="text-xl">
                  {formData.display_name?.substring(0, 2).toUpperCase() ||
                    user?.email?.substring(0, 2).toUpperCase() ||
                    'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  Membro desde{' '}
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('pt-PT')
                    : '...'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Nome</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
                placeholder="O teu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografia</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Conta-nos um pouco sobre ti..."
                rows={4}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="w-full"
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Alterações
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
