<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { TiptapEditor } from '@/components/editor';
import { api, ApiError } from '@/services';

const props = defineProps<{
  slug: string;
}>();

interface PublicPage {
  id: string;
  title: string;
  htmlContent: string | null;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string | null;
  } | null;
}

const loading = ref(true);
const error = ref<string | null>(null);
const page = ref<PublicPage | null>(null);

onMounted(async () => {
  await loadPage();
});

async function loadPage() {
  loading.value = true;
  error.value = null;

  try {
    const response = await api.get<{ page: PublicPage }>(`/public/pages/${props.slug}`);
    page.value = response.page;
  } catch (e: unknown) {
    if (e instanceof ApiError) {
      if (e.code === 'PAGE_NOT_FOUND') {
        error.value = 'Page not found';
      } else if (e.code === 'PAGE_NOT_PUBLIC') {
        error.value = 'This page is no longer public';
      } else {
        error.value = e.message || 'Failed to load page';
      }
    } else {
      error.value = 'Failed to load page';
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
</script>

<template>
  <div class="public-page">
    <!-- Organic header with soft curves -->
    <header class="public-header">
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
        <div class="header-badge">
          <span class="badge-dot"></span>
          <span>Public Page</span>
        </div>
      </div>
    </header>

    <!-- Loading State with organic animation -->
    <div v-if="loading" class="page-loading">
      <div class="loading-orb">
        <div class="orb-inner"></div>
      </div>
      <span class="loading-text">Loading page...</span>
    </div>

    <!-- Error State with gentle aesthetics -->
    <div v-else-if="error" class="page-error">
      <div class="error-illustration">
        <svg viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="50" stroke="currentColor" stroke-width="2" opacity="0.3" />
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
      <h2 class="error-title">{{ error }}</h2>
      <p class="error-description">
        The page you're looking for might have been removed or made private.
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
        Return home
      </router-link>
    </div>

    <!-- Page Content with read-only presentation -->
    <main v-else-if="page" class="page-content">
      <article class="article">
        <!-- Page Header -->
        <header class="article-header">
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

        <!-- Page Body (read-only) -->
        <div class="article-body">
          <TiptapEditor
            :model-value="page.htmlContent || ''"
            :editable="false"
            class="read-only-editor"
          />
        </div>
      </article>
    </main>

    <!-- Footer -->
    <footer class="public-footer">
      <p class="footer-text">
        Shared via <router-link to="/" class="footer-link">LibreDiary</router-link>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.public-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, var(--color-bg-secondary) 0%, var(--color-bg-primary) 300px);
}

/* Header */
.public-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: var(--space-3) var(--space-6);
  background: rgba(var(--color-bg-primary-rgb, 255, 255, 255), 0.8);
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

.header-badge {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  background: rgba(107, 143, 113, 0.1);
  border-radius: var(--radius-full);
}

.badge-dot {
  width: 6px;
  height: 6px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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

.orb-inner {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--color-accent) 0%, rgba(107, 143, 113, 0.3) 100%);
  border-radius: 50%;
  animation: orb-breathe 1.5s ease-in-out infinite;
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

.home-link {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
  text-decoration: none;
  background: rgba(107, 143, 113, 0.1);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.home-link:hover {
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

/* Footer */
.public-footer {
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
