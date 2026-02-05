<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, usePagesStore } from '@/stores';

const router = useRouter();
const authStore = useAuthStore();
const pagesStore = usePagesStore();

const creating = ref(false);

function navigateToPage(pageId: string) {
  router.push({ name: 'page', params: { pageId } });
}

async function createNewPage() {
  if (creating.value) return;

  creating.value = true;
  try {
    const page = await pagesStore.createPage({
      title: 'Untitled',
    });
    router.push({ name: 'page', params: { pageId: page.id } });
  } catch (e) {
    console.error('Failed to create page:', e);
  } finally {
    creating.value = false;
  }
}

function showComingSoon(feature: string) {
  // Simple alert for now - could be replaced with a toast notification
  alert(`${feature} is coming soon!`);
}
</script>

<template>
  <div class="dashboard-page">
    <!-- Welcome Section -->
    <section class="welcome-section">
      <div class="welcome-content">
        <h1 class="welcome-title">
          Good
          {{
            new Date().getHours() < 12
              ? 'morning'
              : new Date().getHours() < 17
                ? 'afternoon'
                : 'evening'
          }}{{ authStore.user?.name ? `, ${authStore.user.name}` : '' }}
        </h1>
        <p class="welcome-subtitle">What would you like to work on today?</p>
      </div>
    </section>

    <!-- Quick Actions -->
    <section class="quick-actions">
      <h2 class="section-title">Get Started</h2>
      <div class="actions-grid">
        <button class="action-card" @click="createNewPage">
          <div class="action-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 21L7.5 17.5M7.5 17.5L16 9C16.9 8.1 18.4 8.1 19.3 9C20.2 9.9 20.2 11.4 19.3 12.3L10.8 20.8H7.5V17.5Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M14.5 10.5L17.5 13.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <div class="action-content">
            <h3>New Page</h3>
            <p>Create a blank page to start writing</p>
          </div>
          <span class="action-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M7.5 5L12.5 10L7.5 15"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>

        <button class="action-card" @click="showComingSoon('Templates')">
          <div class="action-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                rx="2"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path d="M4 9H20" stroke="currentColor" stroke-width="1.5" />
              <path d="M9 9V20" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
          <div class="action-content">
            <h3>Templates</h3>
            <p>Start with a pre-built template</p>
          </div>
          <span class="action-badge">Soon</span>
        </button>

        <button class="action-card" @click="showComingSoon('Import')">
          <div class="action-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 4V14M12 14L8 10M12 14L16 10"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M4 17V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V17"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="action-content">
            <h3>Import</h3>
            <p>Import from Notion or Markdown</p>
          </div>
          <span class="action-badge">Soon</span>
        </button>
      </div>
    </section>

    <!-- Recent Pages -->
    <section v-if="pagesStore.rootPages.length > 0" class="recent-section">
      <div class="section-header">
        <h2 class="section-title">Recent Pages</h2>
        <button class="view-all-btn">View all</button>
      </div>
      <div class="pages-grid">
        <button
          v-for="page in pagesStore.rootPages.slice(0, 6)"
          :key="page.id"
          class="page-card"
          @click="navigateToPage(page.id)"
        >
          <div class="page-card-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 3H12L16 7V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V4C4 3.44772 4.44772 3 5 3Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M12 3V7H16"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="page-card-content">
            <h4 class="page-card-title">{{ page.title }}</h4>
            <p class="page-card-meta">Edited recently</p>
          </div>
        </button>
      </div>
    </section>

    <!-- Empty State -->
    <section v-else class="empty-section">
      <div class="empty-state">
        <div class="empty-illustration">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M8 6H24L32 14V34C32 35.1046 31.1046 36 30 36H10C8.89543 36 8 35.1046 8 34V8C8 6.89543 8.89543 6 10 6Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M24 6V14H32"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M14 22H26M14 28H22"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <h3 class="empty-title">Your workspace is empty</h3>
        <p class="empty-description">
          Create your first page to start organizing your thoughts, notes, and ideas.
        </p>
        <button class="empty-action" @click="createNewPage">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 3.75V14.25"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M3.75 9H14.25"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>Create your first page</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-4) 0;
}

/* Welcome Section */
.welcome-section {
  margin-bottom: var(--space-10);
}

.welcome-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-3xl);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.welcome-subtitle {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

/* Section Styles */
.section-title {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.view-all-btn {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-accent);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.view-all-btn:hover {
  background: var(--color-accent-subtle);
}

/* Quick Actions */
.quick-actions {
  margin-bottom: var(--space-10);
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.action-card {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  text-align: left;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-base);
}

.action-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.action-icon-wrapper {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-lg);
}

.action-content {
  flex: 1;
  min-width: 0;
}

.action-content h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.action-content p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.action-arrow {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
}

.action-card:hover .action-arrow {
  color: var(--color-accent);
  transform: translateX(4px);
}

.action-badge {
  flex-shrink: 0;
  padding: 3px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
}

/* Recent Pages */
.recent-section {
  margin-bottom: var(--space-10);
}

.pages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}

.page-card {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-4);
  text-align: left;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.page-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.page-card-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-md);
}

.page-card-content {
  flex: 1;
  min-width: 0;
}

.page-card-title {
  margin: 0 0 var(--space-1);
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-card-meta {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Empty State */
.empty-section {
  padding: var(--space-16) 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: var(--space-6);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-2xl);
}

.empty-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.empty-description {
  max-width: 360px;
  margin: 0 0 var(--space-6);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.empty-action {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-5);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text-inverse);
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.empty-action:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}
</style>
