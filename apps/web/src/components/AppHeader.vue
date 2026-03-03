<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePagesStore, useSyncStore } from '@/stores';
import { useToast } from '@/composables';
import { useSidebar } from '@/composables/useSidebar';
import { usePagePanels } from '@/composables/usePagePanels';
import type { Page, PageWithChildren } from '@librediary/shared';
import PageContextMenu from './PageContextMenu.vue';
import SaveAsTemplateModal from './SaveAsTemplateModal.vue';

const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const pagesStore = usePagesStore();
const syncStore = useSyncStore();
const sidebar = useSidebar();
const { openComments, openVersionHistory, openShare, commentCount } = usePagePanels();

const isCurrentPageFavorite = computed(() =>
  pagesStore.currentPage ? pagesStore.isFavorite(pagesStore.currentPage.id) : false
);

// More options context menu
const moreBtnRef = ref<HTMLButtonElement>();
const contextMenu = ref<{
  show: boolean;
  x: number;
  y: number;
}>({
  show: false,
  x: 0,
  y: 0,
});

const saveTemplateModal = ref<{
  open: boolean;
  pageId: string;
  pageTitle: string;
}>({
  open: false,
  pageId: '',
  pageTitle: '',
});

function openMoreMenu() {
  if (!pagesStore.currentPage || !moreBtnRef.value) return;
  const rect = moreBtnRef.value.getBoundingClientRect();
  contextMenu.value = {
    show: true,
    x: rect.right - 180, // Align right edge of menu with button
    y: rect.bottom + 4,
  };
}

function closeContextMenu() {
  contextMenu.value.show = false;
}

async function handleAddSubpage(page: Page | PageWithChildren) {
  try {
    const newPage = await pagesStore.createPage({
      title: t('pages.untitled'),
      parentId: page.id,
    });
    router.push({ name: 'page', params: { pageId: newPage.id } });
  } catch {
    toast.error(t('pages.failedToCreate'));
  }
}

async function handleDuplicate(page: Page | PageWithChildren) {
  try {
    const newPage = await pagesStore.duplicatePage(page.id);
    toast.success(t('pages.pageDuplicated'));
    router.push({ name: 'page', params: { pageId: newPage.id } });
  } catch {
    toast.error(t('pages.failedToDuplicate'));
  }
}

function handleRename(page: Page | PageWithChildren) {
  router.push({ name: 'page', params: { pageId: page.id } });
}

async function handleToggleFavorite(page: Page | PageWithChildren) {
  try {
    const wasFavorite = pagesStore.isFavorite(page.id);
    await pagesStore.toggleFavorite(page.id);
    toast.success(wasFavorite ? t('pages.removeFromFavourites') : t('pages.addToFavourites'));
  } catch {
    toast.error(t('pages.failedToUpdateFavourites'));
  }
}

function handleSaveAsTemplate(page: Page | PageWithChildren) {
  saveTemplateModal.value = {
    open: true,
    pageId: page.id,
    pageTitle: page.title,
  };
}

function closeSaveTemplateModal() {
  saveTemplateModal.value.open = false;
}

async function handleMoveToTrash(page: Page | PageWithChildren) {
  try {
    await pagesStore.trashPage(page.id);
    toast.success(t('pages.movedToTrash'));
    if (pagesStore.currentPageId === page.id) {
      router.push({ name: 'dashboard' });
    }
  } catch {
    toast.error(t('pages.failedToTrash'));
  }
}
</script>

