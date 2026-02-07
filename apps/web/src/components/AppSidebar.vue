<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, usePagesStore } from '@/stores';
import { useTheme, useToast } from '@/composables';
import type { PageWithChildren, Page } from '@librediary/shared';
import OrganizationSwitcher from './OrganizationSwitcher.vue';
import PageTreeItem from './PageTreeItem.vue';
import PageContextMenu from './PageContextMenu.vue';
import FavoritesSection from './FavoritesSection.vue';
import NotificationBell from './NotificationBell.vue';
import SearchModal from './SearchModal.vue';

const router = useRouter();
const authStore = useAuthStore();
const pagesStore = usePagesStore();
const { theme, toggleTheme } = useTheme();
const toast = useToast();

const showSearchModal = ref(false);

function openSearch() {
  showSearchModal.value = true;
}

function closeSearch() {
  showSearchModal.value = false;
}

function handleSearchNavigate(pageId: string) {
  showSearchModal.value = false;
  router.push({ name: 'page', params: { pageId } });
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault();
    showSearchModal.value = !showSearchModal.value;
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});
const contextMenu = ref<{
  show: boolean;
  x: number;
  y: number;
  page: Page | PageWithChildren | null;
}>({
  show: false,
  x: 0,
  y: 0,
  page: null,
});

// Fetch pages when organization changes
watch(
  () => authStore.currentOrganizationId,
  async (orgId) => {
    if (orgId) {
      try {
        await pagesStore.fetchPageTree();
        await pagesStore.fetchFavorites();
      } catch (e) {
        console.error('Failed to fetch pages:', e);
        toast.error('Failed to load pages');
      }
    }
  },
  { immediate: true }
);

function navigateToDashboard() {
  router.push({ name: 'dashboard' });
}

function navigateToTrash() {
  router.push({ name: 'trash' });
}

async function createNewPage(parentId?: string) {
  try {
    const page = await pagesStore.createPage({
      title: 'Untitled',
      parentId: parentId ?? null,
    });
    router.push({ name: 'page', params: { pageId: page.id } });
  } catch (e) {
    console.error('Failed to create page:', e);
    toast.error('Failed to create page');
  }
}

function showContextMenu(event: MouseEvent, page: PageWithChildren) {
  event.preventDefault();
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    page,
  };
}

function closeContextMenu() {
  contextMenu.value.show = false;
}

async function handleAddSubpage(page: Page | PageWithChildren) {
  await createNewPage(page.id);
}

async function handleDuplicate(page: Page | PageWithChildren) {
  try {
    const newPage = await pagesStore.duplicatePage(page.id);
    toast.success('Page duplicated');
    router.push({ name: 'page', params: { pageId: newPage.id } });
  } catch (e) {
    console.error('Failed to duplicate page:', e);
    toast.error('Failed to duplicate page');
  }
}

function handleRename(page: Page | PageWithChildren) {
  // Navigate to page and focus on title
  router.push({ name: 'page', params: { pageId: page.id } });
}

async function handleToggleFavorite(page: Page | PageWithChildren) {
  try {
    const wasFavorite = pagesStore.isFavorite(page.id);
    await pagesStore.toggleFavorite(page.id);
    toast.success(wasFavorite ? 'Removed from favorites' : 'Added to favorites');
  } catch (e) {
    console.error('Failed to toggle favorite:', e);
    toast.error('Failed to update favorites');
  }
}

async function handleMoveToTrash(page: Page | PageWithChildren) {
  try {
    await pagesStore.trashPage(page.id);
    toast.success('Moved to trash');
    // Navigate to dashboard if the trashed page was the current page
    if (pagesStore.currentPageId === page.id) {
      router.push({ name: 'dashboard' });
    }
  } catch (e) {
    console.error('Failed to trash page:', e);
    toast.error('Failed to move to trash');
  }
}
</script>

