import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ReadingStatus } from './useReadingProgress';

export interface FriendProgress {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  status: ReadingStatus | null;
  progress: number;
  started_at: string | null;
  finished_at: string | null;
  reading_time_days: number | null;
}

function calculateReadingDays(startedAt: string | null, finishedAt: string | null): number | null {
  if (!startedAt || !finishedAt) return null;

  const start = new Date(startedAt);
  const end = new Date(finishedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(diffDays, 0);
}

/**
 * 🚨 CRITICAL: Filters out not_planned and no-progress members
 * This hook ONLY returns library members with reading progress.
 * It MUST filter out:
 * - Members with not_planned status
 * - Members with no reading_progress entry
 * - Non-library friends (friendships table)
 * Uses get_library_friends_book_progress RPC for filtering.
 */
export function useFriendsBookProgress(bookId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friends-book-progress', bookId, user?.id],
    queryFn: async () => {
      if (!bookId || !user) return [];

      // Single RPC call — returns library members with status to_read/reading/read
      const { data, error } = await supabase.rpc(
        'get_library_friends_book_progress',
        {
          p_user_id: user.id,
          p_book_id: bookId,
        }
      );

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Map RPC result to FriendProgress interface
      const friendsProgress: FriendProgress[] = data.map((row) => ({
        user_id: row.friend_id,
        display_name: row.display_name || null,
        avatar_url: row.avatar_url || null,
        status: (row.status as ReadingStatus) || null,
        progress: row.progress || 0,
        started_at: row.started_at || null,
        finished_at: row.finished_at || null,
        reading_time_days: calculateReadingDays(
          row.started_at || null,
          row.finished_at || null,
        ),
      }));

      // Sort: read (by time), reading (by progress), to_read (by name)
      return friendsProgress.sort((a, b) => {
        const statusOrder: Record<string, number> = { read: 0, reading: 1, to_read: 2 };
        const aOrder = a.status ? (statusOrder[a.status] ?? 3) : 3;
        const bOrder = b.status ? (statusOrder[b.status] ?? 3) : 3;

        if (aOrder !== bOrder) return aOrder - bOrder;

        if (a.status === 'read' && b.status === 'read') {
          const aTime = a.reading_time_days ?? Infinity;
          const bTime = b.reading_time_days ?? Infinity;
          return aTime - bTime;
        }

        if (a.status === 'reading' && b.status === 'reading') {
          return b.progress - a.progress;
        }

        const aName = a.display_name || '';
        const bName = b.display_name || '';
        return aName.localeCompare(bName);
      });
    },
    enabled: !!bookId && !!user,
  });
}