<template>
  <header class="header">
    <div class="header-left">
      <!-- Hamburger Menu (mobile/tablet) -->
      <button
        v-if="sidebar.isOverlay.value"
        class="hamburger-btn"
        type="button"
        :title="$t('responsive.openMenu')"
        :aria-label="$t('responsive.openMenu')"
        @click="sidebar.toggle()"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 5H17M3 10H17M3 15H17"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- Breadcrumbs -->
      <nav v-if="pagesStore.currentPage" class="breadcrumbs">
        <span class="breadcrumb-icon">{{ pagesStore.currentPage.icon ?? '📄' }}</span>
        <span class="breadcrumb-title">{{ pagesStore.currentPage.title }}</span>
      </nav>
      <span v-else class="header-title">{{ $t('nav.dashboard') }}</span>
    </div>

    <!-- Sync Status Indicator -->
    <Transition name="sync-fade" mode="out-in">
      <div
        v-if="syncStore.status !== 'idle'"
        :key="syncStore.status"
        class="sync-indicator"
        :class="`sync-${syncStore.status}`"
        :title="syncStore.statusMessage"
      >
        <!-- Pending/Saving: Breathing Dot -->
        <div
          v-if="syncStore.status === 'pending' || syncStore.status === 'saving'"
          class="sync-dot"
        >
          <span class="dot-core"></span>
          <span class="dot-ring"></span>
          <span class="dot-ring dot-ring-outer"></span>
        </div>

        <!-- Saved: Blooming Checkmark -->
        <div v-else-if="syncStore.status === 'saved'" class="sync-check">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="check-icon">
            <path
              d="M2.5 7.5L5.5 10.5L11.5 3.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="check-path"
            />
          </svg>
        </div>

        <!-- Error: Gentle Alert -->
        <div
          v-else-if="syncStore.status === 'error'"
          class="sync-error"
          role="alert"
          aria-live="polite"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="error-icon">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5" />
            <path d="M7 4V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="7" cy="10" r="0.75" fill="currentColor" />
          </svg>
        </div>

        <!-- Status Text -->
        <span class="sync-text">{{ syncStore.statusMessage }}</span>
      </div>
    </Transition>

    <div class="header-right">
      <!-- Page Actions -->
      <div class="header-actions">
        <button
          class="action-btn"
          type="button"
          :disabled="!pagesStore.currentPage"
          :title="$t('header.viewHistory')"
          :aria-label="$t('header.viewHistory')"
          @click="openVersionHistory"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="6.75" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M9 5.25V9L11.25 10.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          class="action-btn"
          type="button"
          :disabled="!pagesStore.currentPage"
          :class="{ 'has-comments': commentCount > 0 }"
          :title="$t('header.comments')"
          :aria-label="$t('header.comments')"
          @click="openComments"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M15.75 8.625C15.7526 9.59369 15.5139 10.5479 15.0562 11.3973C14.5985 12.2467 13.9367 12.9633 13.1306 13.4833C12.3245 14.0033 11.4001 14.3097 10.4428 14.3732C9.48557 14.4367 8.52754 14.2552 7.6575 13.845L3 15L4.155 10.3425C3.74481 9.47245 3.56334 8.51442 3.62683 7.55719C3.69032 6.59996 3.99675 5.67551 4.51674 4.86941C5.03673 4.06331 5.75327 3.40154 6.60266 2.94383C7.45204 2.48611 8.40631 2.24742 9.375 2.25C10.6304 2.25 11.8568 2.62378 12.893 3.32101C13.9293 4.01825 14.7274 5.0065 15.1861 6.16031C15.6448 7.31411 15.7432 8.58012 15.4686 9.79124"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span v-if="commentCount > 0" class="comment-badge">{{ commentCount }}</span>
        </button>
        <button
          class="action-btn"
          :class="{ 'is-favourite': isCurrentPageFavorite }"
          type="button"
          :disabled="!pagesStore.currentPage"
          :title="
            isCurrentPageFavorite ? $t('pages.removeFromFavourites') : $t('pages.addToFavourites')
          "
          :aria-label="
            isCurrentPageFavorite ? $t('pages.removeFromFavourites') : $t('pages.addToFavourites')
          "
          @click="pagesStore.currentPage && handleToggleFavorite(pagesStore.currentPage)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 2.25L11.0962 6.50074L15.75 7.18125L12.375 10.4693L13.1925 15.1013L9 12.8925L4.8075 15.1013L5.625 10.4693L2.25 7.18125L6.90375 6.50074L9 2.25Z"
              :fill="isCurrentPageFavorite ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div class="header-divider"></div>

      <!-- Share Button -->
      <button
        class="share-btn"
        type="button"
        :disabled="!pagesStore.currentPage"
        :aria-label="$t('header.share')"
        @click="openShare"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 5.5C13.1046 5.5 14 4.60457 14 3.5C14 2.39543 13.1046 1.5 12 1.5C10.8954 1.5 10 2.39543 10 3.5C10 4.60457 10.8954 5.5 12 5.5Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M4 10C5.10457 10 6 9.10457 6 8C6 6.89543 5.10457 6 4 6C2.89543 6 2 6.89543 2 8C2 9.10457 2.89543 10 4 10Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M12 14.5C13.1046 14.5 14 13.6046 14 12.5C14 11.3954 13.1046 10.5 12 10.5C10.8954 10.5 10 11.3954 10 12.5C10 13.6046 10.8954 14.5 12 14.5Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M5.86 9.03L10.14 11.47"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M10.14 4.53L5.86 6.97"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ $t('header.share') }}</span>
      </button>

      <!-- More Options -->
      <button
        ref="moreBtnRef"
        class="more-btn"
        type="button"
        :title="$t('header.moreOptions')"
        :aria-label="$t('header.moreOptions')"
        :disabled="!pagesStore.currentPage"
        @click="openMoreMenu"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          <circle cx="9" cy="4.5" r="1.5" fill="currentColor" />
          <circle cx="9" cy="13.5" r="1.5" fill="currentColor" />
        </svg>
      </button>
    </div>

    <!-- Context Menu (teleported to body for correct positioning) -->
    <Teleport to="body">
      <PageContextMenu
        v-if="contextMenu.show && pagesStore.currentPage"
        :page="pagesStore.currentPage"
        :x="contextMenu.x"
        :y="contextMenu.y"
        @close="closeContextMenu"
        @add-subpage="handleAddSubpage"
        @duplicate="handleDuplicate"
        @rename="handleRename"
        @toggle-favorite="handleToggleFavorite"
        @save-as-template="handleSaveAsTemplate"
        @move-to-trash="handleMoveToTrash"
      />
    </Teleport>

    <!-- Save as Template Modal -->
    <SaveAsTemplateModal
      :open="saveTemplateModal.open"
      :page-id="saveTemplateModal.pageId"
      :page-title="saveTemplateModal.pageTitle"
      @close="closeSaveTemplateModal"
      @saved="closeSaveTemplateModal"
    />
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 var(--space-4);
}