<template>
  <aside class="sidebar">
    <!-- Workspace Header -->
    <div class="sidebar-header">
      <OrganizationSwitcher />
    </div>

    <!-- Search -->
    <div class="sidebar-search">
      <button class="search-wrapper" @click="openSearch">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M14 14L10.5 10.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="search-placeholder">Search...</span>
        <kbd class="search-shortcut"><span class="shortcut-mod">⌘</span>K</kbd>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <!-- Quick Actions -->
      <div class="nav-section">
        <button class="nav-item" @click="navigateToDashboard">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2.25 9.75L9 3L15.75 9.75"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M4.5 8.25V14.25C4.5 14.6642 4.83579 15 5.25 15H7.5V11.25H10.5V15H12.75C13.1642 15 13.5 14.6642 13.5 14.25V8.25"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span>Home</span>
        </button>
        <button class="nav-item create-btn" @click="createNewPage()">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 3.75V14.25"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M3.75 9H14.25"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span>New Page</span>
        </button>
      </div>

      <!-- Favorites Section -->
      <FavoritesSection />

      <!-- Pages Section -->
      <div class="nav-section">
        <div class="nav-section-header">
          <span class="nav-section-title">Pages</span>
          <button
            class="section-action"
            title="Add page"
            aria-label="Add new page"
            @click="createNewPage()"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 2.5V11.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M2.5 7H11.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="pagesStore.loading" class="loading-state">
          <div class="spinner" />
        </div>

        <!-- Empty State -->
        <div v-else-if="pagesStore.rootPages.length === 0" class="empty-state">
          <span class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4H14L20 10V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V5C4 4.44772 4.44772 4 5 4Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M14 4V10H20"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M9 14H15M9 17H13"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span class="empty-text">No pages yet</span>
        </div>

        <!-- Page Tree -->
        <div v-else class="page-tree">
          <PageTreeItem
            v-for="page in pagesStore.pageTree"
            :key="page.id"
            :page="page"
            @contextmenu="showContextMenu"
          />
        </div>
      </div>

      <!-- Trash Link -->
      <div class="nav-section">
        <button class="nav-item trash-link" @click="navigateToTrash">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3 5.25H15"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M6 5.25V4.5C6 3.67157 6.67157 3 7.5 3H10.5C11.3284 3 12 3.67157 12 4.5V5.25"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M4.5 5.25L5.25 14.25C5.28 14.6642 5.58579 15 6 15H12C12.4142 15 12.72 14.6642 12.75 14.25L13.5 5.25"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </svg>
          </span>
          <span>Trash</span>
        </button>
      </div>
    </nav>

    <!-- Footer -->
    <div class="sidebar-footer">
      <div class="user-section">
        <div class="user-avatar">
          {{ authStore.user?.name?.charAt(0).toUpperCase() ?? '?' }}
        </div>
        <div class="user-info">
          <span class="user-name">{{ authStore.user?.name ?? 'User' }}</span>
          <span class="user-email">{{ authStore.user?.email ?? '' }}</span>
        </div>
      </div>
      <div class="footer-actions">
        <NotificationBell />
        <button class="theme-toggle" :title="`Theme: ${theme}`" @click="toggleTheme">
          <span v-if="theme === 'light'">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="3.75" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M9 2.25V3.75M9 14.25V15.75M2.25 9H3.75M14.25 9H15.75M4.22 4.22L5.28 5.28M12.72 12.72L13.78 13.78M4.22 13.78L5.28 12.72M12.72 5.28L13.78 4.22"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span v-else-if="theme === 'dark'">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M15.75 10.5C14.9177 11.3323 13.8066 11.8033 12.6376 11.8219C11.4686 11.8405 10.3434 11.4054 9.48398 10.5977C8.62457 9.79007 8.1 8.67504 8.02109 7.50718C7.94219 6.33932 8.31431 5.19788 9.06 4.305C8.08574 4.58581 7.20454 5.12154 6.50739 6.85749C5.81024 7.59343 5.3252 8.50045 5.10251 9.48675C4.87982 10.473 4.92807 11.5017 5.24204 12.4636C5.55601 13.4255 6.12385 14.2846 6.88457 14.9526C7.64529 15.6205 8.57062 16.0721 9.56612 16.258C10.5616 16.4439 11.5894 16.357 12.5395 16.0065C13.4895 15.656 14.3263 15.0552 14.9651 14.2682C15.6038 13.4813 16.0205 12.5372 16.1715 11.534"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span v-else>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="2.25"
                y="3.75"
                width="13.5"
                height="9.75"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M6 15.75H12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path d="M9 13.5V15.75" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </span>
        </button>
      </div>
    </div>

    <!-- Search Modal -->
    <SearchModal :visible="showSearchModal" @close="closeSearch" @navigate="handleSearchNavigate" />

    <!-- Context Menu -->
    <Teleport to="body">
      <PageContextMenu
        v-if="contextMenu.show && contextMenu.page"
        :page="contextMenu.page"
        :x="contextMenu.x"
        :y="contextMenu.y"
        @close="closeContextMenu"
        @add-subpage="handleAddSubpage"
        @duplicate="handleDuplicate"
        @rename="handleRename"
        @toggle-favorite="handleToggleFavorite"
        @move-to-trash="handleMoveToTrash"
      />
    </Teleport>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Header */
.sidebar-header {
  padding: var(--space-4);
}

/* Search */
.sidebar-search {
  padding: 0 var(--space-3) var(--space-3);
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
  font-family: inherit;
  padding: 0;
}

.search-wrapper:hover {
  border-color: var(--color-border);
}

.search-icon {
  flex-shrink: 0;
  margin-left: var(--space-3);
  color: var(--color-text-tertiary);
  pointer-events: none;
  transition: color var(--transition-fast);
}

.search-wrapper:focus-within .search-icon {
  color: var(--color-accent);
}

.search-placeholder {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: left;
}

.search-shortcut {
  display: flex;
  gap: 1px;
  align-items: center;
  flex-shrink: 0;
  margin-right: var(--space-2);
  padding: 3px 5px;
  font-family: var(--font-family-mono);
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
  color: var(--color-text-tertiary);
  background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-surface-sunken) 100%);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.shortcut-mod {
  font-size: 11px;
  opacity: 0.7;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  overflow-y: auto;
}

.nav-section {
  margin-bottom: var(--space-4);
}

.nav-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-2);
  margin-bottom: var(--space-1);
}

.nav-section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all var(--transition-fast);
}

.nav-section-header:hover .section-action {
  opacity: 1;
}

.section-action:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.nav-item {
  display: flex;
  gap: var(--space-3);
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

.nav-item:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.nav-item.active {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.nav-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: currentColor;
}

.create-btn {
  color: var(--color-accent);
}

.create-btn:hover {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.trash-link {
  color: var(--color-text-tertiary);
}

.trash-link:hover {
  color: var(--color-text-secondary);
}

.page-tree {
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: var(--space-4);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  align-items: center;
  padding: var(--space-6) var(--space-4);
  color: var(--color-text-tertiary);
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
}

.empty-text {
  font-size: var(--text-sm);
}

/* Footer */
.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.user-section {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  min-width: 0;
}

.user-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  overflow: hidden;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-actions {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

.theme-toggle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

/* Scrollbar */
.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
}
</style>
