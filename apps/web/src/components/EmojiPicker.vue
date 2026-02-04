<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

defineProps<{
  modelValue?: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  close: [];
}>();

const pickerRef = ref<HTMLElement>();
const searchQuery = ref('');

// Common emoji categories
const emojiCategories = [
  {
    name: 'Smileys',
    emojis: [
      '😀',
      '😃',
      '😄',
      '😁',
      '😆',
      '😅',
      '🤣',
      '😂',
      '🙂',
      '😊',
      '😇',
      '🥰',
      '😍',
      '🤩',
      '😘',
    ],
  },
  {
    name: 'Objects',
    emojis: [
      '📄',
      '📝',
      '📋',
      '📌',
      '📎',
      '📓',
      '📔',
      '📕',
      '📗',
      '📘',
      '📙',
      '📚',
      '📖',
      '🗂️',
      '📁',
    ],
  },
  {
    name: 'Symbols',
    emojis: [
      '✅',
      '❌',
      '❓',
      '❗',
      '💡',
      '⭐',
      '🔥',
      '❤️',
      '💜',
      '💙',
      '💚',
      '💛',
      '🧡',
      '🤍',
      '🖤',
    ],
  },
  {
    name: 'Nature',
    emojis: [
      '🌸',
      '🌺',
      '🌹',
      '🌻',
      '🌼',
      '🌷',
      '🌱',
      '🌲',
      '🌳',
      '🌴',
      '🌵',
      '🍀',
      '🍁',
      '🍂',
      '🍃',
    ],
  },
  {
    name: 'Tech',
    emojis: [
      '💻',
      '🖥️',
      '⌨️',
      '🖱️',
      '🖨️',
      '📱',
      '📲',
      '☎️',
      '📞',
      '📟',
      '📠',
      '🔋',
      '🔌',
      '💾',
      '💿',
    ],
  },
];

const filteredCategories = computed(() => {
  if (!searchQuery.value) {
    return emojiCategories;
  }
  // For now, just return all - could add emoji names for search
  return emojiCategories;
});

function selectEmoji(emoji: string) {
  emit('update:modelValue', emoji);
  emit('close');
}

function removeEmoji() {
  emit('update:modelValue', null);
  emit('close');
}

function handleClickOutside(event: MouseEvent) {
  if (pickerRef.value && !pickerRef.value.contains(event.target as Node)) {
    emit('close');
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(async () => {
  await nextTick();
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div ref="pickerRef" class="emoji-picker">
    <div class="picker-header">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search emoji..."
        class="picker-search"
      />
    </div>

    <div class="picker-body">
      <div v-for="category in filteredCategories" :key="category.name" class="emoji-category">
        <div class="category-name">{{ category.name }}</div>
        <div class="emoji-grid">
          <button
            v-for="emoji in category.emojis"
            :key="emoji"
            class="emoji-btn"
            :class="{ selected: modelValue === emoji }"
            @click="selectEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="modelValue" class="picker-footer">
      <button class="remove-btn" @click="removeEmoji">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 3L11 11M11 3L3 11"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        Remove icon
      </button>
    </div>
  </div>
</template>

<style scoped>
.emoji-picker {
  width: 280px;
  max-height: 320px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.picker-header {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.picker-search {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  outline: none;
}

.picker-search:focus {
  border-color: var(--color-border);
  box-shadow: 0 0 0 2px var(--color-focus-ring);
}

.picker-body {
  padding: var(--space-2);
  max-height: 220px;
  overflow-y: auto;
}

.emoji-category {
  margin-bottom: var(--space-3);
}

.emoji-category:last-child {
  margin-bottom: 0;
}

.category-name {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
}

.emoji-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 16px;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.emoji-btn:hover {
  background: var(--color-hover);
  transform: scale(1.1);
}

.emoji-btn.selected {
  background: var(--color-accent-subtle);
}

.picker-footer {
  padding: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.remove-btn {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.remove-btn:hover {
  color: var(--color-error);
  background: var(--color-error-subtle);
}

/* Scrollbar */
.picker-body::-webkit-scrollbar {
  width: 6px;
}

.picker-body::-webkit-scrollbar-track {
  background: transparent;
}

.picker-body::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}
</style>
