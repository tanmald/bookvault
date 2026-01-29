export const SUPPORTED_LANGUAGES = [
  { code: 'pt', name: 'Português' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code.toUpperCase();
}
