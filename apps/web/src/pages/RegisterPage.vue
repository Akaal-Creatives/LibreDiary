<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { authService, ApiError } from '@/services';
import AuthLayout from '@/components/AuthLayout.vue';

const props = defineProps<{
  token: string;
}>();

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const name = ref('');
const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const organizationName = ref('');
const loading = ref(false);
const loadingInvite = ref(true);
const error = ref('');
const inviteError = ref('');

onMounted(async () => {
  try {
    const invite = await authService.getInvite(props.token);
    email.value = invite.email;
    organizationName.value = invite.organization.name;
  } catch (err) {
    if (err instanceof ApiError) {
      inviteError.value = err.message;
    } else {
      inviteError.value = 'Invalid or expired invite link';
    }
  } finally {
    loadingInvite.value = false;
  }
});

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
    await authStore.register(email.value, password.value, props.token, name.value || undefined);
    router.push('/app');
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Registration failed. Please try again.';
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
    :title="
      loadingInvite
        ? ''
        : inviteError
          ? $t('auth.invalidInvite')
          : $t('auth.joinOrganisation', { organisationName: organizationName })
    "
    :subtitle="
      loadingInvite ? '' : inviteError ? inviteError : $t('auth.createAccountToGetStarted')
    "
  >
    <!-- Loading State -->
    <div v-if="loadingInvite" class="state-container">
      <div class="loading-spinner large"></div>
      <p>{{ $t('auth.loadingInvite') }}</p>
    </div>

    <!-- Invalid Invite -->
    <div v-else-if="inviteError" class="state-container">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="error-icon">
        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" />
        <path
          d="M24 16V28M24 34V34.1"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <button type="button" class="secondary-btn" @click="goToLogin">
        {{ $t('auth.signIn') }}
      </button>
    </div>

    <!-- Registration Form -->
    <template v-else>
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
          <input id="email" v-model="email" type="email" readonly class="readonly" />
        </div>

        <div class="form-field">
          <label for="name">{{ $t('auth.nameOptional') }}</label>
          <input
            id="name"
            v-model="name"
            type="text"
            :placeholder="$t('auth.namePlaceholder')"
            autocomplete="name"
          />
        </div>

        <div class="form-field">
          <label for="password">{{ $t('auth.password') }}</label>
          <div class="input-group">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="$t('auth.newPasswordPlaceholder')"
              required
              autocomplete="new-password"
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
          <span v-else>{{ $t('auth.createAccount') }}</span>
        </button>
      </form>

      <div class="register-footer">
        <span>{{ $t('auth.alreadyHaveAccount') }}</span>
        <button type="button" class="link-btn" @click="goToLogin">{{ $t('auth.signIn') }}</button>
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

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6);
  text-align: center;
}

.state-container p {
  color: var(--color-text-secondary);
}

.error-icon {
  color: var(--color-error);
}

.secondary-btn {
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

.form-field input.readonly {
  background: var(--color-surface-hover);
  cursor: not-allowed;
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

.loading-spinner.large {
  width: 32px;
  height: 32px;
  border-color: var(--color-accent);
  border-top-color: transparent;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.register-footer {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
  margin-top: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.link-btn {
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
