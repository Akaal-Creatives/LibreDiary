<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppSidebar from '@/components/AppSidebar.vue';
import AppHeader from '@/components/AppHeader.vue';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal.vue';
import OnboardingTour from '@/components/OnboardingTour.vue';
import OfflineIndicator from '@/components/OfflineIndicator.vue';
import { useTheme } from '@/composables';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import { useSidebar } from '@/composables/useSidebar';

// Initialize theme on app load
useTheme();

const sidebar = useSidebar();

// Register global shortcuts
const { register: registerShortcut, toggleHelp } = useKeyboardShortcuts();

registerShortcut({
  id: 'save-noop',
  keys: 'mod+s',
  label: 'shortcuts.save',
  description: 'shortcuts.saveDescription',
  handler: () => {
    // Prevent browser save dialogue — content auto-saves
  },
  global: true,
  category: 'general',
});

registerShortcut({
  id: 'toggle-sidebar',
  keys: 'mod+shift+d',
  label: 'shortcuts.toggleSidebar',
  description: 'shortcuts.toggleSidebarDescription',
  handler: () => {
    sidebar.toggle();
  },
  global: false,
  category: 'navigation',
});

registerShortcut({
  id: 'help',
  keys: 'mod+/',
  label: 'shortcuts.help',
  description: 'shortcuts.helpDescription',
  handler: () => {
    toggleHelp();
  },
  global: false,
  category: 'general',
});

registerShortcut({
  id: 'help-alt',
  keys: '?',
  label: 'shortcuts.help',
  description: 'shortcuts.helpDescription',
  handler: () => {
    toggleHelp();
  },
  global: false,
  category: 'general',
});

function handleSidebarClose() {
  sidebar.close();
}

function handleBackdropClick() {
  sidebar.close();
}
</script>

<template>
  <div class="app-layout">
    <a href="#main-content" class="skip-to-content">{{ $t('a11y.skipToContent') }}</a>
    <OfflineIndicator />
    <!-- Sidebar backdrop (mobile/tablet overlay) -->
    <Transition name="backdrop-fade">
      <div
        v-if="sidebar.isOverlay.value && sidebar.isOpen.value"
        class="sidebar-backdrop"
        @click="handleBackdropClick"
      />
    </Transition>

    <AppSidebar
      class="app-sidebar"
      :class="{
        'is-overlay': sidebar.isOverlay.value,
        'is-open': sidebar.isOpen.value,
      }"
      @close="handleSidebarClose"
    />
    <div class="app-main">
      <AppHeader class="app-header" />
      <main id="main-content" class="app-content">
        <RouterView />
      </main>
    </div>
    <KeyboardShortcutsModal />
    <OnboardingTour />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  background: var(--color-background);
}

.app-sidebar {
  flex-shrink: 0;
  width: 260px;
  height: 100%;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  transition: transform var(--transition-slow);
}

.app-sidebar.is-overlay {
  position: fixed;
  top: 0;
  left: 0;
  z-index: calc(var(--z-modal) + 1);
  transform: translateX(-100%);
}

.app-sidebar.is-overlay.is-open {
  transform: translateX(0);
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.4);
}

.app-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  background: var(--color-background);
}

.app-header {
  flex-shrink: 0;
  height: 52px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.app-content {
  flex: 1;
  padding: var(--space-8);
  overflow: auto;
}

/* Responsive padding */
@media (max-width: 767px) {
  .app-content {
    padding: var(--space-4);
  }
}

/* Smooth scrolling */
.app-content::-webkit-scrollbar {
  width: 8px;
}

.app-content::-webkit-scrollbar-track {
  background: transparent;
}

.app-content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.app-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
}

/* Backdrop transition */
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity var(--transition-slow);
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}
</style>
