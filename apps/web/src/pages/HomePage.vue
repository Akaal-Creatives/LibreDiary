<script setup lang="ts">
import { useRouter } from 'vue-router';
import { DEVELOPER_INFO } from '@librediary/shared';

const router = useRouter();

function goToApp() {
  router.push('/app');
}

function goToLogin() {
  router.push('/login');
}
</script>

<template>
  <div class="home-page">
    <header class="hero">
      <div class="hero-content">
        <h1 class="hero-title">LibreDiary</h1>
        <p class="hero-subtitle">
          Open-source, self-hosted workspace for your notes, docs, and databases.
        </p>
        <div class="hero-actions">
          <VaButton color="primary" size="large" @click="goToLogin"> Get Started </VaButton>
          <VaButton preset="secondary" size="large" @click="goToApp"> Go to App </VaButton>
        </div>
      </div>
    </header>

    <section class="features">
      <div class="feature">
        <div class="feature-icon">📝</div>
        <h3>Block-Based Editor</h3>
        <p>Powerful editor with drag-and-drop blocks, markdown shortcuts, and rich formatting.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🔄</div>
        <h3>Real-Time Collaboration</h3>
        <p>Work together with your team in real-time with presence indicators and live cursors.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🏢</div>
        <h3>Multi-Tenant</h3>
        <p>Organize your workspaces with teams, roles, and granular permissions.</p>
      </div>
      <div class="feature">
        <div class="feature-icon">🔒</div>
        <h3>Self-Hosted</h3>
        <p>Keep your data under your control. Deploy on your own infrastructure.</p>
      </div>
    </section>

    <footer class="footer">
      <p>
        Developed by
        <a :href="DEVELOPER_INFO.website" target="_blank" rel="noopener">
          {{ DEVELOPER_INFO.name }}
        </a>
      </p>
      <p class="license">Licensed under AGPLv3</p>
    </footer>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 24px 80px;
  color: white;
  text-align: center;
}

.hero-content {
  max-width: 600px;
}

.hero-title {
  margin: 0 0 16px;
  font-size: 56px;
  font-weight: 700;
}

.hero-subtitle {
  margin: 0 0 32px;
  font-size: 20px;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 80px 24px;
}

.feature {
  padding: 32px;
  text-align: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  margin-bottom: 16px;
  font-size: 48px;
}

.feature h3 {
  margin: 0 0 8px;
  font-size: 20px;
}

.feature p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.footer {
  padding: 40px 24px;
  color: white;
  text-align: center;
}

.footer a {
  color: white;
  font-weight: 600;
}

.license {
  margin-top: 8px;
  font-size: 14px;
  opacity: 0.7;
}
</style>
