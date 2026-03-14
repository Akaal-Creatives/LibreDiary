import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TableRowDragCell from '../TableRowDragCell.vue';

describe('TableRowDragCell', () => {
  it('renders a <td> element with cell-drag class', () => {
    const wrapper = mount(TableRowDragCell, {
      props: { timerActive: false, showStartTimer: false },
    });
    expect(wrapper.element.tagName).toBe('TD');
    expect(wrapper.classes()).toContain('cell-drag');
  });

  it('renders drag handle by default', () => {
    const wrapper = mount(TableRowDragCell, {
      props: { timerActive: false, showStartTimer: false },
    });
    expect(wrapper.find('.drag-handle').exists()).toBe(true);
    expect(wrapper.find('.timer-row-indicator').exists()).toBe(false);
    expect(wrapper.find('.start-timer-btn').exists()).toBe(false);
  });

  it('renders timer indicator when timerActive is true', () => {
    const wrapper = mount(TableRowDragCell, {
      props: { timerActive: true, showStartTimer: false },
    });
    expect(wrapper.find('.timer-row-indicator').exists()).toBe(true);
    expect(wrapper.find('.timer-row-indicator').attributes('title')).toBe('Timer running');
    expect(wrapper.find('.drag-handle').exists()).toBe(false);
    expect(wrapper.find('.start-timer-btn').exists()).toBe(false);
  });

  it('renders start timer button when showStartTimer is true and timerActive is false', () => {
    const wrapper = mount(TableRowDragCell, {
      props: { timerActive: false, showStartTimer: true },
    });
    expect(wrapper.find('.start-timer-btn').exists()).toBe(true);
    expect(wrapper.find('.start-timer-btn').attributes('title')).toBe('Start timer');
    expect(wrapper.find('.drag-handle').exists()).toBe(false);
    expect(wrapper.find('.timer-row-indicator').exists()).toBe(false);
  });

  it('prioritises timer indicator over start timer button when both props are true', () => {
    const wrapper = mount(TableRowDragCell, {
      props: { timerActive: true, showStartTimer: true },
    });
    expect(wrapper.find('.timer-row-indicator').exists()).toBe(true);
    expect(wrapper.find('.start-timer-btn').exists()).toBe(false);
  });

  it('has draggable attribute set to true', () => {
    const wrapper = mount(TableRowDragCell, {
      props: { timerActive: false, showStartTimer: false },
    });
    expect(wrapper.attributes('draggable')).toBe('true');
  });

  it('emits dragstart event on dragstart', async () => {
    const wrapper = mount(TableRowDragCell, {
      props: { timerActive: false, showStartTimer: false },
    });
    await wrapper.trigger('dragstart');
    expect(wrapper.emitted('dragstart')).toHaveLength(1);
  });

  it('emits dragend event on dragend', async () => {
    const wrapper = mount(TableRowDragCell, {
      props: { timerActive: false, showStartTimer: false },
    });
    await wrapper.trigger('dragend');
    expect(wrapper.emitted('dragend')).toHaveLength(1);
  });

  it('emits start-timer when start timer button is clicked', async () => {
    const wrapper = mount(TableRowDragCell, {
      props: { timerActive: false, showStartTimer: true },
    });
    await wrapper.find('.start-timer-btn').trigger('click');
    expect(wrapper.emitted('start-timer')).toHaveLength(1);
  });
});
