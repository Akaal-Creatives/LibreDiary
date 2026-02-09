<script setup lang="ts">
import { ref } from 'vue';
import { usePagesStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import { filesService } from '@/services/files.service';

const props = defineProps<{
  coverUrl: string | null;
  pageId: string;
  orgId: string;
}>();

const emit = defineEmits<{
  update: [];
}>();

const pagesStore = usePagesStore();
const toast = useToast();

const uploading = ref(false);
const uploadProgress = ref(0);
const saving = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

function openFileDialog() {
  fileInputRef.value?.click();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  uploading.value = true;
  uploadProgress.value = 0;

  try {
    const result = await filesService.uploadFile(props.orgId, file, {}, (progress) => {
      uploadProgress.value = progress;
    });

    try {
      await pagesStore.updatePageData(props.pageId, { coverUrl: result.file.url });
      emit('update');
    } catch (e) {
      console.error('Failed to update cover:', e);
      toast.error('Failed to update cover image');
    }
  } catch (e) {
    console.error('Failed to upload cover:', e);
    toast.error('Failed to upload cover image');
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
    // Reset file input so the same file can be re-selected
    if (input) input.value = '';
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
    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="sr-only"
      @change="handleFileSelect"
    />

    <!-- Cover Image Display -->
    <div v-if="coverUrl" class="cover-container">
      <div class="cover-image" :style="{ backgroundImage: `url(${coverUrl})` }"></div>

      <!-- Upload progress overlay -->
      <div v-if="uploading" class="cover-upload-progress">
        <div class="upload-progress-bar" :style="{ width: `${uploadProgress}%` }"></div>
        <span class="upload-progress-text">Uploading...</span>
      </div>

      <div class="cover-actions">
        <button class="cover-action-btn change-cover-btn" @click="openFileDialog">
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
      <!-- Upload progress overlay when adding new cover -->
      <div v-if="uploading" class="cover-upload-progress cover-upload-progress--inline">
        <div class="upload-progress-bar" :style="{ width: `${uploadProgress}%` }"></div>
        <span class="upload-progress-text">Uploading...</span>
      </div>
      <button v-else class="add-cover-btn" aria-label="Add cover image" @click="openFileDialog">
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
  </div>
</template>

<style scoped>
.page-cover-wrapper {
  position: relative;
  width: 100%;
}

/* Visually hidden file input */
.sr-only {
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

/* Upload Progress */
.cover-upload-progress {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.cover-upload-progress--inline {
  position: relative;
  height: 48px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
}

.upload-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--color-accent);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  transition: width 0.2s ease;
}

.upload-progress-text {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-inverse);
}

.cover-upload-progress--inline .upload-progress-text {
  color: var(--color-text-secondary);
}
</style>
