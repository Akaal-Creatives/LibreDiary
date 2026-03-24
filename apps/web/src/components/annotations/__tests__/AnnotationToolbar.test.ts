import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AnnotationToolbar from '../AnnotationToolbar.vue';
import { DEFAULT_TOOL_STATE } from '../types';
import type { AnnotationToolState } from '../types';

function mountToolbar(toolState?: Partial<AnnotationToolState>) {
  return mount(AnnotationToolbar, {
    props: {
      toolState: { ...DEFAULT_TOOL_STATE, ...toolState },
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  });
}

describe('AnnotationToolbar', () => {
  describe('rendering', () => {
    it('should render the toolbar container', () => {
      const wrapper = mountToolbar();
      expect(wrapper.find('.annotation-toolbar').exists()).toBe(true);
    });

    it('should render all tool buttons', () => {
      const wrapper = mountToolbar();
      const buttons = wrapper.findAll('.annotation-toolbar__tool-btn');
      // select, freehand, rectangle, ellipse, arrow, text, pin = 7 tools
      expect(buttons.length).toBe(7);
    });

    it('should highlight the active tool', () => {
      const wrapper = mountToolbar({ activeTool: 'freehand' });
      const freehandBtn = wrapper.find('[data-tool="freehand"]');
      expect(freehandBtn.classes()).toContain('annotation-toolbar__tool-btn--active');
    });

    it('should render colour picker', () => {
      const wrapper = mountToolbar();
      expect(wrapper.find('[data-testid="colour-picker"]').exists()).toBe(true);
    });

    it('should render stroke width control', () => {
      const wrapper = mountToolbar();
      expect(wrapper.find('[data-testid="stroke-width"]').exists()).toBe(true);
    });
  });

  describe('tool selection', () => {
    it('should emit update:toolState when a tool is selected', async () => {
      const wrapper = mountToolbar();
      const rectBtn = wrapper.find('[data-tool="rectangle"]');
      await rectBtn.trigger('click');

      const emitted = wrapper.emitted('update:toolState');
      expect(emitted).toBeDefined();
      expect(emitted![0]![0]).toMatchObject({ activeTool: 'rectangle' });
    });

    it('should emit update:toolState when colour changes', async () => {
      const wrapper = mountToolbar();
      const colourInput = wrapper.find('[data-testid="colour-picker"] input');
      await colourInput.setValue('#00ff00');
      await colourInput.trigger('input');

      const emitted = wrapper.emitted('update:toolState');
      expect(emitted).toBeDefined();
      expect(emitted!.some((e) => (e[0] as AnnotationToolState).strokeColour === '#00ff00')).toBe(
        true
      );
    });

    it('should emit update:toolState when stroke width changes', async () => {
      const wrapper = mountToolbar();
      const widthInput = wrapper.find('[data-testid="stroke-width"] input');
      await widthInput.setValue('4');
      await widthInput.trigger('input');

      const emitted = wrapper.emitted('update:toolState');
      expect(emitted).toBeDefined();
      expect(emitted!.some((e) => (e[0] as AnnotationToolState).strokeWidth === 4)).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have role="toolbar" on the container', () => {
      const wrapper = mountToolbar();
      expect(wrapper.find('.annotation-toolbar').attributes('role')).toBe('toolbar');
    });

    it('all tool buttons should have aria-label', () => {
      const wrapper = mountToolbar();
      const buttons = wrapper.findAll('.annotation-toolbar__tool-btn');
      buttons.forEach((btn) => {
        expect(btn.attributes('aria-label')).toBeDefined();
      });
    });

    it('active tool button should have aria-pressed="true"', () => {
      const wrapper = mountToolbar({ activeTool: 'arrow' });
      const arrowBtn = wrapper.find('[data-tool="arrow"]');
      expect(arrowBtn.attributes('aria-pressed')).toBe('true');
    });
  });
});
