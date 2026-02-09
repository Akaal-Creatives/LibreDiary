<script setup lang="ts">
import { ref, computed } from 'vue';
import { BubbleMenu } from '@tiptap/vue-3/menus';
import { translateText, SUPPORTED_LANGUAGES } from '@/services/translation.service';
import type { SupportedLanguage } from '@/services/translation.service';
import { writeText } from '@/services/writing.service';
import type { WritingAction } from '@/services/writing.service';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any;
}>();

const authStore = useAuthStore();
const toast = useToast();

const showMenu = ref(false);
const activeView = ref<'main' | 'languages' | 'generate'>('main');
const processing = ref(false);
const loadingMessage = ref('');
const generatePrompt = ref('');

const aiEnabled = computed(() => authStore.currentOrganization?.aiEnabled ?? false);

function toggleMenu() {
  showMenu.value = !showMenu.value;
  if (showMenu.value) {
    activeView.value = 'main';
    generatePrompt.value = '';
  }
}

function closeMenu() {
  showMenu.value = false;
  activeView.value = 'main';
  generatePrompt.value = '';
}

function handleMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu();
  }
}

function showLanguages() {
  activeView.value = 'languages';
}

function showGenerate() {
  activeView.value = 'generate';
}

function goBack() {
  activeView.value = 'main';
  generatePrompt.value = '';
}

const LOADING_MESSAGES: Record<WritingAction, string> = {
  generate: 'Generating...',
  expand: 'Expanding...',
  summarise: 'Summarising...',
  improve: 'Improving...',
};

const SUCCESS_MESSAGES: Record<WritingAction, string> = {
  generate: 'Content generated',
  expand: 'Text expanded',
  summarise: 'Text summarised',
  improve: 'Text improved',
};

async function handleWrite(action: WritingAction) {
  const { from, to } = props.editor.state.selection;
  const selectedText = props.editor.state.doc.textBetween(from, to, ' ');

  if (!selectedText.trim() && action !== 'generate') return;

  const orgId = authStore.currentOrganizationId;
  if (!orgId) return;

  processing.value = true;
  loadingMessage.value = LOADING_MESSAGES[action];

  try {
    const result = await writeText(orgId, action, selectedText);

    props.editor.chain().focus().insertContentAt({ from, to }, result.content).run();

    toast.success(SUCCESS_MESSAGES[action]);
    closeMenu();
  } catch {
    toast.error('Writing failed. Please try again.');
  } finally {
    processing.value = false;
    loadingMessage.value = '';
  }
}

async function handleGenerate() {
  const prompt = generatePrompt.value.trim();
  if (!prompt) return;

  const orgId = authStore.currentOrganizationId;
  if (!orgId) return;

  const { from, to } = props.editor.state.selection;

  processing.value = true;
  loadingMessage.value = LOADING_MESSAGES.generate;

  try {
    const result = await writeText(orgId, 'generate', prompt);

    props.editor.chain().focus().insertContentAt({ from, to }, result.content).run();

    toast.success(SUCCESS_MESSAGES.generate);
    closeMenu();
  } catch {
    toast.error('Writing failed. Please try again.');
  } finally {
    processing.value = false;
    loadingMessage.value = '';
  }
}

async function handleTranslate(language: SupportedLanguage) {
  const { from, to } = props.editor.state.selection;
  const selectedText = props.editor.state.doc.textBetween(from, to, ' ');

  if (!selectedText.trim()) return;

  const orgId = authStore.currentOrganizationId;
  if (!orgId) return;

  processing.value = true;
  loadingMessage.value = 'Translating...';

  try {
    const result = await translateText(orgId, selectedText, language);

    props.editor.chain().focus().insertContentAt({ from, to }, result.translatedText).run();

    toast.success(`Translated to ${language}`);
    closeMenu();
  } catch {
    toast.error('Translation failed. Please try again.');
  } finally {
    processing.value = false;
    loadingMessage.value = '';
  }
}
</script>

