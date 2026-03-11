<script setup lang="ts">
import { ref, watch } from 'vue';
import { useEncryption } from '@/composables/useEncryption';
import { useToast } from '@/composables/useToast';
import RecoveryKeyModal from './RecoveryKeyModal.vue';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  recovered: [];
}>();

const encryption = useEncryption();
const toast = useToast();

const step = ref(1);
const recoveryKeyInput = ref('');
const newPassphrase = ref('');
const confirmPassphrase = ref('');
const error = ref<string | null>(null);
const recovering = ref(false);

// New recovery key shown after successful recovery
const showNewRecoveryKey = ref(false);
const newRecoveryKeyValue = ref('');

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      step.value = 1;
      recoveryKeyInput.value = '';
      newPassphrase.value = '';
      confirmPassphrase.value = '';
      error.value = null;
      recovering.value = false;
      showNewRecoveryKey.value = false;
      newRecoveryKeyValue.value = '';
    }
  }
);

function goToStep2() {
  if (!recoveryKeyInput.value.trim()) return;
  error.value = null;
  step.value = 2;
}

function goBack() {
  step.value = 1;
  error.value = null;
}

async function handleRecover() {
  error.value = null;

  if (newPassphrase.value.length < 8) {
    error.value = 'Passphrase must be at least 8 characters.';
    return;
  }

  if (newPassphrase.value !== confirmPassphrase.value) {
    error.value = 'Passphrases do not match.';
    return;
  }

  recovering.value = true;
  try {
    const result = await encryption.recoverWithRecoveryKey(
      recoveryKeyInput.value.trim(),
      newPassphrase.value
    );
    // Show new recovery key
    newRecoveryKeyValue.value = result.recoveryKey;
    showNewRecoveryKey.value = true;
    toast.success('Encryption recovered successfully.');
  } catch {
    error.value = 'Recovery failed. Please check your recovery key and try again.';
  } finally {
    recovering.value = false;
  }
}

function handleNewRecoveryKeyConfirmed() {
  showNewRecoveryKey.value = false;
  newRecoveryKeyValue.value = '';
  emit('recovered');
  emit('close');
}

