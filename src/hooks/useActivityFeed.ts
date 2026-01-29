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
      // Get friend IDs
      const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`);

      if (friendsError) throw friendsError;

      const friendIds = friendships.map((f) =>
        f.user_id === user!.id ? f.friend_id : f.user_id
      );

      if (friendIds.length === 0) return [];

      // Get reading progress updates from friends
      const { data: progressData, error: progressError } = await supabase
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
        .limit(20);

      if (progressError) throw progressError;

      // Get profiles for friend IDs
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', friendIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles.map((p) => [p.user_id, p.display_name]));

      // Get reviews from friends
      const { data: reviewsData, error: reviewsError } = await supabase
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
        .limit(10);

      if (reviewsError) throw reviewsError;

      // Combine and sort activities
      const activities: Activity[] = [
        ...progressData.map((p) => ({
          id: `progress-${p.id}`,
          type: (p.status === 'read' ? 'finished' : 'reading') as 'reading' | 'finished',
          user_id: p.user_id,
          user_name: profileMap.get(p.user_id) || null,
          book_id: p.book_id,
          book_title: (p.book as unknown as { title: string })?.title || 'Livro desconhecido',
          created_at: p.updated_at,
        })),
        ...reviewsData.map((r) => ({
          id: `review-${r.id}`,
          type: 'review' as const,
          user_id: r.user_id,
          user_name: profileMap.get(r.user_id) || null,
          book_id: r.book_id,
          book_title: (r.book as unknown as { title: string })?.title || 'Livro desconhecido',
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
