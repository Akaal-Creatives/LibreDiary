<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  recoveryKey: string;
}>();

const emit = defineEmits<{
  confirmed: [];
}>();

const confirmed = ref(false);
const copied = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      confirmed.value = false;
      copied.value = false;
    }
  }
);

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(props.recoveryKey);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Fallback: select text for manual copy
  }
}

function downloadKey() {
  const content = [
    'LibreDiary — Recovery Key',
    '═'.repeat(40),
    '',
    'Save this key in a secure location.',
    'You will need it if you forget your encryption passphrase.',
    '',
    props.recoveryKey,
    '',
    '═'.repeat(40),
    `Generated: ${new Date().toISOString()}`,
    '',
    'WARNING: This key cannot be regenerated.',
    'If you lose both your passphrase and this key,',
    'your encrypted data will be permanently inaccessible.',
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'librediary-recovery-key.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleConfirm() {
  if (confirmed.value) {
    emit('confirmed');
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="recovery-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Save your recovery key"
      >
        <div class="recovery-modal__container">
          <div class="recovery-modal__content">
            <!-- Header with shield icon -->
            <div class="recovery-modal__header">
              <div class="recovery-modal__icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <h2 class="recovery-modal__title">Save Your Recovery Key</h2>
              <p class="recovery-modal__subtitle">
                This key is the only way to recover your data if you forget your encryption
                passphrase. It will not be shown again.
              </p>
            </div>

            <!-- Recovery key display -->
            <div class="recovery-modal__key-block">
              <code class="recovery-modal__key-text">{{ recoveryKey }}</code>
            </div>

            <!-- Action buttons row -->
            <div class="recovery-modal__actions-row">
              <button
                data-testid="copy-recovery-key"
                class="recovery-modal__action-btn"
                :class="{ 'recovery-modal__action-btn--success': copied }"
                type="button"
                @click="copyToClipboard"
              >
                <svg v-if="!copied" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect
                    x="5.5"
                    y="5.5"
                    width="8"
                    height="8"
                    rx="1.5"
                    stroke="currentColor"
                    stroke-width="1.25"
                  />
                  <path
                    d="M10.5 5.5V3.5a1.5 1.5 0 00-1.5-1.5H3.5A1.5 1.5 0 002 3.5V9a1.5 1.5 0 001.5 1.5h2"
                    stroke="currentColor"
                    stroke-width="1.25"
                    stroke-linecap="round"
                  />
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 8.5l3 3 6-6"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                {{ copied ? 'Copied' : 'Copy' }}
              </button>

              <button
                data-testid="download-recovery-key"
                class="recovery-modal__action-btn"
                type="button"
                @click="downloadKey"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2v8m0 0l-3-3m3 3l3-3"
                    stroke="currentColor"
                    stroke-width="1.25"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M2.5 11v1.5a1 1 0 001 1h9a1 1 0 001-1V11"
                    stroke="currentColor"
                    stroke-width="1.25"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Download
              </button>
            </div>

            <!-- Warning -->
            <div class="recovery-modal__warning">
              <svg
                class="recovery-modal__warning-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8 1.5l6.5 12H1.5L8 1.5Z"
                  stroke="currentColor"
                  stroke-width="1.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M8 6.5v3"
                  stroke="currentColor"
                  stroke-width="1.25"
                  stroke-linecap="round"
                />
                <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
              </svg>
              <span>
                Store this key somewhere safe — a password manager, encrypted note, or printed in a
                secure location. Never share it with anyone.
              </span>
            </div>

            <!-- Confirmation checkbox -->
            <label class="recovery-modal__confirm-label">
              <input v-model="confirmed" type="checkbox" class="recovery-modal__checkbox" />
              <span class="recovery-modal__checkbox-mark" />
              <span class="recovery-modal__confirm-text">
                I have saved my recovery key in a safe place
              </span>
            </label>

            <!-- Confirm button -->
            <button
              data-testid="confirm-recovery-key"
              class="recovery-modal__confirm-btn"
              type="button"
              :disabled="!confirmed"
              @click="handleConfirm"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.recovery-modal {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(22, 25, 23, 0.75);
  backdrop-filter: blur(6px);
}

.recovery-modal__container {
  position: relative;
  width: 100%;
  max-width: 460px;
  max-height: calc(100vh - var(--space-8));
  overflow: auto;
}

.recovery-modal__content {
  position: relative;
  padding: var(--space-8) var(--space-6) var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(107, 143, 113, 0.06);
}

.recovery-modal__content::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.02;
  pointer-events: none;
}

/* Header */
.recovery-modal__header {
  text-align: center;
  margin-bottom: var(--space-5);
}

.recovery-modal__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: var(--space-3);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-lg);
}

.recovery-modal__title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.recovery-modal__subtitle {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-secondary);
}

/* Key display block */
.recovery-modal__key-block {
  position: relative;
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  background: var(--color-surface-sunken);
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
}

.recovery-modal__key-text {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.7;
  color: var(--color-text-primary);
  text-align: center;
  word-break: break-all;
  letter-spacing: 0.04em;
  user-select: all;
}

/* Action buttons row */
.recovery-modal__actions-row {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.recovery-modal__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  flex: 1;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.recovery-modal__action-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

.recovery-modal__action-btn--success {
  color: var(--color-success);
  border-color: var(--color-success);
}

/* Warning */
.recovery-modal__warning {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-warning-text, #92400e);
  background: var(--color-warning-subtle, #fef3c7);
  border-radius: var(--radius-md);
}

.recovery-modal__warning-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-warning, #f59e0b);
}

/* Confirmation checkbox */
.recovery-modal__confirm-label {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.recovery-modal__confirm-label:hover {
  background: var(--color-hover);
}

.recovery-modal__checkbox {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.recovery-modal__checkbox-mark {
  position: relative;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.recovery-modal__checkbox:checked + .recovery-modal__checkbox-mark {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.recovery-modal__checkbox:checked + .recovery-modal__checkbox-mark::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 5px;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.recovery-modal__checkbox:focus-visible + .recovery-modal__checkbox-mark {
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.recovery-modal__confirm-text {
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-text-primary);
}

/* Confirm button */
.recovery-modal__confirm-btn {
  display: block;
  width: 100%;
  padding: var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: white;
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.recovery-modal__confirm-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.recovery-modal__confirm-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.recovery-modal__confirm-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

/* Modal animations */
.modal-enter-active {
  transition: opacity 0.2s ease-out;
}

.modal-leave-active {
  transition: opacity 0.15s ease-in;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .recovery-modal__content {
  animation: recovery-modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .recovery-modal__content {
  animation: recovery-modal-out 0.15s ease-in forwards;
}

@keyframes recovery-modal-in {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes recovery-modal-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.97) translateY(6px);
  }
}

/* Dark mode */
[data-theme='dark'] .recovery-modal {
  background: rgba(0, 0, 0, 0.8);
}

[data-theme='dark'] .recovery-modal__content::before {
  opacity: 0.03;
}

[data-theme='dark'] .recovery-modal__warning {
  color: var(--color-warning, #d4a74b);
  background: var(--color-warning-subtle, rgba(212, 167, 75, 0.15));
}
</style>
