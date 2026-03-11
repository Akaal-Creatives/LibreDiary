import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import TimerWidget from '../TimerWidget.vue';
import { useTimer, type TimerTarget } from '@/composables/useTimer';

const mockTarget: TimerTarget = {
  databaseId: 'db-1',
  rowId: 'row-1',
  propertyId: 'prop-1',
  taskName: 'Design sprint planning',
};

describe('TimerWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    const { discard } = useTimer();
    discard();
  });

  afterEach(() => {
    const { discard } = useTimer();
    discard();
    vi.useRealTimers();
  });

  function startTimer(target: TimerTarget = mockTarget) {
    const { start } = useTimer();
    start(target);
  }

  it('is hidden when no timer is active', () => {
    const wrapper = mount(TimerWidget);
    expect(wrapper.find('.timer-widget').exists()).toBe(false);
  });

  it('is visible when a timer is active', () => {
    startTimer();
    const wrapper = mount(TimerWidget);
    expect(wrapper.find('.timer-widget').exists()).toBe(true);
  });

  it('displays the task name', () => {
    startTimer();
    const wrapper = mount(TimerWidget);
    expect(wrapper.find('.timer-task-name').text()).toBe('Design sprint planning');
  });

  it('truncates long task names', () => {
    startTimer({
      ...mockTarget,
      taskName: 'A very long task name that exceeds the limit of twenty-eight',
    });
    const wrapper = mount(TimerWidget);
    const name = wrapper.find('.timer-task-name').text();
    expect(name.length).toBeLessThanOrEqual(28);
    expect(name).toContain('…');
  });

  it('displays elapsed time', () => {
    startTimer();
    vi.advanceTimersByTime(5000);
    const wrapper = mount(TimerWidget);
    expect(wrapper.find('.timer-elapsed').text()).toContain('5s');
  });

  it('has running class on elapsed when timer is running', () => {
    startTimer();
    const wrapper = mount(TimerWidget);
    expect(wrapper.find('.timer-elapsed--running').exists()).toBe(true);
  });

  it('pauses timer when pause button clicked', async () => {
    startTimer();
    const wrapper = mount(TimerWidget);
    const pauseBtn = wrapper.find('.timer-btn--play-pause');
    expect(pauseBtn.attributes('aria-label')).toBe('Pause timer');

    await pauseBtn.trigger('click');
    expect(wrapper.find('.timer-elapsed--running').exists()).toBe(false);
    expect(wrapper.find('.timer-btn--play-pause').attributes('aria-label')).toBe('Resume timer');
  });

  it('resumes timer when play button clicked', async () => {
    startTimer();
    const { pause } = useTimer();
    pause();
    const wrapper = mount(TimerWidget);

    const playBtn = wrapper.find('.timer-btn--play-pause');
    expect(playBtn.attributes('aria-label')).toBe('Resume timer');
    await playBtn.trigger('click');
    expect(wrapper.find('.timer-elapsed--running').exists()).toBe(true);
  });

  it('emits stop event with target and elapsed on stop', async () => {
    startTimer();
    vi.advanceTimersByTime(10000);
    const wrapper = mount(TimerWidget);
    await wrapper.find('.timer-btn--stop').trigger('click');

    const emitted = wrapper.emitted('stop');
    expect(emitted).toHaveLength(1);
    const payload = emitted![0]![0] as { target: TimerTarget; elapsedMs: number };
    expect(payload.target).toEqual(mockTarget);
    expect(payload.elapsedMs).toBeGreaterThanOrEqual(10000);
  });

  it('discards timer when discard button clicked', async () => {
    startTimer();
    const wrapper = mount(TimerWidget);
    await wrapper.find('.timer-btn--discard').trigger('click');

    // After discard, isActive should be false and widget should hide
    await flushPromises();
    expect(wrapper.find('.timer-widget').exists()).toBe(false);
    expect(wrapper.emitted('stop')).toBeUndefined();
  });

  it('has role="timer" for accessibility', () => {
    startTimer();
    const wrapper = mount(TimerWidget);
    expect(wrapper.find('[role="timer"]').exists()).toBe(true);
  });

  it('has accessible labels on all buttons', () => {
    startTimer();
    const wrapper = mount(TimerWidget);
    const buttons = wrapper.findAll('button');
    buttons.forEach((btn) => {
      expect(btn.attributes('aria-label')).toBeTruthy();
    });
  });

  it('shows pulsing indicator when running', () => {
    startTimer();
    const wrapper = mount(TimerWidget);
    expect(wrapper.find('.timer-indicator.pulsing').exists()).toBe(true);
  });

  it('stops pulsing indicator when paused', async () => {
    startTimer();
    const wrapper = mount(TimerWidget);
    const { pause } = useTimer();
    pause();
    await flushPromises();
    expect(wrapper.find('.timer-indicator.pulsing').exists()).toBe(false);
  });
});
