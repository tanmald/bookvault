import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLibraryMembers } from '@/hooks/useLibraryMembers';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Shield, ShieldOff, UserMinus, Crown, MoreVertical } from 'lucide-react';
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
import type { Database } from '@/integrations/supabase/types';

type Library = Database['public']['Tables']['libraries']['Row'];

interface ManageMembersDialogProps {
  library: Library | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageMembersDialog({ library, open, onOpenChange }: ManageMembersDialogProps) {
  const { members, isLoading, isAdmin, promoteMember, demoteMember, removeMember } = useLibraryMembers(library?.id);
  const { t, language } = useLanguage();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-GB');
  };

  const isOwner = (userId: string) => library?.created_by === userId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('libraries.manageMembersTitle')}</DialogTitle>
          <DialogDescription>
            {t('libraries.manageMembersDesc')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {t('libraries.noMembers')}
          </div>
        ) : (
          <div className="grid gap-3">
            {members.map((member) => {
              const memberIsOwner = isOwner(member.user_id);

              return (
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
                        {memberIsOwner ? (
                          <Badge variant="default" className="gap-1">
                            <Crown className="h-3 w-3" />
                            {t('libraries.owner')}
                          </Badge>
                        ) : member.role === 'admin' ? (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {t('libraries.admin')}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t('libraries.member')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('friends.since')} {formatDate(member.created_at)}
                      </p>
                    </div>

                    {/* Admin actions - can't modify the owner */}
                    {isAdmin && !memberIsOwner && (
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
                                  {t('friends.kickDesc').replace(
                                    '{name}',
                                    member.display_name || t('friends.user')
                                  )}
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
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
