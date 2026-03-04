<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { ApiError, oauthService } from '@/services';
import OAuthButtons from '@/components/OAuthButtons.vue';
import AuthDivider from '@/components/AuthDivider.vue';
import AuthLayout from '@/components/AuthLayout.vue';
import type { OAuthProvider } from '@librediary/shared';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');
const oauthLoading = ref<OAuthProvider | null>(null);
const configuredProviders = ref<OAuthProvider[]>([]);
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

// Check for OAuth error from callback
onMounted(async () => {
  const oauthError = route.query.error as string;
  if (oauthError) {
    error.value = oauthError;
    // Clean up URL
    router.replace({ query: {} });
  }

  // Fetch configured OAuth providers
  try {
    configuredProviders.value = await oauthService.getConfiguredProviders();
  } catch {
    // OAuth providers not available - continue with email/password only
    configuredProviders.value = [];
  }
});

async function handleSubmit() {
  loading.value = true;
  error.value = '';

  try {
    await authStore.login(email.value, password.value);

    // Redirect to intended destination or app home
    const redirect = route.query.redirect as string;
    const safeRedirect =
      redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/app';
    router.push(safeRedirect);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === 'LOGIN_ERROR') {
        error.value = t('auth.invalidCredentials');
      } else if (err.code === 'VALIDATION_ERROR' && err.details) {
        // Show specific validation errors
        const fieldErrors = err.details as Record<string, string[]>;
        const messages = Object.entries(fieldErrors)
          .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
          .join('; ');
        error.value = messages || err.message;
      } else {
        error.value = err.message;
      }
    } else {
      error.value = 'An unexpected error occurred';
    }
  } finally {
    loading.value = false;
  }
}

function goToForgotPassword() {
  router.push('/forgot-password');
}

async function handleOAuthClick(provider: OAuthProvider) {
  oauthLoading.value = provider;
  error.value = '';

  try {
    await oauthService.initiateOAuth(provider);
  } catch (err) {
    oauthLoading.value = null;
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to initiate OAuth login';
    }
  }
}
</script>

<template>
  <AuthLayout :title="$t('auth.welcomeBack')" :subtitle="$t('auth.signInToContinue')">
    <!-- OAuth Buttons -->
    <OAuthButtons
      v-if="configuredProviders.length > 0"
      mode="login"
      :available-providers="configuredProviders"
      :loading-provider="oauthLoading"
      @click="handleOAuthClick"
    />

    <AuthDivider v-if="configuredProviders.length > 0" :text="$t('auth.continueWithEmail')" />

    <div v-if="isDemoMode" class="demo-banner" role="status" aria-live="polite">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M8 5V8.5M8 11V11.01"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      <span>
        This is a demo instance. Data resets every 24 hours. Use
        <strong>demo@librediary.com</strong> / <strong>password</strong> to log in.
      </span>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <div v-if="error" class="error-message" role="alert" aria-live="polite">
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
        />
      </div>

      <div class="form-field">
        <label for="password">{{ $t('auth.password') }}</label>
        <div class="input-group">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            :placeholder="$t('auth.passwordPlaceholder')"
            required
            autocomplete="current-password"
            :aria-invalid="!!error"
          />
          <button
            type="button"
            class="password-toggle-btn"
            :aria-label="showPassword ? $t('auth.hidePassword') : $t('auth.showPassword')"
            @click="showPassword = !showPassword"
          >
            <!-- Eye open icon (password is hidden, click to show) -->
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
            <!-- Eye closed icon (password is visible, click to hide) -->
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
        <span v-else>{{ $t('auth.signIn') }}</span>
      </button>
    </form>

    <div class="auth-card-footer">
      <button type="button" class="forgot-link" @click="goToForgotPassword">
        {{ $t('auth.forgotPassword') }}
      </button>
    </div>
  </AuthLayout>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.demo-banner {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-warning);
  background: var(--color-warning-subtle);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
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

.forgot-link {
  padding: 0;
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-accent);
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.forgot-link:hover {
  color: var(--color-accent-hover);
}
</style>
