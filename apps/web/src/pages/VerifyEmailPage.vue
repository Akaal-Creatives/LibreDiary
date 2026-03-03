<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/services';
import AuthLayout from '@/components/AuthLayout.vue';

const props = defineProps<{
  token: string;
}>();

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref('');
const success = ref(false);

onMounted(async () => {
  try {
    await authStore.verifyEmail(props.token);
    success.value = true;
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to verify email. Please try again.';
    }
  } finally {
    loading.value = false;
  }
});

function goToApp() {
  router.push('/app');
}

function goToLogin() {
  router.push('/login');
}
</script>

<template>
  <AuthLayout
    :title="
      loading
        ? $t('auth.verifyingEmail')
        : success
          ? $t('auth.emailVerified')
          : $t('auth.verificationFailed')
    "
    :subtitle="
      loading
        ? undefined
        : success
          ? $t('auth.emailVerifiedMessage')
          : $t('auth.verificationFailedMessage')
    "
  >
    <!-- Loading State -->
    <div v-if="loading" class="state-container">
      <div class="loading-spinner large"></div>
    </div>

    <!-- Success State -->
    <div v-else-if="success" class="state-container">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="success-icon">
        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" />
        <path
          d="M16 24L22 30L32 18"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <button v-if="authStore.isAuthenticated" type="button" class="submit-btn" @click="goToApp">
        {{ $t('auth.goToApp') }}
      </button>
      <button v-else type="button" class="submit-btn" @click="goToLogin">
        {{ $t('auth.signIn') }}
      </button>
    </div>

    <!-- Error State -->
    <div v-else class="state-container">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="error-icon">
        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" />
        <path
          d="M24 16V28M24 34V34.1"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <button v-if="authStore.isAuthenticated" type="button" class="secondary-btn" @click="goToApp">
        {{ $t('auth.goToApp') }}
      </button>
      <button v-else type="button" class="secondary-btn" @click="goToLogin">
        {{ $t('auth.signIn') }}
      </button>
    </div>
  </AuthLayout>
</template>

<style scoped>
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-6);
  text-align: center;
}

.success-icon {
  color: var(--color-success);
}

.error-icon {
  color: var(--color-error);
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  margin-top: var(--space-4);
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

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner.large {
  width: 32px;
  height: 32px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
