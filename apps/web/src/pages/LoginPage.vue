<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from '@/composables';

const router = useRouter();
const { theme, toggleTheme } = useTheme();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleSubmit() {
  loading.value = true;
  error.value = '';

  try {
    // TODO: Implement actual login API call
    router.push('/app');
  } catch {
    error.value = 'Invalid credentials';
  } finally {
    loading.value = false;
  }
}

function goHome() {
  router.push('/');
}
</script>

<template>
  <div class="login-page">
    <!-- Theme Toggle -->
    <button class="theme-toggle" :title="`Theme: ${theme}`" @click="toggleTheme">
      <span v-if="theme === 'light'">☀️</span>
      <span v-else-if="theme === 'dark'">🌙</span>
      <span v-else>💻</span>
    </button>

    <div class="login-container">
      <!-- Brand -->
      <button class="brand" @click="goHome">
        <span class="brand-icon">📓</span>
        <span class="brand-name">LibreDiary</span>
      </button>

      <!-- Login Card -->
      <div class="login-card">
        <div class="login-header">
          <h1>Welcome back</h1>
          <p>Sign in to continue to your workspace</p>
        </div>

        <form class="login-form" @submit.prevent="handleSubmit">
          <div v-if="error" class="error-message">
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

          <div class="form-field">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="Enter your password"
              required
              autocomplete="current-password"
            />
          </div>

          <button type="submit" class="submit-btn" :disabled="loading">
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else>Sign In</span>
          </button>
        </form>

        <div class="login-footer">
          <a href="#" class="forgot-link">Forgot your password?</a>
        </div>
      </div>

      <!-- Back link -->
      <button class="back-link" @click="goHome">← Back to home</button>
    </div>
  </div>
</template>

<style scoped>
.login-page {
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
  font-size: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
}

.brand {
  display: flex;
  gap: var(--space-2);
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
  font-size: 1.75rem;
}

.login-card {
  width: 100%;
  padding: var(--space-10);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
}

.login-header {
  margin-bottom: var(--space-8);
  text-align: center;
}

.login-header h1 {
  margin-bottom: var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 600;
}

.login-header p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.error-message {
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

.login-footer {
  margin-top: var(--space-6);
  text-align: center;
}

.forgot-link {
  font-size: var(--text-sm);
  color: var(--color-accent);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.forgot-link:hover {
  color: var(--color-accent-hover);
}

.back-link {
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
