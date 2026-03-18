<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePagesStore } from '@/stores/pages';
import { useInbox } from '@/composables/useInbox';
import { useOfflineQueue } from '@/composables/useOfflineQueue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { useSidebar } from '@/composables/useSidebar';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const pagesStore = usePagesStore();
const authStore = useAuthStore();
const { ensureInbox } = useInbox();
const offlineQueue = useOfflineQueue();
const toast = useToast();
const { isMobile } = useSidebar();

const titleInput = ref<HTMLInputElement>();
const title = ref('');
const body = ref('');
const parentId = ref<string | null>(null);
const saving = ref(false);

const rootPageOptions = computed(() =>
  pagesStore.rootPages.map((p) => ({ id: p.id, title: p.title || t('pages.untitled') }))
);

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      // Reset form
      title.value = '';
      body.value = '';
      parentId.value = null;
      document.body.style.overflow = 'hidden';
      await nextTick();
      titleInput.value?.focus();
    } else {
      document.body.style.overflow = '';
    }
  }
);

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
  // Mod+Enter to save
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    handleSave();
  }
}

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close');
  }
}

async function handleSave() {
  if (saving.value || !title.value.trim()) return;

  saving.value = true;

  try {
    // Resolve parent — default to inbox
    let targetParentId = parentId.value;
    if (!targetParentId) {
      try {
        targetParentId = await ensureInbox();
      } catch {
        // If inbox creation fails, save to root
        targetParentId = null;
      }
    }

    if (!navigator.onLine) {
      // Queue for later
      const orgId = authStore.currentOrganizationId ?? '';
      offlineQueue.enqueue({
        title: title.value.trim(),
        body: body.value.trim(),
        parentId: targetParentId,
        orgId,
      });
      toast.info(t('quickCapture.queuedOffline'));
    } else {
      // Create page immediately
      await pagesStore.createPage({
        title: title.value.trim(),
        parentId: targetParentId ?? undefined,
      });

      toast.success(t('quickCapture.saved'));
    }

    emit('close');
  } catch (error) {
    console.error('Failed to save capture:', error);
    toast.error(t('quickCapture.failedToSave'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  if (props.open) {
    document.body.style.overflow = 'hidden';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition :name="isMobile ? 'sheet' : 'modal'">
      <div
        v-if="open"
        class="capture-backdrop"
        :class="{ 'is-mobile': isMobile }"
        role="dialog"
        aria-modal="true"
        :aria-label="t('quickCapture.title')"
        @click="handleBackdropClick"
        @keydown="handleKeydown"
      >
        <div class="capture-sheet" :class="{ 'is-mobile': isMobile }">
          <!-- Handle bar (mobile only) -->
          <div v-if="isMobile" class="sheet-handle">
            <div class="sheet-handle-bar" />
          </div>

          <!-- Header -->
          <div class="capture-header">
            <h2 class="capture-title">{{ t('quickCapture.title') }}</h2>
            <button
              type="button"
              class="capture-close"
              :aria-label="t('common.close')"
              @click="emit('close')"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 5L15 15M15 5L5 15"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form class="capture-form" @submit.prevent="handleSave">
            <div class="capture-field">
              <input
                ref="titleInput"
                v-model="title"
                type="text"
                class="capture-input capture-input-title"
                :placeholder="t('quickCapture.titlePlaceholder')"
                autocomplete="off"
                required
              />
            </div>

            <div class="capture-field">
              <textarea
                v-model="body"
                class="capture-input capture-input-body"
                :placeholder="t('quickCapture.bodyPlaceholder')"
                rows="3"
              />
            </div>

            <!-- Parent selector -->
            <div class="capture-field capture-parent">
              <label class="capture-label">{{ t('quickCapture.parentLabel') }}</label>
              <select v-model="parentId" class="capture-select">
                <option :value="null">{{ t('inbox.title') }}</option>
                <option v-for="page in rootPageOptions" :key="page.id" :value="page.id">
                  {{ page.title }}
                </option>
              </select>
            </div>

            <!-- Actions -->
            <div class="capture-actions">
              <button type="button" class="capture-btn capture-btn-cancel" @click="emit('close')">
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                class="capture-btn capture-btn-save"
                :disabled="saving || !title.trim()"
              >
                {{ saving ? t('quickCapture.saving') : t('quickCapture.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.capture-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(22, 25, 23, 0.6);
  backdrop-filter: blur(4px);
}

.capture-backdrop.is-mobile {
  align-items: flex-end;
  padding: 0;
}

.capture-sheet {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
}

.capture-sheet.is-mobile {
  max-width: 100%;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Handle bar */
.sheet-handle {
  display: flex;
  justify-content: center;
  padding: var(--space-3) 0 var(--space-1);
}

.sheet-handle-bar {
  width: 36px;
  height: 4px;
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
}

/* Header */
.capture-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5) 0;
}

.capture-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.capture-close {
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

.capture-close:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

/* Form */
.capture-form {
  padding: var(--space-4) var(--space-5) var(--space-5);
}

.capture-field {
  margin-bottom: var(--space-3);
}

.capture-input {
  width: 100%;
  padding: var(--space-3);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--transition-fast);
}

.capture-input:focus {
  border-color: var(--input-focus-border);
}

.capture-input::placeholder {
  color: var(--color-text-tertiary);
}

.capture-input-title {
  font-size: var(--text-lg);
  font-weight: 500;
}

.capture-input-body {
  min-height: 80px;
  resize: vertical;
}

/* Parent selector */
.capture-parent {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.capture-label {
  flex-shrink: 0;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.capture-select {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-md);
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.capture-select:focus {
  border-color: var(--input-focus-border);
}

/* Actions */
.capture-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.capture-btn {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.capture-btn-cancel {
  color: var(--color-text-secondary);
  background: transparent;
}

.capture-btn-cancel:hover {
  background: var(--color-hover);
}

.capture-btn-save {
  color: var(--color-text-inverse);
  background: var(--color-accent);
}

.capture-btn-save:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.capture-btn-save:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Sheet slide-up animation (mobile) */
.sheet-enter-active {
  transition: opacity 0.2s ease-out;
}

.sheet-enter-active .capture-sheet {
  animation: sheet-in 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-leave-active {
  transition: opacity 0.15s ease-in;
}

.sheet-leave-active .capture-sheet {
  animation: sheet-out 0.2s ease-in forwards;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

@keyframes sheet-in {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes sheet-out {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

/* Modal scale animation (desktop) */
.modal-enter-active {
  transition: opacity 0.2s ease-out;
}

.modal-enter-active .capture-sheet {
  animation: modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active {
  transition: opacity 0.15s ease-in;
}

.modal-leave-active .capture-sheet {
  animation: modal-out 0.15s ease-in forwards;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
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
[data-theme='dark'] .capture-backdrop {
  background: rgba(0, 0, 0, 0.7);
}
</style>
