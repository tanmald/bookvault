import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildShareText,
  computeBooksReadInYear,
  computeDaysToRead,
  shareCardImage,
  fetchImageAsDataUrl,
} from './shareCard';
import type { ReadingProgress } from '@/hooks/useReadingProgress';
import type { TranslationKey } from '@/lib/i18n/translations';

const makeProgress = (overrides: Partial<ReadingProgress>): ReadingProgress => ({
  id: 'p1',
  user_id: 'u1',
  book_id: 'b1',
  status: 'read',
  progress: 100,
  sort_order: null,
  started_at: null,
  finished_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('computeDaysToRead', () => {
  it('returns null when either date is missing', () => {
    expect(computeDaysToRead(null, '2026-01-10T00:00:00Z')).toBeNull();
    expect(computeDaysToRead('2026-01-01T00:00:00Z', null)).toBeNull();
    expect(computeDaysToRead(null, null)).toBeNull();
  });

  it('returns 1 for a same-day read', () => {
    expect(computeDaysToRead('2026-01-05T08:00:00Z', '2026-01-05T22:00:00Z')).toBe(1);
  });

  it('returns calendar days between start and finish', () => {
    expect(computeDaysToRead('2026-01-01T12:00:00Z', '2026-01-11T08:00:00Z')).toBe(10);
  });

  it('returns null when finish precedes start', () => {
    expect(computeDaysToRead('2026-01-10T00:00:00Z', '2026-01-01T00:00:00Z')).toBeNull();
  });
});

describe('computeBooksReadInYear', () => {
  it('counts only read books finished in the given year', () => {
    const progress = [
      makeProgress({ book_id: 'b1', finished_at: '2026-03-01T00:00:00Z' }),
      makeProgress({ book_id: 'b2', finished_at: '2026-11-20T00:00:00Z' }),
      makeProgress({ book_id: 'b3', finished_at: '2025-12-31T00:00:00Z' }),
      makeProgress({ book_id: 'b4', status: 'reading', finished_at: null }),
      makeProgress({ book_id: 'b5', finished_at: null }),
    ];
    expect(computeBooksReadInYear(progress, 2026)).toBe(2);
    expect(computeBooksReadInYear(progress, 2025)).toBe(1);
    expect(computeBooksReadInYear([], 2026)).toBe(0);
  });
});

describe('buildShareText', () => {
  const templates: Record<string, string> = {
    'shareCard.byAuthor': ' by {author}',
    'shareCard.shareText': 'I just finished "{title}"{by} in {days} days! 📚 BookVault',
    'shareCard.shareTextOneDay': 'I just finished "{title}"{by} in a single day! 📚 BookVault',
    'shareCard.shareTextNoDays': 'I just finished "{title}"{by}! 📚 BookVault',
  };
  const t = (key: TranslationKey) => templates[key] ?? key;

  it('interpolates title, author and days', () => {
    expect(buildShareText(t, { title: 'Dune', author: 'Frank Herbert', days: 12 })).toBe(
      'I just finished "Dune" by Frank Herbert in 12 days! 📚 BookVault'
    );
  });

  it('uses the single-day template for one day', () => {
    expect(buildShareText(t, { title: 'Dune', author: 'Frank Herbert', days: 1 })).toBe(
      'I just finished "Dune" by Frank Herbert in a single day! 📚 BookVault'
    );
  });

  it('omits days and author when missing', () => {
    expect(buildShareText(t, { title: 'Dune', author: null, days: null })).toBe(
      'I just finished "Dune"! 📚 BookVault'
    );
  });
});

describe('shareCardImage', () => {
  const blob = new Blob(['png-bytes'], { type: 'image/png' });
  const meta = { title: 'Title', text: 'Text' };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses the Web Share API when files are shareable', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });

    await expect(shareCardImage(blob, 'card.png', meta)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Title', text: 'Text', files: expect.any(Array) })
    );
  });

  it('returns cancelled when the user aborts the share sheet', async () => {
    const abort = new Error('cancelled');
    abort.name = 'AbortError';
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(abort),
      canShare: () => true,
    });

    await expect(shareCardImage(blob, 'card.png', meta)).resolves.toBe('cancelled');
  });

  it('falls back to the image clipboard when file sharing is unavailable', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { write } });
    vi.stubGlobal(
      'ClipboardItem',
      class {
        constructor(public items: Record<string, Blob>) {}
      }
    );

    await expect(shareCardImage(blob, 'card.png', meta)).resolves.toBe('copied');
    expect(write).toHaveBeenCalledOnce();
  });

  it('falls back to download when neither share nor clipboard is available', async () => {
    vi.stubGlobal('navigator', {});
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await expect(shareCardImage(blob, 'card.png', meta)).resolves.toBe('downloaded');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});

describe('fetchImageAsDataUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('strips the nocache param and returns a data URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['img'], { type: 'image/png' })),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchImageAsDataUrl('https://example.com/cover.png?nocache=3&v=1');

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/cover.png?v=1');
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('returns null on network failure or non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(fetchImageAsDataUrl('https://example.com/cover.png')).resolves.toBeNull();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchImageAsDataUrl('https://example.com/cover.png')).resolves.toBeNull();

    await expect(fetchImageAsDataUrl('not-a-url')).resolves.toBeNull();
  });
});
