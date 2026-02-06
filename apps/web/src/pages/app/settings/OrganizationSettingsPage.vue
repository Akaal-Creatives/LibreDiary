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
  allowedDomains: '', // Comma-separated domains for simple UI
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
        allowedDomains: currentOrg.value.allowedDomains?.join(', ') || '',
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
    // Convert comma-separated domains to array
    const domainsArray = form.value.allowedDomains
      ? form.value.allowedDomains
          .split(',')
          .map((d) => d.trim().toLowerCase())
          .filter((d) => d.length > 0)
      : [];

    await orgsStore.updateOrganization({
      name: form.value.name,
      slug: form.value.slug,
      allowedDomains: domainsArray,
      aiEnabled: form.value.aiEnabled,
    });
    success.value = 'Settings saved successfully';
    // Auto-hide success after 3s
    setTimeout(() => {
      success.value = null;
    }, 3000);
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
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">Settings</h1>
        <p class="page-description">Manage your organization's profile, security, and features</p>
      </div>
      <div v-if="currentOrg" class="org-badge">
        <span
          class="org-avatar"
          :style="{ backgroundColor: currentOrg.accentColor || 'var(--color-accent)' }"
        >
          {{ currentOrg.name.charAt(0).toUpperCase() }}
        </span>
        <span class="org-name">{{ currentOrg.name }}</span>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading settings...</p>
    </div>

    <template v-else>
      <!-- Notifications -->
      <Transition name="slide-fade">
        <div v-if="error" class="notification notification--error">
          <svg class="notification-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M9 5V10M9 12.5V13"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>{{ error }}</span>
          <button class="notification-close" @click="error = null">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 3L11 11M11 3L3 11"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </Transition>

      <Transition name="slide-fade">
        <div v-if="success" class="notification notification--success">
          <svg class="notification-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M5.5 9L8 11.5L12.5 6.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>{{ success }}</span>
        </div>
      </Transition>

      <form class="settings-form" @submit.prevent="handleSave">
        <!-- General Settings -->
        <section class="settings-section">
          <div class="section-header">
            <div class="section-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect
                  x="3"
                  y="3"
                  width="14"
                  height="14"
                  rx="3"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  d="M7 10H13M7 7H10"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <div class="section-header-text">
              <h2 class="section-title">General</h2>
              <p class="section-description">Basic organization information</p>
            </div>
          </div>

          <div class="section-content">
            <div class="field">
              <label for="org-name" class="field-label">Organization name</label>
              <input
                id="org-name"
                v-model="form.name"
                type="text"
                class="field-input"
                placeholder="Acme Inc."
                :disabled="saving || !orgsStore.canManageSettings"
              />
            </div>

            <div class="field">
              <label for="org-slug" class="field-label">URL slug</label>
              <div class="field-input-group">
                <span class="field-prefix">librediary.app/</span>
                <input
                  id="org-slug"
                  v-model="form.slug"
                  type="text"
                  class="field-input field-input--grouped"
                  placeholder="acme"
                  :disabled="saving || !orgsStore.canManageSettings"
                />
              </div>
              <p class="field-hint">Used in URLs to identify your organization</p>
            </div>
          </div>
        </section>

        <!-- Security Settings (Owner only) -->
        <section v-if="orgsStore.isOwner" class="settings-section">
          <div class="section-header">
            <div class="section-icon section-icon--security">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2L3 5V9.5C3 13.64 5.95 17.52 10 18.5C14.05 17.52 17 13.64 17 9.5V5L10 2Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
                <path
                  d="M7 10L9 12L13 8"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="section-header-text">
              <h2 class="section-title">Security</h2>
              <p class="section-description">Control who can join your organization</p>
            </div>
          </div>

          <div class="section-content">
            <div class="field">
              <label for="allowed-domains" class="field-label">
                Email domain restriction
                <span class="field-label-badge">Owner only</span>
              </label>
              <input
                id="allowed-domains"
                v-model="form.allowedDomains"
                type="text"
                class="field-input"
                placeholder="example.com, company.org"
                :disabled="saving"
              />
              <p class="field-hint">
                Only allow invites to email addresses from these domains. Separate multiple domains
                with commas. Leave empty to allow any domain.
              </p>
            </div>
          </div>
        </section>

        <!-- Features Settings -->
        <section class="settings-section">
          <div class="section-header">
            <div class="section-icon section-icon--features">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2L12.09 7.26L18 8.27L14 12.14L14.82 18.02L10 15.27L5.18 18.02L6 12.14L2 8.27L7.91 7.26L10 2Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <div class="section-header-text">
              <h2 class="section-title">Features</h2>
              <p class="section-description">Enable or disable capabilities</p>
            </div>
          </div>

          <div class="section-content">
            <div class="toggle-row">
              <div class="toggle-info">
                <div class="toggle-label">AI-powered writing</div>
                <p class="toggle-description">
                  Enable intelligent writing assistance, suggestions, and content generation
                </p>
              </div>
              <label class="toggle">
                <input
                  id="ai-enabled"
                  v-model="form.aiEnabled"
                  type="checkbox"
                  :disabled="saving || !orgsStore.canManageSettings"
                />
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
              </label>
            </div>
          </div>
        </section>

        <!-- Save Actions -->
        <div v-if="orgsStore.canManageSettings" class="form-actions">
          <button type="submit" class="btn btn--primary" :disabled="saving">
            <svg
              v-if="saving"
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
            <span>{{ saving ? 'Saving...' : 'Save changes' }}</span>
          </button>
        </div>
      </form>

      <!-- Danger Zone (Owner only) -->
      <section v-if="orgsStore.isOwner" class="danger-zone">
        <div class="danger-header">
          <svg class="danger-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2L18 17H2L10 2Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path
              d="M10 8V11M10 14V14.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <h2 class="danger-title">Danger Zone</h2>
        </div>

        <div class="danger-card">
          <div class="danger-content">
            <h3 class="danger-action-title">Delete this organization</h3>
            <p class="danger-action-description">
              Once deleted, all pages, members, and settings will be permanently removed. This
              action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            class="btn btn--danger"
            :disabled="saving"
            @click="openDeleteConfirm"
          >
            Delete organization
          </button>
        </div>
      </section>
    </template>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="closeDeleteConfirm">
          <div class="modal modal--danger">
            <div class="modal-header">
              <div class="modal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3L21 20H3L12 3Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M12 10V13M12 16V16.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <h2 class="modal-title">Delete Organization</h2>
            </div>

            <div class="modal-body">
              <p class="modal-text">
                This will permanently delete <strong>{{ currentOrg?.name }}</strong> and all
                associated data including:
              </p>
              <ul class="modal-list">
                <li>All pages and their content</li>
                <li>Member access and invitations</li>
                <li>Organization settings</li>
              </ul>

              <div class="field">
                <label class="field-label">
                  Type <code class="confirm-code">{{ currentOrg?.name }}</code> to confirm
                </label>
                <input
                  v-model="deleteConfirmText"
                  type="text"
                  class="field-input"
                  :placeholder="currentOrg?.name"
                  autocomplete="off"
                />
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn--ghost"
                :disabled="saving"
                @click="closeDeleteConfirm"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn--danger"
                :disabled="deleteConfirmText !== currentOrg?.name || saving"
                @click="handleDelete"
              >
                {{ saving ? 'Deleting...' : 'I understand, delete this organization' }}
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
  max-width: 680px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
}

