import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, ChevronRight, Check, BookOpen, Clock } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';

interface Step3_FriendsProps {
  onContinue: () => void;
  isInviteMode?: boolean;
}

interface MockFriend {
  name: string;
  avatar: string;
  books: number;
  reading: number;
  status: 'read' | 'reading' | 'to_read';
  progress?: number;
  finishedDays?: number;
}

const mockFriends: MockFriend[] = [
  { name: 'Ana', avatar: 'A', books: 12, reading: 3, status: 'read', finishedDays: 2 },
  { name: 'Miguel', avatar: 'M', books: 8, reading: 1, status: 'reading', progress: 45 },
  { name: 'Sofia', avatar: 'S', books: 15, reading: 2, status: 'read', finishedDays: 5 },
];

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatReadingTime(days: number): string {
  if (days === 0) return '<1 day';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function Step3_Friends({ onContinue, isInviteMode = false }: Step3_FriendsProps) {
  const { t, language } = useLanguage();
  const { inviterName } = useOnboarding();

  if (isInviteMode && inviterName) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            {t('onboarding.friendsTitle')}
          </h2>
          <p className="text-muted-foreground">
            {t('onboarding.friendsDesc')}
          </p>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900 rounded-full p-2">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                {t('onboarding.inviteFriends')}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('joinInvite.welcomeDesc').replace('{name}', inviterName)}
              </p>
            </div>
          </div>
        </div>

        <Button onClick={onContinue} className="w-full">
          {t('onboarding.continue')}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t('onboarding.step3Title')}</h2>
        <p className="text-muted-foreground">{t('onboarding.friendsDesc')}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t('onboarding.scoreboardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y">
            {mockFriends.map((friend, index) => {
              const isRead = friend.status === 'read';
              const isReading = friend.status === 'reading';
              const isTopThree = isRead && index < 3;

              return (
                <div key={friend.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-8 flex-shrink-0 text-center">
                    {isRead && (
                      <>
                        {index === 0 && <Trophy className="h-5 w-5 text-primary mx-auto" />}
                        {index === 1 && <Trophy className="h-5 w-5 text-muted-foreground mx-auto" />}
                        {index === 2 && <Trophy className="h-5 w-5 text-accent-foreground mx-auto" />}
                        {index > 2 && <span className="text-sm text-muted-foreground">{index + 1}º</span>}
                      </>
                    )}
                  </div>

                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {friend.avatar}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{friend.name}</p>
                    </div>
                    {isReading && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {friend.progress}% {t('status.reading').toLowerCase()}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {isRead && friend.finishedDays !== undefined && (
                      <Badge variant={isTopThree ? 'default' : 'secondary'} className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatReadingTime(friend.finishedDays)}
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
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-primary/5 rounded-lg">
        <div className="flex items-start gap-3">
          <Trophy className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">{t('onboarding.inviteFriends')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('onboarding.inviteFriendsDesc')}
            </p>
          </div>
        </div>
      </div>

      <Button onClick={onContinue} className="w-full">
        {t('onboarding.continue')}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
