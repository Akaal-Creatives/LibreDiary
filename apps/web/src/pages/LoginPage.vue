<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function handleSubmit() {
  loading.value = true;
  error.value = '';

  try {
    // TODO: Implement actual login API call
    // For now, redirect to app
    router.push('/app');
  } catch {
    error.value = 'Invalid credentials';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>Welcome Back</h1>
        <p>Sign in to your LibreDiary account</p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <VaAlert v-if="error" color="danger" class="login-error">
          {{ error }}
        </VaAlert>

        <VaInput
          v-model="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          required
        />

        <VaInput
          v-model="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          required
        />

        <VaButton type="submit" color="primary" block :loading="loading" :disabled="loading">
          Sign In
        </VaButton>
      </form>

      <div class="login-footer">
        <RouterLink to="/">Back to home</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--va-background-secondary);
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: var(--va-background-primary);
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.login-header {
  margin-bottom: 32px;
  text-align: center;
}

.login-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.login-header p {
  margin: 0;
  color: var(--va-secondary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-error {
  margin-bottom: 8px;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
}

.login-footer a {
  color: var(--va-primary);
  text-decoration: none;
}

.login-footer a:hover {
  text-decoration: underline;
}
</style>
