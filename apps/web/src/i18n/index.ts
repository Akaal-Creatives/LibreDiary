import { createI18n } from 'vue-i18n';
import enGB from '../locales/en-GB.json';

export const SUPPORTED_LOCALES = {
  'en-GB': { name: 'English (UK)', nativeName: 'English (UK)', dir: 'ltr' as const },
  'en-US': { name: 'English (US)', nativeName: 'English (US)', dir: 'ltr' as const },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' as const },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' as const },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' as const },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr' as const },
  'pt-BR': { name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', dir: 'ltr' as const },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' as const },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '简体中文', dir: 'ltr' as const },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' as const },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' as const },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' as const },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' as const },
  nl: { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' as const },
  tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' as const },
  pl: { name: 'Polish', nativeName: 'Polski', dir: 'ltr' as const },
  sv: { name: 'Swedish', nativeName: 'Svenska', dir: 'ltr' as const },
} as const;

export type LocaleCode = keyof typeof SUPPORTED_LOCALES;

export const DEFAULT_LOCALE: LocaleCode = 'en-GB';

const loadedLocales = new Set<string>(['en-GB']);

const localeImports: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  'en-US': () => import('../locales/en-US.json'),
  fr: () => import('../locales/fr.json'),
  es: () => import('../locales/es.json'),
  de: () => import('../locales/de.json'),
  it: () => import('../locales/it.json'),
  'pt-BR': () => import('../locales/pt-BR.json'),
  ja: () => import('../locales/ja.json'),
  'zh-CN': () => import('../locales/zh-CN.json'),
  ko: () => import('../locales/ko.json'),
  ar: () => import('../locales/ar.json'),
  hi: () => import('../locales/hi.json'),
  ru: () => import('../locales/ru.json'),
  nl: () => import('../locales/nl.json'),
  tr: () => import('../locales/tr.json'),
  pl: () => import('../locales/pl.json'),
  sv: () => import('../locales/sv.json'),
};

export async function loadLocaleMessages(locale: LocaleCode): Promise<void> {
  if (loadedLocales.has(locale)) return;

  const importFn = localeImports[locale];
  if (!importFn) return;

  const messages = await importFn();
  i18n.global.setLocaleMessage(locale, messages.default as typeof enGB);
  loadedLocales.add(locale);
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: 'en-GB',
  messages: {
    'en-GB': enGB,
  },
});
