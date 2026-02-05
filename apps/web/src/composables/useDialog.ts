/* eslint-disable vue/one-component-per-file */
import { ref, createApp, h, type App } from 'vue';
import AlertDialog, { type AlertVariant } from '@/components/ui/AlertDialog.vue';
import ConfirmDialog, { type ConfirmVariant } from '@/components/ui/ConfirmDialog.vue';

interface AlertOptions {
  title?: string;
  message: string;
  variant?: AlertVariant;
  confirmText?: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
}

// Singleton state for the dialog system
const dialogContainer = ref<HTMLElement | null>(null);
let mountedApp: App | null = null;

function ensureContainer(): HTMLElement {
  if (!dialogContainer.value) {
    dialogContainer.value = document.createElement('div');
    dialogContainer.value.id = 'dialog-container';
    document.body.appendChild(dialogContainer.value);
  }
  return dialogContainer.value;
}

function cleanup() {
  if (mountedApp) {
    mountedApp.unmount();
    mountedApp = null;
  }
}

/**
 * Show an alert dialog
 * @returns Promise that resolves when the user clicks OK
 */
export function alert(options: AlertOptions | string): Promise<void> {
  const opts: AlertOptions = typeof options === 'string' ? { message: options } : options;

  return new Promise((resolve) => {
    cleanup();
    const container = ensureContainer();

    const app = createApp({
      setup() {
        const isOpen = ref(true);

        function handleClose() {
          isOpen.value = false;
          setTimeout(() => {
            cleanup();
            resolve();
          }, 200); // Wait for animation
        }

        return () =>
          h(AlertDialog, {
            open: isOpen.value,
            title: opts.title,
            message: opts.message,
            variant: opts.variant ?? 'info',
            confirmText: opts.confirmText ?? 'OK',
            onConfirm: handleClose,
            onClose: handleClose,
          });
      },
    });

    mountedApp = app;
    app.mount(container);
  });
}

/**
 * Show a confirmation dialog
 * @returns Promise that resolves to true if confirmed, false if cancelled
 */
export function confirm(options: ConfirmOptions | string): Promise<boolean> {
  const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;

  return new Promise((resolve) => {
    cleanup();
    const container = ensureContainer();

    const app = createApp({
      setup() {
        const isOpen = ref(true);

        function handleConfirm() {
          isOpen.value = false;
          setTimeout(() => {
            cleanup();
            resolve(true);
          }, 200);
        }

        function handleCancel() {
          isOpen.value = false;
          setTimeout(() => {
            cleanup();
            resolve(false);
          }, 200);
        }

        return () =>
          h(ConfirmDialog, {
            open: isOpen.value,
            title: opts.title,
            message: opts.message,
            variant: opts.variant ?? 'default',
            confirmText: opts.confirmText ?? 'Confirm',
            cancelText: opts.cancelText ?? 'Cancel',
            onConfirm: handleConfirm,
            onCancel: handleCancel,
            onClose: handleCancel,
          });
      },
    });

    mountedApp = app;
    app.mount(container);
  });
}

/**
 * Composable for using dialogs in Vue components
 * Provides alert() and confirm() functions
 */
export function useDialog() {
  return {
    alert,
    confirm,
  };
}

export type { AlertOptions, ConfirmOptions, AlertVariant, ConfirmVariant };
