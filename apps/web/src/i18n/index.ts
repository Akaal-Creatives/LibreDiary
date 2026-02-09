import { createI18n } from 'vue-i18n';
import enGB from '../locales/en-GB.json';
import enUS from '../locales/en-US.json';

export type LocaleCode = 'en-GB' | 'en-US';

export const SUPPORTED_LOCALES: Record<LocaleCode, { name: string }> = {
  'en-GB': { name: 'English (UK)' },
  'en-US': { name: 'English (US)' },
};

export const DEFAULT_LOCALE: LocaleCode = 'en-GB';

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: 'en-GB',
  messages: {
    'en-GB': enGB,
    'en-US': enUS,
  },
});
