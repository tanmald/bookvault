import { useFriendsBookProgress, FriendProgress } from '@/hooks/useFriendsBookProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Users, BookOpen, Clock, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FriendsScoreboardProps {
  bookId: string;
}

function formatReadingTime(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'menos de 1 dia';
  if (days === 1) return '1 dia';
  return `${days} dias`;
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

function FriendProgressItem({
  friend,
  rank,
}: {
  friend: FriendProgress;
  rank: number;
}) {
  const isRead = friend.status === 'read';
  const isReading = friend.status === 'reading';
  const isTopThree = isRead && rank <= 3;

  return (
    <div className="flex items-center gap-3 py-2">
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
        <p className="font-medium truncate">
          {friend.display_name || 'Utilizador'}
        </p>
        {isReading && (
          <div className="flex items-center gap-2 mt-1">
            <Progress value={friend.progress} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {friend.progress}%
            </span>
          </div>
        )}
      </div>

      {/* Status badge / reading time */}
      <div className="flex-shrink-0">
        {isRead && friend.reading_time_days !== null && (
          <Badge
            variant={isTopThree ? 'default' : 'secondary'}
            className="flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            {formatReadingTime(friend.reading_time_days)}
          </Badge>
        )}
        {isReading && (
          <Badge variant="outline" className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            A Ler
          </Badge>
        )}
        {friend.status === 'to_read' && (
          <Badge variant="secondary" className="text-muted-foreground">
            Para Ler
          </Badge>
        )}
        {!friend.status && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

function ScoreboardSkeleton() {
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
}

export function FriendsScoreboard({ bookId }: FriendsScoreboardProps) {
  const { data: friendsProgress, isLoading } = useFriendsBookProgress(bookId);

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <CardTitle className="text-lg">Scoreboard dajamigaz</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ScoreboardSkeleton />
        ) : !friendsProgress || friendsProgress.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Ainda não tens amigos!</p>
            <p className="text-xs mt-1">Convida amigos para comparar leituras.</p>
          </div>
        ) : (
          <>
            {/* Summary badges */}
            {(readCount > 0 || readingCount > 0) && (
              <div className="flex gap-2 mb-4">
                {readCount > 0 && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {readCount} {readCount === 1 ? 'leu' : 'leram'}
                  </Badge>
                )}
                {readingCount > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {readingCount} a ler
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
