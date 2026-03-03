<script setup lang="ts">
import { useTheme } from '@/composables';
import AuthBrand from './AuthBrand.vue';

defineProps<{
  title: string;
  subtitle?: string;
}>();

const { theme, toggleTheme } = useTheme();
</script>

<template>
  <div class="auth-layout">
    <!-- Theme Toggle -->
    <button
      type="button"
      class="auth-layout__theme-toggle"
      :title="`Theme: ${theme}`"
      :aria-label="$t('a11y.toggleTheme')"
      @click="toggleTheme"
    >
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
        <path d="M6.5 18H13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M10 15V18" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>

    <div class="auth-layout__split">
      <!-- Left: Branded Panel (desktop only) -->
      <aside class="auth-layout__brand-panel">
        <div class="auth-layout__brand-panel-content">
          <AuthBrand size="large" color="inverse" />
          <p class="auth-layout__tagline">
            Your private, open-source workspace for notes, docs, and databases.
          </p>
        </div>
        <p class="auth-layout__brand-footer">Open source. Self-hosted. Private by design.</p>
        <!-- Decorative dot pattern overlay -->
        <div class="auth-layout__pattern" aria-hidden="true"></div>
      </aside>

      <!-- Right: Form Panel -->
      <main class="auth-layout__form-panel">
        <!-- Mobile brand (visible below 768px) -->
        <div class="auth-layout__mobile-brand">
          <AuthBrand />
        </div>

        <div class="auth-layout__card">
          <div class="auth-layout__header">
            <h1>{{ title }}</h1>
            <p v-if="subtitle">{{ subtitle }}</p>
          </div>

          <slot />
        </div>

        <div class="auth-layout__footer">
          <slot name="footer" />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background: var(--color-background);
}

.auth-layout__theme-toggle {
  position: fixed;
  top: var(--space-5);
  right: var(--space-5);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.auth-layout__theme-toggle:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.auth-layout__split {
  display: flex;
  min-height: 100vh;
}

/* Brand Panel (left side) */
.auth-layout__brand-panel {
  position: relative;
  display: none;
  flex-direction: column;
  justify-content: center;
  width: 45%;
  min-width: 380px;
  max-width: 560px;
  padding: var(--space-12);
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
}

.auth-layout__brand-panel-content {
  position: relative;
  z-index: 1;
}

.auth-layout__tagline {
  margin-top: var(--space-6);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: rgba(255, 255, 255, 0.85);
}

.auth-layout__brand-footer {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding-top: var(--space-12);
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.6);
}

.auth-layout__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 20px 20px;
  mask-image: radial-gradient(ellipse 70% 60% at 60% 50%, black 20%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 60% 50%, black 20%, transparent 100%);
}

/* Form Panel (right side) */
.auth-layout__form-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.auth-layout__mobile-brand {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-8);
}

.auth-layout__card {
  width: 100%;
  max-width: 400px;
  padding: var(--space-10);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
}

.auth-layout__header {
  margin-bottom: var(--space-8);
  text-align: center;
}

.auth-layout__header h1 {
  margin-bottom: var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 600;
}

.auth-layout__header p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.auth-layout__footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  margin-top: var(--space-6);
}

/* Desktop: show split panel */
@media (min-width: 768px) {
  .auth-layout__brand-panel {
    display: flex;
  }

  .auth-layout__mobile-brand {
    display: none;
  }

  .auth-layout__theme-toggle {
    color: var(--color-text-secondary);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }
}
</style>
