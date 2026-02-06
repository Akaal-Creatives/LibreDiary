import { ref, readonly } from 'vue';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

const toasts = ref<Toast[]>([]);

let toastId = 0;

function generateId(): string {
  return `toast-${++toastId}`;
}

function addToast(toast: Omit<Toast, 'id'>): string {
  const id = generateId();
  const duration = toast.duration ?? 4000;

  toasts.value.push({ ...toast, id, duration });

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

function removeToast(id: string): void {
  const index = toasts.value.findIndex((t) => t.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
  }
}

function success(message: string, duration?: number): string {
  return addToast({ message, type: 'success', duration });
}

function error(message: string, duration?: number): string {
  return addToast({ message, type: 'error', duration: duration ?? 6000 });
}

function info(message: string, duration?: number): string {
  return addToast({ message, type: 'info', duration });
}

function warning(message: string, duration?: number): string {
  return addToast({ message, type: 'warning', duration });
}

export function useToast() {
  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}
