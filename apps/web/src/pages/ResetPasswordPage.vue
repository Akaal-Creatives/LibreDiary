<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authService, ApiError } from '@/services';
import AuthLayout from '@/components/AuthLayout.vue';

const props = defineProps<{
  token: string;
}>();

const router = useRouter();

const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);
const error = ref('');
const success = ref(false);

async function handleSubmit() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters';
    return;
  }

  loading.value = true;

  try {
    await authService.resetPassword(props.token, password.value);
    success.value = true;
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to reset password. Please try again.';
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
    :title="success ? $t('auth.passwordResetSuccess') : $t('auth.resetPasswordTitle')"
    :subtitle="
      success ? $t('auth.passwordResetSuccessMessage') : $t('auth.resetPasswordDescription')
    "
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
      <button type="button" class="submit-btn" @click="goToLogin">
        {{ $t('auth.signIn') }}
      </button>
    </div>

    <!-- Form State -->
    <template v-else>
      <form class="auth-form" @submit.prevent="handleSubmit">
        <div
          v-if="error"
          id="reset-password-error"
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
          <label for="password">{{ $t('auth.newPassword') }}</label>
          <div class="input-group">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="$t('auth.newPasswordPlaceholder')"
              required
              autocomplete="new-password"
              :aria-invalid="!!error"
              :aria-describedby="error ? 'reset-password-error' : undefined"
            />
            <button
              type="button"
              class="password-toggle-btn"
              :aria-label="showPassword ? $t('auth.hidePassword') : $t('auth.showPassword')"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M2.5 10C2.5 10 5 4.5 10 4.5C15 4.5 17.5 10 17.5 10C17.5 10 15 15.5 10 15.5C5 15.5 2.5 10 2.5 10Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 3L17 17"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M8.5 4.8C9 4.6 9.5 4.5 10 4.5C15 4.5 17.5 10 17.5 10C17.5 10 16.8 11.3 15.5 12.7"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M4.5 7.3C3.2 8.7 2.5 10 2.5 10C2.5 10 5 15.5 10 15.5C10.5 15.5 11 15.4 11.5 15.2"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="form-field">
          <label for="confirm-password">{{ $t('auth.confirmPassword') }}</label>
          <div class="input-group">
            <input
              id="confirm-password"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              :placeholder="$t('auth.confirmPasswordPlaceholder')"
              required
              autocomplete="new-password"
              :aria-invalid="!!error"
              :aria-describedby="error ? 'reset-password-error' : undefined"
            />
            <button
              type="button"
              class="password-toggle-btn"
              :aria-label="showConfirmPassword ? $t('auth.hidePassword') : $t('auth.showPassword')"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <svg
                v-if="!showConfirmPassword"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M2.5 10C2.5 10 5 4.5 10 4.5C15 4.5 17.5 10 17.5 10C17.5 10 15 15.5 10 15.5C5 15.5 2.5 10 2.5 10Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 3L17 17"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M8.5 4.8C9 4.6 9.5 4.5 10 4.5C15 4.5 17.5 10 17.5 10C17.5 10 16.8 11.3 15.5 12.7"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M4.5 7.3C3.2 8.7 2.5 10 2.5 10C2.5 10 5 15.5 10 15.5C10.5 15.5 11 15.4 11.5 15.2"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          <span v-else>{{ $t('auth.resetPassword') }}</span>
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

.input-group {
  position: relative;
}

.input-group input {
  padding-right: calc(var(--space-4) + 40px);
}

.password-toggle-btn {
  position: absolute;
  top: 50%;
  right: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  opacity: 0.5;
  transition: opacity var(--transition-fast);
  transform: translateY(-50%);
}

.password-toggle-btn:hover {
  opacity: 0.7;
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
