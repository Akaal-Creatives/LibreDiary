import '@testing-library/jest-dom/vitest';
import { config } from '@vue/test-utils';
import { i18n } from '@/i18n';

// Register i18n globally for all component tests
config.global.plugins = [i18n];

// Mock window.matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
