<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { api, ApiError } from '@/services';
import { useOrganizationsStore } from '@/stores';

const props = defineProps<{
  pageId: string;
  pageTitle: string;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update'): void;
}>();

const orgStore = useOrganizationsStore();

// Types
interface Permission {
  id: string;
  userId: string | null;
  level: 'VIEW' | 'EDIT' | 'FULL_ACCESS';
  shareToken: string | null;
  expiresAt: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
}

interface PagePublicInfo {
  isPublic: boolean;
  publicSlug: string | null;
}

// State
const loading = ref(true);
const saving = ref(false);
const permissions = ref<Permission[]>([]);
const shareLinks = ref<Permission[]>([]);
const pageInfo = ref<PagePublicInfo>({ isPublic: false, publicSlug: null });

// Add permission form
const newEmail = ref('');
const newLevel = ref<'VIEW' | 'EDIT' | 'FULL_ACCESS'>('VIEW');
const addError = ref('');

// Copy status
const copied = ref(false);
let copiedTimeout: ReturnType<typeof setTimeout> | null = null;

const orgId = computed(() => orgStore.currentOrganization?.id);

const publicUrl = computed(() => {
  if (!pageInfo.value.publicSlug) return '';
  return `${window.location.origin}/p/${pageInfo.value.publicSlug}`;
});

onMounted(() => {
  if (props.isOpen) {
    loadData();
  }
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      loadData();
    }
  }
);

async function loadData() {
  if (!orgId.value) return;

  loading.value = true;
  try {
    // Fetch permissions and page info in parallel
    const [permResponse, linkResponse, pageResponse] = await Promise.all([
      api.get<{ permissions: Permission[] }>(
        `/organizations/${orgId.value}/pages/${props.pageId}/permissions`
      ),
      api.get<{ shareLinks: Permission[] }>(
        `/organizations/${orgId.value}/pages/${props.pageId}/permissions/share-links`
      ),
      api.get<{ page: PagePublicInfo }>(`/organizations/${orgId.value}/pages/${props.pageId}`),
    ]);

    permissions.value = permResponse.permissions.filter((p) => p.userId !== null);
    shareLinks.value = linkResponse.shareLinks;
    pageInfo.value = {
      isPublic: pageResponse.page.isPublic,
      publicSlug: pageResponse.page.publicSlug,
    };
  } catch (e) {
    console.error('Failed to load share data:', e);
  } finally {
    loading.value = false;
  }
}

async function togglePublic() {
  if (!orgId.value) return;

  saving.value = true;
  try {
    const newIsPublic = !pageInfo.value.isPublic;
    const response = await api.patch<{ page: PagePublicInfo }>(
      `/organizations/${orgId.value}/pages/${props.pageId}`,
      {
        isPublic: newIsPublic,
      }
    );
    pageInfo.value = {
      isPublic: response.page.isPublic,
      publicSlug: response.page.publicSlug,
    };
    emit('update');
  } catch (e) {
    console.error('Failed to toggle public access:', e);
  } finally {
    saving.value = false;
  }
}

async function copyPublicLink() {
  if (!publicUrl.value) return;

  try {
    await navigator.clipboard.writeText(publicUrl.value);
    copied.value = true;

    if (copiedTimeout) clearTimeout(copiedTimeout);
    copiedTimeout = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy link:', e);
  }
}

async function addPermission() {
  if (!orgId.value || !newEmail.value.trim()) return;

  addError.value = '';
  saving.value = true;

  try {
    // First, find the user by email (simplified - you'd need a user lookup endpoint)
    // For now, assume the backend handles email-to-userId conversion
    await api.post(`/organizations/${orgId.value}/pages/${props.pageId}/permissions`, {
      userId: newEmail.value.trim(), // Backend should handle email lookup
      level: newLevel.value,
    });

    newEmail.value = '';
    newLevel.value = 'VIEW';
    await loadData();
    emit('update');
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'PERMISSION_EXISTS') {
        addError.value = 'This user already has access';
      } else {
        addError.value = e.message;
      }
    } else {
      addError.value = 'Failed to add permission';
    }
  } finally {
    saving.value = false;
  }
}

