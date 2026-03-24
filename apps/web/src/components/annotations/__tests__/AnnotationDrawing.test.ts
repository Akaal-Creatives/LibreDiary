import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AnnotationLayer from '../AnnotationLayer.vue';
import { DEFAULT_TOOL_STATE } from '../types';
import type { AnnotationToolState } from '../types';

// Mock vue-konva
vi.mock('vue-konva', () => ({
  __esModule: true,
  default: { install: vi.fn() },
}));

// Stubs that capture events
let stageMouseDown: ((e: unknown) => void) | null = null;
let stageMouseMove: ((e: unknown) => void) | null = null;
let stageMouseUp: (() => void) | null = null;

const konvaStubs = {
  'v-stage': {
    template: '<div class="v-stage" data-testid="konva-stage"><slot /></div>',
    props: ['config'],
    emits: ['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend'],
    setup(_: unknown, { emit }: { emit: (event: string, ...args: unknown[]) => void }) {
      // Expose event triggers for tests
      stageMouseDown = (e: unknown) => emit('mousedown', e);
      stageMouseMove = (e: unknown) => emit('mousemove', e);
      stageMouseUp = () => emit('mouseup');
    },
  },
  'v-layer': { template: '<div class="v-layer"><slot /></div>' },
  'v-line': { template: '<div class="v-line" />', props: ['config'] },
  'v-rect': { template: '<div class="v-rect" />', props: ['config'] },
  'v-ellipse': { template: '<div class="v-ellipse" />', props: ['config'] },
  'v-arrow': { template: '<div class="v-arrow" />', props: ['config'] },
  'v-text': { template: '<div class="v-text" />', props: ['config'] },
  'v-circle': { template: '<div class="v-circle" />', props: ['config'] },
  'v-group': { template: '<div class="v-group"><slot /></div>', props: ['config'] },
};

function createStageEvent(x: number, y: number) {
  return {
    evt: new MouseEvent('mousedown'),
    target: {
      getStage: () => ({
        getPointerPosition: () => ({ x, y }),
      }),
    },
  };
}

function mountLayer(toolState?: Partial<AnnotationToolState>) {
  return mount(AnnotationLayer, {
    props: {
      imageWidth: 800,
      imageHeight: 600,
      annotations: [],
      toolState: { ...DEFAULT_TOOL_STATE, ...toolState },
      active: true,
    },
    global: { stubs: konvaStubs },
  });
}

describe('Annotation Drawing Tools', () => {
  describe('freehand', () => {
    it('should emit annotation:create with freehand type after drawing', async () => {
      const wrapper = mountLayer({ activeTool: 'freehand' });

      stageMouseDown!(createStageEvent(10, 20));
      await wrapper.vm.$nextTick();

      stageMouseMove!(createStageEvent(30, 40));
      await wrapper.vm.$nextTick();

      stageMouseMove!(createStageEvent(50, 60));
      await wrapper.vm.$nextTick();

      stageMouseUp!();
      await wrapper.vm.$nextTick();

      const emitted = wrapper.emitted('annotation:create');
      expect(emitted).toBeDefined();
      expect(emitted![0]![0]).toMatchObject({ type: 'freehand' });
      expect((emitted![0]![0] as { points: number[] }).points.length).toBeGreaterThan(2);
    });
  });

  describe('rectangle', () => {
    it('should emit annotation:create with rectangle type after drag', async () => {
      const wrapper = mountLayer({ activeTool: 'rectangle' });

      stageMouseDown!(createStageEvent(10, 20));
      await wrapper.vm.$nextTick();

      stageMouseMove!(createStageEvent(110, 120));
      await wrapper.vm.$nextTick();

      stageMouseUp!();
      await wrapper.vm.$nextTick();

      const emitted = wrapper.emitted('annotation:create');
      expect(emitted).toBeDefined();
      expect(emitted![0]![0]).toMatchObject({
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 100,
        height: 100,
      });
    });
  });

  describe('ellipse', () => {
    it('should emit annotation:create with ellipse type after drag', async () => {
      const wrapper = mountLayer({ activeTool: 'ellipse' });

      stageMouseDown!(createStageEvent(50, 50));
      await wrapper.vm.$nextTick();

      stageMouseMove!(createStageEvent(150, 100));
      await wrapper.vm.$nextTick();

      stageMouseUp!();
      await wrapper.vm.$nextTick();

      const emitted = wrapper.emitted('annotation:create');
      expect(emitted).toBeDefined();
      expect(emitted![0]![0]).toMatchObject({
        type: 'ellipse',
        radiusX: 50,
        radiusY: 25,
      });
    });
  });

  describe('arrow', () => {
    it('should emit annotation:create with arrow type after drag', async () => {
      const wrapper = mountLayer({ activeTool: 'arrow' });

      stageMouseDown!(createStageEvent(10, 20));
      await wrapper.vm.$nextTick();

      stageMouseMove!(createStageEvent(200, 150));
      await wrapper.vm.$nextTick();

      stageMouseUp!();
      await wrapper.vm.$nextTick();

      const emitted = wrapper.emitted('annotation:create');
      expect(emitted).toBeDefined();
      expect(emitted![0]![0]).toMatchObject({
        type: 'arrow',
        points: [10, 20, 200, 150],
      });
    });
  });

  describe('text', () => {
    it('should emit annotation:create with text type on click', async () => {
      const wrapper = mountLayer({ activeTool: 'text' });

      stageMouseDown!(createStageEvent(100, 200));
      await wrapper.vm.$nextTick();

      const emitted = wrapper.emitted('annotation:create');
      expect(emitted).toBeDefined();
      expect(emitted![0]![0]).toMatchObject({
        type: 'text',
        x: 100,
        y: 200,
        text: 'Text',
      });
    });
  });

  describe('pin comment', () => {
    it('should emit annotation:create with pin type on click', async () => {
      const wrapper = mountLayer({ activeTool: 'pin' });

      stageMouseDown!(createStageEvent(300, 400));
      await wrapper.vm.$nextTick();

      const emitted = wrapper.emitted('annotation:create');
      expect(emitted).toBeDefined();
      expect(emitted![0]![0]).toMatchObject({
        type: 'pin',
        x: 300,
        y: 400,
        pinNumber: 1,
      });
    });
  });

  describe('select tool', () => {
    it('should not emit annotation:create when select tool is active', async () => {
      const wrapper = mountLayer({ activeTool: 'select' });

      stageMouseDown!(createStageEvent(100, 200));
      await wrapper.vm.$nextTick();

      stageMouseUp!();
      await wrapper.vm.$nextTick();

      expect(wrapper.emitted('annotation:create')).toBeUndefined();
    });
  });
});
