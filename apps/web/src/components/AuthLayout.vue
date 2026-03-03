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
          <div class="auth-layout__brand-row">
            <AuthBrand size="large" color="inverse" />
          </div>
          <p class="auth-layout__tagline">
            Your private, open-source workspace for notes, docs, and databases.
          </p>

          <!-- Feature highlights -->
          <div class="auth-layout__features" role="list" aria-label="Key features">
            <div class="auth-layout__feature" role="listitem">
              <div class="auth-layout__feature-icon" aria-hidden="true">
                <!-- Workspace / layers icon -->
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="10"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                  <rect
                    x="9"
                    y="9"
                    width="10"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.5"
                  />
                </svg>
              </div>
              <div class="auth-layout__feature-text">
                <span class="auth-layout__feature-title">Notes, Docs &amp; Databases</span>
                <span class="auth-layout__feature-desc">Everything in one unified workspace</span>
              </div>
            </div>

            <!-- Vine connector -->
            <div class="auth-layout__vine" aria-hidden="true"></div>

            <div class="auth-layout__feature" role="listitem">
              <div class="auth-layout__feature-icon" aria-hidden="true">
                <!-- Shield / lock icon -->
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path
                    d="M11 2L3 6V11C3 15.4 6.4 19.5 11 20.5C15.6 19.5 19 15.4 19 11V6L11 2Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M11 9V13M11 15V15.01"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <div class="auth-layout__feature-text">
                <span class="auth-layout__feature-title">Self-hosted &amp; Private</span>
                <span class="auth-layout__feature-desc">Your data never leaves your server</span>
              </div>
            </div>

            <!-- Vine connector -->
            <div class="auth-layout__vine" aria-hidden="true"></div>

            <div class="auth-layout__feature" role="listitem">
              <div class="auth-layout__feature-icon" aria-hidden="true">
                <!-- Branch / open source icon -->
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="4" r="2.5" stroke="currentColor" stroke-width="1.5" />
                  <circle cx="6" cy="18" r="2.5" stroke="currentColor" stroke-width="1.5" />
                  <circle cx="16" cy="18" r="2.5" stroke="currentColor" stroke-width="1.5" />
                  <path
                    d="M11 6.5V10C11 12 9 14 6 15.5M11 10C11 12 13 14 16 15.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <div class="auth-layout__feature-text">
                <span class="auth-layout__feature-title">Open Source</span>
                <span class="auth-layout__feature-desc">Transparent and community-driven</span>
              </div>
            </div>

            <!-- Vine connector -->
            <div class="auth-layout__vine" aria-hidden="true"></div>

            <div class="auth-layout__feature" role="listitem">
              <div class="auth-layout__feature-icon" aria-hidden="true">
                <!-- Offline / signal icon -->
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path
                    d="M4.5 8.5C6.3 6.2 8.5 5 11 5C13.5 5 15.7 6.2 17.5 8.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M7 12C8.2 10.5 9.5 9.8 11 9.8C12.5 9.8 13.8 10.5 15 12"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <circle cx="11" cy="16" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <div class="auth-layout__feature-text">
                <span class="auth-layout__feature-title">Local-first</span>
                <span class="auth-layout__feature-desc">Works offline, syncs when ready</span>
              </div>
            </div>
          </div>
        </div>

        <p class="auth-layout__brand-footer">Open source. Self-hosted. Private by design.</p>

        <!-- Decorative dot pattern overlay -->
        <div class="auth-layout__pattern" aria-hidden="true"></div>
        <!-- Decorative organic ring -->
        <div class="auth-layout__ring" aria-hidden="true"></div>
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

/* =============================================
   Brand Panel (left side)
   ============================================= */
.auth-layout__brand-panel {
  position: relative;
  display: none;
  flex-direction: column;
  justify-content: center;
  width: 45%;
  min-width: 380px;
  max-width: 560px;
  padding: var(--space-10) var(--space-10);
  overflow: hidden;
  background: linear-gradient(
    160deg,
    var(--color-accent) 0%,
    var(--color-accent-hover) 60%,
    color-mix(in srgb, var(--color-accent-hover) 85%, #2d4a32) 100%
  );
}

.auth-layout__brand-panel-content {
  position: relative;
  z-index: 1;
}

.auth-layout__brand-row {
  animation: brand-fade-in 600ms ease-out both;
}

.auth-layout__tagline {
  margin-top: var(--space-4);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: rgba(255, 255, 255, 0.8);
  animation: brand-fade-in 600ms ease-out 100ms both;
}

/* =============================================
   Feature highlights
   ============================================= */
.auth-layout__features {
  margin-top: var(--space-8);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.auth-layout__feature {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  animation: feature-slide-in 500ms ease-out both;
}

.auth-layout__feature:nth-child(1) {
  animation-delay: 250ms;
}
.auth-layout__feature:nth-child(3) {
  animation-delay: 400ms;
}
.auth-layout__feature:nth-child(5) {
  animation-delay: 550ms;
}
.auth-layout__feature:nth-child(7) {
  animation-delay: 700ms;
}

.auth-layout__feature-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.auth-layout__feature-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}

.auth-layout__feature-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.01em;
}

.auth-layout__feature-desc {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.65);
  line-height: var(--leading-relaxed);
}

/* Vine connector between features */
.auth-layout__vine {
  width: 1px;
  height: 16px;
  margin-left: 20px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.08));
  animation: vine-grow 400ms ease-out both;
}

.auth-layout__vine:nth-child(2) {
  animation-delay: 350ms;
}
.auth-layout__vine:nth-child(4) {
  animation-delay: 500ms;
}
.auth-layout__vine:nth-child(6) {
  animation-delay: 650ms;
}

/* =============================================
   Footer
   ============================================= */
.auth-layout__brand-footer {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding-top: var(--space-8);
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.03em;
  animation: brand-fade-in 600ms ease-out 900ms both;
}

/* =============================================
   Decorative layers
   ============================================= */
.auth-layout__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse 80% 70% at 70% 40%, black 10%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 70% 40%, black 10%, transparent 80%);
}

.auth-layout__ring {
  position: absolute;
  bottom: -80px;
  right: -60px;
  width: 280px;
  height: 280px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  animation: ring-expand 1.2s ease-out 400ms both;
}

.auth-layout__ring::after {
  content: '';
  position: absolute;
  inset: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 50%;
}

/* =============================================
   Form Panel (right side) — unchanged
   ============================================= */
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

/* =============================================
   Responsive
   ============================================= */
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

/* Taller panels get more breathing room */
@media (min-height: 800px) and (min-width: 768px) {
  .auth-layout__brand-panel {
    padding: var(--space-12) var(--space-12);
  }

  .auth-layout__features {
    margin-top: var(--space-10);
  }

  .auth-layout__vine {
    height: 20px;
  }
}

/* =============================================
   Animations
   ============================================= */
@keyframes brand-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes feature-slide-in {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes vine-grow {
  from {
    opacity: 0;
    transform: scaleY(0);
    transform-origin: top;
  }
  to {
    opacity: 1;
    transform: scaleY(1);
    transform-origin: top;
  }
}

@keyframes ring-expand {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .auth-layout__brand-row,
  .auth-layout__tagline,
  .auth-layout__feature,
  .auth-layout__vine,
  .auth-layout__brand-footer,
  .auth-layout__ring {
    animation: none !important;
  }
}
</style>
