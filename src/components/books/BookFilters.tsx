import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X, Filter, ChevronUp } from 'lucide-react';
import { useGenres } from '@/hooks/useGenres';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { getGenreTranslationKey } from '@/lib/i18n/translations';
import type { ReadingStatus } from '@/hooks/useReadingProgress';

interface BookFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ReadingStatus | 'all';
  onStatusChange: (value: ReadingStatus | 'all') => void;
  genreFilter: string | 'all';
  onGenreChange: (value: string | 'all') => void;
  authorFilter: string | 'all';
  onAuthorChange: (value: string | 'all') => void;
  authors: string[];
  onClearFilters: () => void;
  hideStatusFilter?: boolean;
  showNotPlanned: boolean;
  onToggleNotPlanned: (value: boolean) => void;
}

export function BookFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  genreFilter,
  onGenreChange,
  authorFilter,
  onAuthorChange,
  authors,
  onClearFilters,
  hideStatusFilter = false,
  showNotPlanned,
  onToggleNotPlanned,
}: BookFiltersProps) {
  const { data: genres } = useGenres();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters = search || (!hideStatusFilter && statusFilter !== 'all') || genreFilter !== 'all' || authorFilter !== 'all';
  
  const activeFilterCount = [
    !hideStatusFilter && statusFilter !== 'all',
    genreFilter !== 'all',
    authorFilter !== 'all',
    showNotPlanned
  ].filter(Boolean).length;

  if (isMobile && !isExpanded) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsExpanded(true)}
        >
          <Filter className="h-4 w-4 mr-2" />
          {t('filters.show')}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  if (isMobile && isExpanded) {
    return (
      <div className="space-y-3 mb-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setIsExpanded(false)}
        >
          <ChevronUp className="h-4 w-4 mr-2" />
          {t('filters.hide')}
        </Button>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('filters.search')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={genreFilter} onValueChange={(v) => onGenreChange(v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('filters.genre')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allGenres')}</SelectItem>
              {genres?.map((genre) => (
                <SelectItem key={genre.id} value={genre.id}>
                  {t(getGenreTranslationKey(genre.slug))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {authors.length > 0 && (
            <Select value={authorFilter} onValueChange={(v) => onAuthorChange(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('filters.author')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allAuthors')}</SelectItem>
                {authors.map((author) => (
                  <SelectItem key={author} value={author}>
                    {author}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!hideStatusFilter && (
            <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as ReadingStatus | 'all')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('filters.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('status.all')}</SelectItem>
                <SelectItem value="not_planned">{t('status.notPlanned')}</SelectItem>
                <SelectItem value="to_read">{t('status.toRead')}</SelectItem>
                <SelectItem value="reading">{t('status.reading')}</SelectItem>
                <SelectItem value="read">{t('status.read')}</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="show-not-planned-mobile" className="cursor-pointer">
              {t('filters.showNotPlanned')}
            </Label>
            <Switch
              id="show-not-planned-mobile"
              checked={showNotPlanned}
              onCheckedChange={onToggleNotPlanned}
            />
          </div>

          <Button variant="outline" className="w-full" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            {t('filters.clear')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('filters.search')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={genreFilter} onValueChange={(v) => onGenreChange(v)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t('filters.genre')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.allGenres')}</SelectItem>
          {genres?.map((genre) => (
            <SelectItem key={genre.id} value={genre.id}>
              {t(getGenreTranslationKey(genre.slug))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {authors.length > 0 && (
        <Select value={authorFilter} onValueChange={(v) => onAuthorChange(v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('filters.author')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allAuthors')}</SelectItem>
            {authors.map((author) => (
              <SelectItem key={author} value={author}>
                {author}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!hideStatusFilter && (
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as ReadingStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('status.all')}</SelectItem>
            <SelectItem value="not_planned">{t('status.notPlanned')}</SelectItem>
            <SelectItem value="to_read">{t('status.toRead')}</SelectItem>
            <SelectItem value="reading">{t('status.reading')}</SelectItem>
            <SelectItem value="read">{t('status.read')}</SelectItem>
          </SelectContent>
        </Select>
      )}

      <div className="flex items-center gap-2 px-3 py-1 border rounded-md bg-background">
        <Switch
          id="show-not-planned"
          checked={showNotPlanned}
          onCheckedChange={onToggleNotPlanned}
        />
        <Label htmlFor="show-not-planned" className="text-sm cursor-pointer">
          {t('filters.showNotPlanned')}
        </Label>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={onClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
