<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, shallowRef } from 'vue';
import { usePagesStore, useAuthStore } from '@/stores';
import { useCollaboration } from '@/composables';
import PageBreadcrumbs from '@/components/PageBreadcrumbs.vue';
import CanvasToolbar from '@/components/canvas/CanvasToolbar.vue';
import WhiteboardCanvas from '@/components/canvas/WhiteboardCanvas.vue';
import { useCanvasCollab } from '@/components/canvas/useCanvasCollab';
import type { ElementType } from '@/components/canvas/canvasTypes';

const props = defineProps<{ canvasId: string }>();

const pagesStore = usePagesStore();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref<string | null>(null);
const canvasTitle = ref('Untitled Canvas');
const activeTool = ref<ElementType | 'select'>('select');
const canvasRef = shallowRef<InstanceType<typeof WhiteboardCanvas> | null>(null);

const documentName = computed(() => {
  const orgId = authStore.currentOrganizationId;
  return orgId ? `${orgId}/${props.canvasId}` : null;
});

const {
  isConnected,
  connectionError,
  connectedUsers,
  ydoc,
  disconnect: disconnectCollaboration,
} = useCollaboration({
  documentName: () => documentName.value,
  enabled: () => !!documentName.value,
  onSynced: () => { loading.value = false; },
  onAuthenticationFailed: (reason) => {
    error.value = `Collaboration failed: ${reason}`;
    loading.value = false;
  },
});

// Canvas elements synced via Yjs
const { elements, addElement, updateElement, deleteElement } = useCanvasCollab(ydoc);

onMounted(loadCanvas);

watch(() => props.canvasId, (_newId, _oldId) => {
  disconnectCollaboration();
  loadCanvas();
});

onUnmounted(() => {
  disconnectCollaboration();
  pagesStore.setCurrentPage(null);
});

async function loadCanvas() {
  loading.value = true;
  error.value = null;
  pagesStore.setCurrentPage(props.canvasId);

  try {
    const page = await pagesStore.fetchPage(props.canvasId);
    canvasTitle.value = page.title;
    pagesStore.expandToPage(props.canvasId);
    setTimeout(() => { if (loading.value) loading.value = false; }, 5000);
  } catch {
    error.value = 'Failed to load canvas';
    loading.value = false;
  }
}

let titleSaveTimeout: ReturnType<typeof setTimeout> | null = null;

function updateTitle(event: Event) {
  const el = event.target as HTMLElement;
  const newTitle = el.textContent?.trim() || 'Untitled Canvas';
  canvasTitle.value = newTitle;
  if (titleSaveTimeout) clearTimeout(titleSaveTimeout);
  titleSaveTimeout = setTimeout(() => {
    pagesStore.updatePageData(props.canvasId, { title: newTitle }).catch(console.error);
  }, 500);
}

function exportPng() {
  canvasRef.value?.exportAsPng();
}
</script>

<template>
  <div class="canvas-view">
    <div class="canvas-breadcrumbs">
      <PageBreadcrumbs />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="canvas-loading">
      <div class="loading-spinner" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="canvas-error">
      <p>{{ error }}</p>
      <button @click="loadCanvas">Try again</button>
    </div>

    <template v-else>
      <!-- Header -->
      <header class="canvas-header">
        <div class="canvas-meta">
          <span class="canvas-icon">🎨</span>
          <h1
            class="canvas-title"
            contenteditable="true"
            spellcheck="false"
            @blur="updateTitle"
          >{{ canvasTitle }}</h1>
          <div class="canvas-info">
            <span v-if="isConnected" class="collab-status">
              <span class="collab-dot" />
              {{ connectedUsers.length }} editing
            </span>
          </div>
        </div>
        <div class="canvas-actions">
          <button class="action-btn" title="Export as PNG" @click="exportPng">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2.25v9M5.25 7.5L9 11.25l3.75-3.75M3 12.75v1.5a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-1.5"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Export PNG</span>
          </button>
        </div>
      </header>

      <div v-if="connectionError" class="connection-error">
        Connection error: {{ connectionError }}
      </div>

      <!-- Canvas area -->
      <div class="canvas-body">
        <CanvasToolbar v-model:active-tool="activeTool" />
        <WhiteboardCanvas
          ref="canvasRef"
          :elements="elements"
          :active-tool="activeTool"
          @add-element="addElement"
          @update-element="updateElement"
          @delete-element="deleteElement"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.canvas-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.canvas-breadcrumbs {
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.canvas-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.canvas-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: var(--space-4);
  color: var(--color-text-secondary);
}

.canvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.canvas-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.canvas-icon {
  font-size: 1.5rem;
}

.canvas-title {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  border: none;
  outline: none;
}

.canvas-title:empty::before {
  content: 'Untitled Canvas';
  color: var(--color-text-tertiary);
}

.canvas-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.collab-status {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.collab-dot {
  width: 6px;
  height: 6px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.canvas-actions {
  display: flex;
  gap: var(--space-2);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: inherit;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.connection-error {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-warning);
  background: var(--color-warning-subtle);
  flex-shrink: 0;
}

.canvas-body {
  position: relative;
  flex: 1;
  overflow: hidden;
}
</style>
