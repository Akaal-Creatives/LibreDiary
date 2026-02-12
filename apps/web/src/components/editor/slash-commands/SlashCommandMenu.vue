<script setup lang="ts">
import { computed, watch, ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import type { SlashCommand } from './slashCommands';

const props = defineProps<{
  commands: SlashCommand[];
  selectedIndex: number;
}>();

const emit = defineEmits<{
  select: [command: SlashCommand];
  close: [];
  navigate: [index: number];
}>();

const { t } = useI18n();
const listboxRef = ref<HTMLElement>();

const GROUP_ORDER = ['basic', 'lists', 'advanced'] as const;

const GROUP_LABEL_KEYS: Record<string, string> = {
  basic: 'slashCommands.groupBasic',
  lists: 'slashCommands.groupLists',
  advanced: 'slashCommands.groupAdvanced',
};

const groupedCommands = computed(() => {
  const groups: { key: string; label: string; commands: SlashCommand[] }[] = [];

  for (const groupKey of GROUP_ORDER) {
    const cmds = props.commands.filter((c) => c.group === groupKey);
    if (cmds.length > 0) {
      const labelKey = GROUP_LABEL_KEYS[groupKey] || `slashCommands.group${groupKey}`;
      groups.push({ key: groupKey, label: t(labelKey), commands: cmds });
    }
  }

  return groups;
});

function flatIndex(command: SlashCommand): number {
  return props.commands.indexOf(command);
}

function handleKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      emit('navigate', (props.selectedIndex + 1) % props.commands.length);
      break;
    case 'ArrowUp':
      event.preventDefault();
      emit('navigate', (props.selectedIndex - 1 + props.commands.length) % props.commands.length);
      break;
    case 'Enter': {
      event.preventDefault();
      const cmd = props.commands[props.selectedIndex];
      if (cmd) {
        emit('select', cmd);
      }
      break;
    }
    case 'Escape':
      event.preventDefault();
      emit('close');
      break;
  }
}

function handleClick(command: SlashCommand) {
  emit('select', command);
}

watch(
  () => props.selectedIndex,
  async () => {
    await nextTick();
    const activeEl = listboxRef.value?.querySelector('[aria-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }
);
</script>

<template>
  <div class="slash-menu">
    <div v-if="commands.length === 0" class="slash-menu-empty">
      {{ t('slashCommands.noResults') }}
    </div>
    <div
      v-else
      ref="listboxRef"
      role="listbox"
      class="slash-menu-listbox"
      tabindex="0"
      @keydown="handleKeydown"
    >
      <template v-for="group in groupedCommands" :key="group.key">
        <div class="slash-menu-group-header">
          {{ group.label }}
        </div>
        <div
          v-for="command in group.commands"
          :key="command.id"
          role="option"
          :aria-selected="flatIndex(command) === selectedIndex ? 'true' : 'false'"
          :class="[
            'slash-menu-item',
            { 'slash-menu-item--active': flatIndex(command) === selectedIndex },
          ]"
          @mousedown.prevent="handleClick(command)"
        >
          <div class="slash-menu-item-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path :d="command.icon" />
            </svg>
          </div>
          <div class="slash-menu-item-content">
            <div class="slash-menu-item-label">{{ t(command.labelKey) }}</div>
            <div class="slash-menu-item-description">{{ t(command.descriptionKey) }}</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.slash-menu {
  min-width: 240px;
  max-width: 320px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.slash-menu-empty {
  padding: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: center;
}

.slash-menu-listbox {
  padding: var(--space-1);
  outline: none;
}

.slash-menu-group-header {
  padding: var(--space-2) var(--space-3) var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.slash-menu-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.slash-menu-item:hover,
.slash-menu-item--active {
  background: var(--color-hover);
}

.slash-menu-item-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
}

.slash-menu-item--active .slash-menu-item-icon {
  color: var(--color-accent);
}

.slash-menu-item-content {
  min-width: 0;
}

.slash-menu-item-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.slash-menu-item-description {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}
</style>
