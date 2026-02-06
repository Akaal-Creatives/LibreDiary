<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { mentionsService, type MentionUser } from '@/services';

const props = defineProps<{
  modelValue: string;
  organizationId: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
}>();

// State
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const dropdownRef = ref<HTMLDivElement | null>(null);
const searching = ref(false);
const users = ref<MentionUser[]>([]);
const selectedIndex = ref(0);
const showDropdown = ref(false);
const mentionStart = ref<number | null>(null);
const mentionQuery = ref('');

// Dropdown positioning
const dropdownStyle = ref<{ top: string; left: string }>({ top: '0', left: '0' });

const localValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// Watch for @ triggers
watch(localValue, async (newValue) => {
  if (!textareaRef.value) return;

  const cursorPos = textareaRef.value.selectionStart;
  const textBeforeCursor = newValue.slice(0, cursorPos);

  // Find the last @ symbol that's at word boundary (start or after whitespace)
  const lastAtIndex = findMentionStart(textBeforeCursor);

  if (lastAtIndex !== null) {
    const query = textBeforeCursor.slice(lastAtIndex + 1);

    // Only search if query is at least 2 chars
    if (query.length >= 2 && !query.includes(' ')) {
      mentionStart.value = lastAtIndex;
      mentionQuery.value = query;
      await searchUsers(query);
    } else if (query.length < 2) {
      mentionStart.value = lastAtIndex;
      mentionQuery.value = query;
      showDropdown.value = false;
      users.value = [];
    } else {
      closeMentionDropdown();
    }
  } else {
    closeMentionDropdown();
  }
});

function findMentionStart(text: string): number | null {
  // Find @ that's at start or preceded by whitespace
  for (let i = text.length - 1; i >= 0; i--) {
    const char = text.charAt(i);
    if (char === '@') {
      const prevChar = i > 0 ? text.charAt(i - 1) : '';
      if (i === 0 || /\s/.test(prevChar)) {
        return i;
      }
      return null;
    }
    // If we hit a space before finding @, no active mention
    if (/\s/.test(char)) {
      return null;
    }
  }
  return null;
}

async function searchUsers(query: string) {
  if (!props.organizationId || query.length < 2) {
    users.value = [];
    showDropdown.value = false;
    return;
  }

  searching.value = true;

  try {
    users.value = await mentionsService.searchUsers(props.organizationId, query);
    selectedIndex.value = 0;

    if (users.value.length > 0) {
      showDropdown.value = true;
      await nextTick();
      positionDropdown();
    } else {
      showDropdown.value = false;
    }
  } catch (e) {
    console.error('Failed to search users:', e);
    users.value = [];
    showDropdown.value = false;
  } finally {
    searching.value = false;
  }
}

function positionDropdown() {
  if (!textareaRef.value) return;

  // Position below the textarea with some offset
  dropdownStyle.value = {
    top: `${textareaRef.value.offsetHeight + 4}px`,
    left: '0',
  };
}

function selectUser(user: MentionUser) {
  if (mentionStart.value === null) return;

  const before = localValue.value.slice(0, mentionStart.value);
  const cursorPos = textareaRef.value?.selectionStart || 0;
  const after = localValue.value.slice(cursorPos);

  // Insert @username
  const username = getUserMentionName(user);
  const newValue = `${before}@${username} ${after}`;
  localValue.value = newValue;

  closeMentionDropdown();

  // Set cursor after the mention
  nextTick(() => {
    if (textareaRef.value) {
      const newCursorPos = before.length + username.length + 2; // +2 for @ and space
      textareaRef.value.selectionStart = newCursorPos;
      textareaRef.value.selectionEnd = newCursorPos;
      textareaRef.value.focus();
    }
  });
}

function getUserMentionName(user: MentionUser): string {
  // Use name if available (converted to username format), otherwise email prefix
  if (user.name) {
    return user.name.toLowerCase().replace(/\s+/g, '_');
  }
  return user.email.split('@')[0] || user.email;
}

function closeMentionDropdown() {
  showDropdown.value = false;
  users.value = [];
  mentionStart.value = null;
  mentionQuery.value = '';
  selectedIndex.value = 0;
}

