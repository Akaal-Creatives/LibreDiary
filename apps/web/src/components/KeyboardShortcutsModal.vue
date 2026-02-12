<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';

const { t } = useI18n();
const { shortcuts, isHelpVisible, modifierSymbol } = useKeyboardShortcuts();

type ShortcutEntry = (typeof shortcuts.value)[number];

const groupedShortcuts = computed(() => {
  const groups: Record<string, ShortcutEntry[]> = {};
  for (const s of shortcuts.value) {
    if (!groups[s.category]) {
      groups[s.category] = [];
    }
    groups[s.category]!.push({ ...s });
  }
  return groups;
});

function categoryLabel(category: string): string {
  const key = `shortcuts.category${category.charAt(0).toUpperCase() + category.slice(1)}`;
  return t(key);
}

function formatKeys(keys: string): string[] {
  return keys.split('+').map((part) => {
    if (part === 'mod') return modifierSymbol.value;
    if (part === 'shift') return 'Shift';
    if (part === 'alt') return 'Alt';
    if (part === '/') return '/';
    if (part === '?') return '?';
    return part.toUpperCase();
  });
}

function close() {
  isHelpVisible.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isHelpVisible" class="shortcuts-overlay" @click.self="close">
        <div
          class="shortcuts-modal"
          role="dialog"
          aria-modal="true"
          :aria-label="t('shortcuts.title')"
        >
          <header class="modal-header">
            <h2 class="modal-title">{{ t('shortcuts.title') }}</h2>
            <button class="close-btn" :aria-label="t('shortcuts.close')" @click="close">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M5 5L13 13M13 5L5 13"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </header>

          <div class="modal-body">
            <div
              v-for="(items, category) in groupedShortcuts"
              :key="category"
              class="shortcut-group"
            >
              <h3 class="group-title">{{ categoryLabel(String(category)) }}</h3>
              <div class="shortcut-list">
                <div v-for="shortcut in items" :key="shortcut.id" class="shortcut-item">
                  <span class="shortcut-label">{{ t(shortcut.description) }}</span>
                  <span class="shortcut-keys">
                    <kbd v-for="(key, idx) in formatKeys(shortcut.keys)" :key="idx" class="key">{{
                      key
                    }}</kbd>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.shortcuts-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.5);
}

.shortcuts-modal {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
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

.modal-body {
  padding: var(--space-4) var(--space-5);
  overflow-y: auto;
}

.shortcut-group {
  margin-bottom: var(--space-5);
}

.shortcut-group:last-child {
  margin-bottom: 0;
}

.group-title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
}

.shortcut-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.shortcut-keys {
  display: flex;
  gap: 4px;
  align-items: center;
}

.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  font-family: var(--font-family-mono);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  color: var(--color-text-secondary);
  background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-sunken) 100%);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-base);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
