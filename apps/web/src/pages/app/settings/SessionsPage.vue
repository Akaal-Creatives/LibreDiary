<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { authService } from '@/services/auth.service';
import type { SessionInfo } from '@/services/auth.service';
import { useToast } from '@/composables/useToast';

const toast = useToast();

const sessions = ref<SessionInfo[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const revokingId = ref<string | null>(null);

onMounted(() => {
  loadSessions();
});

async function loadSessions() {
  loading.value = true;
  error.value = null;
  try {
    const response = await authService.getSessions();
    sessions.value = response.sessions;
  } catch (e) {
    console.error('Failed to load sessions:', e);
    error.value = 'Failed to load sessions';
  } finally {
    loading.value = false;
  }
}

async function revokeSession(sessionId: string) {
  revokingId.value = sessionId;
  try {
    await authService.revokeSession(sessionId);
    sessions.value = sessions.value.filter((s) => s.id !== sessionId);
    toast.success('Session revoked successfully');
  } catch (e) {
    console.error('Failed to revoke session:', e);
    toast.error('Failed to revoke session');
  } finally {
    revokingId.value = null;
  }
}

function parseUserAgent(userAgent: string | null): { device: string; browser: string } {
  if (!userAgent) {
    return { device: 'Unknown device', browser: 'Unknown browser' };
  }

  let device = 'Unknown device';
  let browser = 'Unknown browser';

  // Parse device
  if (userAgent.includes('iPhone')) {
    device = 'iPhone';
  } else if (userAgent.includes('iPad')) {
    device = 'iPad';
  } else if (userAgent.includes('Android')) {
    device = 'Android';
  } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
    device = 'Mac';
  } else if (userAgent.includes('Windows')) {
    device = 'Windows';
  } else if (userAgent.includes('Linux')) {
    device = 'Linux';
  }

  // Parse browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  }

  return { device, browser };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function getDeviceIcon(userAgent: string | null): string {
  if (!userAgent) return 'device';

  if (userAgent.includes('iPhone') || userAgent.includes('Android')) {
    return 'phone';
  } else if (userAgent.includes('iPad')) {
    return 'tablet';
  }
  return 'desktop';
}
</script>

<template>
  <div class="sessions-page">
    <header class="page-header">
      <h1 class="page-title">Sessions</h1>
      <p class="page-description">
        View and manage your active sessions. You can sign out of other devices if needed.
      </p>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading sessions...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg class="error-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" />
        <path d="M24 14V26" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <circle cx="24" cy="32" r="2" fill="currentColor" />
      </svg>
      <p class="error-text">{{ error }}</p>
      <button class="retry-btn" @click="loadSessions">Try again</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="sessions.length === 0" class="empty-state">
      <svg class="empty-icon" width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="10" width="32" height="24" rx="2" stroke="currentColor" stroke-width="2" />
        <path d="M8 18H40" stroke="currentColor" stroke-width="2" />
        <path d="M20 38H28" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path d="M24 34V38" stroke="currentColor" stroke-width="2" />
      </svg>
      <p class="empty-text">No active sessions</p>
    </div>

    <!-- Sessions List -->
    <div v-else class="sessions-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ current: session.isCurrent }"
      >
        <div class="session-icon">
          <svg
            v-if="getDeviceIcon(session.userAgent) === 'phone'"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="6"
              y="3"
              width="12"
              height="18"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path d="M10 18H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <svg
            v-else-if="getDeviceIcon(session.userAgent) === 'tablet'"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="4"
              y="3"
              width="16"
              height="18"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path d="M10 18H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="4"
              width="18"
              height="12"
              rx="1"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path d="M8 20H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M12 16V20" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>

        <div class="session-info">
          <div class="session-header">
            <span class="session-device">
              {{ parseUserAgent(session.userAgent).device }}
              <template v-if="parseUserAgent(session.userAgent).browser !== 'Unknown browser'">
                &middot; {{ parseUserAgent(session.userAgent).browser }}
              </template>
            </span>
            <span v-if="session.isCurrent" class="current-badge">Current session</span>
          </div>
          <div class="session-details">
            <span class="detail-item">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1" />
                <path
                  d="M6 3V6L8 7"
                  stroke="currentColor"
                  stroke-width="1"
                  stroke-linecap="round"
                />
              </svg>
              {{ formatRelativeTime(session.lastActiveAt) }}
            </span>
            <span class="detail-item">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="5" r="2" stroke="currentColor" stroke-width="1" />
                <path
                  d="M2 10C2 8.34315 3.79086 7 6 7C8.20914 7 10 8.34315 10 10"
                  stroke="currentColor"
                  stroke-width="1"
                  stroke-linecap="round"
                />
              </svg>
              {{ session.ipAddress ?? 'Unknown' }}
            </span>
          </div>
        </div>

        <button
          v-if="!session.isCurrent"
          class="revoke-btn"
          :disabled="revokingId === session.id"
          @click="revokeSession(session.id)"
        >
          {{ revokingId === session.id ? 'Revoking...' : 'Sign out' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sessions-page {
  max-width: 800px;
  padding: var(--space-6);
}

.page-header {
  margin-bottom: var(--space-8);
}

.page-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-12);
  color: var(--color-text-tertiary);
}

.spinner {
  width: 24px;
  height: 24px;
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

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-12);
  text-align: center;
}

.error-icon {
  color: var(--color-error);
  opacity: 0.5;
}

.error-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.retry-btn {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: white;
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.retry-btn:hover {
  background: var(--color-accent-hover);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-12);
  color: var(--color-text-tertiary);
}

.empty-icon {
  opacity: 0.5;
}

.empty-text {
  margin: 0;
  font-size: var(--text-sm);
}

/* Sessions List */
.sessions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.session-item {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.session-item:hover {
  border-color: var(--color-border-strong);
}

.session-item.current {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
}

.session-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
}

.session-item.current .session-icon {
  color: var(--color-accent);
  background: white;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-header {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-1);
}

.session-device {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.current-badge {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: white;
  border-radius: var(--radius-sm);
}

.session-details {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.detail-item {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.revoke-btn {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-error);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.revoke-btn:hover:not(:disabled) {
  color: white;
  background: var(--color-error);
}

.revoke-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
