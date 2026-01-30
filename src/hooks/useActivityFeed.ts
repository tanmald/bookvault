import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Activity {
  id: string;
  type: 'reading' | 'finished' | 'review';
  user_id: string;
  user_name: string | null;
  book_id: string;
  book_title: string;
  rating?: number;
  created_at: string;
}

export function useActivityFeed() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['activity-feed', user?.id],
    queryFn: async () => {
      // Get friends with profiles in a single query (includes display_name)
      const { data: friends, error: friendsError } = await supabase
        .rpc('get_friends_with_profiles', { p_user_id: user!.id });

      if (friendsError) throw friendsError;
      if (!friends || friends.length === 0) return [];

      const friendIds = friends.map((f) => f.friend_user_id);
      const profileMap = new Map(friends.map((f) => [f.friend_user_id, f.display_name]));

      // Run reading progress and reviews queries in parallel
      const [progressResult, reviewsResult] = await Promise.all([
        supabase
          .from('reading_progress')
          .select(`
            id,
            user_id,
            book_id,
            status,
            updated_at,
            book:books(title)
          `)
          .in('user_id', friendIds)
          .in('status', ['reading', 'read'])
          .order('updated_at', { ascending: false })
          .limit(20),
        supabase
          .from('reviews')
          .select(`
            id,
            user_id,
            book_id,
            rating,
            created_at,
            book:books(title)
          `)
          .in('user_id', friendIds)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (progressResult.error) throw progressResult.error;
      if (reviewsResult.error) throw reviewsResult.error;

      const progressData = progressResult.data ?? [];
      const reviewsData = reviewsResult.data ?? [];

      // Combine and sort activities
      const activities: Activity[] = [
        ...progressData.map((p) => ({
          id: `progress-${p.id}`,
          type: (p.status === 'read' ? 'finished' : 'reading') as 'reading' | 'finished',
          user_id: p.user_id,
          user_name: profileMap.get(p.user_id) || null,
          book_id: p.book_id,
          book_title: (p.book as { title: string } | null)?.title || 'Livro desconhecido',
          created_at: p.updated_at,
        })),
        ...reviewsData.map((r) => ({
          id: `review-${r.id}`,
          type: 'review' as const,
          user_id: r.user_id,
          user_name: profileMap.get(r.user_id) || null,
          book_id: r.book_id,
          book_title: (r.book as { title: string } | null)?.title || 'Livro desconhecido',
          rating: r.rating,
          created_at: r.created_at,
        })),
      ];

      // Sort by date
      activities.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return activities.slice(0, 20);
    },
    enabled: !!user,
  });

  return {
    activities: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
