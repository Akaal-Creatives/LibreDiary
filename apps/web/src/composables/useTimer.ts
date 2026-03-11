import { ref, computed, readonly } from 'vue';

export interface TimerTarget {
  databaseId: string;
  rowId: string;
  propertyId: string;
  taskName: string;
}

const STORAGE_KEY = 'librediary-timer-state';

interface StoredTimerState {
  target: TimerTarget;
  startedAt: number;
  accumulatedMs: number;
  isPaused: boolean;
  pausedAt: number | null;
}

// Singleton state — shared across all consumers
const target = ref<TimerTarget | null>(null);
const startedAt = ref<number | null>(null);
const accumulatedMs = ref(0);
const isPaused = ref(false);
const pausedAt = ref<number | null>(null);
const elapsedMs = ref(0);

let intervalId: ReturnType<typeof setInterval> | null = null;

function loadFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state: StoredTimerState = JSON.parse(raw);
    target.value = state.target;
    startedAt.value = state.startedAt;
    accumulatedMs.value = state.accumulatedMs;
    isPaused.value = state.isPaused;
    pausedAt.value = state.pausedAt;

    if (!state.isPaused) {
      startTicking();
    } else {
      updateElapsed();
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveToStorage(): void {
  if (!target.value || !startedAt.value) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const state: StoredTimerState = {
    target: target.value,
    startedAt: startedAt.value,
    accumulatedMs: accumulatedMs.value,
    isPaused: isPaused.value,
    pausedAt: pausedAt.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function updateElapsed(): void {
  if (!startedAt.value) {
    elapsedMs.value = 0;
    return;
  }
  if (isPaused.value) {
    elapsedMs.value = accumulatedMs.value;
  } else {
    elapsedMs.value = accumulatedMs.value + (Date.now() - startedAt.value);
  }
}

function startTicking(): void {
  stopTicking();
  updateElapsed();
  intervalId = setInterval(updateElapsed, 1000);
}

function stopTicking(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// Initialise from storage on first import
let initialised = false;

export function useTimer() {
  if (!initialised) {
    initialised = true;
    loadFromStorage();
  }

  const isRunning = computed(() => target.value !== null && !isPaused.value);
  const isActive = computed(() => target.value !== null);

  function start(newTarget: TimerTarget): void {
    // If there's already a running timer for a different target, ignore
    if (target.value && target.value.rowId !== newTarget.rowId) {
      return;
    }
    target.value = newTarget;
    startedAt.value = Date.now();
    accumulatedMs.value = 0;
    isPaused.value = false;
    pausedAt.value = null;
    saveToStorage();
    startTicking();
  }

  function pause(): void {
    if (!target.value || isPaused.value) return;
    accumulatedMs.value += Date.now() - (startedAt.value ?? Date.now());
    isPaused.value = true;
    pausedAt.value = Date.now();
    stopTicking();
    updateElapsed();
    saveToStorage();
  }

  function resume(): void {
    if (!target.value || !isPaused.value) return;
    startedAt.value = Date.now();
    isPaused.value = false;
    pausedAt.value = null;
    saveToStorage();
    startTicking();
  }

  function stop(): { target: TimerTarget; elapsedMs: number } | null {
    if (!target.value) return null;
    updateElapsed();
    const result = {
      target: { ...target.value },
      elapsedMs: elapsedMs.value,
    };

    target.value = null;
    startedAt.value = null;
    accumulatedMs.value = 0;
    isPaused.value = false;
    pausedAt.value = null;
    elapsedMs.value = 0;
    stopTicking();
    localStorage.removeItem(STORAGE_KEY);
    return result;
  }

  function discard(): void {
    target.value = null;
    startedAt.value = null;
    accumulatedMs.value = 0;
    isPaused.value = false;
    pausedAt.value = null;
    elapsedMs.value = 0;
    stopTicking();
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    target: readonly(target),
    elapsedMs: readonly(elapsedMs),
    isRunning,
    isActive,
    isPaused: readonly(isPaused),
    start,
    pause,
    resume,
    stop,
    discard,
  };
}
