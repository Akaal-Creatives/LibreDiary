<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { notificationsService } from '@/services';
import type { Notification, NotificationType } from '@librediary/shared';
import { useRouter } from 'vue-router';

// Props
const props = defineProps<{
  pollInterval?: number;
}>();

const router = useRouter();

// State
const isOpen = ref(false);
const loading = ref(true);
const notifications = ref<Notification[]>([]);
const unreadCount = ref(0);
const error = ref<string | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const bellRef = ref<HTMLElement | null>(null);

// Poll timer
let pollTimer: ReturnType<typeof setInterval> | null = null;

// Computed
const hasUnread = computed(() => unreadCount.value > 0);
const displayCount = computed(() => (unreadCount.value > 99 ? '99+' : String(unreadCount.value)));

// Notification type icons and colors
const notificationMeta: Record<NotificationType, { icon: string; color: string; bgColor: string }> =
  {
    MENTION: {
      icon: '@',
      color: 'var(--color-accent)',
      bgColor: 'rgba(124, 154, 140, 0.15)',
    },
    COMMENT_REPLY: {
      icon: '💬',
      color: 'var(--color-accent)',
      bgColor: 'rgba(124, 154, 140, 0.15)',
    },
    PAGE_SHARED: {
      icon: '📄',
      color: '#6b7fd4',
      bgColor: 'rgba(107, 127, 212, 0.15)',
    },
    COMMENT_RESOLVED: {
      icon: '✓',
      color: 'var(--color-success, #22c55e)',
      bgColor: 'rgba(34, 197, 94, 0.15)',
    },
    INVITATION: {
      icon: '✉',
      color: '#e879a9',
      bgColor: 'rgba(232, 121, 169, 0.15)',
    },
  };

// Methods
async function fetchNotifications() {
  try {
    const [notifs, count] = await Promise.all([
      notificationsService.getNotifications({ limit: 20 }),
      notificationsService.getUnreadCount(),
    ]);
    notifications.value = notifs;
    unreadCount.value = count;
    error.value = null;
  } catch (e) {
    console.error('Failed to fetch notifications:', e);
    error.value = 'Failed to load notifications';
  } finally {
    loading.value = false;
  }
}

async function fetchUnreadCount() {
  try {
    unreadCount.value = await notificationsService.getUnreadCount();
  } catch (e) {
    console.error('Failed to fetch unread count:', e);
  }
}

async function markAsRead(notification: Notification) {
  if (notification.isRead) return;

  try {
    const updated = await notificationsService.markAsRead(notification.id);
    const idx = notifications.value.findIndex((n) => n.id === notification.id);
    if (idx !== -1) {
      notifications.value[idx] = updated;
    }
    unreadCount.value = Math.max(0, unreadCount.value - 1);
  } catch (e) {
    console.error('Failed to mark as read:', e);
  }
}

async function markAllAsRead() {
  try {
    await notificationsService.markAllAsRead();
    notifications.value = notifications.value.map(
      (n): Notification => ({
        ...n,
        isRead: true,
        readAt: new Date().toISOString(),
      })
    );
    unreadCount.value = 0;
  } catch (e) {
    console.error('Failed to mark all as read:', e);
  }
}

