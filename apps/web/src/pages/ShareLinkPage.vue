<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { TiptapEditor } from '@/components/editor';
import { api, ApiError } from '@/services';

const props = defineProps<{
  token: string;
}>();

interface SharedPage {
  id: string;
  title: string;
  htmlContent: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string | null;
  } | null;
  permission: {
    level: 'VIEW' | 'EDIT' | 'FULL_ACCESS';
    expiresAt: string | null;
  };
}

type ErrorType = 'not-found' | 'expired' | 'generic';

const loading = ref(true);
const errorType = ref<ErrorType | null>(null);
const errorMessage = ref<string | null>(null);
const page = ref<SharedPage | null>(null);
const content = ref('');

const canEdit = computed(() => {
  return page.value?.permission.level === 'EDIT' || page.value?.permission.level === 'FULL_ACCESS';
});

const permissionLabel = computed(() => {
  if (!page.value) return '';
  switch (page.value.permission.level) {
    case 'VIEW':
      return 'View only';
    case 'EDIT':
      return 'Can edit';
    case 'FULL_ACCESS':
      return 'Full access';
    default:
      return '';
  }
});

onMounted(async () => {
  await loadPage();
});

async function loadPage() {
  loading.value = true;
  errorType.value = null;
  errorMessage.value = null;

  try {
    const response = await api.get<{ page: SharedPage }>(`/public/pages/share/${props.token}`);
    page.value = response.page;
    content.value = response.page.htmlContent || '';
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      switch (e.code) {
        case 'PAGE_NOT_FOUND':
          errorType.value = 'not-found';
          errorMessage.value = 'Page not found';
          break;
        case 'INVALID_SHARE_TOKEN':
          errorType.value = 'not-found';
          errorMessage.value = 'Invalid share link';
          break;
        case 'SHARE_TOKEN_EXPIRED':
          errorType.value = 'expired';
          errorMessage.value = 'Link expired';
          break;
        default:
          errorType.value = 'generic';
          errorMessage.value = e.message || 'Failed to load page';
      }
    } else {
      errorType.value = 'generic';
      errorMessage.value = 'Failed to load page';
    }
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function onContentUpdate(newContent: string) {
  content.value = newContent;
  // In a real implementation, you would save changes here
  // For now, guest edits are local-only (would need API support for persistence)
}
</script>

<template>
  <div class="share-page">
    <!-- Header with share link indicator -->
    <header class="share-header">
      <div class="header-content">
        <router-link to="/" class="brand-link">
          <div class="brand">
            <div class="brand-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <path
                  d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path d="M12 10H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M12 14H18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M12 18H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </div>
            <span class="brand-name">LibreDiary</span>
          </div>
        </router-link>
        <div class="header-badges">
          <div class="header-badge shared">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M10.5 3.5L3.5 10.5M3.5 3.5H10.5V10.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Shared Link</span>
          </div>
          <div v-if="page" class="header-badge permission" :class="{ editable: canEdit }">
            <svg v-if="canEdit" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M8.5 1.5L10.5 3.5M1.5 10.5L2 8.5L9 1.5L10.5 3L3.5 10L1.5 10.5Z"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="3.5" stroke="currentColor" stroke-width="1.2" />
              <circle cx="6" cy="6" r="1" fill="currentColor" />
            </svg>
            <span>{{ permissionLabel }}</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="page-loading">
      <div class="loading-orb">
        <div class="orb-ring"></div>
        <div class="orb-inner"></div>
      </div>
      <span class="loading-text">Loading shared page...</span>
    </div>

    <!-- Expired Token Error -->
    <div v-else-if="errorType === 'expired'" class="page-error expired">
      <div class="error-illustration">
        <svg viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="45" stroke="currentColor" stroke-width="2" opacity="0.2" />
          <path
            d="M60 30V60L80 75"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.6"
          />
          <path
            d="M40 90L80 90"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            opacity="0.3"
          />
        </svg>
      </div>
      <h2 class="error-title">{{ errorMessage }}</h2>
      <p class="error-description">
        This share link has expired and is no longer valid. Please ask the page owner for a new
        link.
      </p>
      <router-link to="/" class="home-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 8H4M4 8L7 5M4 8L7 11"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Go to LibreDiary
      </router-link>
    </div>

    <!-- Not Found / Invalid Token Error -->
    <div v-else-if="errorType === 'not-found'" class="page-error not-found">
      <div class="error-illustration">
        <svg viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="45" stroke="currentColor" stroke-width="2" opacity="0.2" />
          <path
            d="M45 45L75 75M75 45L45 75"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            opacity="0.5"
          />
        </svg>
      </div>
      <h2 class="error-title">{{ errorMessage }}</h2>
      <p class="error-description">
        This link doesn't exist or the page has been removed. Check the URL or contact the person
        who shared it.
      </p>
      <router-link to="/" class="home-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M12 8H4M4 8L7 5M4 8L7 11"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Go to LibreDiary
      </router-link>
    </div>

    <!-- Generic Error -->
    <div v-else-if="errorType === 'generic'" class="page-error">
      <div class="error-illustration">
        <svg viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="45" stroke="currentColor" stroke-width="2" opacity="0.2" />
          <path
            d="M60 35V65"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            opacity="0.6"
          />
          <circle cx="60" cy="80" r="3" fill="currentColor" opacity="0.6" />
        </svg>
      </div>
      <h2 class="error-title">{{ errorMessage }}</h2>
      <p class="error-description">
        Something went wrong while loading this page. Please try again.
      </p>
      <button class="retry-btn" @click="loadPage">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 8a6 6 0 0111.5-2.4M14 8a6 6 0 01-11.5 2.4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <path
            d="M14 2v4h-4M2 14v-4h4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Try again
      </button>
    </div>

    <!-- Page Content -->
    <main v-else-if="page" class="page-content">
      <article class="article">
        <!-- Page Header with icon -->
        <header class="article-header">
          <div v-if="page.icon" class="article-icon">{{ page.icon }}</div>
          <h1 class="article-title">{{ page.title }}</h1>
          <div class="article-meta">
            <span v-if="page.createdBy?.name" class="meta-author">
              By {{ page.createdBy.name }}
            </span>
            <span class="meta-separator">·</span>
            <time class="meta-date" :datetime="page.updatedAt">
              {{ formatDate(page.updatedAt) }}
            </time>
          </div>
        </header>

        <!-- Decorative divider -->
        <div class="article-divider">
          <svg viewBox="0 0 100 12" preserveAspectRatio="none">
            <path
              d="M0 6 Q 25 0, 50 6 T 100 6"
              stroke="currentColor"
              stroke-width="1"
              fill="none"
            />
          </svg>
        </div>

        <!-- Page Body -->
        <div class="article-body" :class="{ editable: canEdit }">
          <TiptapEditor
            :model-value="content"
            :editable="canEdit"
            :placeholder="canEdit ? 'Start writing...' : ''"
            class="shared-editor"
            @update:model-value="onContentUpdate"
          />
        </div>

        <!-- Edit mode indicator -->
        <div v-if="canEdit" class="edit-notice">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.2" />
            <path d="M7 4V7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            <circle cx="7" cy="10" r="0.75" fill="currentColor" />
          </svg>
          <span>You can edit this page. Changes are visible to everyone with this link.</span>
        </div>
      </article>
    </main>

    <!-- Footer -->
    <footer class="share-footer">
      <p class="footer-text">
        Shared via <router-link to="/" class="footer-link">LibreDiary</router-link>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.share-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, var(--color-bg-secondary) 0%, var(--color-bg-primary) 300px);
}