/* Page Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  flex: 1;
}

.page-title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.page-description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.org-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
}

.org-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  border-radius: var(--radius-sm);
}

.org-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-16) 0;
  color: var(--color-text-tertiary);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Notifications */
.notification {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  border-radius: var(--radius-lg);
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
}

.notification--error {
  color: var(--color-error);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-error) 8%, transparent),
    color-mix(in srgb, var(--color-error) 4%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--color-error) 20%, transparent);
}

.notification--success {
  color: var(--color-success);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-success) 8%, transparent),
    color-mix(in srgb, var(--color-success) 4%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--color-success) 20%, transparent);
}

.notification-icon {
  flex-shrink: 0;
}

.notification-close {
  margin-left: auto;
  padding: var(--space-1);
  color: inherit;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.notification-close:hover {
  opacity: 1;
}

/* Slide-fade transition */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Settings Sections */
.settings-section {
  margin-bottom: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.settings-section:hover {
  border-color: var(--color-border-strong);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-5) var(--space-4);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-accent) 3%, var(--color-surface)) 0%,
    var(--color-surface) 100%
  );
  border-bottom: 1px solid var(--color-border-subtle);
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-md);
}

.section-icon--security {
  color: #5a9a6b;
  background: rgba(90, 154, 107, 0.1);
}

