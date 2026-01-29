import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFriends } from '@/hooks/useFriends';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Star, Loader2, UserMinus } from 'lucide-react';

export default function Friends() {
  const { friends, isLoading, removeFriend } = useFriends();
  const { activities, isLoading: activitiesLoading } = useActivityFeed();

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Amigos</h1>
        <p className="text-muted-foreground">
          Vê o que os teus amigos estão a ler
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Friends List */}
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Os Meus Amigos ({friends.length})
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : friends.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Ainda sem amigos</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Partilha um link de convite para adicionar amigos à tua biblioteca
                </p>
                <Button asChild>
                  <Link to="/invites">Criar Convite</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {friends.map((friend) => (
                <Card key={friend.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {friend.display_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {friend.display_name || 'Utilizador'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Amigo desde {new Date(friend.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFriend.mutate(friend.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="text-lg font-medium mb-4">Atividade Recente</h2>

          {activitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Sem atividade recente
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {activity.user_name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user_name}</span>{' '}
                          {activity.type === 'reading' && 'começou a ler'}
                          {activity.type === 'finished' && 'terminou de ler'}
                          {activity.type === 'review' && 'avaliou'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.book_title}
                        </p>
                        {activity.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < activity.rating!
                                    ? 'fill-accent text-accent'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.created_at).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
