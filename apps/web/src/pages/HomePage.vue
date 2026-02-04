<script setup lang="ts">
import { useRouter } from 'vue-router';
import { DEVELOPER_INFO } from '@librediary/shared';
import { useTheme } from '@/composables';

const router = useRouter();
const { theme, toggleTheme } = useTheme();

function goToLogin() {
  router.push('/login');
}
</script>

<template>
  <div class="home-page">
    <!-- Navigation -->
    <nav class="nav">
      <div class="nav-brand">
        <svg class="brand-icon" width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect
            x="4"
            y="3"
            width="16"
            height="22"
            rx="2"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M8 8H16M8 12H16M8 16H12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <path
            d="M20 7V23C20 24.1046 20.8954 25 22 25H22C23.1046 25 24 24.1046 24 23V7"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <span class="brand-name">LibreDiary</span>
      </div>
      <div class="nav-actions">
        <button class="theme-toggle" :title="`Theme: ${theme}`" @click="toggleTheme">
          <svg v-if="theme === 'light'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M10 2.5V4M10 16V17.5M2.5 10H4M16 10H17.5M4.7 4.7L5.76 5.76M14.24 14.24L15.3 15.3M4.7 15.3L5.76 14.24M14.24 5.76L15.3 4.7"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <svg v-else-if="theme === 'dark'" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M17.5 11.5C16.5 12.5 15.1 13.1 13.6 13.1C10.5 13.1 8 10.6 8 7.5C8 5.9 8.6 4.5 9.6 3.5C5.8 4.2 3 7.5 3 11.5C3 16 6.6 19.5 11 19.5C15 19.5 18.3 16.7 19 12.9C18.6 12.5 18.1 12 17.5 11.5Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect
              x="2.5"
              y="4"
              width="15"
              height="11"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M6.5 18H13.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path d="M10 15V18" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
        <button class="nav-link" @click="goToLogin">Sign In</button>
      </div>
    </nav>

    <!-- Hero Section -->
    <header class="hero">
      <div class="hero-content">
        <div class="hero-badge">Open Source • Self-Hosted • Local-First</div>
        <h1 class="hero-title">Your ideas deserve<br />a calm home</h1>
        <p class="hero-subtitle">
          A workspace for notes, docs, and databases. Built for focus, designed for clarity, and
          always under your control.
        </p>
        <div class="hero-actions">
          <button class="btn-primary" @click="goToLogin">
            Get Started
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8H13M13 8L9 4M13 8L9 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <a href="https://github.com" target="_blank" class="btn-secondary">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5C4.86 1.5 1.5 4.86 1.5 9C1.5 12.31 3.67 15.1 6.71 16.13C7.11 16.2 7.25 15.96 7.25 15.75V14.31C5.01 14.81 4.54 13.31 4.54 13.31C4.17 12.43 3.64 12.19 3.64 12.19C2.9 11.69 3.7 11.7 3.7 11.7C4.52 11.76 4.95 12.53 4.95 12.53C5.69 13.77 6.88 13.41 7.28 13.21C7.35 12.68 7.57 12.32 7.81 12.11C6.01 11.9 4.12 11.16 4.12 8.28C4.12 7.45 4.44 6.77 4.97 6.25C4.89 6.03 4.61 5.26 5.04 4.22C5.04 4.22 5.74 3.98 7.24 4.96C7.9 4.77 8.6 4.68 9.3 4.68C10 4.68 10.7 4.77 11.36 4.96C12.86 3.98 13.56 4.22 13.56 4.22C13.99 5.26 13.71 6.03 13.63 6.25C14.16 6.77 14.48 7.45 14.48 8.28C14.48 11.17 12.58 11.9 10.78 12.1C11.08 12.36 11.35 12.86 11.35 13.63V15.75C11.35 15.96 11.49 16.21 11.9 16.13C14.93 15.1 17.1 12.31 17.1 9C17.1 4.86 13.74 1.5 9.6 1.5H9Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            View on GitHub
          </a>
        </div>
      </div>
      <div class="hero-visual">
        <div class="visual-card">
          <div class="visual-header">
            <span class="visual-dot"></span>
            <span class="visual-dot"></span>
            <span class="visual-dot"></span>
          </div>
          <div class="visual-content">
            <div class="visual-line long"></div>
            <div class="visual-line medium"></div>
            <div class="visual-line short"></div>
            <div class="visual-block"></div>
          </div>
        </div>
      </div>
    </header>

    <!-- Features Section -->
    <section class="features">
      <div class="features-header">
        <h2>Built for the way you think</h2>
        <p>Simple tools that get out of your way</p>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M4 24L8 20M8 20L18 10C19.1 8.9 20.9 8.9 22 10C23.1 11.1 23.1 12.9 22 14L12 24H8V20Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M16 12L20 16"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <h3>Block Editor</h3>
          <p>
            Write naturally with a powerful editor. Drag, drop, and organize your thoughts with
            ease.
          </p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M4 14C4 14 7 7 14 7C21 7 24 14 24 14"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M4 14C4 14 7 21 14 21C21 21 24 14 24 14"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <circle cx="14" cy="14" r="3" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M7 4L10 7M21 4L18 7M7 24L10 21M21 24L18 21"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <h3>Real-Time Sync</h3>
          <p>Collaborate seamlessly. See changes as they happen with live cursors and presence.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M5 24V12L14 5L23 12V24H17V17H11V24H5Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <h3>Self-Hosted</h3>
          <p>Your data stays yours. Deploy on your infrastructure with full control and privacy.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect
                x="4"
                y="4"
                width="20"
                height="6"
                rx="1"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <rect
                x="4"
                y="13"
                width="9"
                height="11"
                rx="1"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <rect
                x="16"
                y="13"
                width="8"
                height="5"
                rx="1"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <rect
                x="16"
                y="21"
                width="8"
                height="3"
                rx="1"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </svg>
          </div>
          <h3>Databases</h3>
          <p>Tables, kanbans, calendars. Multiple views for the same data, however you need it.</p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <svg class="brand-icon" width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect
              x="4"
              y="3"
              width="16"
              height="22"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M8 8H16M8 12H16M8 16H12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M20 7V23C20 24.1046 20.8954 25 22 25H22C23.1046 25 24 24.1046 24 23V7"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>LibreDiary</span>
        </div>
        <p class="footer-attribution">
          Developed by
          <a :href="DEVELOPER_INFO.website" target="_blank" rel="noopener">
            {{ DEVELOPER_INFO.name }}
          </a>
        </p>
        <p class="footer-license">Licensed under AGPLv3</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: var(--color-background);
  color: var(--color-text-primary);
}

