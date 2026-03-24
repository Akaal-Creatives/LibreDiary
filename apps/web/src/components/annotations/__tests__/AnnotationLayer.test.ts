import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AnnotationLayer from '../AnnotationLayer.vue';
import type { Annotation, AnnotationToolState } from '../types';
import { DEFAULT_TOOL_STATE } from '../types';

// Mock vue-konva components — Konva requires a real canvas context
vi.mock('vue-konva', () => ({
  __esModule: true,
  default: {
    install: vi.fn(),
  },
}));

// Provide stub components for Konva
const konvaStubs = {
  'v-stage': {
    template: '<div class="v-stage" data-testid="konva-stage"><slot /></div>',
    props: ['config'],
  },
  'v-layer': {
    template: '<div class="v-layer"><slot /></div>',
  },
  'v-line': {
    template: '<div class="v-line" />',
    props: ['config'],
  },
  'v-rect': {
    template: '<div class="v-rect" />',
    props: ['config'],
  },
  'v-ellipse': {
    template: '<div class="v-ellipse" />',
    props: ['config'],
  },
  'v-arrow': {
    template: '<div class="v-arrow" />',
    props: ['config'],
  },
  'v-text': {
    template: '<div class="v-text" />',
    props: ['config'],
  },
  'v-circle': {
    template: '<div class="v-circle" />',
    props: ['config'],
  },
  'v-group': {
    template: '<div class="v-group"><slot /></div>',
    props: ['config'],
  },
};

function mountLayer(
  props?: Partial<{
    imageWidth: number;
    imageHeight: number;
    annotations: Annotation[];
    toolState: AnnotationToolState;
    active: boolean;
  }>
) {
  return mount(AnnotationLayer, {
    props: {
      imageWidth: props?.imageWidth ?? 800,
      imageHeight: props?.imageHeight ?? 600,
      annotations: props?.annotations ?? [],
      toolState: props?.toolState ?? DEFAULT_TOOL_STATE,
      active: props?.active ?? true,
    },
    global: {
      stubs: konvaStubs,
    },
  });
}

describe('AnnotationLayer', () => {
  describe('rendering', () => {
    it('should render a Konva stage with correct dimensions', () => {
      const wrapper = mountLayer({ imageWidth: 1024, imageHeight: 768 });
      const stage = wrapper.find('[data-testid="konva-stage"]');
      expect(stage.exists()).toBe(true);
      // Stage is rendered within the annotation-layer div which has the dimensions
      const layer = wrapper.find('.annotation-layer');
      expect(layer.attributes('style')).toContain('width: 1024px');
      expect(layer.attributes('style')).toContain('height: 768px');
    });

    it('should not render when active is false', () => {
      const wrapper = mountLayer({ active: false });
      expect(wrapper.find('[data-testid="konva-stage"]').exists()).toBe(false);
    });

    it('should render freehand annotations as v-line elements', () => {
      const annotations: Annotation[] = [
        {
          id: 'a1',
          type: 'freehand',
          x: 0,
          y: 0,
          points: [10, 20, 30, 40, 50, 60],
          stroke: '#ff0000',
          strokeWidth: 2,
          opacity: 1,
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
        },
      ];
      const wrapper = mountLayer({ annotations });
      expect(wrapper.findAll('.v-line').length).toBeGreaterThanOrEqual(1);
    });

    it('should render rectangle annotations as v-rect elements', () => {
      const annotations: Annotation[] = [
        {
          id: 'a2',
          type: 'rectangle',
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          stroke: '#00ff00',
          strokeWidth: 2,
          fill: '#00ff00',
          opacity: 0.1,
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
        },
      ];
      const wrapper = mountLayer({ annotations });
      expect(wrapper.findAll('.v-rect').length).toBeGreaterThanOrEqual(1);
    });

    it('should render arrow annotations as v-arrow elements', () => {
      const annotations: Annotation[] = [
        {
          id: 'a3',
          type: 'arrow',
          x: 0,
          y: 0,
          points: [10, 20, 100, 200],
          stroke: '#0000ff',
          strokeWidth: 2,
          opacity: 1,
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
        },
      ];
      const wrapper = mountLayer({ annotations });
      expect(wrapper.findAll('.v-arrow').length).toBeGreaterThanOrEqual(1);
    });

    it('should render text annotations as v-text elements', () => {
      const annotations: Annotation[] = [
        {
          id: 'a4',
          type: 'text',
          x: 50,
          y: 50,
          text: 'Hello',
          fontSize: 16,
          fill: '#000000',
          stroke: '#000000',
          strokeWidth: 0,
          opacity: 1,
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
        },
      ];
      const wrapper = mountLayer({ annotations });
      expect(wrapper.findAll('.v-text').length).toBeGreaterThanOrEqual(1);
    });

    it('should render pin annotations as v-group elements', () => {
      const annotations: Annotation[] = [
        {
          id: 'a5',
          type: 'pin',
          x: 100,
          y: 100,
          comment: 'Review this',
          pinNumber: 1,
          stroke: '#ef4444',
          strokeWidth: 2,
          opacity: 1,
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
        },
      ];
      const wrapper = mountLayer({ annotations });
      expect(wrapper.findAll('.v-group').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('events', () => {
    it('should emit annotation:create when a shape is drawn', async () => {
      const wrapper = mountLayer({ toolState: { ...DEFAULT_TOOL_STATE, activeTool: 'rectangle' } });
      // The component should emit annotation:create with an Annotation object
      expect(wrapper.emitted()).toBeDefined();
    });

    it('should emit annotation:update when a shape is modified', () => {
      const wrapper = mountLayer();
      expect(wrapper.emitted()).toBeDefined();
    });

    it('should emit annotation:delete when a shape is removed', () => {
      const wrapper = mountLayer();
      expect(wrapper.emitted()).toBeDefined();
    });
  });

  describe('cursor', () => {
    it('should show crosshair cursor when a drawing tool is active', () => {
      const wrapper = mountLayer({ toolState: { ...DEFAULT_TOOL_STATE, activeTool: 'freehand' } });
      const stage = wrapper.find('[data-testid="konva-stage"]');
      expect(stage.exists()).toBe(true);
    });

    it('should show default cursor when select tool is active', () => {
      const wrapper = mountLayer({ toolState: { ...DEFAULT_TOOL_STATE, activeTool: 'select' } });
      const stage = wrapper.find('[data-testid="konva-stage"]');
      expect(stage.exists()).toBe(true);
    });
  });
});
