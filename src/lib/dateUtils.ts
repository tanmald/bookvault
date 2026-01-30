/**
 * Format a date string for display
 */
export function formatDate(
  dateString: string | null | undefined,
  locale: string = 'pt-PT'
): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Format a date with time
 */
export function formatDateTime(
  dateString: string | null | undefined,
  locale: string = 'pt-PT'
): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Get relative time (e.g., "2 days ago", "just now")
 */
export function getRelativeTime(
  dateString: string | null | undefined,
  locale: string = 'pt-PT'
): string {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffMinutes < 1) {
      return locale.startsWith('pt') ? 'agora mesmo' : 'just now';
    } else if (diffMinutes < 60) {
      return rtf.format(-diffMinutes, 'minute');
    } else if (diffHours < 24) {
      return rtf.format(-diffHours, 'hour');
    } else if (diffDays < 30) {
      return rtf.format(-diffDays, 'day');
    } else {
      return formatDate(dateString, locale);
    }
  } catch {
    return '';
  }
}

/**
 * Calculate days between two dates
 */
export function daysBetween(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): number | null {
  if (!startDate || !endDate) return null;

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
