<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores';
import { useTheme } from '@/composables';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { theme, toggleTheme } = useTheme();

interface NavItem {
  name: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: 'admin-dashboard', label: 'Dashboard', icon: 'dashboard' },
  { name: 'admin-users', label: 'Users', icon: 'users' },
  { name: 'admin-organizations', label: 'Organizations', icon: 'organizations' },
  { name: 'admin-settings', label: 'System Settings', icon: 'settings' },
];

const breadcrumbs = computed(() => {
  const crumbs = [{ name: 'admin-dashboard', label: 'Admin' }];

  const currentNav = navItems.find((item) => item.name === route.name);
  if (currentNav && currentNav.name !== 'admin-dashboard') {
    crumbs.push({ name: currentNav.name, label: currentNav.label });
  }

  return crumbs;
});

function exitAdmin() {
  router.push({ name: 'dashboard' });
}

async function handleLogout() {
  await authStore.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="admin-sidebar">
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <div class="admin-brand">
          <div class="brand-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2L18 6V14L10 18L2 14V6L10 2Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
              <path
                d="M10 10L18 6M10 10L2 6M10 10V18"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">LibreDiary</span>
            <span class="brand-badge">Admin</span>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="nav-item"
          :class="{ active: route.name === item.name }"
        >
          <span class="nav-icon">
            <!-- Dashboard Icon -->
            <svg
              v-if="item.icon === 'dashboard'"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              <rect
                x="2"
                y="2"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <rect
                x="10"
                y="2"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <rect
                x="2"
                y="10"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <rect
                x="10"
                y="10"
                width="6"
                height="6"
                rx="1"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </svg>
            <!-- Users Icon -->
            <svg
              v-else-if="item.icon === 'users'"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              <circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M1.5 15C1.5 12.5 3.5 10.5 6 10.5C8.5 10.5 10.5 12.5 10.5 15"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <circle cx="13" cy="6" r="2" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M16.5 14C16.5 12.5 15 11 13 11"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <!-- Organizations Icon -->
            <svg
              v-else-if="item.icon === 'organizations'"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              <rect
                x="2"
                y="4"
                width="14"
                height="12"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M5 8H7M5 11H7"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <rect x="10" y="8" width="4" height="8" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M6 4V2.5C6 2.22386 6.22386 2 6.5 2H11.5C11.7761 2 12 2.22386 12 2.5V4"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </svg>
            <!-- Settings Icon -->
            <svg
              v-else-if="item.icon === 'settings'"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              <path
                d="M9 11.5C10.3807 11.5 11.5 10.3807 11.5 9C11.5 7.61929 10.3807 6.5 9 6.5C7.61929 6.5 6.5 7.61929 6.5 9C6.5 10.3807 7.61929 11.5 9 11.5Z"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M15 9C15 8.5 14.8 8 14.5 7.5L16 5.5L14.5 3.5L12 4.5C11.5 4 11 3.5 10.5 3.5L10 1H8L7.5 3.5C7 3.5 6.5 4 6 4.5L3.5 3.5L2 5.5L3.5 7.5C3.2 8 3 8.5 3 9C3 9.5 3.2 10 3.5 10.5L2 12.5L3.5 14.5L6 13.5C6.5 14 7 14.5 7.5 14.5L8 17H10L10.5 14.5C11 14.5 11.5 14 12 13.5L14.5 14.5L16 12.5L14.5 10.5C14.8 10 15 9.5 15 9Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <button class="exit-admin-btn" @click="exitAdmin">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 14H3.5C3.22386 14 3 13.7761 3 13.5V2.5C3 2.22386 3.22386 2 3.5 2H6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M11 11L14 8L11 5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M6 8H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span>Exit Admin</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="admin-main">
      <!-- Header -->
      <header class="admin-header">
        <div class="header-left">
          <!-- Breadcrumbs -->
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <ol class="breadcrumb-list">
              <li v-for="(crumb, index) in breadcrumbs" :key="crumb.name" class="breadcrumb-item">
                <RouterLink
                  v-if="index < breadcrumbs.length - 1"
                  :to="{ name: crumb.name }"
                  class="breadcrumb-link"
                >
                  {{ crumb.label }}
                </RouterLink>
                <span v-else class="breadcrumb-current">{{ crumb.label }}</span>
                <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M5 3L9 7L5 11"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </li>
            </ol>
          </nav>
        </div>

        <div class="header-right">
          <!-- Theme Toggle -->
          <button class="header-btn" :title="`Theme: ${theme}`" @click="toggleTheme">
            <span v-if="theme === 'light'">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="3.75" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M9 2.25V3.75M9 14.25V15.75M2.25 9H3.75M14.25 9H15.75M4.22 4.22L5.28 5.28M12.72 12.72L13.78 13.78M4.22 13.78L5.28 12.72M12.72 5.28L13.78 4.22"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span v-else>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M15.75 10.5C14.9177 11.3323 13.8066 11.8033 12.6376 11.8219C11.4686 11.8405 10.3434 11.4054 9.48398 10.5977C8.62457 9.79007 8.1 8.67504 8.02109 7.50718C7.94219 6.33932 8.31431 5.19788 9.06 4.305C8.08574 4.58581 7.20454 5.12154 6.50739 6.85749C5.81024 7.59343 5.3252 8.50045 5.10251 9.48675C4.87982 10.473 4.92807 11.5017 5.24204 12.4636C5.55601 13.4255 6.12385 14.2846 6.88457 14.9526C7.64529 15.6205 8.57062 16.0721 9.56612 16.258C10.5616 16.4439 11.5894 16.357 12.5395 16.0065C13.4895 15.656 14.3263 15.0552 14.9651 14.2682C15.6038 13.4813 16.0205 12.5372 16.1715 11.534"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </button>

          <!-- User Menu -->
          <div class="user-menu">
            <div class="user-avatar">
              {{ authStore.user?.name?.charAt(0).toUpperCase() ?? '?' }}
            </div>
            <div class="user-info">
              <span class="user-name">{{ authStore.user?.name ?? 'Admin' }}</span>
              <span class="user-role">Super Admin</span>
            </div>
            <button class="logout-btn" title="Logout" @click="handleLogout">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M11 5L14 8L11 11"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path d="M14 8H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                <path
                  d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Admin-specific accent color - Terracotta/Coral */
.admin-layout {
  --admin-accent: #c4725c;
  --admin-accent-hover: #b5634d;
  --admin-accent-active: #a65540;
  --admin-accent-subtle: rgba(196, 114, 92, 0.08);
  --admin-accent-muted: rgba(196, 114, 92, 0.15);
}

[data-theme='dark'] .admin-layout {
  --admin-accent: #d4897a;
  --admin-accent-hover: #e09a8c;
  --admin-accent-active: #c47a6b;
  --admin-accent-subtle: rgba(212, 137, 122, 0.1);
  --admin-accent-muted: rgba(212, 137, 122, 0.18);
}

.admin-layout {
  display: flex;
  height: 100vh;
  background: var(--color-background);
}

/* Sidebar */
.admin-sidebar {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 240px;
  height: 100%;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.sidebar-header {
  padding: var(--space-4) var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
}

.admin-brand {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--admin-accent);
  background: var(--admin-accent-subtle);
  border-radius: var(--radius-lg);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 600;
  color: var(--admin-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--admin-accent-subtle);
  border-radius: var(--radius-sm);
}

/* Navigation */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: var(--space-1);
  padding: var(--space-3);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.nav-item:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.nav-item.active {
  color: var(--admin-accent);
  background: var(--admin-accent-subtle);
}

.nav-item.active .nav-icon {
  color: var(--admin-accent);
}

.nav-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: currentColor;
}

