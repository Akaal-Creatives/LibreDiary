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
        <span class="brand-icon">📓</span>
        <span class="brand-name">LibreDiary</span>
      </div>
      <div class="nav-actions">
        <button class="theme-toggle" :title="`Theme: ${theme}`" @click="toggleTheme">
          <span v-if="theme === 'light'">☀️</span>
          <span v-else-if="theme === 'dark'">🌙</span>
          <span v-else>💻</span>
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
            <span class="btn-arrow">→</span>
          </button>
          <a href="https://github.com" target="_blank" class="btn-secondary"> View on GitHub </a>
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
          <div class="feature-icon">✏️</div>
          <h3>Block Editor</h3>
          <p>
            Write naturally with a powerful editor. Drag, drop, and organize your thoughts with
            ease.
          </p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔄</div>
          <h3>Real-Time Sync</h3>
          <p>Collaborate seamlessly. See changes as they happen with live cursors and presence.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🏠</div>
          <h3>Self-Hosted</h3>
          <p>Your data stays yours. Deploy on your infrastructure with full control and privacy.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🗂️</div>
          <h3>Databases</h3>
          <p>Tables, kanbans, calendars. Multiple views for the same data, however you need it.</p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-brand">
          <span class="brand-icon">📓</span>
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
  gap: var(--space-2);
  font-size: var(--text-lg);
  font-weight: 600;
}

.brand-icon {
  font-size: 1.5rem;
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
  font-size: 1.125rem;
  background: var(--color-hover);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.theme-toggle:hover {
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

.btn-arrow {
  transition: transform var(--transition-fast);
}

.btn-primary:hover .btn-arrow {
  transform: translateX(4px);
}

.btn-secondary {
  display: inline-flex;
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
  margin-bottom: var(--space-4);
  font-size: 2rem;
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
