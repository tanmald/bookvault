import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFriends } from '@/hooks/useFriends';
import { useLibraryMembers } from '@/hooks/useLibraryMembers';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLibrary } from '@/contexts/LibraryContext';
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
  const { currentLibrary, isLoading: libraryLoading } = useLibrary();
  const { friends, isLoading } = useFriends();
  const { members, isLoading: membersLoading, isAdmin, promoteMember, demoteMember, removeMember } = useLibraryMembers(currentLibrary?.id);
  const { activities, isLoading: activitiesLoading } = useActivityFeed();
  const { t, language } = useLanguage();

  // Get member info by user_id
  const getMemberInfo = (userId: string) => {
    return members.find((m) => m.user_id === userId);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB');
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">{t('friends.title')}</h1>
        <p className="text-muted-foreground">
          {t('friends.subtitle')}
        </p>
      </div>

      <div className="grid md:grid-cols-[2fr_1fr] lg:grid-cols-[1fr_400px] gap-6 md:gap-8">
        {/* Library Members / Friends List */}
        <div>
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('friends.myLibrary')} ({members.length > 0 ? members.length : friends.length})
          </h2>

          {libraryLoading || isLoading || membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 && friends.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">{t('friends.empty')}</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {t('friends.emptyDesc')}
                </p>
                <Button asChild>
                  <Link to="/invites">{t('friends.createInvite')}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {members.map((member) => (
                <Card key={member.user_id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {member.display_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">
                          {member.display_name || t('friends.user')}
                        </h3>
                        {member.user_id === currentLibrary?.created_by ? (
                          <Badge variant="default" className="gap-1">
                            <Crown className="h-3 w-3" />
                            {t('friends.owner')}
                          </Badge>
                        ) : member.role === 'admin' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {t('friends.admin')}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t('friends.member')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('friends.since')} {formatDate(member.created_at)}
                      </p>
                    </div>
                    
                    {/* Admin actions - can't modify the owner */}
                    {isAdmin && member.user_id !== currentLibrary?.created_by && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role === 'member' ? (
                            <DropdownMenuItem
                              onClick={() => promoteMember.mutate(member.user_id)}
                              disabled={promoteMember.isPending}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              {t('friends.promoteAdmin')}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => demoteMember.mutate(member.user_id)}
                              disabled={demoteMember.isPending}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              {t('friends.demoteAdmin')}
                            </DropdownMenuItem>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                {t('friends.kickMember')}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('friends.kickTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('friends.kickDesc').replace('{name}', member.display_name || t('friends.user'))}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMember.mutate(member.user_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('friends.kick')}
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
          <h2 className="text-lg font-medium mb-4">{t('friends.recentActivity')}</h2>

          {activitiesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('friends.noActivity')}
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
                          {activity.type === 'reading' && t('friends.startedReading')}
                          {activity.type === 'finished' && t('friends.finishedReading')}
                          {activity.type === 'review' && t('friends.reviewed')}
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
                          {formatDate(activity.created_at)}
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
