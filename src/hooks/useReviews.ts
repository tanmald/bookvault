import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import posthog from '@/lib/posthog';

export interface Review {
  id: string;
  user_id: string;
  book_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export function useReviews(bookId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get the current user's review for a specific book
  const myReviewQuery = useQuery({
    queryKey: ['my-review', user?.id, bookId],
    queryFn: async () => {
      if (!user || !bookId) return null;

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data as Review | null;
    },
    enabled: !!user && !!bookId,
  });

  // Query to get all reviews for a book
  const bookReviewsQuery = useQuery({
    queryKey: ['book-reviews', bookId],
    queryFn: async () => {
      if (!bookId) return [];

      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('book_id', bookId);

      if (error) throw error;
      return data as Review[];
    },
    enabled: !!bookId,
  });

  // Mutation to upsert a review (create or update)
  const upsertReview = useMutation({
    mutationFn: async ({
      bookId,
      rating,
      content,
    }: {
      bookId: string;
      rating: number;
      content?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      if (!rating || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const { data, error } = await supabase
        .from('reviews')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          rating,
          content: content || null,
        }, {
          onConflict: 'user_id,book_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: ['my-review'] });
      queryClient.invalidateQueries({ queryKey: ['book-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['friends-book-progress'] });
      posthog.capture('review submitted', {
        book_id: review.book_id,
        rating: review.rating,
        has_content: !!review.content,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error saving review',
        description: error.message,
      });
    },
  });

  // Mutation to delete a review
  const deleteReview = useMutation({
    mutationFn: async (bookId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-review'] });
      queryClient.invalidateQueries({ queryKey: ['book-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['friends-book-progress'] });
      toast({
        title: 'Review deleted',
        description: 'Your review has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error deleting review',
        description: error.message,
      });
    },
  });

  return {
    myReview: myReviewQuery.data,
    isMyReviewLoading: myReviewQuery.isLoading,
    bookReviews: bookReviewsQuery.data,
    isBookReviewsLoading: bookReviewsQuery.isLoading,
    upsertReview,
    deleteReview,
  };
}

// Hook to get friend reviews for a book
export function useFriendReviews(bookId: string | undefined, friendIds: string[]) {
  return useQuery({
    queryKey: ['friend-reviews', bookId, friendIds],
    queryFn: async () => {
      if (!bookId || friendIds.length === 0) return [];

      const { data, error } = await supabase
        .from('reviews')
        .select('user_id, rating, content')
        .eq('book_id', bookId)
        .in('user_id', friendIds);

      if (error) throw error;
      return data as { user_id: string; rating: number; content: string | null }[];
    },
    enabled: !!bookId && friendIds.length > 0,
  });
}