async function deleteNotification(notificationId: string, event: Event) {
  event.stopPropagation();

  try {
    await notificationsService.deleteNotification(notificationId);
    const idx = notifications.value.findIndex((n) => n.id === notificationId);
    if (idx !== -1) {
      const notification = notifications.value[idx];
      const wasUnread = notification && !notification.isRead;
      notifications.value.splice(idx, 1);
      if (wasUnread) {
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    }
  } catch (e) {
    console.error('Failed to delete notification:', e);
  }
}

function handleNotificationClick(notification: Notification) {
  markAsRead(notification);

  // Navigate based on notification type
  const data = notification.data as Record<string, unknown> | null;
  if (data?.pageId) {
    isOpen.value = false;
    router.push(`/app/page/${data.pageId}`);
  } else if (data?.organizationId) {
    isOpen.value = false;
    router.push('/app/settings');
  }
}

function togglePanel() {
  isOpen.value = !isOpen.value;
  if (isOpen.value && notifications.value.length === 0) {
    fetchNotifications();
  }
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (
    isOpen.value &&
    panelRef.value &&
    bellRef.value &&
    !panelRef.value.contains(target) &&
    !bellRef.value.contains(target)
  ) {
    isOpen.value = false;
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getMeta(type: NotificationType) {
  return notificationMeta[type] || notificationMeta.MENTION;
}

// Lifecycle
onMounted(() => {
  fetchUnreadCount();
  document.addEventListener('click', handleClickOutside);

  // Start polling
  const interval = props.pollInterval || 60000; // Default 1 minute
  pollTimer = setInterval(fetchUnreadCount, interval);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (pollTimer) {
    clearInterval(pollTimer);
  }
});

// Refetch when panel opens
watch(isOpen, (open) => {
  if (open) {
    loading.value = true;
    fetchNotifications();
  }
});
</script>

<template>
  <div class="notification-bell-container">
    <!-- Bell Button -->
    <button
      ref="bellRef"
      class="bell-button"
      :class="{ active: isOpen, 'has-unread': hasUnread }"
      aria-label="Notifications"
      :aria-expanded="isOpen"
      @click="togglePanel"
    >
      <svg class="bell-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2.5C7.23858 2.5 5 4.73858 5 7.5V10.5L3.5 13.5V14.5H16.5V13.5L15 10.5V7.5C15 4.73858 12.7614 2.5 10 2.5Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M8 14.5V15.5C8 16.6046 8.89543 17.5 10 17.5C11.1046 17.5 12 16.6046 12 15.5V14.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>

      <!-- Unread Badge -->
      <Transition name="badge">
        <span v-if="hasUnread" class="unread-badge">
          <span class="badge-count">{{ displayCount }}</span>
          <span class="badge-ping"></span>
        </span>
      </Transition>
    </button>

    <!-- Dropdown Panel -->
    <Transition name="panel">
      <div v-if="isOpen" ref="panelRef" class="notification-panel">
        <!-- Panel Header -->
        <header class="panel-header">
          <div class="header-left">
            <h3 class="panel-title">Notifications</h3>
            <span v-if="hasUnread" class="unread-indicator">{{ unreadCount }} new</span>
          </div>
          <div class="header-actions">
            <button
              v-if="hasUnread"
              class="mark-all-btn"
              title="Mark all as read"
              @click="markAllAsRead"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13.5 4.5L6 12L2.5 8.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Mark all read</span>
            </button>
            <button
              class="settings-btn"
              title="Notification settings"
              @click="
                isOpen = false;
                router.push({ name: 'notification-settings' });
              "
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <!-- Panel Body -->
        <div class="panel-body">
          <!-- Loading State -->
          <div v-if="loading" class="loading-state">
            <div
              v-for="i in 3"
              :key="i"
              class="skeleton-item"
              :style="{ '--delay': `${i * 0.1}s` }"
            >
              <div class="skeleton-icon"></div>
              <div class="skeleton-content">
                <div class="skeleton-title"></div>
                <div class="skeleton-message"></div>
              </div>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error-state">
            <div class="error-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M12 8V12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>
            <p>{{ error }}</p>
            <button class="retry-btn" @click="fetchNotifications">Try again</button>
          </div>

          <!-- Empty State -->
          <div v-else-if="notifications.length === 0" class="empty-state">
            <div class="empty-illustration">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  stroke="currentColor"
                  stroke-width="1.5"
                  opacity="0.3"
                />
                <path
                  d="M24 10C18.4772 10 14 14.4772 14 20V25L11 30V32H37V30L34 25V20C34 14.4772 29.5228 10 24 10Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  opacity="0.5"
                />
                <path
                  d="M20 32V34C20 36.2091 21.7909 38 24 38C26.2091 38 28 36.2091 28 34V32"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  opacity="0.5"
                />
              </svg>
            </div>
            <h4>All caught up!</h4>
            <p>No notifications to show</p>
          </div>

          <!-- Notifications List -->
          <TransitionGroup v-else name="list" tag="div" class="notifications-list">
            <div
              v-for="notification in notifications"
              :key="notification.id"
              class="notification-item"
              :class="{ unread: !notification.isRead }"
              role="button"
              tabindex="0"
              @click="handleNotificationClick(notification)"
              @keydown.enter="handleNotificationClick(notification)"
            >
              <!-- Type Icon -->
              <div
                class="notification-icon"
                :style="{
                  color: getMeta(notification.type).color,
                  background: getMeta(notification.type).bgColor,
                }"
              >
                <span v-if="notification.type === 'MENTION'" class="icon-at">@</span>
                <svg
                  v-else-if="notification.type === 'COMMENT_REPLY'"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M12.25 7C12.25 9.8995 9.8995 12.25 7 12.25C5.8875 12.25 4.8555 11.9168 4 11.348L1.75 12.25L2.652 10C2.0832 9.1445 1.75 8.1125 1.75 7C1.75 4.1005 4.1005 1.75 7 1.75C9.8995 1.75 12.25 4.1005 12.25 7Z"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <svg
                  v-else-if="notification.type === 'PAGE_SHARED'"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M8.16667 1.75H3.5C2.85567 1.75 2.33333 2.27233 2.33333 2.91667V11.0833C2.33333 11.7277 2.85567 12.25 3.5 12.25H10.5C11.1443 12.25 11.6667 11.7277 11.6667 11.0833V5.25L8.16667 1.75Z"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M8.16667 1.75V5.25H11.6667"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <svg
                  v-else-if="notification.type === 'COMMENT_RESOLVED'"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <circle cx="7" cy="7" r="5.25" stroke="currentColor" stroke-width="1.2" />
                  <path
                    d="M4.5 7L6.5 9L9.5 5"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <svg
                  v-else-if="notification.type === 'INVITATION'"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <rect
                    x="1.75"
                    y="3.5"
                    width="10.5"
                    height="7"
                    rx="1"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <path
                    d="M1.75 4.5L7 8L12.25 4.5"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>

              <!-- Content -->
              <div class="notification-content">
                <p class="notification-title">{{ notification.title }}</p>
                <p v-if="notification.message" class="notification-message">
                  {{ notification.message }}
                </p>
                <span class="notification-time">{{ formatTimeAgo(notification.createdAt) }}</span>
              </div>

              <!-- Actions -->
              <div class="notification-actions">
                <button
                  class="delete-btn"
                  title="Delete notification"
                  @click="deleteNotification(notification.id, $event)"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                      stroke="currentColor"
                      stroke-width="1.2"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>

              <!-- Unread Dot -->
              <span v-if="!notification.isRead" class="unread-dot"></span>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.notification-bell-container {
  position: relative;
}

/* Bell Button */
.bell-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.bell-button:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.bell-button.active {
  color: var(--color-accent);
  background: rgba(124, 154, 140, 0.1);
}

.bell-button.has-unread .bell-icon {
  animation: bell-ring 0.5s ease-in-out;
}

@keyframes bell-ring {
  0%,
  100% {
    transform: rotate(0deg);
  }
  20% {
    transform: rotate(12deg);
  }
  40% {
    transform: rotate(-10deg);
  }
  60% {
    transform: rotate(6deg);
  }
  80% {
    transform: rotate(-4deg);
  }
}

.bell-icon {
  transition: transform 0.2s ease;
}

/* Unread Badge */
.unread-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 2px var(--color-bg-primary);
}

.badge-count {
  font-size: 10px;
  font-weight: 600;
  color: white;
  letter-spacing: -0.02em;
}

.badge-ping {
  position: absolute;
  inset: 0;
  background: var(--color-accent);
  border-radius: inherit;
  opacity: 0.6;
  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {
  75%,
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}

/* Badge Transition */
.badge-enter-active,
.badge-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.badge-enter-from,
.badge-leave-to {
  transform: scale(0);
  opacity: 0;
}

/* Notification Panel */
.notification-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1000;
  width: 360px;
  max-height: 480px;
  overflow: hidden;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow:
    0 20px 40px -12px rgba(0, 0, 0, 0.15),
    0 8px 16px -8px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.02);
}

