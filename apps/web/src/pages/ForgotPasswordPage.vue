<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from '@/composables';
import { authService, ApiError } from '@/services';

const router = useRouter();
const { theme, toggleTheme } = useTheme();

const email = ref('');
const loading = ref(false);
const error = ref('');
const success = ref(false);

async function handleSubmit() {
  loading.value = true;
  error.value = '';

  try {
    await authService.forgotPassword(email.value);
    success.value = true;
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'An unexpected error occurred';
    }
  } finally {
    loading.value = false;
  }
}

function goHome() {
  router.push('/');
}

function goToLogin() {
  router.push('/login');
}
</script>

<template>
  <div class="forgot-page">
    <!-- Theme Toggle -->
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
        <path d="M6.5 18H13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M10 15V18" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>

    <div class="forgot-container">
      <!-- Brand -->
      <button class="brand" @click="goHome">
        <svg class="brand-icon" width="32" height="32" viewBox="0 0 28 28" fill="none">
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
      </button>

      <!-- Forgot Password Card -->
      <div class="forgot-card">
        <!-- Success State -->
        <div v-if="success" class="success-state">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" />
            <path
              d="M16 24L22 30L32 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <h2>Check your email</h2>
          <p>
            We've sent a password reset link to <strong>{{ email }}</strong>
          </p>
          <p class="muted">If you don't see it, check your spam folder.</p>
          <button class="secondary-btn" @click="goToLogin">Back to Login</button>
        </div>

        <!-- Form State -->
        <template v-else>
          <div class="forgot-header">
            <h1>Forgot password?</h1>
            <p>Enter your email and we'll send you a reset link</p>
          </div>

          <form class="forgot-form" @submit.prevent="handleSubmit">
            <div v-if="error" class="error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M8 5V8.5M8 11V11.01"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              {{ error }}
            </div>

            <div class="form-field">
              <label for="email">Email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                required
                autocomplete="email"
              />
            </div>

            <button type="submit" class="submit-btn" :disabled="loading">
              <span v-if="loading" class="loading-spinner"></span>
              <span v-else>Send Reset Link</span>
            </button>
          </form>

          <div class="forgot-footer">
            <button class="link-btn" @click="goToLogin">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              Back to Login
            </button>
          </div>
        </template>
      </div>

      <!-- Back link -->
      <button class="back-link" @click="goHome">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Back to home
      </button>
    </div>
  </div>
</template>

<style scoped>
.forgot-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-6);
  background: var(--color-background);
}

.theme-toggle {
  position: fixed;
  top: var(--space-5);
  right: var(--space-5);
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

.theme-toggle:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.forgot-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

.brand {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-8);
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.brand:hover {
  opacity: 0.8;
}

.brand-icon {
  color: var(--color-accent);
}

.forgot-card {
  width: 100%;
  padding: var(--space-10);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
}

.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}

.success-state svg {
  color: var(--color-success);
}

.success-state h2 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 600;
}

.success-state p {
  margin: 0;
  color: var(--color-text-secondary);
}

.success-state .muted {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.secondary-btn {
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-6);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.secondary-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-strong);
}

.forgot-header {
  margin-bottom: var(--space-8);
  text-align: center;
}

.forgot-header h1 {
  margin-bottom: var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 600;
}

.forgot-header p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.forgot-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.error-message {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-radius: var(--radius-md);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-field label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-field input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-lg);
  outline: none;
  transition: all var(--transition-fast);
}

.form-field input::placeholder {
  color: var(--color-text-tertiary);
}

.form-field input:focus {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  margin-top: var(--space-2);
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

.submit-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-text-inverse);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.forgot-footer {
  margin-top: var(--space-6);
  text-align: center;
}

.link-btn {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  padding: 0;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.link-btn:hover {
  color: var(--color-accent-hover);
}

.back-link {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-top: var(--space-6);
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.back-link:hover {
  color: var(--color-text-primary);
}
</style>
