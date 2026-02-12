import { ref, computed, readonly, onMounted, onUnmounted } from 'vue';

export interface KeyboardShortcut {
  id: string;
  keys: string; // 'mod+n', 'mod+shift+d', '?'
  label: string; // i18n key
  description: string; // i18n key
  handler: () => void;
  global?: boolean; // fires even in inputs
  category: 'navigation' | 'editor' | 'general';
}

const shortcuts = ref<KeyboardShortcut[]>([]);
const isHelpVisible = ref(false);

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const modifierSymbol = computed(() => (isMac ? '\u2318' : 'Ctrl'));

function parseKeys(keys: string): { mod: boolean; shift: boolean; alt: boolean; key: string } {
  const parts = keys.toLowerCase().split('+');
  return {
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts[parts.length - 1] ?? '',
  };
}

function matchesEvent(event: KeyboardEvent, parsed: ReturnType<typeof parseKeys>): boolean {
  const modKey = isMac ? event.metaKey : event.ctrlKey;

  if (parsed.mod && !modKey) return false;
  if (!parsed.mod && modKey) return false;
  if (parsed.shift && !event.shiftKey) return false;
  if (!parsed.shift && event.shiftKey) return false;
  if (parsed.alt && !event.altKey) return false;

  return event.key.toLowerCase() === parsed.key;
}

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    target.getAttribute('contenteditable') === 'true'
  );
}

let listenerAttached = false;

function handleKeydown(event: KeyboardEvent) {
  const inInput = isInputElement(event.target);

  for (const shortcut of shortcuts.value) {
    const parsed = parseKeys(shortcut.keys);

    if (!shortcut.global && inInput) continue;

    if (matchesEvent(event, parsed)) {
      event.preventDefault();
      shortcut.handler();
      return;
    }
  }
}

function attachListener() {
  if (listenerAttached || typeof document === 'undefined') return;
  document.addEventListener('keydown', handleKeydown);
  listenerAttached = true;
}

function detachListener() {
  if (!listenerAttached || typeof document === 'undefined') return;
  document.removeEventListener('keydown', handleKeydown);
  listenerAttached = false;
}

export function useKeyboardShortcuts() {
  onMounted(() => {
    attachListener();
  });

  onUnmounted(() => {
    // Only detach if no shortcuts remain
    if (shortcuts.value.length === 0) {
      detachListener();
    }
  });

  function register(shortcut: KeyboardShortcut): void {
    // Avoid duplicates
    const existing = shortcuts.value.findIndex((s) => s.id === shortcut.id);
    if (existing >= 0) {
      shortcuts.value[existing] = shortcut;
    } else {
      shortcuts.value.push(shortcut);
    }
  }

  function unregister(id: string): void {
    shortcuts.value = shortcuts.value.filter((s) => s.id !== id);
  }

  function toggleHelp(): void {
    isHelpVisible.value = !isHelpVisible.value;
  }

  return {
    shortcuts: readonly(shortcuts),
    register,
    unregister,
    isHelpVisible,
    toggleHelp,
    modifierSymbol,
  };
}
