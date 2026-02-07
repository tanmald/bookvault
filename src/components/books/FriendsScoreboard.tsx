import { useFriendsBookProgress, FriendProgress } from '@/hooks/useFriendsBookProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Trophy, Users, BookOpen, Clock, CheckCircle, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FriendsScoreboardProps {
  bookId: string;
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function FriendsScoreboard({ bookId }: FriendsScoreboardProps) {
  const { user } = useAuth();
  const { data: friendsProgress, isLoading } = useFriendsBookProgress(bookId);
  const { t } = useLanguage();

  const formatReadingTime = (days: number | null): string => {
    if (days === null) return '';
    if (days === 0) return t('scoreboard.lessThanDay');
    if (days === 1) return t('scoreboard.oneDay');
    return `${days} ${t('scoreboard.days')}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Count readers by status for summary
  const readCount = friendsProgress?.filter((f) => f.status === 'read').length || 0;
  const readingCount = friendsProgress?.filter((f) => f.status === 'reading').length || 0;

  // Calculate rank only for readers who finished
  let readRank = 0;
  const friendsWithRank = friendsProgress?.map((friend) => {
    if (friend.status === 'read') {
      readRank++;
      return { ...friend, rank: readRank };
    }
    return { ...friend, rank: 0 };
  });

  const FriendProgressItem = ({
    friend,
    rank,
  }: {
    friend: FriendProgress;
    rank: number;
  }) => {
    const isRead = friend.status === 'read';
    const isReading = friend.status === 'reading';
    const isTopThree = isRead && rank <= 3;
    const hasReview = friend.review_rating !== null;

    return (
      <div className="py-2">
        <div className="flex items-center gap-3">
          {/* Rank for completed readers */}
          <div className="w-8 flex-shrink-0 text-center">
            {isRead && (
              <>
                {rank === 1 && <Trophy className="h-5 w-5 text-primary mx-auto" />}
                {rank === 2 && <Trophy className="h-5 w-5 text-muted-foreground mx-auto" />}
                {rank === 3 && <Trophy className="h-5 w-5 text-accent-foreground mx-auto" />}
                {rank > 3 && (
                  <span className="text-sm text-muted-foreground">{rank}º</span>
                )}
              </>
            )}
          </div>

          {/* Avatar */}
          <Avatar className="h-9 w-9">
            <AvatarImage src={friend.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(friend.display_name)}
            </AvatarFallback>
          </Avatar>

          {/* Name and status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">
                {friend.display_name || t('friends.user')}
              </p>
              {friend.user_id === user?.id && (
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {t('scoreboard.you')}
                </Badge>
              )}
            </div>
          </div>

          {/* Status badge / reading time */}
          <div className="flex-shrink-0">
            {isRead && friend.finished_at && (
              <Badge
                variant={isTopThree ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                {formatDate(friend.finished_at)}
              </Badge>
            )}
            {isReading && (
              <Badge variant="outline" className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {t('status.reading')}
              </Badge>
            )}
            {friend.status === 'to_read' && (
              <Badge variant="secondary" className="text-muted-foreground">
                {t('status.toRead')}
              </Badge>
            )}
            {!friend.status && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        </div>

        {/* Review section for completed readers with reviews */}
        {isRead && hasReview && (
          <div className="mt-2 ml-11 pl-3 border-l-2 border-muted">
            {/* Star rating */}
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= (friend.review_rating || 0)
                      ? 'fill-accent text-accent'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            {/* Comment (if exists) */}
            {friend.review_content && (
              <p className="text-sm text-muted-foreground italic line-clamp-2">
                "{friend.review_content}"
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const ScoreboardSkeleton = () => {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">{t('scoreboard.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ScoreboardSkeleton />
        ) : !friendsProgress || friendsProgress.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('scoreboard.noFriends')}
            description={t('scoreboard.inviteFriends')}
            size="sm"
          />
        ) : (
          <>
            {/* Summary badges */}
            {(readCount > 0 || readingCount > 0) && (
              <div className="flex gap-2 mb-4">
                {readCount > 0 && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {readCount} {readCount === 1 ? t('scoreboard.read') : t('scoreboard.readPlural')}
                  </Badge>
                )}
                {readingCount > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {readingCount} {t('scoreboard.currentlyReading')}
                  </Badge>
                )}
              </div>
            )}

            {/* Friends list */}
            <div className="divide-y">
              {friendsWithRank?.map((friend) => (
                <FriendProgressItem
                  key={friend.user_id}
                  friend={friend}
                  rank={friend.rank}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
