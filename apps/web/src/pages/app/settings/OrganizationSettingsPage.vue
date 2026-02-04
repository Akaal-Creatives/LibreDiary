<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores';
import { useOrganizationsStore } from '@/stores/organizations';
import { ApiError } from '@/services';

const router = useRouter();
const authStore = useAuthStore();
const orgsStore = useOrganizationsStore();

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

// Form data
const form = ref({
  name: '',
  slug: '',
  allowedDomain: '',
  aiEnabled: true,
});

const currentOrg = computed(() => authStore.currentOrganization);

// Load initial data
async function loadData() {
  loading.value = true;
  error.value = null;
  try {
    await orgsStore.fetchOrganization();
    if (currentOrg.value) {
      form.value = {
        name: currentOrg.value.name,
        slug: currentOrg.value.slug,
        allowedDomain: currentOrg.value.allowedDomain || '',
        aiEnabled: currentOrg.value.aiEnabled,
      };
    }
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to load organization settings';
    }
  } finally {
    loading.value = false;
  }
}

// Watch for organization changes
watch(
  () => authStore.currentOrganizationId,
  () => {
    loadData();
  }
);

onMounted(loadData);

async function handleSave() {
  saving.value = true;
  error.value = null;
  success.value = null;

  try {
    await orgsStore.updateOrganization({
      name: form.value.name,
      slug: form.value.slug,
      allowedDomain: form.value.allowedDomain || null,
      aiEnabled: form.value.aiEnabled,
    });
    success.value = 'Settings saved successfully';
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to save settings';
    }
  } finally {
    saving.value = false;
  }
}

// Delete confirmation
const showDeleteConfirm = ref(false);
const deleteConfirmText = ref('');

function openDeleteConfirm() {
  showDeleteConfirm.value = true;
  deleteConfirmText.value = '';
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false;
  deleteConfirmText.value = '';
}

