import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLibrary } from '@/contexts/LibraryContext';
import { useLibraries } from '@/hooks/useLibraries';
import { useLibraryMembers } from '@/hooks/useLibraryMembers';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Library as LibraryIcon, Edit, Trash2, Users as UsersIcon, LogOut, MoreVertical, Crown, Shield, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditLibraryDialog } from './EditLibraryDialog';
import { ManageMembersDialog } from './ManageMembersDialog';
import type { Database } from '@/integrations/supabase/types';

type Library = Database['public']['Tables']['libraries']['Row'];

export function LibraryManagementCard() {
  const { user } = useAuth();
  const { libraries } = useLibrary();
  const { deleteLibrary } = useLibraries();
  const { t } = useLanguage();

  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [managingLibrary, setManagingLibrary] = useState<Library | null>(null);
  const [deletingLibrary, setDeletingLibrary] = useState<Library | null>(null);
  const [leavingLibrary, setLeavingLibrary] = useState<{ library: Library; leaveFn: () => void } | null>(null);

  // Fetch book counts for all libraries
  const libraryIds = libraries.map((lib) => lib.id);

  const { data: bookCounts } = useQuery({
    queryKey: ['book-counts', libraryIds],
    queryFn: async () => {
      if (libraryIds.length === 0) return {};

      const { data, error } = await supabase
        .from('books')
        .select('library_id')
        .in('library_id', libraryIds);

      if (error) throw error;

      return (data || []).reduce((acc: Record<string, number>, book) => {
        acc[book.library_id] = (acc[book.library_id] || 0) + 1;
        return acc;
      }, {});
    },
    enabled: libraryIds.length > 0,
  });

  // Fetch member counts for all libraries
  const { data: memberCounts } = useQuery({
    queryKey: ['member-counts', libraryIds],
    queryFn: async () => {
      if (libraryIds.length === 0) return {};

      const { data, error } = await supabase
        .from('library_members')
        .select('library_id')
        .in('library_id', libraryIds);

      if (error) throw error;

      return (data || []).reduce((acc: Record<string, number>, member) => {
        acc[member.library_id] = (acc[member.library_id] || 0) + 1;
        return acc;
      }, {});
    },
    enabled: libraryIds.length > 0,
  });

  // Group libraries
  const myLibraries = libraries.filter((lib) => lib.created_by === user?.id);
  const joinedLibraries = libraries.filter((lib) => lib.created_by !== user?.id);

  // Get user's role in a library
  const useUserRole = (libraryId: string) => {
    const { members, isAdmin } = useLibraryMembers(libraryId);
    const member = members.find((m) => m.user_id === user?.id);

    if (user?.id === libraries.find((l) => l.id === libraryId)?.created_by) {
      return 'owner';
    }
    if (isAdmin) return 'admin';
    return 'member';
  };

  const handleDelete = async (library: Library) => {
    if (library.is_default) {
      return; // Already handled by UI
    }

    try {
      await deleteLibrary.mutateAsync(library.id);
      setDeletingLibrary(null);
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const LibraryCard = ({ library }: { library: Library }) => {
    const role = useUserRole(library.id);
    const { leaveLibrary: leaveLibraryMutation } = useLibraryMembers(library.id);
    const isOwner = role === 'owner';
    const bookCount = bookCounts?.[library.id] || 0;
    const memberCount = memberCounts?.[library.id] || 0;

    const handleLeaveClick = () => {
      setLeavingLibrary({
        library,
        leaveFn: () => leaveLibraryMutation.mutate(),
      });
    };

    const getRoleBadge = () => {
      if (isOwner) {
        return (
          <Badge variant="default" className="gap-1">
            <Crown className="h-3 w-3" />
            {t('libraries.owner')}
          </Badge>
        );
      }
      if (role === 'admin') {
        return (
          <Badge variant="secondary" className="gap-1">
            <Shield className="h-3 w-3" />
            {t('libraries.admin')}
          </Badge>
        );
      }
      return <Badge variant="outline">{t('libraries.member')}</Badge>;
    };

    const getActions = () => {
      if (isOwner) {
        return [
          {
            label: t('libraries.edit'),
            icon: Edit,
            onClick: () => setEditingLibrary(library),
          },
          {
            label: t('libraries.manageMembers'),
            icon: UsersIcon,
            onClick: () => setManagingLibrary(library),
          },
          {
            label: t('libraries.delete'),
            icon: Trash2,
            onClick: () => setDeletingLibrary(library),
            destructive: true,
            disabled: library.is_default,
          },
        ];
      }
      if (role === 'admin') {
        return [
          {
            label: t('libraries.manageMembers'),
            icon: UsersIcon,
            onClick: () => setManagingLibrary(library),
          },
          {
            label: t('libraries.leave'),
            icon: LogOut,
            onClick: handleLeaveClick,
            destructive: true,
          },
        ];
      }
      return [
        {
          label: t('libraries.leave'),
          icon: LogOut,
          onClick: handleLeaveClick,
          destructive: true,
        },
      ];
    };

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <LibraryIcon className="h-5 w-5 text-accent" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{library.name}</h3>
                {getRoleBadge()}
              </div>
              {library.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {library.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {bookCount} {bookCount === 1 ? t('libraries.book') : t('libraries.books')}
                </span>
                <span className="flex items-center gap-1">
                  <UsersIcon className="h-4 w-4" />
                  {memberCount} {memberCount === 1 ? t('libraries.member') : t('libraries.members')}
                </span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {getActions().map((action) => (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={action.destructive ? 'text-destructive focus:text-destructive' : ''}
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('libraries.management')}</CardTitle>
          <CardDescription>{t('libraries.managementDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* My Libraries */}
          {myLibraries.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">
                {t('libraries.myLibraries')} ({myLibraries.length})
              </h3>
              <div className="space-y-3">
                {myLibraries.map((library) => (
                  <LibraryCard key={library.id} library={library} />
                ))}
              </div>
            </div>
          )}

          {/* Joined Libraries */}
          {joinedLibraries.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">
                {t('libraries.joinedLibraries')} ({joinedLibraries.length})
              </h3>
              <div className="space-y-3">
                {joinedLibraries.map((library) => (
                  <LibraryCard key={library.id} library={library} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {libraries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('libraries.noLibraries')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditLibraryDialog
        library={editingLibrary}
        open={!!editingLibrary}
        onOpenChange={(open) => !open && setEditingLibrary(null)}
      />

      <ManageMembersDialog
        library={managingLibrary}
        open={!!managingLibrary}
        onOpenChange={(open) => !open && setManagingLibrary(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingLibrary} onOpenChange={(open) => !open && setDeletingLibrary(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('libraries.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingLibrary?.is_default
                ? t('libraries.cannotDeleteDefault')
                : t('libraries.deleteDesc').replace('{name}', deletingLibrary?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLibrary && handleDelete(deletingLibrary)}
              disabled={deletingLibrary?.is_default || deleteLibrary.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Confirmation */}
      <AlertDialog open={!!leavingLibrary} onOpenChange={(open) => !open && setLeavingLibrary(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('libraries.leaveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('libraries.leaveDesc').replace('{name}', leavingLibrary?.library.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (leavingLibrary) {
                  leavingLibrary.leaveFn();
                  setLeavingLibrary(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('libraries.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