function handleKeydown(e: KeyboardEvent) {
  if (!showDropdown.value || users.value.length === 0) {
    // Handle submit shortcut
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      emit('submit');
    }
    return;
  }

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex.value = (selectedIndex.value + 1) % users.value.length;
      scrollToSelected();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex.value =
        selectedIndex.value === 0 ? users.value.length - 1 : selectedIndex.value - 1;
      scrollToSelected();
      break;
    case 'Enter':
    case 'Tab': {
      e.preventDefault();
      const selectedUser = users.value[selectedIndex.value];
      if (selectedUser) {
        selectUser(selectedUser);
      }
      break;
    }
    case 'Escape':
      e.preventDefault();
      closeMentionDropdown();
      break;
  }
}

function scrollToSelected() {
  nextTick(() => {
    if (!dropdownRef.value) return;
    const selectedEl = dropdownRef.value.querySelector('.mention-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Close dropdown when clicking outside
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!dropdownRef.value?.contains(target) && !textareaRef.value?.contains(target)) {
    closeMentionDropdown();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="mention-autocomplete">
    <textarea
      ref="textareaRef"
      v-model="localValue"
      class="mention-input"
      :placeholder="placeholder || 'Type @ to mention someone...'"
      :rows="rows || 2"
      :disabled="disabled"
      @keydown="handleKeydown"
    />

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div
        v-if="showDropdown && users.length > 0"
        ref="dropdownRef"
        class="mention-dropdown"
        :style="dropdownStyle"
      >
        <div class="dropdown-header">
          <span class="dropdown-label">Mention someone</span>
          <span class="dropdown-hint">↑↓ to navigate · Enter to select</span>
        </div>
        <div class="dropdown-list">
          <button
            v-for="(user, index) in users"
            :key="user.id"
            class="mention-item"
            :class="{ selected: index === selectedIndex }"
            @click="selectUser(user)"
            @mouseenter="selectedIndex = index"
          >
            <div class="user-avatar">
              <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name || ''" />
              <span v-else class="avatar-initials">{{ getInitials(user.name) }}</span>
            </div>
            <div class="user-info">
              <span class="user-name">{{ user.name || user.email.split('@')[0] }}</span>
              <span class="user-email">{{ user.email }}</span>
            </div>
            <div class="mention-preview">@{{ getUserMentionName(user) }}</div>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Loading indicator -->
    <div v-if="searching" class="search-indicator">
      <div class="search-spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.mention-autocomplete {
  position: relative;
  width: 100%;
}

.mention-input {
  width: 100%;
  padding: var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-primary);
  resize: none;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.mention-input::placeholder {
  color: var(--color-text-tertiary);
}

.mention-input:focus {
  background: var(--color-bg-primary);
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 154, 140, 0.1);
}

.mention-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Dropdown */
.mention-dropdown {
  position: absolute;
  z-index: 100;
  width: 100%;
  max-height: 280px;
  overflow: hidden;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow:
    0 10px 40px -10px rgba(0, 0, 0, 0.15),
    0 4px 16px -4px rgba(0, 0, 0, 0.1);
}

.dropdown-header {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.dropdown-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dropdown-hint {
  font-size: 10px;
  color: var(--color-text-tertiary);
}

.dropdown-list {
  max-height: 240px;
  padding: var(--space-1);
  overflow-y: auto;
}

.mention-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-2);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.mention-item:hover,
.mention-item.selected {
  background: rgba(124, 154, 140, 0.08);
}

.mention-item.selected {
  background: rgba(124, 154, 140, 0.12);
}

.user-avatar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-accent);
  background: rgba(124, 154, 140, 0.15);
  border-radius: 50%;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 11px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.user-email {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-preview {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  color: var(--color-accent);
  background: rgba(124, 154, 140, 0.1);
  border-radius: var(--radius-sm);
}

/* Search indicator */
.search-indicator {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  pointer-events: none;
}

.search-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dropdown transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Scrollbar styling for dropdown */
.dropdown-list::-webkit-scrollbar {
  width: 6px;
}

.dropdown-list::-webkit-scrollbar-track {
  background: transparent;
}

.dropdown-list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.dropdown-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}
</style>
