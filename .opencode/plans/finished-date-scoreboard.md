# Implementation Plan: Finished Date Scoreboard Display and Editing

## Overview
Implement finished date display in FriendsScoreboard and date editing functionality in BookDetails page.

---

## Files to Modify

1. `src/hooks/useReadingProgress.ts` - Add `updateFinishedDate` mutation
2. `src/components/books/FriendsScoreboard.tsx` - Add date display with `formatDate` helper
3. `src/pages/BookDetails.tsx` - Add date editing UI with Popover + Calendar
4. `src/lib/i18n/translations.ts` - Add PT and EN translations

---

## Step 1: useReadingProgress.ts

Add the `updateFinishedDate` mutation to the hook return object.

```typescript
// Add to the return object
const updateFinishedDate = useMutation({
  mutationFn: async ({ bookId, finishedAt }: { bookId: string; finishedAt: string }) => {
    const { data, error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: user.id,
        book_id: bookId,
        finished_at: finishedAt,
        status: 'read',
        progress: 100,
      }, {
        onConflict: 'user_id,book_id',
      })
      .select()
      .single();
    if (error) throw error;
    return data as ReadingProgress;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['reading-progress'] });
    toast({
      title: t('toast.success'),
      description: t('book.finishedDateUpdated'),
    });
  },
});

// Return object update
return {
  // ... existing properties
  updateFinishedDate,
};
```

---

## Step 2: FriendsScoreboard.tsx

### Import Clock icon
```typescript
import { Clock, Trophy, Medal, Award } from 'lucide-react';
```

### Add formatDate helper
```typescript
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('default', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
```

### Add date display in badge
```typescript
// Inside the friend row rendering
{isRead && friend.finished_at && (
  <Badge variant={isTopThree ? 'default' : 'secondary'} className="flex items-center gap-1">
    <Clock className="h-3 w-3" />
    {formatDate(friend.finished_at)}
  </Badge>
)}
```

---

## Step 3: BookDetails.tsx

### Import required components
```typescript
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Pencil } from 'lucide-react';
```

### Add state
```typescript
const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
```

### Get updateFinishedDate mutation
```typescript
const { progress, updateProgress, updateFinishedDate, isLoading: isProgressLoading } = useReadingProgress(bookId);
```

### Add date editing UI (inside the StatusBadge section)
```typescript
{progress?.status === 'read' && (
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">
      {t('book.finishedOn')}:
    </span>
    <span className="text-sm font-medium">
      {progress?.finished_at
        ? new Date(progress.finished_at).toLocaleDateString()
        : t('book.notFinished')}
    </span>
    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={progress?.finished_at ? new Date(progress.finished_at) : undefined}
          onSelect={(date) => {
            if (date) {
              // Validate not in future
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              if (date > today) {
                toast({
                  title: t('book.invalidDate'),
                  description: t('book.futureDateError'),
                  variant: 'destructive',
                });
                return;
              }
              updateFinishedDate.mutate({
                bookId,
                finishedAt: date.toISOString(),
              });
              setIsDatePickerOpen(false);
            }
          }}
          disabled={(date) => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            return date > today;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  </div>
)}
```

---

## Step 4: translations.ts

### Portuguese (PT) translations
```typescript
export const pt = {
  // ... existing translations
  book: {
    // ... existing
    finished: 'Concluído',
    finishedOn: 'Concluído em',
    editFinishedDate: 'Editar data de conclusão',
    finishedDateUpdated: 'Data de conclusão atualizada com sucesso',
    futureDateError: 'A data não pode ser no futuro',
    notFinished: 'Não concluído',
    invalidDate: 'Data inválida',
  },
  scoreboard: {
    title: 'Placar de Leitura',
    finishedDate: 'Concluído em',
  },
};
```

### English (EN) translations
```typescript
export const en = {
  // ... existing translations
  book: {
    // ... existing
    finished: 'Finished',
    finishedOn: 'Finished on',
    editFinishedDate: 'Edit finished date',
    finishedDateUpdated: 'Finished date updated successfully',
    futureDateError: 'Date cannot be in the future',
    notFinished: 'Not finished',
    invalidDate: 'Invalid date',
  },
  scoreboard: {
    title: 'Reading Scoreboard',
    finishedDate: 'Finished on',
  },
};
```

---

## Type Definitions

Ensure `ReadingProgress` type includes `finished_at`:

```typescript
export interface ReadingProgress {
  id?: string;
  user_id: string;
  book_id: string;
  status: 'not_planned' | 'to_read' | 'reading' | 'read';
  progress: number;
  finished_at?: string | null;
  created_at?: string;
  updated_at?: string;
}
```

---

## Database Schema Verification

Ensure the `reading_progress` table has the `finished_at` column:

```sql
ALTER TABLE reading_progress 
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;
```

---

## Verification Checklist

### Functionality
- [ ] Scoreboard shows finished date for 'read' books
- [ ] Date format is correct and localized
- [ ] BookDetails shows edit button for finished date
- [ ] Calendar picker opens on click
- [ ] Future dates are disabled in calendar
- [ ] Date updates correctly on selection
- [ ] Toast notification appears on success
- [ ] Both PT and EN translations work correctly
- [ ] No regressions in existing functionality

### UI/UX
- [ ] Date display is clear and readable in scoreboard
- [ ] Edit button is intuitive (pencil icon)
- [ ] Calendar is properly positioned
- [ ] Error messages are clear
- [ ] Loading states are handled

### Edge Cases
- [ ] Works when finished_at is null
- [ ] Works when status changes from 'read' to something else
- [ ] Handles timezone correctly
- [ ] Validates date on both client and server

---

## Testing Steps

1. **Scoreboard Display**
   - Navigate to a book with 'read' status
   - Verify finished date appears in scoreboard
   - Check date format matches locale

2. **Date Editing**
   - Open BookDetails for a finished book
   - Click pencil icon to edit date
   - Select a new date
   - Verify toast appears and date updates

3. **Validation**
   - Try to select a future date
   - Verify error message appears
   - Verify date is not updated

4. **Translations**
   - Switch to Portuguese
   - Verify all labels are translated
   - Switch to English
   - Verify all labels are translated

---

## Rollback Plan

If issues are found:

1. Revert the specific file changes
2. Clear browser cache
3. Verify existing functionality still works
4. Fix issues and redeploy
