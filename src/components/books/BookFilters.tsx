import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useGenres } from '@/hooks/useGenres';
import type { ReadingStatus } from '@/hooks/useReadingProgress';

interface BookFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ReadingStatus | 'all';
  onStatusChange: (value: ReadingStatus | 'all') => void;
  genreFilter: string | 'all';
  onGenreChange: (value: string | 'all') => void;
  onClearFilters: () => void;
  hideStatusFilter?: boolean;
}

export function BookFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  genreFilter,
  onGenreChange,
  onClearFilters,
  hideStatusFilter = false,
}: BookFiltersProps) {
  const { data: genres } = useGenres();

  const hasActiveFilters = search || (!hideStatusFilter && statusFilter !== 'all') || genreFilter !== 'all';

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por título ou autor..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {!hideStatusFilter && (
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as ReadingStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="to_read">Para Ler</SelectItem>
            <SelectItem value="reading">A Ler</SelectItem>
            <SelectItem value="read">Lido</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select value={genreFilter} onValueChange={(v) => onGenreChange(v)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Género" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os géneros</SelectItem>
          {genres?.map((genre) => (
            <SelectItem key={genre.id} value={genre.id}>
              {genre.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={onClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
