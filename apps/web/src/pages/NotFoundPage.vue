<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goHome() {
  router.push('/');
}
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <VaButton color="primary" @click="goHome"> Go Home </VaButton>
    </div>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--va-background-secondary);
}

.not-found-content {
  text-align: center;
}

.not-found-content h1 {
  margin: 0;
  font-size: 120px;
  font-weight: 700;
  color: var(--va-primary);
  line-height: 1;
}

.not-found-content h2 {
  margin: 16px 0;
  font-size: 32px;
}

.not-found-content p {
  margin: 0 0 32px;
  color: var(--va-secondary);
}
</style>