async function updatePermission(permissionId: string, level: 'VIEW' | 'EDIT' | 'FULL_ACCESS') {
  if (!orgId.value) return;

  saving.value = true;
  try {
    await api.patch(
      `/organizations/${orgId.value}/pages/${props.pageId}/permissions/${permissionId}`,
      {
        level,
      }
    );
    await loadData();
    emit('update');
  } catch (e) {
    console.error('Failed to update permission:', e);
  } finally {
    saving.value = false;
  }
}

async function removePermission(permissionId: string) {
  if (!orgId.value) return;

  saving.value = true;
  try {
    await api.delete(
      `/organizations/${orgId.value}/pages/${props.pageId}/permissions/${permissionId}`
    );
    await loadData();
    emit('update');
  } catch (e) {
    console.error('Failed to remove permission:', e);
  } finally {
    saving.value = false;
  }
}

function close() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <!-- Header -->
          <header class="modal-header">
            <div class="header-content">
              <h2 class="modal-title">Share</h2>
              <p class="modal-subtitle">{{ pageTitle }}</p>
            </div>
            <button class="close-btn" aria-label="Close" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </header>

          <!-- Loading -->
          <div v-if="loading" class="modal-loading">
            <div class="loading-dot"></div>
            <span>Loading sharing settings...</span>
          </div>

          <div v-else class="modal-body">
            <!-- Public Access Section -->
            <section class="share-section">
              <div class="section-header">
                <div class="section-icon public-icon">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5" />
                    <path d="M10 3V17" stroke="currentColor" stroke-width="1.5" />
                    <path d="M3 10H17" stroke="currentColor" stroke-width="1.5" />
                    <path
                      d="M4 6.5C5.5 7.5 7.5 8 10 8C12.5 8 14.5 7.5 16 6.5"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                    <path
                      d="M4 13.5C5.5 12.5 7.5 12 10 12C12.5 12 14.5 12.5 16 13.5"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                  </svg>
                </div>
                <div class="section-info">
                  <h3 class="section-title">Public Access</h3>
                  <p class="section-desc">Anyone with the link can view this page</p>
                </div>
                <label class="toggle" :class="{ active: pageInfo.isPublic, saving }">
                  <input
                    type="checkbox"
                    :checked="pageInfo.isPublic"
                    :disabled="saving"
                    @change="togglePublic"
                  />
                  <span class="toggle-track">
                    <span class="toggle-thumb"></span>
                  </span>
                </label>
              </div>

              <!-- Public Link -->
              <Transition name="slide">
                <div v-if="pageInfo.isPublic && publicUrl" class="public-link-box">
                  <input type="text" :value="publicUrl" readonly class="link-input" />
                  <button class="copy-btn" :class="{ copied }" @click="copyPublicLink">
                    <svg v-if="!copied" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect
                        x="5"
                        y="5"
                        width="8"
                        height="8"
                        rx="1.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                      />
                      <path
                        d="M3 11V3.5C3 2.67 3.67 2 4.5 2H11"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 8.5L6 11.5L13 4.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    {{ copied ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
              </Transition>
            </section>

            <!-- Divider -->
            <div class="section-divider"></div>

            <!-- People with Access -->
            <section class="share-section">
              <h3 class="section-label">People with access</h3>

              <!-- Add Person Form -->
              <div class="add-person-form">
                <div class="form-row">
                  <input
                    v-model="newEmail"
                    type="email"
                    placeholder="Enter email or user ID..."
                    class="email-input"
                    @keyup.enter="addPermission"
                  />
                  <select v-model="newLevel" class="level-select">
                    <option value="VIEW">Can view</option>
                    <option value="EDIT">Can edit</option>
                    <option value="FULL_ACCESS">Full access</option>
                  </select>
                  <button
                    class="add-btn"
                    :disabled="!newEmail.trim() || saving"
                    @click="addPermission"
                  >
                    Add
                  </button>
                </div>
                <p v-if="addError" class="form-error">{{ addError }}</p>
              </div>

              <!-- Permission List -->
              <div class="permission-list">
                <div v-if="permissions.length === 0" class="empty-state">
                  <p>No one else has access yet</p>
                </div>

                <TransitionGroup name="list" tag="div">
                  <div v-for="perm in permissions" :key="perm.id" class="permission-item">
                    <div class="user-avatar">
                      {{ (perm.user?.name ?? perm.user?.email ?? '?').charAt(0).toUpperCase() }}
                    </div>
                    <div class="user-info">
                      <span class="user-name">{{ perm.user?.name || 'Unknown user' }}</span>
                      <span class="user-email">{{ perm.user?.email }}</span>
                    </div>
                    <select
                      :value="perm.level"
                      class="level-select compact"
                      @change="
                        (e: Event) =>
                          updatePermission(
                            perm.id,
                            ((e.target as HTMLSelectElement)?.value ?? perm.level) as
                              | 'VIEW'
                              | 'EDIT'
                              | 'FULL_ACCESS'
                          )
                      "
                    >
                      <option value="VIEW">Can view</option>
                      <option value="EDIT">Can edit</option>
                      <option value="FULL_ACCESS">Full access</option>
                    </select>
                    <button
                      class="remove-btn"
                      title="Remove access"
                      @click="removePermission(perm.id)"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M12 4L4 12M4 4L12 12"
                          stroke="currentColor"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </TransitionGroup>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.modal-container {
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

/* Header */
.modal-header {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-subtitle {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.close-btn {
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

.close-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

/* Loading */
.modal-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  padding: var(--space-10);
  color: var(--color-text-tertiary);
}

.loading-dot {
  width: 24px;
  height: 24px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: pulse-dot 1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Body */
.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
}

/* Section */
.share-section {
  margin-bottom: var(--space-4);
}

.section-header {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.section-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-accent);
  background: rgba(107, 143, 113, 0.1);
  border-radius: var(--radius-lg);
}

.section-info {
  flex: 1;
  min-width: 0;
}

.section-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-desc {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.section-label {
  margin: 0 0 var(--space-3);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Toggle */
.toggle {
  position: relative;
  cursor: pointer;
}

.toggle input {
  position: absolute;
  opacity: 0;
}

.toggle-track {
  display: block;
  width: 44px;
  height: 24px;
  padding: 2px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  transition: background var(--transition-fast);
}

.toggle.active .toggle-track {
  background: var(--color-accent);
}

.toggle.saving {
  opacity: 0.6;
  pointer-events: none;
}

.toggle-thumb {
  display: block;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform var(--transition-fast);
}

.toggle.active .toggle-thumb {
  transform: translateX(20px);
}

/* Public Link Box */
.public-link-box {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.link-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  outline: none;
}

.copy-btn {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  background: rgba(107, 143, 113, 0.1);
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.copy-btn:hover {
  background: rgba(107, 143, 113, 0.2);
}

.copy-btn.copied {
  color: var(--color-success);
  background: rgba(34, 197, 94, 0.1);
}

/* Divider */
.section-divider {
  height: 1px;
  margin: var(--space-4) 0;
  background: var(--color-border);
}

/* Add Person Form */
.add-person-form {
  margin-bottom: var(--space-4);
}

.form-row {
  display: flex;
  gap: var(--space-2);
}

.email-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: all var(--transition-fast);
}

.email-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(107, 143, 113, 0.1);
}

.level-select {
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  cursor: pointer;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
}

.level-select.compact {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
}

.add-btn {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: white;
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.add-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-error {
  margin: var(--space-2) 0 0;
  font-size: var(--text-xs);
  color: var(--color-error);
}

/* Permission List */
.permission-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.empty-state {
  padding: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: center;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.permission-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.user-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
  background: rgba(107, 143, 113, 0.15);
  border-radius: 50%;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.user-email {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.remove-btn:hover {
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(10px);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.list-move {
  transition: transform 0.2s ease;
}
</style>
