<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import type { Page, PageWithChildren } from '@librediary/shared';

const props = defineProps<{
  page: Page | PageWithChildren;
  x: number;
  y: number;
}>();

const emit = defineEmits<{
  close: [];
  addSubpage: [page: Page | PageWithChildren];
  duplicate: [page: Page | PageWithChildren];
  rename: [page: Page | PageWithChildren];
  toggleFavorite: [page: Page | PageWithChildren];
  moveToTrash: [page: Page | PageWithChildren];
}>();

const menuRef = ref<HTMLElement>();
const focusedIndex = ref(0);
const menuActions = ['addSubpage', 'duplicate', 'rename', 'toggleFavorite', 'moveToTrash'];

function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close');
  }
}

function focusItem(index: number) {
  const buttons = menuRef.value?.querySelectorAll<HTMLButtonElement>('.menu-item');
  if (buttons && buttons[index]) {
    buttons[index].focus();
    focusedIndex.value = index;
  }
}

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'Escape':
      emit('close');
      break;
    case 'ArrowDown':
      event.preventDefault();
      focusItem((focusedIndex.value + 1) % menuActions.length);
      break;
    case 'ArrowUp':
      event.preventDefault();
      focusItem((focusedIndex.value - 1 + menuActions.length) % menuActions.length);
      break;
    case 'Home':
      event.preventDefault();
      focusItem(0);
      break;
    case 'End':
      event.preventDefault();
      focusItem(menuActions.length - 1);
      break;
  }
}

function handleAction(action: string) {
  switch (action) {
    case 'addSubpage':
      emit('addSubpage', props.page);
      break;
    case 'duplicate':
      emit('duplicate', props.page);
      break;
    case 'rename':
      emit('rename', props.page);
      break;
    case 'toggleFavorite':
      emit('toggleFavorite', props.page);
      break;
    case 'moveToTrash':
      emit('moveToTrash', props.page);
      break;
  }
  emit('close');
}

onMounted(async () => {
  await nextTick();
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);

  // Adjust position if menu would go off screen
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (rect.right > viewportWidth) {
      menuRef.value.style.left = `${props.x - rect.width}px`;
    }
    if (rect.bottom > viewportHeight) {
      menuRef.value.style.top = `${props.y - rect.height}px`;
    }

    // Focus first menu item for keyboard navigation
    focusItem(0);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div
    ref="menuRef"
    class="context-menu"
    :style="{ left: `${x}px`, top: `${y}px` }"
    role="menu"
    @click.stop
  >
    <button class="menu-item" role="menuitem" @click="handleAction('addSubpage')">
      <svg class="menu-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3.5V12.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
        <path d="M3.5 8H12.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
      </svg>
      <span>Add subpage</span>
    </button>

    <button class="menu-item" role="menuitem" @click="handleAction('duplicate')">
      <svg class="menu-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect
          x="2.5"
          y="5.5"
          width="8"
          height="8"
          rx="1"
          stroke="currentColor"
          stroke-width="1.25"
        />
        <path
          d="M5.5 5.5V3.5C5.5 2.94772 5.94772 2.5 6.5 2.5H12.5C13.0523 2.5 13.5 2.94772 13.5 3.5V9.5C13.5 10.0523 13.0523 10.5 12.5 10.5H10.5"
          stroke="currentColor"
          stroke-width="1.25"
        />
      </svg>
      <span>Duplicate</span>
    </button>

    <button class="menu-item" role="menuitem" @click="handleAction('rename')">
      <svg class="menu-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M11.5 2.5L13.5 4.5L6 12H4V10L11.5 2.5Z"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>Rename</span>
    </button>

    <div class="menu-separator" />

    <button class="menu-item" role="menuitem" @click="handleAction('toggleFavorite')">
      <svg class="menu-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 2L9.79 5.64L13.76 6.22L10.88 9.02L11.58 13L8 11.11L4.42 13L5.12 9.02L2.24 6.22L6.21 5.64L8 2Z"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>Add to favorites</span>
    </button>

    <div class="menu-separator" />

    <button class="menu-item danger" role="menuitem" @click="handleAction('moveToTrash')">
      <svg class="menu-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 4.5H13" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
        <path
          d="M5.5 4.5V3.5C5.5 2.94772 5.94772 2.5 6.5 2.5H9.5C10.0523 2.5 10.5 2.94772 10.5 3.5V4.5"
          stroke="currentColor"
          stroke-width="1.25"
        />
        <path
          d="M4 4.5L4.75 12.5C4.78 12.7761 5.00239 13 5.27852 13H10.7215C10.9976 13 11.22 12.7761 11.25 12.5L12 4.5"
          stroke="currentColor"
          stroke-width="1.25"
        />
        <path d="M6.5 7V10.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
        <path d="M9.5 7V10.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
      </svg>
      <span>Move to trash</span>
    </button>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  min-width: 180px;
  padding: var(--space-1);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.menu-item {
  display: flex;
  gap: var(--space-2);
  align-items: center;
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

.menu-item:hover,
.menu-item:focus {
  color: var(--color-text-primary);
  background: var(--color-hover);
  outline: none;
}

.menu-item.danger {
  color: var(--color-error);
}

.menu-item.danger:hover {
  background: var(--color-error-subtle);
}

.menu-icon {
  flex-shrink: 0;
}

.menu-separator {
  height: 1px;
  margin: var(--space-1) 0;
  background: var(--color-border);
}
</style>