.header-left {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  min-width: 0;
}

.hamburger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  padding: 4px;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.hamburger-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.breadcrumbs {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  min-width: 0;
}

.breadcrumb-icon {
  flex-shrink: 0;
  font-size: 1.125rem;
}

.breadcrumb-title {
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.header-right {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.header-actions {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

/* Touch target: 36px visible + 4px padding each side = 44px effective area (WCAG 2.5.5) */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  padding: 4px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.action-btn:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.action-btn:disabled {
  cursor: default;
  opacity: 0.4;
}

.action-btn {
  position: relative;
}

.action-btn.has-comments {
  color: var(--color-accent);
}

.action-btn.is-favourite {
  color: var(--color-warning);
}

.comment-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.header-divider {
  width: 1px;
  height: 20px;
  margin: 0 var(--space-2);
  background: var(--color-border);
}

.share-btn {
  display: flex;
  gap: var(--space-2);
  align-items: center;
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

.share-btn:hover {
  background: var(--color-accent-hover);
}

/* Touch target: 36px visible + 4px padding each side = 44px effective area (WCAG 2.5.5) */
.more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  padding: 4px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.more-btn:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.more-btn:disabled {
  cursor: default;
  opacity: 0.4;
}

/* ===========================================
   SYNC STATUS INDICATOR
   Organic minimalism - breathing, alive, unobtrusive
   =========================================== */

.sync-indicator {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sync-text {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  opacity: 0.8;
}

/* Pending/Saving State - Breathing Dot */
.sync-pending,
.sync-saving {
  color: var(--color-accent, #6b8f71);
  background: color-mix(in srgb, var(--color-accent, #6b8f71) 8%, transparent);
}

.sync-dot {
  position: relative;
  width: 10px;
  height: 10px;
}

.dot-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  background: currentColor;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: breathe-core 2s ease-in-out infinite;
}

.dot-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: 0.4;
  transform: translate(-50%, -50%);
  animation: breathe-ring 2s ease-in-out infinite;
}

.dot-ring-outer {
  width: 16px;
  height: 16px;
  opacity: 0.15;
  animation: breathe-ring-outer 2s ease-in-out infinite;
}

@keyframes breathe-core {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.7;
  }
}

@keyframes breathe-ring {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.15);
    opacity: 0.25;
  }
}

@keyframes breathe-ring-outer {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.15;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.08;
  }
}

/* Saved State - Blooming Checkmark */
.sync-saved {
  color: var(--color-accent, #6b8f71);
  background: color-mix(in srgb, var(--color-accent, #6b8f71) 8%, transparent);
}

.sync-check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon {
  animation: check-bloom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.check-path {
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: check-draw 0.4s ease-out 0.1s forwards;
}

@keyframes check-bloom {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes check-draw {
  to {
    stroke-dashoffset: 0;
  }
}

/* Error State - Gentle Pulse */
.sync-error {
  color: var(--color-error, #c75050);
  background: color-mix(in srgb, var(--color-error, #c75050) 8%, transparent);
}

.error-icon {
  animation: error-pulse 2s ease-in-out infinite;
}

@keyframes error-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

/* Transition animations */
.sync-fade-enter-active,
.sync-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sync-fade-enter-from {
  transform: translateY(-4px);
  opacity: 0;
}

.sync-fade-leave-to {
  transform: translateY(4px);
  opacity: 0;
}
</style>
