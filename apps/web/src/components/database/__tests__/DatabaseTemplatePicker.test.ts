import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { databaseTemplates } from '../databaseTemplates';
import DatabaseTemplatePicker from '../DatabaseTemplatePicker.vue';

describe('DatabaseTemplatePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  function mountComponent(props: { open?: boolean } = {}) {
    return mount(DatabaseTemplatePicker, {
      props: { open: true, ...props },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    });
  }

  // =========================================
  // Visibility
  // =========================================

  describe('visibility', () => {
    it('should render modal content when open is true', () => {
      const wrapper = mountComponent({ open: true });
      expect(wrapper.find('.modal-overlay').exists()).toBe(true);
    });

    it('should not render modal content when open is false', () => {
      const wrapper = mountComponent({ open: false });
      expect(wrapper.find('.modal-overlay').exists()).toBe(false);
    });
  });

  // =========================================
  // Template cards
  // =========================================

  describe('template cards', () => {
    it('should render all database templates as cards', () => {
      const wrapper = mountComponent();
      const cards = wrapper.findAll('.template-card');
      expect(cards).toHaveLength(databaseTemplates.length);
    });

    it('should display template name on each card', () => {
      const wrapper = mountComponent();
      const names = wrapper.findAll('.template-name').map((el) => el.text());
      for (const template of databaseTemplates) {
        expect(names).toContain(template.name);
      }
    });

    it('should display template description on each card', () => {
      const wrapper = mountComponent();
      const descriptions = wrapper.findAll('.template-description').map((el) => el.text());
      for (const template of databaseTemplates) {
        expect(descriptions).toContain(template.description);
      }
    });

    it('should display property count for templates with properties', () => {
      const wrapper = mountComponent();
      // Task Tracker has 4 properties
      const cards = wrapper.findAll('.template-card');
      const taskTrackerCard = cards.find(
        (card) => card.find('.template-name').text() === 'Task Tracker'
      );
      expect(taskTrackerCard).toBeDefined();
      const badge = taskTrackerCard!.find('.property-count');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toContain('4');
    });

    it('should not display property count for blank template', () => {
      const wrapper = mountComponent();
      const cards = wrapper.findAll('.template-card');
      const blankCard = cards.find((card) => card.find('.template-name').text() === 'Blank');
      expect(blankCard).toBeDefined();
      expect(blankCard!.find('.property-count').exists()).toBe(false);
    });
  });

  // =========================================
  // Events
  // =========================================

  describe('events', () => {
    it('should emit select with template id when a template card is clicked', async () => {
      const wrapper = mountComponent();
      const cards = wrapper.findAll('.template-card');
      // Click the second card (Task Tracker)
      await cards[1].trigger('click');

      expect(wrapper.emitted('select')).toHaveLength(1);
      expect(wrapper.emitted('select')![0]).toEqual(['task-tracker']);
    });

    it('should emit select with "blank" when the blank template is clicked', async () => {
      const wrapper = mountComponent();
      const cards = wrapper.findAll('.template-card');
      await cards[0].trigger('click');

      expect(wrapper.emitted('select')).toHaveLength(1);
      expect(wrapper.emitted('select')![0]).toEqual(['blank']);
    });

    it('should emit close when close button is clicked', async () => {
      const wrapper = mountComponent();
      await wrapper.find('.close-btn').trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should emit close when clicking the overlay background', async () => {
      const wrapper = mountComponent();
      await wrapper.find('.modal-overlay').trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should not emit close when clicking inside the modal', async () => {
      const wrapper = mountComponent();
      await wrapper.find('.modal').trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });

  // =========================================
  // Header
  // =========================================

  describe('header', () => {
    it('should display a modal title', () => {
      const wrapper = mountComponent();
      const title = wrapper.find('.modal-title');
      expect(title.exists()).toBe(true);
      expect(title.text().length).toBeGreaterThan(0);
    });
  });

  // =========================================
  // Accessibility
  // =========================================

  describe('accessibility', () => {
    it('should have role="dialog" on the modal', () => {
      const wrapper = mountComponent();
      const modal = wrapper.find('.modal');
      expect(modal.attributes('role')).toBe('dialog');
    });

    it('should have aria-labelledby pointing to the title', () => {
      const wrapper = mountComponent();
      const modal = wrapper.find('.modal');
      const titleId = wrapper.find('.modal-title').attributes('id');
      expect(modal.attributes('aria-labelledby')).toBe(titleId);
    });

    it('should have aria-label on close button', () => {
      const wrapper = mountComponent();
      const closeBtn = wrapper.find('.close-btn');
      expect(closeBtn.attributes('aria-label')).toBeTruthy();
    });
  });
});