<template>
  <BubbleMenu
    v-if="aiEnabled"
    :editor="editor"
    :tippy-options="{ duration: 150, placement: 'top', maxWidth: 'none' }"
  >
    <div class="ai-bubble">
      <!-- Loading overlay -->
      <div v-if="processing" class="ai-loading">
        <div class="ai-spinner"></div>
        <span>{{ loadingMessage }}</span>
      </div>

      <template v-else>
        <!-- AI trigger button -->
        <button
          class="ai-trigger"
          type="button"
          aria-haspopup="true"
          :aria-expanded="showMenu"
          @click="toggleMenu"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M7 1.75L8.225 4.55L11.375 4.9L9.1 7L9.7 10.1L7 8.575L4.3 10.1L4.9 7L2.625 4.9L5.775 4.55L7 1.75Z"
              stroke="currentColor"
              stroke-width="1.1"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>AI</span>
          <svg
            class="ai-chevron"
            :class="{ 'ai-chevron--open': showMenu }"
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

        <!-- Main menu -->
        <div
          v-if="showMenu && activeView === 'main'"
          class="ai-menu"
          role="menu"
          aria-label="AI actions"
          @keydown="handleMenuKeydown"
        >
          <div class="ai-menu-section">
            <span class="ai-menu-label">Write</span>
            <button class="ai-menu-item" role="menuitem" type="button" @click="showGenerate">
              Generate
            </button>
            <button
              class="ai-menu-item"
              role="menuitem"
              type="button"
              @click="handleWrite('expand')"
            >
              Expand
            </button>
            <button
              class="ai-menu-item"
              role="menuitem"
              type="button"
              @click="handleWrite('summarise')"
            >
              Summarise
            </button>
            <button
              class="ai-menu-item"
              role="menuitem"
              type="button"
              @click="handleWrite('improve')"
            >
              Improve
            </button>
          </div>
          <div class="ai-menu-divider"></div>
          <div class="ai-menu-section">
            <span class="ai-menu-label">Translate</span>
            <button class="ai-menu-item" role="menuitem" type="button" @click="showLanguages">
              Translate to...
            </button>
          </div>
        </div>

        <!-- Language submenu -->
        <div
          v-if="showMenu && activeView === 'languages'"
          class="ai-languages"
          role="listbox"
          aria-label="Select language"
          @keydown="handleMenuKeydown"
        >
          <button class="ai-back-btn" type="button" @click="goBack">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M7.5 9L4.5 6L7.5 3"
                stroke="currentColor"
                stroke-width="1.25"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Back
          </button>
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

        <!-- Generate view -->
        <div
          v-if="showMenu && activeView === 'generate'"
          class="ai-generate"
          @keydown="handleMenuKeydown"
        >
          <button class="ai-back-btn" type="button" @click="goBack">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M7.5 9L4.5 6L7.5 3"
                stroke="currentColor"
                stroke-width="1.25"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Back
          </button>
          <input
            v-model="generatePrompt"
            class="ai-generate-input"
            type="text"
            placeholder="Describe what to generate..."
            @keydown.enter.prevent="handleGenerate"
          />
          <button
            class="ai-generate-btn"
            type="button"
            :disabled="!generatePrompt.trim()"
            @click="handleGenerate"
          >
            Generate
          </button>
        </div>
      </template>
    </div>
  </BubbleMenu>
</template>

<style scoped>
.ai-bubble {
  position: relative;
  font-family: var(--font-sans);
}

.ai-trigger {
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

.ai-trigger:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.ai-trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.ai-chevron {
  transition: transform var(--transition-fast);
}

.ai-chevron--open {
  transform: rotate(180deg);
}

/* Main menu */
.ai-menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  z-index: 10;
  min-width: 180px;
  padding: var(--space-1);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.ai-menu-section {
  padding: var(--space-1) 0;
}

.ai-menu-label {
  display: block;
  padding: var(--space-1) var(--space-3);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ai-menu-item {
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

.ai-menu-item:hover,
.ai-menu-item:focus {
  color: var(--color-text-primary);
  background: var(--color-hover);
  outline: none;
}

.ai-menu-divider {
  height: 1px;
  margin: var(--space-1) var(--space-2);
  background: var(--color-border);
}

/* Language submenu */
.ai-languages {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  z-index: 10;
  min-width: 180px;
  max-height: 280px;
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

/* Back button */
.ai-back-btn {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-1);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border);
  border-radius: 0;
  transition: all var(--transition-fast);
}

.ai-back-btn:hover {
  color: var(--color-text-primary);
}

/* Generate view */
.ai-generate {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  z-index: 10;
  min-width: 260px;
  padding: var(--space-1);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.ai-generate-input {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  margin: var(--space-1) 0;
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.ai-generate-input:focus {
  border-color: var(--color-accent);
}

.ai-generate-input::placeholder {
  color: var(--color-text-tertiary);
}

.ai-generate-btn {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-inverse);
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.ai-generate-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.ai-generate-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Loading state */
.ai-loading {
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

.ai-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: ai-spin 0.6s linear infinite;
}

@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Scrollbar styling */
.ai-languages::-webkit-scrollbar {
  width: 4px;
}

.ai-languages::-webkit-scrollbar-track {
  background: transparent;
}

.ai-languages::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}
</style>
