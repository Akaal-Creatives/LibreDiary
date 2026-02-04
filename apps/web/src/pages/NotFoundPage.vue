<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useTheme } from '@/composables';

const router = useRouter();
useTheme();

function goHome() {
  router.push('/');
}
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <!-- Illustration -->
      <div class="illustration">
        <div class="illustration-circle">
          <svg class="illustration-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="20" cy="20" r="12" stroke="currentColor" stroke-width="2" />
            <path d="M29 29L40 40" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path
              d="M14 20H26M20 14V26"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              opacity="0.5"
            />
          </svg>
        </div>
        <div class="illustration-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>

      <!-- Content -->
      <div class="not-found-content">
        <h1 class="error-code">404</h1>
        <h2 class="error-title">Page not found</h2>
        <p class="error-description">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div class="error-actions">
          <button class="btn-primary" @click="goHome">
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
            <span>Go Home</span>
          </button>
          <button class="btn-secondary" @click="router.back()">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M11.25 14.25L6 9L11.25 3.75"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-6);
  background: var(--color-background);
}

.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
  text-align: center;
}

/* Illustration */
.illustration {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-8);
}

.illustration-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  margin-bottom: var(--space-4);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-full);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.illustration-icon {
  color: var(--color-accent);
}

.illustration-dots {
  display: flex;
  gap: var(--space-2);
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}
.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Content */
.not-found-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error-code {
  margin: 0 0 var(--space-2);
  font-size: clamp(4rem, 12vw, 6rem);
  font-weight: 700;
  line-height: 1;
  color: var(--color-accent);
  letter-spacing: -0.04em;
}

.error-title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.error-description {
  max-width: 320px;
  margin: 0 0 var(--space-8);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

/* Actions */
.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  justify-content: center;
}

.btn-primary {
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

.btn-primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-5);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.btn-secondary:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}
</style>
