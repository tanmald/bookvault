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
  review_rating: number | null;
  review_content: string | null;
}

function calculateReadingDays(startedAt: string | null, finishedAt: string | null): number | null {
  if (!startedAt || !finishedAt) return null;
  
  const start = new Date(startedAt);
  const end = new Date(finishedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(diffDays, 0);
}

export function useFriendsBookProgress(bookId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['friends-book-progress', bookId, user?.id],
    queryFn: async () => {
      if (!bookId || !user) return [];

      // Step 1: Get all friends
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;
      if (!friendships || friendships.length === 0) return [];

      // Extract friend IDs
      const friendIds = friendships.map((f) =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Step 2: Get profiles for all friends
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', friendIds);

      if (profilesError) throw profilesError;

      // Step 3: Get reading progress for this book from friends
      const { data: progressData, error: progressError } = await supabase
        .from('reading_progress')
        .select('user_id, status, progress, started_at, finished_at')
        .eq('book_id', bookId)
        .in('user_id', friendIds);

      if (progressError) throw progressError;

      // Step 4: Get reviews for this book from friends
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('user_id, rating, content')
        .eq('book_id', bookId)
        .in('user_id', friendIds);

      if (reviewsError) throw reviewsError;

      // Step 5: Combine data - include all friends, even those without progress
      const friendsProgress: FriendProgress[] = friendIds.map((friendId) => {
        const profile = profiles?.find((p) => p.user_id === friendId);
        const progress = progressData?.find((p) => p.user_id === friendId);
        const review = reviewsData?.find((r) => r.user_id === friendId);

        return {
          user_id: friendId,
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
          status: progress?.status || null,
          progress: progress?.progress || 0,
          started_at: progress?.started_at || null,
          finished_at: progress?.finished_at || null,
          reading_time_days: calculateReadingDays(
            progress?.started_at || null,
            progress?.finished_at || null
          ),
          review_rating: review?.rating ?? null,
          review_content: review?.content ?? null,
        };
      });

      // Step 6: Add current user's data to the scoreboard
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      const { data: currentUserProgress } = await supabase
        .from('reading_progress')
        .select('user_id, status, progress, started_at, finished_at')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: currentUserReview } = await supabase
        .from('reviews')
        .select('user_id, rating, content')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .maybeSingle();

      const currentUserData: FriendProgress = {
        user_id: user.id,
        display_name: currentUserProfile?.display_name || null,
        avatar_url: currentUserProfile?.avatar_url || null,
        status: currentUserProgress?.status || null,
        progress: currentUserProgress?.progress || 0,
        started_at: currentUserProgress?.started_at || null,
        finished_at: currentUserProgress?.finished_at || null,
        reading_time_days: calculateReadingDays(
          currentUserProgress?.started_at || null,
          currentUserProgress?.finished_at || null
        ),
        review_rating: currentUserReview?.rating ?? null,
        review_content: currentUserReview?.content ?? null,
      };

      // Merge current user with friends
      const allProgress = [currentUserData, ...friendsProgress];

      // Step 7: Sort - read (by time), reading (by progress), to_read, not_planned, then null
      return allProgress.sort((a, b) => {
        // Priority order: read > reading > to_read > not_planned > null
        const statusOrder = { read: 0, reading: 1, to_read: 2, not_planned: 3 };
        const aOrder = a.status ? statusOrder[a.status] : 4;
        const bOrder = b.status ? statusOrder[b.status] : 4;

        if (aOrder !== bOrder) return aOrder - bOrder;

        // Within same status, sort by specific criteria
        if (a.status === 'read' && b.status === 'read') {
          // Sort by finished_at date (earliest first - who finished first)
          const aFinished = a.finished_at ? new Date(a.finished_at).getTime() : Infinity;
          const bFinished = b.finished_at ? new Date(b.finished_at).getTime() : Infinity;
          return aFinished - bFinished;
        }

        if (a.status === 'reading' && b.status === 'reading') {
          // Sort by progress (higher first)
          return b.progress - a.progress;
        }

        // For others, sort by name
        const aName = a.display_name || '';
        const bName = b.display_name || '';
        return aName.localeCompare(bName);
      });
    },
    enabled: !!bookId && !!user,
  });
}