async function handleDelete() {
  if (deleteConfirmText.value !== currentOrg.value?.name) {
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    await orgsStore.deleteOrganization();
    router.push({ name: 'dashboard' });
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to delete organization';
    }
    saving.value = false;
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="settings-header">
      <h1 class="settings-title">Organization Settings</h1>
      <p class="settings-subtitle">Manage your organization's profile and settings</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading settings...</p>
    </div>

    <template v-else>
      <div v-if="error" class="alert alert-error">
        {{ error }}
      </div>

      <div v-if="success" class="alert alert-success">
        {{ success }}
      </div>

      <form class="settings-form" @submit.prevent="handleSave">
        <!-- General Settings -->
        <section class="settings-section">
          <h2 class="section-title">General</h2>

          <div class="form-group">
            <label for="org-name" class="form-label">Organization name</label>
            <input
              id="org-name"
              v-model="form.name"
              type="text"
              class="form-input"
              :disabled="saving || !orgsStore.canManageSettings"
            />
          </div>

          <div class="form-group">
            <label for="org-slug" class="form-label">URL slug</label>
            <div class="input-prefix-wrapper">
              <span class="input-prefix">librediary.app/</span>
              <input
                id="org-slug"
                v-model="form.slug"
                type="text"
                class="form-input slug-input"
                :disabled="saving || !orgsStore.canManageSettings"
              />
            </div>
            <p class="form-help">Used in URLs to identify your organization</p>
          </div>
        </section>

        <!-- Security Settings (Owner only) -->
        <section v-if="orgsStore.isOwner" class="settings-section">
          <h2 class="section-title">Security</h2>

          <div class="form-group">
            <label for="allowed-domain" class="form-label">Email domain lockdown</label>
            <input
              id="allowed-domain"
              v-model="form.allowedDomain"
              type="text"
              class="form-input"
              placeholder="example.com"
              :disabled="saving"
            />
            <p class="form-help">
              Only allow invites to email addresses from this domain. Leave empty to allow any
              domain.
            </p>
          </div>
        </section>

        <!-- AI Settings -->
        <section class="settings-section">
          <h2 class="section-title">Features</h2>

          <div class="form-group toggle-group">
            <div class="toggle-content">
              <label for="ai-enabled" class="form-label">AI Features</label>
              <p class="form-help">Enable AI-powered writing assistance and suggestions</p>
            </div>
            <label class="toggle">
              <input
                id="ai-enabled"
                v-model="form.aiEnabled"
                type="checkbox"
                :disabled="saving || !orgsStore.canManageSettings"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </section>

        <!-- Save Button -->
        <div v-if="orgsStore.canManageSettings" class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>

      <!-- Danger Zone (Owner only) -->
      <section v-if="orgsStore.isOwner" class="settings-section danger-zone">
        <h2 class="section-title">Danger Zone</h2>

        <div class="danger-card">
          <div class="danger-content">
            <h3>Delete organization</h3>
            <p>
              Permanently delete this organization and all its data. This action cannot be undone.
            </p>
          </div>
          <button class="btn btn-danger" :disabled="saving" @click="openDeleteConfirm">
            Delete Organization
          </button>
        </div>
      </section>
    </template>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm">
          <div class="modal danger-modal">
            <div class="modal-header">
              <h2 class="modal-title">Delete Organization</h2>
            </div>
            <div class="modal-body">
              <p class="danger-warning">
                This will permanently delete <strong>{{ currentOrg?.name }}</strong> and all
                associated data including pages, members, and settings.
              </p>
              <div class="form-group">
                <label class="form-label">
                  Type <strong>{{ currentOrg?.name }}</strong> to confirm:
                </label>
                <input
                  v-model="deleteConfirmText"
                  type="text"
                  class="form-input"
                  :placeholder="currentOrg?.name"
                />
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" @click="closeDeleteConfirm">Cancel</button>
              <button
                class="btn btn-danger"
                :disabled="deleteConfirmText !== currentOrg?.name || saving"
                @click="handleDelete"
              >
                {{ saving ? 'Deleting...' : 'Delete Organization' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-6) 0;
}

.settings-header {
  margin-bottom: var(--space-8);
}

.settings-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.settings-subtitle {
  margin: 0;
  color: var(--color-text-secondary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-16) 0;
  color: var(--color-text-tertiary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.alert {
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  border-radius: var(--radius-md);
}

.alert-error {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.alert-success {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
}

.settings-section {
  padding: var(--space-6);
  margin-bottom: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.section-title {
  margin: 0 0 var(--space-4);
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-input {
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

.form-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.form-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.input-prefix-wrapper {
  display: flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.input-prefix-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.input-prefix {
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
  border-right: 1px solid var(--color-border);
}

.slug-input {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.slug-input:focus {
  box-shadow: none;
}

.form-help {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.toggle-group {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.toggle-content {
  flex: 1;
}

.toggle-content .form-label {
  margin-bottom: var(--space-1);
}

.toggle-content .form-help {
  margin-top: 0;
}

.toggle {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  width: 44px;
  height: 24px;
}

.toggle input {
  width: 0;
  height: 0;
  opacity: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  background: var(--color-border-strong);
  border-radius: 24px;
  transition: all var(--transition-fast);
}

.toggle-slider::before {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  content: '';
  background: white;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.toggle input:checked + .toggle-slider {
  background: var(--color-accent);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle input:disabled + .toggle-slider {
  cursor: not-allowed;
  opacity: 0.6;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: var(--space-3) var(--space-5);
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

.btn-primary {
  color: white;
  background: var(--color-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-hover);
}

.btn-danger {
  color: white;
  background: var(--color-error);
}

.btn-danger:hover:not(:disabled) {
  filter: brightness(0.9);
}

/* Danger Zone */
.danger-zone {
  border-color: var(--color-error);
}

.danger-zone .section-title {
  color: var(--color-error);
}

.danger-card {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.danger-content h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text-primary);
}

.danger-content p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Modal */
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
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
}

.danger-modal {
  border: 2px solid var(--color-error);
}

.modal-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-error);
}

.modal-body {
  padding: var(--space-6);
}

.danger-warning {
  margin: 0 0 var(--space-4);
  color: var(--color-text-secondary);
}

.modal-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
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
