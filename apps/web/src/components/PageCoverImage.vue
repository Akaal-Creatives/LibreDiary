<script setup lang="ts">
import { ref, watch } from 'vue';
import { usePagesStore } from '@/stores';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  coverUrl: string | null;
  pageId: string;
}>();

const emit = defineEmits<{
  update: [];
}>();

const pagesStore = usePagesStore();
const toast = useToast();

const showModal = ref(false);
const urlInput = ref('');
const urlError = ref<string | null>(null);
const saving = ref(false);

watch(
  () => showModal.value,
  (isOpen) => {
    if (isOpen) {
      urlInput.value = props.coverUrl || '';
      urlError.value = null;
    }
  }
);

function openModal() {
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  urlInput.value = '';
  urlError.value = null;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function submitUrl() {
  const url = urlInput.value.trim();

  if (!url) {
    urlError.value = 'Please enter a URL';
    return;
  }

  if (!isValidUrl(url)) {
    urlError.value = 'Please enter a valid URL';
    return;
  }

  saving.value = true;
  try {
    await pagesStore.updatePageData(props.pageId, { coverUrl: url });
    emit('update');
    closeModal();
  } catch (e) {
    console.error('Failed to update cover:', e);
    toast.error('Failed to update cover image');
  } finally {
    saving.value = false;
  }
}

async function removeCover() {
  saving.value = true;
  try {
    await pagesStore.updatePageData(props.pageId, { coverUrl: null });
    emit('update');
  } catch (e) {
    console.error('Failed to remove cover:', e);
    toast.error('Failed to remove cover image');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="page-cover-wrapper">
    <!-- Cover Image Display -->
    <div v-if="coverUrl" class="cover-container">
      <div class="cover-image" :style="{ backgroundImage: `url(${coverUrl})` }"></div>
      <div class="cover-actions">
        <button class="cover-action-btn change-cover-btn" @click="openModal">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M10.5 1.5L12.5 3.5L5 11H3V9L10.5 1.5Z"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Change cover</span>
        </button>
        <button
          class="cover-action-btn remove-cover-btn"
          aria-label="Remove cover image"
          @click="removeCover"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4H12" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
            <path
              d="M4.5 4V3C4.5 2.44772 4.94772 2 5.5 2H8.5C9.05228 2 9.5 2.44772 9.5 3V4"
              stroke="currentColor"
              stroke-width="1.25"
            />
            <path
              d="M3 4L3.75 11.5C3.78 11.7761 4.00239 12 4.27852 12H9.72148C9.99761 12 10.22 11.7761 10.25 11.5L11 4"
              stroke="currentColor"
              stroke-width="1.25"
            />
          </svg>
          <span>Remove</span>
        </button>
      </div>
    </div>

    <!-- Add Cover Button (when no cover) -->
    <div v-else class="add-cover-area">
      <button class="add-cover-btn" aria-label="Add cover image" @click="openModal">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect
            x="2"
            y="3"
            width="12"
            height="10"
            rx="1"
            stroke="currentColor"
            stroke-width="1.25"
          />
          <circle cx="5.5" cy="6.5" r="1.5" stroke="currentColor" stroke-width="1.25" />
          <path
            d="M2 11L5 8L7 10L10 6L14 11"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>Add cover</span>
      </button>
    </div>

    <!-- URL Input Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
          <div
            class="cover-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cover-modal-title"
          >
            <div class="modal-header">
              <h3 id="cover-modal-title" class="modal-title">
                {{ coverUrl ? 'Change cover image' : 'Add cover image' }}
              </h3>
              <button class="close-btn" aria-label="Close" @click="closeModal">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 4L12 12M4 12L12 4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label for="cover-url" class="form-label">Image URL</label>
                <input
                  id="cover-url"
                  v-model="urlInput"
                  type="url"
                  class="form-input"
                  placeholder="https://example.com/image.jpg"
                  :disabled="saving"
                />
                <p v-if="urlError" class="form-error">{{ urlError }}</p>
                <p class="form-help">Enter a direct URL to an image (JPG, PNG, GIF, WebP)</p>
              </div>

              <!-- Preview -->
              <div v-if="urlInput && isValidUrl(urlInput)" class="preview-section">
                <p class="preview-label">Preview</p>
                <div class="preview-image" :style="{ backgroundImage: `url(${urlInput})` }"></div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary cancel-btn" :disabled="saving" @click="closeModal">
                Cancel
              </button>
              <button class="btn btn-primary submit-btn" :disabled="saving" @click="submitUrl">
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.page-cover-wrapper {
  position: relative;
  width: 100%;
}

/* Cover Image */
.cover-container {
  position: relative;
  width: 100%;
  height: 200px;
  margin-bottom: var(--space-6);
  overflow: hidden;
  border-radius: var(--radius-lg);
}

.cover-image {
  width: 100%;
  height: 100%;
  background-position: center;
  background-size: cover;
}

.cover-actions {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-3);
  display: flex;
  gap: var(--space-2);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.cover-container:hover .cover-actions {
  opacity: 1;
}

.cover-action-btn {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-inverse);
  cursor: pointer;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: var(--radius-md);
  backdrop-filter: blur(4px);
  transition: all var(--transition-fast);
}

.cover-action-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

/* Add Cover Area */
.add-cover-area {
  padding: var(--space-2) var(--space-4);
  margin-bottom: var(--space-4);
}

.add-cover-btn {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.add-cover-btn:hover {
  color: var(--color-text-secondary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
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

.cover-modal {
  width: 100%;
  max-width: 480px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
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
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.modal-body {
  padding: var(--space-4);
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

.form-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
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
  opacity: 0.6;
  cursor: not-allowed;
}

.form-error {
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-error);
}

.form-help {
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.preview-section {
  margin-top: var(--space-4);
}

.preview-label {
  margin-bottom: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-image {
  width: 100%;
  height: 120px;
  background-color: var(--color-surface-sunken);
  background-position: center;
  background-size: cover;
  border-radius: var(--radius-md);
}

.modal-footer {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding: var(--space-4);
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
  opacity: 0.6;
  cursor: not-allowed;
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

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .cover-modal,
.modal-leave-to .cover-modal {
  transform: scale(0.95) translateY(10px);
}
</style>
