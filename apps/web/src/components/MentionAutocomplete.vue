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
      :placeholder="placeholder || $t('mentions.placeholder')"
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
          <span class="dropdown-label">{{ $t('mentions.mentionSomeone') }}</span>
          <span class="dropdown-hint">{{ $t('mentions.navigateHint') }}</span>
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
  background: var(--color-surface, var(--color-bg-primary));
  border: 1px solid var(--color-border-subtle, var(--color-border));
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.mention-input::placeholder {
  color: var(--color-text-tertiary);
}

.mention-input:focus {
  background: var(--color-surface, var(--color-bg-primary));
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-accent-subtle, rgba(107, 143, 113, 0.08));
}

.mention-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* Dropdown */
.mention-dropdown {
  position: absolute;
  z-index: 1100;
  width: 100%;
  max-height: 280px;
  overflow: hidden;
  background: var(--color-surface, var(--color-bg-primary));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow:
    0 12px 48px -8px rgba(0, 0, 0, 0.2),
    0 4px 16px -4px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.04);
}

.dropdown-header {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-sunken, var(--color-bg-secondary));
  border-bottom: 1px solid var(--color-border-subtle, var(--color-border));
}

.dropdown-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dropdown-hint {
  font-size: 0.625rem;
  color: var(--color-text-tertiary);
  opacity: 0.7;
}

.dropdown-list {
  max-height: 240px;
  padding: var(--space-1);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.mention-item {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: 6px var(--space-2);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.mention-item:hover,
.mention-item.selected {
  background: var(--color-accent-subtle, rgba(107, 143, 113, 0.08));
}

.mention-item.selected {
  background: var(--color-accent-muted, rgba(107, 143, 113, 0.12));
}

.user-avatar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  overflow: hidden;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-muted, rgba(107, 143, 113, 0.15));
  border-radius: var(--radius-md);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  font-size: 10px;
  letter-spacing: 0.02em;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  display: block;
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.3;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  display: block;
  overflow: hidden;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-preview {
  flex-shrink: 0;
  padding: 2px 6px;
  font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-accent-subtle, rgba(107, 143, 113, 0.08));
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
  animation: mention-spin 0.8s linear infinite;
}

@keyframes mention-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dropdown transitions */
.dropdown-enter-active {
  transition: all 0.18s cubic-bezier(0.32, 0.72, 0, 1);
}

.dropdown-leave-active {
  transition: all 0.12s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* Scrollbar styling for dropdown */
.dropdown-list::-webkit-scrollbar {
  width: 5px;
}

.dropdown-list::-webkit-scrollbar-track {
  background: transparent;
}

.dropdown-list::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.dropdown-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong, var(--color-text-tertiary));
}
</style>
