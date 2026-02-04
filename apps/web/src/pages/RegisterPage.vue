<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from '@/composables';
import { useAuthStore } from '@/stores/auth';
import { authService, ApiError } from '@/services';

const props = defineProps<{
  token: string;
}>();

const router = useRouter();
const authStore = useAuthStore();
const { theme, toggleTheme } = useTheme();

const email = ref('');
const name = ref('');
const password = ref('');
const confirmPassword = ref('');
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

function goHome() {
  router.push('/');
}

function goToLogin() {
  router.push('/login');
}
</script>

<template>
  <div class="register-page">
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

    <div class="register-container">
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

      <!-- Loading State -->
      <div v-if="loadingInvite" class="register-card">
        <div class="loading-state">
          <div class="loading-spinner large"></div>
          <p>Loading invite...</p>
        </div>
      </div>

      <!-- Invalid Invite -->
      <div v-else-if="inviteError" class="register-card">
        <div class="error-state">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" />
            <path
              d="M24 16V28M24 34V34.1"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <h2>Invalid Invite</h2>
          <p>{{ inviteError }}</p>
          <button class="secondary-btn" @click="goToLogin">Go to Login</button>
        </div>
      </div>

      <!-- Registration Form -->
      <div v-else class="register-card">
        <div class="register-header">
          <h1>Join {{ organizationName }}</h1>
          <p>Create your account to get started</p>
        </div>

        <form class="register-form" @submit.prevent="handleSubmit">
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
            <input id="email" v-model="email" type="email" readonly class="readonly" />
          </div>

          <div class="form-field">
            <label for="name">Name (optional)</label>
            <input
              id="name"
              v-model="name"
              type="text"
              placeholder="Your name"
              autocomplete="name"
            />
          </div>

          <div class="form-field">
            <label for="password">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="At least 8 characters"
              required
              autocomplete="new-password"
            />
          </div>

          <div class="form-field">
            <label for="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              required
              autocomplete="new-password"
            />
          </div>

          <button type="submit" class="submit-btn" :disabled="loading">
            <span v-if="loading" class="loading-spinner"></span>
            <span v-else>Create Account</span>
          </button>
        </form>

        <div class="register-footer">
          <span>Already have an account?</span>
          <button class="link-btn" @click="goToLogin">Sign in</button>
        </div>
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
.register-page {
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

.register-container {
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

.register-card {
  width: 100%;
  padding: var(--space-10);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6);
  text-align: center;
}

.loading-state p,
.error-state p {
  color: var(--color-text-secondary);
}

.error-state svg {
  color: var(--color-error);
}

.error-state h2 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 600;
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

.register-header {
  margin-bottom: var(--space-8);
  text-align: center;
}

.register-header h1 {
  margin-bottom: var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 600;
}

.register-header p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.register-form {
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

.form-field input.readonly {
  background: var(--color-surface-hover);
  cursor: not-allowed;
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
