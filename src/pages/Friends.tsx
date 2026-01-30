import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFriends } from '@/hooks/useFriends';
import { useLibraryMembers } from '@/hooks/useLibraryMembers';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Star, Loader2, UserMinus, Shield, ShieldOff, Crown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

export default function Friends() {
  const { friends, isLoading } = useFriends();
  const { members, isLoading: membersLoading, isAdmin, promoteMember, demoteMember, removeMember } = useLibraryMembers();
  const { activities, isLoading: activitiesLoading } = useActivityFeed();

  // Get member info by user_id
  const getMemberInfo = (userId: string) => {
    return members.find((m) => m.user_id === userId);
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Amigos</h1>
        <p className="text-muted-foreground">
          Vê o que os teus amigos estão a ler
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Library Members / Friends List */}
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            A Minha Biblioteca ({members.length > 0 ? members.length : friends.length})
          </h2>

          {isLoading || membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 && friends.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Ainda sem membros</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Partilha um link de convite para adicionar membros à tua biblioteca
                </p>
                <Button asChild>
                  <Link to="/invites">Criar Convite</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {members.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {member.display_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">
                          {member.display_name || 'Utilizador'}
                        </h3>
                        {member.is_owner ? (
                          <Badge variant="default" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Dono
                          </Badge>
                        ) : member.role === 'admin' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">Membro</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Desde {new Date(member.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                    
                    {/* Admin actions - can't modify the owner */}
                    {isAdmin && !member.is_owner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role === 'member' ? (
                            <DropdownMenuItem
                              onClick={() => promoteMember.mutate(member.id)}
                              disabled={promoteMember.isPending}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Promover a Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => demoteMember.mutate(member.id)}
                              disabled={demoteMember.isPending}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remover Admin
                            </DropdownMenuItem>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Expulsar da Biblioteca
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Expulsar membro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação irá remover {member.display_name || 'este utilizador'} da tua biblioteca. 
                                  Eles deixarão de ter acesso aos teus livros e a amizade será removida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMember.mutate({ memberId: member.id, memberUserId: member.user_id })}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Expulsar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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