/* Panel Transition */
.panel-enter-active,
.panel-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}

/* Panel Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.panel-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.unread-indicator {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-accent);
  background: rgba(124, 154, 140, 0.1);
  border-radius: var(--radius-full);
}

.header-actions {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

.mark-all-btn {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.mark-all-btn:hover {
  color: var(--color-accent);
  background: rgba(124, 154, 140, 0.1);
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1);
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.settings-btn:hover {
  color: var(--color-accent);
  background: rgba(124, 154, 140, 0.1);
}

/* Panel Body */
.panel-body {
  max-height: 400px;
  overflow-y: auto;
}

/* Loading State */
.loading-state {
  padding: var(--space-4);
}

.skeleton-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  animation: skeleton-fade 1.5s ease-in-out infinite;
  animation-delay: var(--delay);
}

.skeleton-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.skeleton-content {
  flex: 1;
}

.skeleton-title {
  width: 60%;
  height: 12px;
  margin-bottom: var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-xs);
}

.skeleton-message {
  width: 80%;
  height: 10px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-xs);
}

@keyframes skeleton-fade {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-8);
  text-align: center;
}

.error-icon {
  color: var(--color-error, #ef4444);
  margin-bottom: var(--space-2);
}

.error-state p {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.retry-btn {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  background: rgba(124, 154, 140, 0.1);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: rgba(124, 154, 140, 0.2);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-8);
  text-align: center;
}

.empty-illustration {
  color: var(--color-accent);
  opacity: 0.5;
  margin-bottom: var(--space-3);
}

.empty-state h4 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.empty-state p {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Notifications List */
.notifications-list {
  padding: var(--space-2);
}

/* Notification Item */
.notification-item {
  position: relative;
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  cursor: pointer;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.notification-item:hover {
  background: var(--color-hover);
}

.notification-item.unread {
  background: rgba(124, 154, 140, 0.05);
}

.notification-item.unread:hover {
  background: rgba(124, 154, 140, 0.1);
}

.notification-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-md);
}

.icon-at {
  font-size: 14px;
  font-weight: 700;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  margin: 0 0 2px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.notification-message {
  margin: 0 0 4px;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.notification-actions {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.notification-item:hover .notification-actions {
  opacity: 1;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: var(--color-bg-primary);
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.delete-btn:hover {
  color: var(--color-error, #ef4444);
  background: rgba(239, 68, 68, 0.1);
}

.unread-dot {
  position: absolute;
  top: 50%;
  left: var(--space-1);
  width: 6px;
  height: 6px;
  margin-top: -3px;
  background: var(--color-accent);
  border-radius: 50%;
}

/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.25s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-12px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.list-move {
  transition: transform 0.25s ease;
}
</style>
