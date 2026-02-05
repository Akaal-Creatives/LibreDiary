<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { OrgRole } from '@librediary/shared';
import { useOrganizationsStore } from '@/stores/organizations';
import { ApiError } from '@/services';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  invited: [];
}>();

const orgsStore = useOrganizationsStore();
const toast = useToast();

const email = ref('');
const role = ref<OrgRole>('MEMBER');
const error = ref<string | null>(null);
const submitting = ref(false);

// Reset form when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      email.value = '';
      role.value = 'MEMBER';
      error.value = null;
    }
  }
);

// Owner can invite with any role, Admin can only invite as Member
const availableRoles = computed<{ value: OrgRole; label: string }[]>(() => {
  if (orgsStore.isOwner) {
    return [
      { value: 'MEMBER', label: 'Member' },
      { value: 'ADMIN', label: 'Admin' },
    ];
  }
  return [{ value: 'MEMBER', label: 'Member' }];
});

async function handleSubmit() {
  error.value = null;

  if (!email.value.trim()) {
    error.value = 'Email is required';
    return;
  }

  submitting.value = true;
  try {
    await orgsStore.createInvite({
      email: email.value.trim(),
      role: role.value,
    });
    toast.success(`Invitation sent to ${email.value.trim()}`);
    emit('invited');
    emit('close');
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to send invite';
    }
  } finally {
    submitting.value = false;
  }
}

function close() {
  if (!submitting.value) {
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="close">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2 class="modal-title">Invite Member</h2>
            <button class="close-button" :disabled="submitting" @click="close">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <form class="modal-body" @submit.prevent="handleSubmit">
            <div v-if="error" class="error-message">
              {{ error }}
            </div>

            <div class="form-group">
              <label for="invite-email" class="form-label">Email address</label>
              <input
                id="invite-email"
                v-model="email"
                type="email"
                class="form-input"
                placeholder="colleague@example.com"
                :disabled="submitting"
                autocomplete="email"
              />
            </div>

            <div class="form-group">
              <label for="invite-role" class="form-label">Role</label>
              <select
                id="invite-role"
                v-model="role"
                class="form-select"
                :disabled="submitting || availableRoles.length === 1"
              >
                <option v-for="r in availableRoles" :key="r.value" :value="r.value">
                  {{ r.label }}
                </option>
              </select>
              <p class="form-help">
                <template v-if="role === 'ADMIN'">
                  Admins can manage members and organization settings.
                </template>
                <template v-else> Members can view and contribute to the organization. </template>
              </p>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" :disabled="submitting" @click="close">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                <svg
                  v-if="submitting"
                  class="btn-spinner"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-dasharray="28"
                    stroke-dashoffset="7"
                  />
                </svg>
                {{ submitting ? 'Sending...' : 'Send Invite' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.5);
}

.modal {
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - var(--space-8));
  overflow: hidden;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-button {
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

.close-button:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.close-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.modal-body {
  padding: var(--space-6);
}

.error-message {
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border-radius: var(--radius-md);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-input,
.form-select {
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

.form-input:focus,
.form-select:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.form-input:disabled,
.form-select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.form-help {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.modal-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-hover);
}

.btn-primary {
  color: white;
  background: var(--color-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95) translateY(10px);
}
</style>
