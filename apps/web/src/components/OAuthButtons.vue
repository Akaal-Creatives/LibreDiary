<script setup lang="ts">
import { computed } from 'vue';
import type { OAuthProvider } from '@librediary/shared';

const props = withDefaults(
  defineProps<{
    mode?: 'login' | 'register' | 'link';
    loadingProvider?: OAuthProvider | null;
    disabledProviders?: OAuthProvider[];
    availableProviders?: OAuthProvider[];
  }>(),
  {
    mode: 'login',
    loadingProvider: null,
    disabledProviders: () => [],
    availableProviders: () => ['github', 'google'],
  }
);

const emit = defineEmits<{
  click: [provider: OAuthProvider];
}>();

const buttonText = computed(() => {
  switch (props.mode) {
    case 'register':
      return { github: 'Sign up with GitHub', google: 'Sign up with Google' };
    case 'link':
      return { github: 'Link GitHub', google: 'Link Google' };
    default:
      return { github: 'Continue with GitHub', google: 'Continue with Google' };
  }
});

function handleClick(provider: OAuthProvider) {
  if (props.loadingProvider || props.disabledProviders.includes(provider)) return;
  emit('click', provider);
}

function isDisabled(provider: OAuthProvider) {
  return props.loadingProvider !== null || props.disabledProviders.includes(provider);
}

function isLoading(provider: OAuthProvider) {
  return props.loadingProvider === provider;
}
</script>

<template>
  <div class="oauth-buttons">
    <!-- GitHub Button -->
    <button
      v-if="availableProviders.includes('github')"
      type="button"
      class="oauth-btn oauth-btn--github"
      :class="{
        'oauth-btn--loading': isLoading('github'),
        'oauth-btn--disabled': isDisabled('github'),
      }"
      :disabled="isDisabled('github')"
      :aria-label="buttonText.github"
      :aria-busy="isLoading('github')"
      @click="handleClick('github')"
    >
      <span class="oauth-btn__icon">
        <!-- GitHub Logo -->
        <svg
          v-if="!isLoading('github')"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
          />
        </svg>
        <!-- Loading Spinner -->
        <svg
          v-else
          class="oauth-btn__spinner"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-dasharray="50"
            stroke-dashoffset="15"
          />
        </svg>
      </span>
      <span class="oauth-btn__text">{{ buttonText.github }}</span>
      <span class="oauth-btn__connector" aria-hidden="true" />
    </button>

    <!-- Google Button -->
    <button
      v-if="availableProviders.includes('google')"
      type="button"
      class="oauth-btn oauth-btn--google"
      :class="{
        'oauth-btn--loading': isLoading('google'),
        'oauth-btn--disabled': isDisabled('google'),
      }"
      :disabled="isDisabled('google')"
      :aria-label="buttonText.google"
      :aria-busy="isLoading('google')"
      @click="handleClick('google')"
    >
      <span class="oauth-btn__icon">
        <!-- Google Logo (multi-color) -->
        <svg
          v-if="!isLoading('google')"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <!-- Loading Spinner -->
        <svg
          v-else
          class="oauth-btn__spinner"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-dasharray="50"
            stroke-dashoffset="15"
          />
        </svg>
      </span>
      <span class="oauth-btn__text">{{ buttonText.google }}</span>
      <span class="oauth-btn__connector" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.oauth-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.oauth-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.5;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  outline: none;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.1s ease;
}

.oauth-btn:focus-visible {
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.oauth-btn:active:not(:disabled) {
  transform: scale(0.98);
}

/* GitHub - Dark theme */
.oauth-btn--github {
  color: #ffffff;
  background-color: #24292f;
  border-color: #24292f;
}

.oauth-btn--github:hover:not(:disabled) {
  background-color: #32383f;
  border-color: #32383f;
}

.oauth-btn--github:active:not(:disabled) {
  background-color: #1b1f23;
}

/* Google - Light theme with border */
.oauth-btn--google {
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  border-color: var(--color-border);
}

.oauth-btn--google:hover:not(:disabled) {
  background-color: var(--color-surface-sunken);
  border-color: var(--color-border-strong, var(--color-border));
}

.oauth-btn--google:active:not(:disabled) {
  background-color: var(--color-hover);
}

/* Icon container */
.oauth-btn__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

/* Text */
.oauth-btn__text {
  flex: 1;
  text-align: center;
}

/* Connector line - subtle "linking" visual */
.oauth-btn__connector {
  position: absolute;
  top: 50%;
  left: var(--space-4);
  width: 0;
  height: 1px;
  background: currentColor;
  opacity: 0;
  transition:
    width 0.2s ease,
    opacity 0.2s ease;
  transform: translateY(-50%);
}

.oauth-btn:hover:not(:disabled) .oauth-btn__connector {
  width: 24px;
  opacity: 0.2;
}

/* Loading state */
.oauth-btn--loading {
  cursor: wait;
}

.oauth-btn--loading .oauth-btn__text {
  opacity: 0.7;
}

.oauth-btn__spinner {
  animation: oauth-spin 0.8s linear infinite;
}

@keyframes oauth-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Disabled state */
.oauth-btn--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.oauth-btn:disabled {
  pointer-events: none;
}

/* Divider for separating OAuth from other auth methods */
.oauth-divider {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: var(--space-4) 0;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.oauth-divider::before,
.oauth-divider::after {
  flex: 1;
  height: 1px;
  content: '';
  background: var(--color-border);
}
</style>