/* Header */
.share-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: var(--space-3) var(--space-6);
  background: rgba(var(--color-bg-primary-rgb, 255, 255, 255), 0.85);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
}

.header-content {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  justify-content: space-between;
  max-width: 800px;
  margin: 0 auto;
}

.brand-link {
  text-decoration: none;
}

.brand {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  color: var(--color-text-primary);
}

.brand-icon {
  width: 24px;
  height: 24px;
  color: var(--color-accent);
}

.brand-name {
  font-size: var(--text-base);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.header-badges {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.header-badge {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-full);
}

.header-badge.shared {
  color: var(--color-accent);
  background: rgba(107, 143, 113, 0.1);
}

.header-badge.permission.editable {
  color: var(--color-warning);
  background: rgba(234, 179, 8, 0.1);
}

/* Loading State */
.page-loading {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
}

.loading-orb {
  position: relative;
  width: 48px;
  height: 48px;
}

.orb-ring {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.orb-inner {
  position: absolute;
  inset: 8px;
  background: linear-gradient(135deg, var(--color-accent) 0%, rgba(107, 143, 113, 0.3) 100%);
  border-radius: 50%;
  animation: orb-breathe 1.5s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes orb-breathe {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}

.loading-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  letter-spacing: 0.02em;
}

/* Error State */
.page-error {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  justify-content: center;
  padding: var(--space-20) var(--space-4);
  text-align: center;
}

.error-illustration {
  width: 100px;
  height: 100px;
  margin-bottom: var(--space-2);
  color: var(--color-text-tertiary);
}

.page-error.expired .error-illustration {
  color: var(--color-warning);
}

.page-error.not-found .error-illustration {
  color: var(--color-error);
}

.error-title {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.error-description {
  max-width: 360px;
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.home-link,
.retry-btn {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
  text-decoration: none;
  cursor: pointer;
  background: rgba(107, 143, 113, 0.1);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.home-link:hover,
.retry-btn:hover {
  background: rgba(107, 143, 113, 0.2);
}

/* Page Content */
.page-content {
  flex: 1;
  padding: var(--space-8) var(--space-4);
}

.article {
  max-width: 680px;
  margin: 0 auto;
}

.article-header {
  margin-bottom: var(--space-6);
  text-align: center;
}

.article-icon {
  margin-bottom: var(--space-3);
  font-size: 3rem;
  line-height: 1;
}

.article-title {
  margin: 0 0 var(--space-4);
  font-size: clamp(var(--text-2xl), 5vw, var(--text-4xl));
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.article-meta {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.meta-separator {
  opacity: 0.5;
}

.meta-author {
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Decorative divider */
.article-divider {
  width: 60px;
  height: 12px;
  margin: 0 auto var(--space-8);
  color: var(--color-accent);
  opacity: 0.4;
}

/* Article body */
.article-body {
  font-size: var(--text-base);
  line-height: 1.75;
  color: var(--color-text-primary);
}

.article-body.editable {
  padding: var(--space-4);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.article-body.editable:focus-within {
  border-color: var(--color-accent);
  border-style: solid;
  box-shadow: 0 0 0 3px rgba(107, 143, 113, 0.1);
}

.article-body :deep(.tiptap) {
  padding: 0;
}

.article-body :deep(p) {
  margin: 0 0 var(--space-4);
}

.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3) {
  margin-top: var(--space-8);
  margin-bottom: var(--space-4);
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-primary);
}

.article-body :deep(h1) {
  font-size: var(--text-2xl);
}

.article-body :deep(h2) {
  font-size: var(--text-xl);
}

.article-body :deep(h3) {
  font-size: var(--text-lg);
}

.article-body :deep(blockquote) {
  margin: var(--space-6) 0;
  padding-left: var(--space-4);
  font-style: italic;
  color: var(--color-text-secondary);
  border-left: 3px solid var(--color-accent);
}

.article-body :deep(code) {
  padding: 2px 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9em;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
}

.article-body :deep(pre) {
  margin: var(--space-6) 0;
  padding: var(--space-4);
  overflow-x: auto;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.article-body :deep(pre code) {
  padding: 0;
  background: transparent;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: var(--space-4) 0;
  padding-left: var(--space-6);
}

.article-body :deep(li) {
  margin-bottom: var(--space-2);
}

/* Edit notice */
.edit-notice {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  margin-top: var(--space-6);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.edit-notice svg {
  flex-shrink: 0;
  margin-top: 1px;
}

/* Footer */
.share-footer {
  padding: var(--space-6) var(--space-4);
  text-align: center;
  border-top: 1px solid var(--color-border);
}

.footer-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.footer-link {
  font-weight: 500;
  color: var(--color-accent);
  text-decoration: none;
}

.footer-link:hover {
  text-decoration: underline;
}
</style>
