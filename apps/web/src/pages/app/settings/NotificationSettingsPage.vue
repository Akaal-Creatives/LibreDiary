<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { notificationsService } from '@/services/notifications.service';
import type { NotificationPreferences } from '@/services/notifications.service';

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const preferences = ref<NotificationPreferences>({
  emailMention: true,
  emailCommentReply: true,
  emailPageShared: true,
  emailCommentResolved: true,
  emailInvitation: true,
});

async function loadPreferences() {
  loading.value = true;
  error.value = null;
  try {
    preferences.value = await notificationsService.getPreferences();
  } catch {
    error.value = 'Failed to load notification preferences';
  } finally {
    loading.value = false;
  }
}

async function handleToggle(key: keyof NotificationPreferences) {
  const previousValue = preferences.value[key];
  preferences.value[key] = !previousValue;

  saving.value = true;
  error.value = null;
  success.value = null;

  try {
    preferences.value = await notificationsService.updatePreferences({
      [key]: !previousValue,
    });
    success.value = 'Preferences updated';
    setTimeout(() => {
      success.value = null;
    }, 3000);
  } catch {
    // Revert on failure
    preferences.value[key] = previousValue;
    error.value = 'Failed to update preferences';
  } finally {
    saving.value = false;
  }
}

onMounted(loadPreferences);
</script>

<template>
  <div class="settings-page">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">Notifications</h1>
        <p class="page-description">
          Choose which events trigger email notifications. In-app notifications are always enabled.
        </p>
      </div>
    </header>

    <!-- Notifications -->
    <Transition name="slide-fade">
      <div v-if="error" class="notification notification--error">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
          <path d="M8 4.5V8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="8" cy="11" r="0.75" fill="currentColor" />
        </svg>
        <span>{{ error }}</span>
        <button class="notification-close" @click="error = null">&times;</button>
      </div>
    </Transition>

    <Transition name="slide-fade">
      <div v-if="success" class="notification notification--success">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M5.5 8L7.5 10L10.5 6"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ success }}</span>
        <button class="notification-close" @click="success = null">&times;</button>
      </div>
    </Transition>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading preferences...</span>
    </div>

    <!-- Preferences Form -->
    <div v-else>
      <!-- Email Notifications Section -->
      <section class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="2"
                y="4"
                width="14"
                height="10"
                rx="2"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M2 6L9 10.5L16 6"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="section-header-text">
            <h2 class="section-title">Email notifications</h2>
            <p class="section-description">Receive email alerts for activity that involves you</p>
          </div>
        </div>

        <div class="section-content">
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Mentions</div>
              <p class="toggle-description">When someone mentions you in a comment with @</p>
            </div>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="preferences.emailMention"
                :disabled="saving"
                @change="handleToggle('emailMention')"
              />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>

          <div class="toggle-divider"></div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Comment replies</div>
              <p class="toggle-description">When someone replies to one of your comments</p>
            </div>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="preferences.emailCommentReply"
                :disabled="saving"
                @change="handleToggle('emailCommentReply')"
              />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>

          <div class="toggle-divider"></div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Page sharing</div>
              <p class="toggle-description">When someone shares a page with you</p>
            </div>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="preferences.emailPageShared"
                :disabled="saving"
                @change="handleToggle('emailPageShared')"
              />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>

          <div class="toggle-divider"></div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Comment resolved</div>
              <p class="toggle-description">When someone resolves a comment you authored</p>
            </div>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="preferences.emailCommentResolved"
                :disabled="saving"
                @change="handleToggle('emailCommentResolved')"
              />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>

          <div class="toggle-divider"></div>

          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Invitations</div>
              <p class="toggle-description">When you are invited to join an organisation</p>
            </div>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="preferences.emailInvitation"
                :disabled="saving"
                @change="handleToggle('emailInvitation')"
              />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 680px;
  padding: var(--space-6);
  margin: 0 auto;
}

/* Page Header */
.page-header {
  padding-bottom: var(--space-6);
  margin-bottom: var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.page-title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.page-description {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-secondary);
}

/* Notifications */
.notification {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
}

.notification--error {
  color: var(--color-error);
  background: linear-gradient(135deg, rgba(196, 92, 92, 0.08), rgba(196, 92, 92, 0.04));
  border: 1px solid rgba(196, 92, 92, 0.2);
}

.notification--success {
  color: var(--color-success);
  background: linear-gradient(135deg, rgba(90, 154, 107, 0.08), rgba(90, 154, 107, 0.04));
  border: 1px solid rgba(90, 154, 107, 0.2);
}

.notification-close {
  padding: 0 var(--space-1);
  margin-left: auto;
  font-size: var(--text-lg);
  line-height: 1;
  color: inherit;
  cursor: pointer;
  background: none;
  border: none;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.notification-close:hover {
  opacity: 1;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Settings Section */
.settings-section {
  margin-bottom: var(--space-6);
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.section-header {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-5) var(--space-6);
  background: linear-gradient(135deg, rgba(107, 143, 113, 0.03), transparent);
  border-bottom: 1px solid var(--color-border-subtle);
}

.section-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-md);
}

.section-header-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.section-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.section-content {
  padding: var(--space-5) var(--space-6);
}

/* Toggle Row */
.toggle-row {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.toggle-info {
  flex: 1;
}

.toggle-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.toggle-description {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-text-tertiary);
}

.toggle-divider {
  height: 1px;
  margin: var(--space-4) 0;
  background: var(--color-border-subtle);
}

/* Toggle Switch */
.toggle {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.toggle-track {
  display: flex;
  align-items: center;
  width: 44px;
  height: 24px;
  padding: 2px;
  background: var(--color-border-strong);
  border-radius: var(--radius-full);
  transition: background var(--transition-fast);
}

.toggle input:checked + .toggle-track {
  background: var(--color-accent);
}

.toggle input:disabled + .toggle-track {
  cursor: not-allowed;
  opacity: 0.5;
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform var(--transition-fast);
}

.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}

/* Transitions */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
