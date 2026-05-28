<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { matchProvider, toEmbedUrl, getProviderLabel } from './embed/embedProviders';
import type { EmbedProvider } from './embed/embedProviders';

const props = defineProps<{
  node: {
    attrs: {
      url: string | null;
      embedUrl: string | null;
      provider: EmbedProvider | null;
    };
  };
  updateAttributes: (attrs: Record<string, unknown>) => void;
  editor: { isEditable: boolean };
}>();

const editing = ref(!props.node.attrs.url);
const inputUrl = ref(props.node.attrs.url ?? '');
const urlError = ref('');
const iframeLoading = ref(true);
const inputRef = ref<HTMLInputElement | null>(null);

const providerLabel = computed(() =>
  props.node.attrs.provider ? getProviderLabel(props.node.attrs.provider) : 'Embed'
);

onMounted(() => {
  if (editing.value) {
    inputRef.value?.focus();
  }
});

function handleSubmit() {
  const raw = inputUrl.value.trim();
  if (!raw) return;

  const provider = matchProvider(raw);
  const embedUrl = toEmbedUrl(raw);

  if (!embedUrl) {
    urlError.value = 'Unsupported URL. Paste a YouTube, Vimeo, Figma, or Google Maps link.';
    return;
  }

  urlError.value = '';
  iframeLoading.value = true;
  props.updateAttributes({ url: raw, embedUrl, provider });
  editing.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSubmit();
  }
  if (event.key === 'Escape' && props.node.attrs.url) {
    editing.value = false;
  }
}

function onIframeLoad() {
  iframeLoading.value = false;
}
</script>

<template>
  <div class="embed-block" data-drag-handle>
    <!-- Edit mode -->
    <div v-if="editing" class="embed-edit">
      <input
        ref="inputRef"
        v-model="inputUrl"
        class="embed-url-input"
        placeholder="Paste a YouTube, Vimeo, Figma, or Google Maps URL…"
        @keydown="handleKeydown"
      />
      <div class="embed-edit-actions">
        <button class="embed-submit-btn" @click="handleSubmit">Embed</button>
        <button v-if="node.attrs.url" class="embed-cancel-btn" @click="editing = false">
          Cancel
        </button>
      </div>
      <p v-if="urlError" class="embed-error" role="alert">{{ urlError }}</p>
      <p class="embed-hint">Supported: YouTube, Vimeo, Figma, Google Maps</p>
    </div>

    <!-- Preview mode -->
    <template v-else>
      <div class="embed-toolbar" contenteditable="false">
        <span class="embed-provider-label">{{ providerLabel }}</span>
        <button
          v-if="editor.isEditable"
          class="embed-edit-btn"
          aria-label="Edit embed URL"
          @click="editing = true"
        >
          Edit URL
        </button>
      </div>
      <div class="embed-frame-wrapper">
        <div v-if="iframeLoading" class="embed-loading" aria-label="Loading embed…">
          <span class="embed-loading-spinner" />
        </div>
        <iframe
          :src="node.attrs.embedUrl!"
          class="embed-iframe"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          allowfullscreen
          loading="lazy"
          title="Embedded content"
          @load="onIframeLoad"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.embed-block {
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  margin: var(--space-2) 0;
}

.embed-edit {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.embed-url-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: var(--color-background);
  color: var(--color-text-primary);
  outline: none;
  box-sizing: border-box;
}

.embed-url-input:focus {
  border-color: var(--color-accent);
}

.embed-edit-actions {
  display: flex;
  gap: var(--space-2);
}

.embed-submit-btn {
  padding: var(--space-1) var(--space-3);
  background: var(--color-accent);
  color: var(--color-on-accent, #fff);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  cursor: pointer;
}

.embed-cancel-btn {
  padding: var(--space-1) var(--space-3);
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  cursor: pointer;
}

.embed-error {
  font-size: var(--text-xs);
  color: var(--color-danger, #e53e3e);
  margin: 0;
}

.embed-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

.embed-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-raised);
  border-bottom: 1px solid var(--color-border);
}

.embed-provider-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.embed-edit-btn {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.embed-edit-btn:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
}

.embed-frame-wrapper {
  position: relative;
  padding-top: 56.25%;
  height: 0;
}

.embed-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  z-index: 1;
}

.embed-loading-spinner {
  display: block;
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: embed-spin 0.8s linear infinite;
}

@keyframes embed-spin {
  to {
    transform: rotate(360deg);
  }
}

.embed-iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
}
</style>
