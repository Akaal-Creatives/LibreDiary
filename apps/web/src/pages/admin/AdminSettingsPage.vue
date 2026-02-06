<script setup lang="ts">
// System settings page - placeholder for future implementation
</script>

<template>
  <div class="admin-settings">
    <div class="page-header">
      <h1 class="page-title">System Settings</h1>
      <p class="page-description">Configure system-wide preferences</p>
    </div>

    <!-- Coming Soon -->
    <div class="coming-soon">
      <div class="coming-soon-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path
            d="M32 40C36.4183 40 40 36.4183 40 32C40 27.5817 36.4183 24 32 24C27.5817 24 24 27.5817 24 32C24 36.4183 27.5817 40 32 40Z"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M52 32C52 30.5 51.5 29 51 28L56 22L52 16L44 19C43 18 42 17 41 17L40 8H24L23 17C22 17 21 18 20 19L12 16L8 22L13 28C12.5 29 12 30.5 12 32C12 33.5 12.5 35 13 36L8 42L12 48L20 45C21 46 22 47 23 47L24 56H40L41 47C42 47 43 46 44 45L52 48L56 42L51 36C51.5 35 52 33.5 52 32Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <h2 class="coming-soon-title">Coming Soon</h2>
      <p class="coming-soon-description">
        System settings configuration will be available in a future update. This will include
        options for:
      </p>
      <ul class="feature-list">
        <li>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8L6 11L13 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Site name and branding
        </li>
        <li>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8L6 11L13 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Registration and signup settings
        </li>
        <li>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8L6 11L13 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Email and SMTP configuration
        </li>
        <li>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8L6 11L13 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Storage and backup settings
        </li>
        <li>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8L6 11L13 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          AI features toggle
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.admin-settings {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.page-description {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.coming-soon-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
  margin-bottom: var(--space-6);
  color: var(--admin-accent);
  background: var(--admin-accent-subtle);
  border-radius: var(--radius-2xl);
}

.coming-soon-title {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.coming-soon-description {
  max-width: 400px;
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-6);
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 0;
  margin: 0;
  list-style: none;
  text-align: left;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.feature-list li svg {
  color: var(--color-success);
  flex-shrink: 0;
}
</style>
