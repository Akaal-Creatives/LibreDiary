import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { i18n } from '@/i18n';

import AdminTranslationsPage from '../AdminTranslationsPage.vue';

function mountPage() {
  return mount(AdminTranslationsPage, {
    global: {
      plugins: [i18n],
      stubs: { Teleport: true },
    },
  });
}

describe('AdminTranslationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  // ===========================================
  // PAGE HEADER
  // ===========================================

  describe('page header', () => {
    it('renders the page title', () => {
      const wrapper = mountPage();
      expect(wrapper.find('.page-title').text()).toBe('Translation Status');
    });

    it('renders the page description', () => {
      const wrapper = mountPage();
      expect(wrapper.find('.page-description').text()).toContain(
        'Overview of translation progress'
      );
    });
  });

  // ===========================================
  // SUMMARY CARDS
  // ===========================================

  describe('summary cards', () => {
    it('shows total languages count', () => {
      const wrapper = mountPage();
      const stats = wrapper.findAll('.stat-value');
      // First stat should be total languages count = 17
      expect(stats[0].text()).toBe('17');
    });

    it('shows fully translated count', () => {
      const wrapper = mountPage();
      const stats = wrapper.findAll('.stat-value');
      // en-GB should always be 100% (at minimum)
      const fullyTranslated = parseInt(stats[1].text(), 10);
      expect(fullyTranslated).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================
  // TRANSLATION TABLE
  // ===========================================

  describe('translation table', () => {
    it('shows a row per locale', () => {
      const wrapper = mountPage();
      const rows = wrapper.findAll('.translation-row');
      expect(rows.length).toBe(17);
    });

    it('shows en-GB as 100% complete', () => {
      const wrapper = mountPage();
      const rows = wrapper.findAll('.translation-row');
      // en-GB should be first (complete, sorted first)
      const enGBRow = rows.find((row) => row.text().includes('English (UK)'));
      expect(enGBRow).toBeDefined();
      expect(enGBRow!.text()).toContain('100%');
      expect(enGBRow!.find('.status-badge--complete').exists()).toBe(true);
    });

    it('shows skeleton locales as 0% with skeleton badge', () => {
      const wrapper = mountPage();
      const rows = wrapper.findAll('.translation-row');
      // Find a skeleton locale (e.g. French, which has empty JSON)
      const frRow = rows.find((row) => row.text().includes('Français'));
      expect(frRow).toBeDefined();
      expect(frRow!.text()).toContain('0%');
      expect(frRow!.find('.status-badge--skeleton').exists()).toBe(true);
    });

    it('shows progress bar for each locale', () => {
      const wrapper = mountPage();
      const bars = wrapper.findAll('.progress-bar');
      expect(bars.length).toBe(17);
    });

    it('progress bar width matches percentage for en-GB', () => {
      const wrapper = mountPage();
      const rows = wrapper.findAll('.translation-row');
      const enGBRow = rows.find((row) => row.text().includes('English (UK)'));
      const bar = enGBRow!.find('.progress-bar-fill');
      expect(bar.attributes('style')).toContain('width: 100%');
    });

    it('shows download button for each locale', () => {
      const wrapper = mountPage();
      const downloadButtons = wrapper.findAll('.download-btn');
      expect(downloadButtons.length).toBe(17);
    });
  });

  // ===========================================
  // EXPANDABLE MISSING KEYS
  // ===========================================

  describe('expandable missing keys', () => {
    it('shows expand button for locales with missing keys', () => {
      const wrapper = mountPage();
      const expandButtons = wrapper.findAll('.expand-btn');
      // Should have expand buttons for locales with missing keys (not for complete ones)
      expect(expandButtons.length).toBeGreaterThan(0);
    });

    it('expands missing keys list on click', async () => {
      const wrapper = mountPage();
      const expandButtons = wrapper.findAll('.expand-btn');

      // Click first expand button
      await expandButtons[0].trigger('click');

      const missingList = wrapper.find('.missing-keys-list');
      expect(missingList.exists()).toBe(true);
    });
  });
});
