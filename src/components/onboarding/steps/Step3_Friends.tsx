import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Star, ChevronRight, Check, UserPlus } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';

interface Step3_FriendsProps {
  onContinue: () => void;
  isInviteMode?: boolean;
}

const mockFriends = [
  { name: 'Ana', books: 12, reading: 3, avatar: 'A' },
  { name: 'Miguel', books: 8, reading: 1, avatar: 'M' },
  { name: 'Sofia', books: 15, reading: 2, avatar: 'S' },
];

export function Step3_Friends({ onContinue, isInviteMode = false }: Step3_FriendsProps) {
  const { t } = useLanguage();
  const { inviterName } = useOnboarding();

  // In invite mode, show simplified UI
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
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold">{t('onboarding.scoreboardTitle')}</h3>
          </div>

          <div className="space-y-3">
            {mockFriends.map((friend, index) => (
              <div
                key={friend.name}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-medium">
                    {index + 1}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {friend.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{friend.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{friend.books} books</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {friend.reading} reading
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Trophy className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">{t('onboarding.inviteFriends')}</p>
            <p className="text-sm text-muted-foreground">
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
