import { toBlob } from 'html-to-image';
import { differenceInCalendarDays } from 'date-fns';
import type { ReadingProgress } from '@/hooks/useReadingProgress';
import type { TranslationKey } from '@/lib/i18n/translations';

type Translate = (key: TranslationKey) => string;

export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'cancelled';

export function computeDaysToRead(
  startedAt: string | null,
  finishedAt: string | null
): number | null {
  if (!startedAt || !finishedAt) return null;
  const days = differenceInCalendarDays(new Date(finishedAt), new Date(startedAt));
  if (Number.isNaN(days) || days < 0) return null;
  return Math.max(1, days);
}

export function computeBooksReadInYear(progress: ReadingProgress[], year: number): number {
  return progress.filter(
    (p) =>
      p.status === 'read' &&
      p.finished_at &&
      new Date(p.finished_at).getFullYear() === year
  ).length;
}

export function buildShareText(
  t: Translate,
  { title, author, days }: { title: string; author: string | null; days: number | null }
): string {
  const by = author ? t('shareCard.byAuthor').replace('{author}', author) : '';
  const template =
    days === null
      ? t('shareCard.shareTextNoDays')
      : days === 1
        ? t('shareCard.shareTextOneDay')
        : t('shareCard.shareText');
  return template
    .replace('{title}', title)
    .replace('{by}', by)
    .replace('{days}', String(days ?? ''));
}

// Fetch the cover through the network and hand it to the card as a data URL:
// a data-URL <img> is same-origin by definition, so the rasterization canvas
// is never CORS-tainted regardless of the storage host's headers.
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const cleanUrl = new URL(url);
    cleanUrl.searchParams.delete('nocache');
    const response = await fetch(cleanUrl.toString());
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function isSafari(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  );
}

export async function generateCardImage(node: HTMLElement): Promise<Blob> {
  const options = {
    pixelRatio: 3,
    cacheBust: true,
    width: node.offsetWidth,
    height: node.offsetHeight,
    // The preview wrapper scales the card down to fit the dialog; capture
    // the card at its intrinsic size.
    style: { transform: 'none' },
  };
  // Safari can rasterize before images/fonts finish decoding on the first
  // pass — render twice and keep the second result.
  if (isSafari()) await toBlob(node, options);
  const blob = await toBlob(node, options);
  if (!blob) throw new Error('Failed to generate card image');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Share rungs, most to least native: Web Share API with a file (mobile),
// image clipboard (desktop Chrome/Safari), plain download (everything else).
// navigator.share alone isn't enough — desktop Chrome exposes it but rejects
// files, hence the canShare({ files }) check.
export async function shareCardImage(
  blob: Blob,
  filename: string,
  meta: { title: string; text: string }
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });

  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: meta.title, text: meta.text });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // fall through to the clipboard/download rungs
    }
  }

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return 'copied';
    } catch {
      // fall through to download
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}
