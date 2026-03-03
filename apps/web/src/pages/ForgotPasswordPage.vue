<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService, ApiError } from '@/services';
import AuthLayout from '@/components/AuthLayout.vue';

const router = useRouter();

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

function goToLogin() {
  router.push('/login');
}
</script>

<template>
  <AuthLayout
    :title="success ? $t('auth.checkYourEmail') : $t('auth.forgotPasswordTitle')"
    :subtitle="success ? undefined : $t('auth.forgotPasswordDescription')"
  >
    <!-- Success State -->
    <div v-if="success" class="success-state" role="alert" aria-live="polite">
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
      <p>
        {{ $t('auth.resetLinkSent') }} <strong>{{ email }}</strong>
      </p>
      <p class="muted">{{ $t('auth.checkSpamFolder') }}</p>
      <button type="button" class="secondary-btn" @click="goToLogin">
        {{ $t('auth.backToLogin') }}
      </button>
    </div>

    <!-- Form State -->
    <template v-else>
      <form class="auth-form" @submit.prevent="handleSubmit">
        <div
          v-if="error"
          id="forgot-password-error"
          class="error-message"
          role="alert"
          aria-live="polite"
        >
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
          <label for="email">{{ $t('auth.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            :placeholder="$t('auth.emailPlaceholder')"
            required
            autocomplete="email"
            :aria-invalid="!!error"
            :aria-describedby="error ? 'forgot-password-error' : undefined"
          />
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          <span v-else>{{ $t('auth.sendResetLink') }}</span>
        </button>
      </form>

      <div class="auth-card-footer">
        <button type="button" class="link-btn" @click="goToLogin">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ $t('auth.backToLogin') }}
        </button>
      </div>
    </template>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
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

.auth-card-footer {
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
</style>