.nav-label {
  font-weight: 500;
}

/* Sidebar Footer */
.sidebar-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.exit-admin-btn {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.exit-admin-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

/* Main Content */
.admin-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  background: var(--color-background);
}

/* Header */
.admin-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 var(--space-6);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

/* Breadcrumbs */
.breadcrumb-list {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  padding: 0;
  margin: 0;
  list-style: none;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
}

.breadcrumb-link {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.breadcrumb-link:hover {
  color: var(--admin-accent);
}

.breadcrumb-current {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.breadcrumb-separator {
  display: flex;
  align-items: center;
  padding: 0 var(--space-1);
  color: var(--color-text-tertiary);
}

/* Header Button */
.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.header-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

/* User Menu */
.user-menu {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding-left: var(--space-4);
  border-left: 1px solid var(--color-border);
}

.user-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--admin-accent);
  border-radius: var(--radius-full);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.user-role {
  font-size: var(--text-xs);
  color: var(--admin-accent);
  font-weight: 500;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.logout-btn:hover {
  color: var(--color-error);
  background: var(--color-error-subtle);
}

/* Content */
.admin-content {
  flex: 1;
  padding: var(--space-6);
  overflow: auto;
}

/* Scrollbar */
.admin-content::-webkit-scrollbar,
.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}

.admin-content::-webkit-scrollbar-track,
.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.admin-content::-webkit-scrollbar-thumb,
.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.admin-content::-webkit-scrollbar-thumb:hover,
.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
}
</style>
