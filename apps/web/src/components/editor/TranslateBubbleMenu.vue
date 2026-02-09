<script setup lang="ts">
import { ref, computed } from 'vue';
import { BubbleMenu } from '@tiptap/vue-3/menus';
import { translateText, SUPPORTED_LANGUAGES } from '@/services/translation.service';
import type { SupportedLanguage } from '@/services/translation.service';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
}>();

const authStore = useAuthStore();
const toast = useToast();

const showLanguages = ref(false);
const translating = ref(false);

const aiEnabled = computed(() => authStore.currentOrganization?.aiEnabled ?? false);

function toggleLanguages() {
  showLanguages.value = !showLanguages.value;
}

function handleLanguagesKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    showLanguages.value = false;
  }
}

async function handleTranslate(language: SupportedLanguage) {
  const { from, to } = props.editor.state.selection;
  const selectedText = props.editor.state.doc.textBetween(from, to, ' ');

  if (!selectedText.trim()) return;

  const orgId = authStore.currentOrganizationId;
  if (!orgId) return;

  translating.value = true;

  try {
    const result = await translateText(orgId, selectedText, language);

    props.editor.chain().focus().insertContentAt({ from, to }, result.translatedText).run();

    toast.success(`Translated to ${language}`);
    showLanguages.value = false;
  } catch {
    toast.error('Translation failed. Please try again.');
  } finally {
    translating.value = false;
  }
}
</script>

<template>
  <BubbleMenu
    v-if="aiEnabled"
    :editor="editor"
    :tippy-options="{ duration: 150, placement: 'top', maxWidth: 'none' }"
  >
    <div class="translate-bubble">
      <!-- Loading overlay -->
      <div v-if="translating" class="translate-loading">
        <div class="translate-spinner"></div>
        <span>Translating...</span>
      </div>

      <!-- Translate trigger button -->
      <button
        v-else
        class="translate-trigger"
        type="button"
        aria-haspopup="true"
        :aria-expanded="showLanguages"
        @click="toggleLanguages"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M1.75 2.625H8.75"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
          />
          <path
            d="M5.25 1.75V2.625"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
          />
          <path
            d="M7 2.625C7 4.375 5.6875 6.5625 3.5 7.875"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
          />
          <path
            d="M2.625 6.125C3.5 6.875 4.8125 7.875 5.25 7.875"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
          />
          <path
            d="M8.75 12.25L10.5 7.875L12.25 12.25"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M9.1875 11.375H11.8125"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
          />
        </svg>
        <span>Translate</span>
        <svg
          class="translate-chevron"
          :class="{ 'translate-chevron--open': showLanguages }"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.5 3.75L5 6.25L7.5 3.75"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <!-- Language dropdown -->
      <div
        v-if="showLanguages && !translating"
        class="translate-languages"
        role="listbox"
        aria-label="Select language"
        @keydown="handleLanguagesKeydown"
      >
        <button
          v-for="lang in SUPPORTED_LANGUAGES"
          :key="lang"
          class="language-item"
          role="option"
          type="button"
          @click="handleTranslate(lang)"
        >
          {{ lang }}
        </button>
      </div>
    </div>
  </BubbleMenu>
</template>

<style scoped>
.translate-bubble {
  position: relative;
  font-family: var(--font-sans);
}

.translate-trigger {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  padding: 5px var(--space-2) 5px 6px;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-fast);
}

.translate-trigger:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.translate-trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.translate-chevron {
  transition: transform var(--transition-fast);
}

.translate-chevron--open {
  transform: rotate(180deg);
}

/* Language dropdown */
.translate-languages {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  z-index: 10;
  min-width: 180px;
  max-height: 240px;
  padding: var(--space-1);
  overflow-y: auto;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.language-item {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.language-item:hover,
.language-item:focus {
  color: var(--color-text-primary);
  background: var(--color-hover);
  outline: none;
}

/* Loading state */
.translate-loading {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: 5px var(--space-3);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.translate-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: translate-spin 0.6s linear infinite;
}

@keyframes translate-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Scrollbar styling for language list */
.translate-languages::-webkit-scrollbar {
  width: 4px;
}

.translate-languages::-webkit-scrollbar-track {
  background: transparent;
}

.translate-languages::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}
</style>
