import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ImageNodeView from '../ImageNodeView.vue';

// Mock vue-konva (AnnotationLayer uses it)
vi.mock('vue-konva', () => ({
  __esModule: true,
  default: { install: vi.fn() },
}));

// Stub Konva components used by AnnotationLayer
const konvaStubs = {
  'v-stage': { template: '<div class="v-stage"><slot /></div>', props: ['config'] },
  'v-layer': { template: '<div class="v-layer"><slot /></div>' },
  'v-line': { template: '<div class="v-line" />', props: ['config'] },
  'v-rect': { template: '<div class="v-rect" />', props: ['config'] },
  'v-ellipse': { template: '<div class="v-ellipse" />', props: ['config'] },
  'v-arrow': { template: '<div class="v-arrow" />', props: ['config'] },
  'v-text': { template: '<div class="v-text" />', props: ['config'] },
  'v-circle': { template: '<div class="v-circle" />', props: ['config'] },
  'v-group': { template: '<div class="v-group"><slot /></div>', props: ['config'] },
};

function createMockNode(attrs: Record<string, unknown> = {}) {
  return {
    attrs: {
      src: 'https://example.com/image.png',
      alt: 'Test image',
      title: null,
      ...attrs,
    },
  };
}

function mountNodeView(overrides: Record<string, unknown> = {}) {
  return mount(ImageNodeView, {
    props: {
      node: createMockNode(overrides),
      updateAttributes: vi.fn(),
      editor: { isEditable: true },
    },
    global: {
      stubs: konvaStubs,
    },
  });
}

describe('ImageNodeView', () => {
  describe('rendering', () => {
    it('should render an image with the correct src', () => {
      const wrapper = mountNodeView();
      const img = wrapper.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('https://example.com/image.png');
    });

    it('should render an image with the correct alt text', () => {
      const wrapper = mountNodeView({ alt: 'My photo' });
      const img = wrapper.find('img');
      expect(img.attributes('alt')).toBe('My photo');
    });

    it('should have the image-node-view wrapper class', () => {
      const wrapper = mountNodeView();
      expect(wrapper.find('.image-node-view').exists()).toBe(true);
    });

    it('should not show annotation layer by default', () => {
      const wrapper = mountNodeView();
      expect(wrapper.find('.annotation-layer').exists()).toBe(false);
    });
  });

  describe('annotation activation', () => {
    it('should show annotate button on hover/focus', () => {
      const wrapper = mountNodeView();
      // The annotate button should exist (visible on hover via CSS)
      expect(wrapper.find('[data-testid="annotate-btn"]').exists()).toBe(true);
    });

    it('should activate annotation layer when annotate button is clicked', async () => {
      const wrapper = mountNodeView();
      const btn = wrapper.find('[data-testid="annotate-btn"]');
      await btn.trigger('click');
      expect(wrapper.find('.annotation-layer').exists()).toBe(true);
    });

    it('should deactivate annotation layer when close button is clicked', async () => {
      const wrapper = mountNodeView();
      // Activate first
      await wrapper.find('[data-testid="annotate-btn"]').trigger('click');
      expect(wrapper.find('.annotation-layer').exists()).toBe(true);

      // Now close
      const closeBtn = wrapper.find('[data-testid="close-annotations-btn"]');
      await closeBtn.trigger('click');
      expect(wrapper.find('.annotation-layer').exists()).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('should have role="img" on the wrapper when not annotating', () => {
      const wrapper = mountNodeView();
      const imgWrapper = wrapper.find('.image-node-view__image-wrapper');
      expect(imgWrapper.attributes('role')).toBe('img');
    });

    it('annotate button should have aria-label', () => {
      const wrapper = mountNodeView();
      const btn = wrapper.find('[data-testid="annotate-btn"]');
      expect(btn.attributes('aria-label')).toBeDefined();
    });
  });
});
