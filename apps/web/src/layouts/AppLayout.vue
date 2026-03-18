<script setup lang="ts">
import { ref } from 'vue';
import { RouterView } from 'vue-router';
import AppSidebar from '@/components/AppSidebar.vue';
import AppHeader from '@/components/AppHeader.vue';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal.vue';
import OnboardingTour from '@/components/OnboardingTour.vue';
import OfflineIndicator from '@/components/OfflineIndicator.vue';
import MobileBottomNav from '@/components/MobileBottomNav.vue';
import QuickCaptureSheet from '@/components/QuickCaptureSheet.vue';
import { useTheme } from '@/composables';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import { useSidebar } from '@/composables/useSidebar';
import { APP_VERSION } from '@/utils/version';

// Initialize theme on app load
useTheme();

const sidebar = useSidebar();

const showQuickCapture = ref(false);

function openQuickCapture() {
  showQuickCapture.value = true;
}

function closeQuickCapture() {
  showQuickCapture.value = false;
}

function handleMobileSearch() {
  // Trigger the existing search shortcut
  const event = new KeyboardEvent('keydown', {
    key: 'k',
    metaKey: true,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

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

registerShortcut({
  id: 'quick-capture',
  keys: 'mod+shift+c',
  label: 'quickCapture.shortcutHint',
  description: 'quickCapture.shortcutDescription',
  handler: () => {
    openQuickCapture();
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
        <div class="app-content-body">
          <RouterView />
        </div>
        <footer class="app-footer">
          <span class="app-footer-text">
            <a
              href="https://github.com/Akaal-Creatives/LibreDiary/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              class="app-footer-link"
              >LibreDiary v{{ APP_VERSION }}</a
            >
            <span class="app-footer-sep">&middot;</span>
            Developed by
            <a
              href="https://www.akaalcreatives.com"
              target="_blank"
              rel="noopener noreferrer"
              class="app-footer-link"
              >Akaal Creatives</a
            >
          </span>
        </footer>
      </main>
    </div>
    <!-- Mobile bottom nav (< 768px only) -->
    <MobileBottomNav
      v-if="sidebar.isMobile.value"
      @capture="openQuickCapture"
      @search="handleMobileSearch"
    />

    <!-- Quick capture sheet (all viewports via Mod+Shift+C, mobile via FAB) -->
    <QuickCaptureSheet :open="showQuickCapture" @close="closeQuickCapture" />

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
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: auto;
}

.app-content-body {
  flex: 1;
  padding: var(--space-8);
}

/* Footer */
.app-footer {
  padding: var(--space-4) var(--space-8);
  text-align: center;
  border-top: 1px solid var(--color-border-subtle, var(--color-border));
}

.app-footer-text {
  font-size: 11px;
  color: var(--color-text-tertiary);
  letter-spacing: 0.01em;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.app-footer:hover .app-footer-text {
  opacity: 1;
}

.app-footer-link {
  color: inherit;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.app-footer-link:hover {
  color: var(--color-accent);
}

.app-footer-sep {
  margin: 0 var(--space-1);
  opacity: 0.5;
}

/* Responsive padding */
@media (max-width: 767px) {
  .app-content-body {
    padding: var(--space-4);
    padding-bottom: calc(
      var(--bottom-nav-height) + var(--space-4) + env(safe-area-inset-bottom, 0px)
    );
  }

  .app-footer {
    padding: var(--space-3) var(--space-4);
    padding-bottom: calc(
      var(--bottom-nav-height) + var(--space-3) + env(safe-area-inset-bottom, 0px)
    );
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