function close() {
  if (!recovering.value) {
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="recovery-flow-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Recover encryption access"
        @click.self="close"
        @keydown.escape="close"
      >
        <div class="recovery-flow-modal__container">
          <div class="recovery-flow-modal__content">
            <!-- Close button -->
            <button
              data-testid="recovery-close-btn"
              class="recovery-flow-modal__close"
              aria-label="Close"
              :disabled="recovering"
              @click="close"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>

            <!-- Header -->
            <div class="recovery-flow-modal__header">
              <div class="recovery-flow-modal__icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1.5" />
                  <path
                    d="M14 14l5 5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M8 8.5h4M10 6.5v4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <h2 class="recovery-flow-modal__title">Recover Encryption Access</h2>
              <div class="recovery-flow-modal__steps">
                <span
                  class="recovery-flow-modal__step-dot"
                  :class="{ 'recovery-flow-modal__step-dot--active': step === 1 }"
                />
                <span
                  class="recovery-flow-modal__step-dot"
                  :class="{ 'recovery-flow-modal__step-dot--active': step === 2 }"
                />
              </div>
            </div>

            <!-- Error display -->
            <div v-if="error" class="recovery-flow-modal__error" role="alert">
              {{ error }}
            </div>

            <!-- Step 1: Recovery key input -->
            <div v-if="step === 1" class="recovery-flow-modal__step">
              <label for="recovery-key-field" class="recovery-flow-modal__label">
                Recovery Key
              </label>
              <p class="recovery-flow-modal__hint">
                Enter the recovery key you saved when you first set up encryption.
              </p>
              <textarea
                id="recovery-key-field"
                v-model="recoveryKeyInput"
                data-testid="recovery-key-input"
                class="recovery-flow-modal__textarea"
                rows="3"
                placeholder="ABCD-EFGH-IJKL-MNOP-..."
                spellcheck="false"
                autocomplete="off"
              />

              <div class="recovery-flow-modal__actions">
                <button
                  type="button"
                  class="recovery-flow-modal__btn recovery-flow-modal__btn--secondary"
                  @click="close"
                >
                  Cancel
                </button>
                <button
                  data-testid="recovery-next-btn"
                  type="button"
                  class="recovery-flow-modal__btn recovery-flow-modal__btn--primary"
                  :disabled="!recoveryKeyInput.trim()"
                  @click="goToStep2"
                >
                  Next
                </button>
              </div>
            </div>

            <!-- Step 2: New passphrase -->
            <div v-if="step === 2" class="recovery-flow-modal__step">
              <label for="new-passphrase-field" class="recovery-flow-modal__label">
                New Passphrase
              </label>
              <p class="recovery-flow-modal__hint">
                Choose a new encryption passphrase. Minimum 8 characters.
              </p>
              <input
                id="new-passphrase-field"
                v-model="newPassphrase"
                data-testid="new-passphrase-input"
                type="password"
                class="recovery-flow-modal__input"
                placeholder="Enter new passphrase"
                autocomplete="new-password"
                :disabled="recovering"
              />

              <label
                for="confirm-passphrase-field"
                class="recovery-flow-modal__label recovery-flow-modal__label--spaced"
              >
                Confirm Passphrase
              </label>
              <input
                id="confirm-passphrase-field"
                v-model="confirmPassphrase"
                data-testid="confirm-passphrase-input"
                type="password"
                class="recovery-flow-modal__input"
                placeholder="Confirm new passphrase"
                autocomplete="new-password"
                :disabled="recovering"
              />

              <div class="recovery-flow-modal__actions">
                <button
                  type="button"
                  class="recovery-flow-modal__btn recovery-flow-modal__btn--secondary"
                  :disabled="recovering"
                  @click="goBack"
                >
                  Back
                </button>
                <button
                  data-testid="recovery-submit-btn"
                  type="button"
                  class="recovery-flow-modal__btn recovery-flow-modal__btn--primary"
                  :disabled="!newPassphrase || !confirmPassphrase || recovering"
                  @click="handleRecover"
                >
                  {{ recovering ? 'Recovering...' : 'Recover Access' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- New recovery key modal (shown after successful recovery) -->
  <RecoveryKeyModal
    :open="showNewRecoveryKey"
    :recovery-key="newRecoveryKeyValue"
    @confirmed="handleNewRecoveryKeyConfirmed"
  />
</template>

<style scoped>
.recovery-flow-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(22, 25, 23, 0.6);
  backdrop-filter: blur(4px);
}

.recovery-flow-modal__container {
  position: relative;
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - var(--space-8));
  overflow: auto;
}

.recovery-flow-modal__content {
  position: relative;
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(107, 143, 113, 0.05);
}

.recovery-flow-modal__content::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.02;
  pointer-events: none;
}

/* Close button */
.recovery-flow-modal__close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.recovery-flow-modal__close:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.recovery-flow-modal__close:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Header */
.recovery-flow-modal__header {
  text-align: center;
  margin-bottom: var(--space-5);
}

.recovery-flow-modal__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--space-3);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-lg);
}

.recovery-flow-modal__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.recovery-flow-modal__steps {
  display: flex;
  justify-content: center;
  gap: var(--space-2);
}

.recovery-flow-modal__step-dot {
  width: 8px;
  height: 8px;
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.recovery-flow-modal__step-dot--active {
  width: 24px;
  background: var(--color-accent);
}

/* Error */
.recovery-flow-modal__error {
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border-radius: var(--radius-md);
}

/* Form elements */
.recovery-flow-modal__label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.recovery-flow-modal__label--spaced {
  margin-top: var(--space-4);
}

.recovery-flow-modal__hint {
  margin: 0 0 var(--space-3);
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-text-tertiary);
}

.recovery-flow-modal__textarea {
  width: 100%;
  padding: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  resize: vertical;
  transition: all var(--transition-fast);
}

.recovery-flow-modal__textarea:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.recovery-flow-modal__input {
  width: 100%;
  padding: var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: all var(--transition-fast);
}

.recovery-flow-modal__input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.recovery-flow-modal__input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Actions */
.recovery-flow-modal__actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.recovery-flow-modal__btn {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.recovery-flow-modal__btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.recovery-flow-modal__btn--secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
}

.recovery-flow-modal__btn--secondary:hover:not(:disabled) {
  background: var(--color-hover);
}

.recovery-flow-modal__btn--primary {
  color: white;
  background: var(--color-accent);
}

.recovery-flow-modal__btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

/* Animations */
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

.modal-enter-active .recovery-flow-modal__content {
  animation: modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active .recovery-flow-modal__content {
  animation: modal-out 0.15s ease-in forwards;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes modal-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.98) translateY(4px);
  }
}

/* Dark mode */
[data-theme='dark'] .recovery-flow-modal {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme='dark'] .recovery-flow-modal__content::before {
  opacity: 0.03;
}
</style>
