import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTimer, type TimerTarget } from '../useTimer';

const mockTarget: TimerTarget = {
  databaseId: 'db-1',
  rowId: 'row-1',
  propertyId: 'prop-1',
  taskName: 'Test Task',
};

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    // Reset singleton state by discarding any active timer
    const { discard } = useTimer();
    discard();
  });

  afterEach(() => {
    const { discard } = useTimer();
    discard();
    vi.useRealTimers();
  });

  it('starts with no active timer', () => {
    const { isActive, isRunning, elapsedMs } = useTimer();
    expect(isActive.value).toBe(false);
    expect(isRunning.value).toBe(false);
    expect(elapsedMs.value).toBe(0);
  });

  it('starts a timer', () => {
    const { start, isActive, isRunning, target } = useTimer();
    start(mockTarget);
    expect(isActive.value).toBe(true);
    expect(isRunning.value).toBe(true);
    expect(target.value).toEqual(mockTarget);
  });

  it('tracks elapsed time', () => {
    const { start, elapsedMs } = useTimer();
    start(mockTarget);

    vi.advanceTimersByTime(5000);
    expect(elapsedMs.value).toBeGreaterThanOrEqual(5000);
  });

  it('pauses and resumes', () => {
    const { start, pause, resume, isPaused, isRunning, elapsedMs } = useTimer();
    start(mockTarget);
    vi.advanceTimersByTime(3000);

    pause();
    expect(isPaused.value).toBe(true);
    expect(isRunning.value).toBe(false);
    const pausedElapsed = elapsedMs.value;

    // Time passes while paused — elapsed should not increase
    vi.advanceTimersByTime(5000);
    expect(elapsedMs.value).toBe(pausedElapsed);

    resume();
    expect(isPaused.value).toBe(false);
    expect(isRunning.value).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(elapsedMs.value).toBeGreaterThanOrEqual(pausedElapsed + 2000);
  });

  it('stops timer and returns elapsed', () => {
    const { start, stop, isActive, elapsedMs } = useTimer();
    start(mockTarget);
    vi.advanceTimersByTime(10000);

    const result = stop();
    expect(result).not.toBeNull();
    expect(result!.target).toEqual(mockTarget);
    expect(result!.elapsedMs).toBeGreaterThanOrEqual(10000);
    expect(isActive.value).toBe(false);
    expect(elapsedMs.value).toBe(0);
  });

  it('stop returns null when no timer is active', () => {
    const { stop } = useTimer();
    expect(stop()).toBeNull();
  });

  it('discards timer without returning data', () => {
    const { start, discard, isActive, elapsedMs } = useTimer();
    start(mockTarget);
    vi.advanceTimersByTime(5000);

    discard();
    expect(isActive.value).toBe(false);
    expect(elapsedMs.value).toBe(0);
  });

  it('persists timer state to localStorage', () => {
    const { start } = useTimer();
    start(mockTarget);

    const stored = localStorage.getItem('librediary-timer-state');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.target).toEqual(mockTarget);
  });

  it('clears localStorage on stop', () => {
    const { start, stop } = useTimer();
    start(mockTarget);
    stop();
    expect(localStorage.getItem('librediary-timer-state')).toBeNull();
  });

  it('ignores start for different target when timer already running', () => {
    const { start, target } = useTimer();
    start(mockTarget);

    const otherTarget: TimerTarget = { ...mockTarget, rowId: 'row-2', taskName: 'Other Task' };
    start(otherTarget);

    expect(target.value!.rowId).toBe('row-1');
  });

  it('pause is no-op when already paused', () => {
    const { start, pause, isPaused, elapsedMs } = useTimer();
    start(mockTarget);
    vi.advanceTimersByTime(3000);
    pause();
    const elapsed1 = elapsedMs.value;
    pause(); // second call
    expect(isPaused.value).toBe(true);
    expect(elapsedMs.value).toBe(elapsed1);
  });

  it('resume is no-op when not paused', () => {
    const { start, resume, isRunning } = useTimer();
    start(mockTarget);
    resume(); // no-op since already running
    expect(isRunning.value).toBe(true);
  });
});
