import { useState } from 'react';
import { useFriendsBookProgress, FriendProgress } from '@/hooks/useFriendsBookProgress';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Trophy, Users, BookOpen, Clock, CheckCircle, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/dateUtils';

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

/**
 * 🚨 CRITICAL: Only shows library_members, NOT friendships
 * This scoreboard MUST only display members of the book's library.
 * It should NEVER show global friends who aren't library members.
 * Uses get_library_friends_book_progress RPC which filters by library_members.
 */
export function FriendsScoreboard({ bookId }: FriendsScoreboardProps) {
  const { data: friendsProgress, isLoading } = useFriendsBookProgress(bookId);
  const { t } = useLanguage();
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const toggleComment = (userId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Count readers by status for summary
  const readCount = friendsProgress?.filter((f) => f.status === 'read').length || 0;
  const readingCount = friendsProgress?.filter((f) => f.status === 'reading').length || 0;

  // Sort: read (by reading time, fastest first) > reading > to_read
  interface FriendWithRank extends FriendProgress {
    rank?: number;
  }

  const friendsWithRank: FriendWithRank[] = [
    ...(friendsProgress
      ?.filter((f) => f.status === 'read')
      .sort((a, b) => (a.reading_time_days ?? 999) - (b.reading_time_days ?? 999))
      .map((friend, idx) => ({ ...friend, rank: idx + 1 })) || []),
    ...(friendsProgress?.filter((f) => f.status === 'reading') || []),
    ...(friendsProgress?.filter((f) => f.status === 'to_read') || []),
  ];

  const showRank = readCount > 0;

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

    return (
      <div className="flex items-center gap-3 py-2">
        {/* Rank for completed readers */}
        {showRank && (
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
        )}

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
            {friend.review_rating && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3 w-3",
                      i < friend.review_rating!
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
          {isReading && (
            <div className="flex items-center gap-2 mt-1">
              <Progress value={friend.progress} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {friend.progress}%
              </span>
            </div>
          )}
          {isRead && friend.review_text && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => toggleComment(friend.user_id)}
              >
                {expandedComments.has(friend.user_id) ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    {t('review.hideComment')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    {t('review.showComment')}
                  </>
                )}
              </Button>
              {expandedComments.has(friend.user_id) && (
                <p className="mt-1 text-sm text-muted-foreground italic border-l-2 border-muted pl-2">
                  "{friend.review_text}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Status badge / reading time */}
        <div className="flex-shrink-0">
          {isRead && friend.finished_at && (
            <Badge
              variant={isTopThree ? 'default' : 'secondary'}
              className="flex items-center gap-1"
            >
              <Clock className="h-3 w-3" />
              {formatDate(friend.finished_at, language)}
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