/* Navigation */
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-5) var(--space-6);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-lg);
  font-weight: 600;
}

.brand-icon {
  color: var(--color-accent);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--color-text-secondary);
  background: var(--color-hover);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  color: var(--color-text-primary);
  background: var(--color-active);
}

.nav-link {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

/* Hero */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-16);
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-16) var(--space-6);
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-visual {
    display: none;
  }
}

.hero-badge {
  display: inline-block;
  margin-bottom: var(--space-4);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: var(--color-accent-subtle);
  border-radius: var(--radius-full);
}

.hero-title {
  margin-bottom: var(--space-5);
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.hero-subtitle {
  max-width: 480px;
  margin-bottom: var(--space-8);
  font-size: var(--text-lg);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

@media (max-width: 900px) {
  .hero-subtitle {
    margin-inline: auto;
  }
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

@media (max-width: 900px) {
  .hero-actions {
    justify-content: center;
  }
}

.btn-primary {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-4) var(--space-6);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

.btn-primary svg {
  transition: transform var(--transition-fast);
}

.btn-primary:hover svg {
  transform: translateX(4px);
}

.btn-secondary {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-4) var(--space-6);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text-primary);
  text-decoration: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.btn-secondary:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.btn-secondary svg {
  color: var(--color-text-secondary);
}

/* Hero Visual */
.hero-visual {
  display: flex;
  justify-content: center;
}

.visual-card {
  width: 100%;
  max-width: 400px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}

.visual-header {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface-sunken);
  border-bottom: 1px solid var(--color-border);
}

.visual-dot {
  width: 10px;
  height: 10px;
  background: var(--color-border-strong);
  border-radius: 50%;
}

.visual-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6);
}

.visual-line {
  height: 12px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
}

.visual-line.long {
  width: 100%;
}
.visual-line.medium {
  width: 75%;
}
.visual-line.short {
  width: 50%;
}

.visual-block {
  height: 80px;
  margin-top: var(--space-2);
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent-muted);
  border-radius: var(--radius-md);
}

/* Features */
.features {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-20) var(--space-6);
}

.features-header {
  max-width: 500px;
  margin-bottom: var(--space-12);
  text-align: center;
  margin-inline: auto;
}

.features-header h2 {
  margin-bottom: var(--space-3);
  font-size: var(--text-3xl);
}

.features-header p {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-6);
}

.feature-card {
  padding: var(--space-8);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-base);
}

.feature-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: var(--space-4);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-lg);
}

.feature-card h3 {
  margin-bottom: var(--space-2);
  font-size: var(--text-lg);
  font-weight: 600;
}

.feature-card p {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

/* Footer */
.footer {
  padding: var(--space-12) var(--space-6);
  border-top: 1px solid var(--color-border);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.footer-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  font-size: var(--text-lg);
  font-weight: 600;
}

.footer-brand .brand-icon {
  color: var(--color-accent);
}

.footer-attribution {
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.footer-attribution a {
  color: var(--color-accent);
  font-weight: 500;
}

.footer-license {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}
</style>