.section-icon--features {
  color: #c4973b;
  background: rgba(196, 151, 59, 0.1);
}

.section-header-text {
  flex: 1;
  padding-top: 2px;
}

.section-title {
  margin: 0 0 2px;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.section-content {
  padding: var(--space-5);
}

/* Form Fields */
.field {
  margin-bottom: var(--space-5);
}

.field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.field-label-badge {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: var(--color-accent-subtle);
  border-radius: var(--radius-sm);
}

.field-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all var(--transition-fast);
}

.field-input::placeholder {
  color: var(--color-text-tertiary);
}

.field-input:hover:not(:disabled) {
  border-color: var(--color-border-strong);
}

.field-input:focus {
  border-color: var(--color-accent);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.04),
    0 0 0 3px var(--color-focus-ring);
}

.field-input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.field-input-group {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.field-input-group:hover {
  border-color: var(--color-border-strong);
}

.field-input-group:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.field-prefix {
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  background: var(--color-surface-sunken);
  border-right: 1px solid var(--color-border);
}

.field-input--grouped {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.field-input--grouped:focus {
  box-shadow: none;
}

.field-hint {
  margin: var(--space-2) 0 0;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-text-tertiary);
}

/* Toggle Row */
.toggle-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.toggle-info {
  flex: 1;
}

.toggle-label {
  margin-bottom: var(--space-1);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.toggle-description {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-text-tertiary);
}

/* Custom Toggle */
.toggle {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.toggle-track {
  display: flex;
  align-items: center;
  width: 44px;
  height: 24px;
  padding: 2px;
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
  transition: background var(--transition-fast);
}

.toggle input:checked + .toggle-track {
  background: var(--color-accent);
}

.toggle input:disabled + .toggle-track {
  cursor: not-allowed;
  opacity: 0.5;
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform var(--transition-fast);
}

.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-8);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn--primary {
  color: white;
  background: var(--color-accent);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn--primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn--ghost {
  color: var(--color-text-secondary);
  background: transparent;
}

.btn--ghost:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.btn--danger {
  color: white;
  background: var(--color-error);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn--danger:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn--danger:active:not(:disabled) {
  transform: translateY(0);
}

.btn-spinner {
  animation: spin 0.8s linear infinite;
}

/* Danger Zone */
.danger-zone {
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px dashed var(--color-border);
}

.danger-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.danger-icon {
  color: var(--color-error);
}

.danger-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-error);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.danger-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-error) 4%, var(--color-surface)) 0%,
    color-mix(in srgb, var(--color-error) 2%, var(--color-surface)) 100%
  );
  border: 1px solid color-mix(in srgb, var(--color-error) 20%, transparent);
  border-radius: var(--radius-lg);
}

.danger-content {
  flex: 1;
}

.danger-action-title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.danger-action-description {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-text-secondary);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 440px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

.modal--danger {
  border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-error) 6%, var(--color-surface)) 0%,
    color-mix(in srgb, var(--color-error) 3%, var(--color-surface)) 100%
  );
  border-bottom: 1px solid var(--color-border);
}

.modal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border-radius: var(--radius-md);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-body {
  padding: var(--space-5);
}

.modal-text {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.modal-list {
  margin: 0 0 var(--space-5);
  padding-left: var(--space-5);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.modal-list li {
  margin-bottom: var(--space-1);
}

.confirm-code {
  padding: 2px 6px;
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border-radius: var(--radius-sm);
}

.modal-footer {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface-sunken);
  border-top: 1px solid var(--color-border);
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95) translateY(10px);
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
