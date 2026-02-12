<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from '@/composables';
import { adminService } from '@/services';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton.vue';

interface Stats {
  users: {
    total: number;
    verified: number;
    superAdmins: number;
  };
  organizations: {
    total: number;
    active: number;
  };
  pages: number;
  databases: number;
  files: {
    total: number;
    totalSize: number;
  };
  templates: number;
  backups: number;
}

interface Health {
  database: {
    status: 'connected' | 'disconnected';
    error?: string;
  };
  storage: {
    status: 'connected' | 'disconnected';
    error?: string;
  };
  collaboration: {
    status: 'connected' | 'disconnected';
  };
  server: {
    uptime: number;
    nodeVersion: string;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
}

const toast = useToast();
const loading = ref(true);
const stats = ref<Stats | null>(null);
const health = ref<Health | null>(null);

onMounted(async () => {
  await Promise.all([loadStats(), loadHealth()]);
});

async function loadStats() {
  loading.value = true;
  try {
    stats.value = await adminService.getStats();
  } catch (error) {
    console.error('Failed to load stats:', error);
    toast.error('Failed to load statistics');
  } finally {
    loading.value = false;
  }
}

async function loadHealth() {
  try {
    health.value = await adminService.getSystemHealth();
  } catch (error) {
    console.error('Failed to load health:', error);
    toast.error('Failed to load system health');
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
</script>

<template>
  <div class="admin-dashboard">
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-description">System overview and statistics</p>
    </div>

    <!-- Loading State -->
    <DashboardSkeleton v-if="loading" />

    <!-- Stats Grid -->
    <div v-else-if="stats" class="stats-grid">
      <!-- Total Users -->
      <div class="stat-card">
        <div class="stat-icon users">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="8" cy="7" r="3" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M2 21C2 17.134 5.134 14 9 14H7C10.866 14 14 17.134 14 21"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <circle cx="17" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M22 20C22 17.5 19.5 15 17 15"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.users.total }}</span>
          <span class="stat-label">Total Users</span>
        </div>
        <div class="stat-badge">
          <span class="badge-value">{{ stats.users.verified }}</span>
          <span class="badge-label">verified</span>
        </div>
      </div>

      <!-- Super Admins -->
      <div class="stat-card">
        <div class="stat-icon admins">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.users.superAdmins }}</span>
          <span class="stat-label">Super Admins</span>
        </div>
      </div>

      <!-- Total Organizations -->
      <div class="stat-card">
        <div class="stat-icon orgs">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M7 10H10M7 14H10"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <rect x="14" y="10" width="5" height="11" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M8 5V3.5C8 3.22386 8.22386 3 8.5 3H15.5C15.7761 3 16 3.22386 16 3.5V5"
              stroke="currentColor"
              stroke-width="1.5"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.organizations.total }}</span>
          <span class="stat-label">Organizations</span>
        </div>
        <div class="stat-badge success">
          <span class="badge-value">{{ stats.organizations.active }}</span>
          <span class="badge-label">active</span>
        </div>
      </div>

      <!-- Deleted Organizations -->
      <div class="stat-card">
        <div class="stat-icon deleted">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 7H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path
              d="M10 11V17M14 11V17"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M5 7L6 19C6 19.5523 6.44772 20 7 20H17C17.5523 20 18 19.5523 18 19L19 7"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7"
              stroke="currentColor"
              stroke-width="1.5"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{
            stats.organizations.total - stats.organizations.active
          }}</span>
          <span class="stat-label">Deleted Orgs</span>
        </div>
      </div>

      <!-- Pages -->
      <div class="stat-card">
        <div class="stat-icon pages">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V7L14 2Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path d="M14 2V7H19" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
            <path
              d="M9 13H15M9 17H13"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.pages }}</span>
          <span class="stat-label">Pages</span>
        </div>
      </div>

      <!-- Databases -->
      <div class="stat-card">
        <div class="stat-icon databases">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M4 5V19C4 20.6569 7.58172 22 12 22C16.4183 22 20 20.6569 20 19V5"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M4 12C4 13.6569 7.58172 15 12 15C16.4183 15 20 13.6569 20 12"
              stroke="currentColor"
              stroke-width="1.5"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.databases }}</span>
          <span class="stat-label">Databases</span>
        </div>
      </div>

      <!-- Files -->
      <div class="stat-card">
        <div class="stat-icon files">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M13 2H6C5.44772 2 5 2.44772 5 3V21C5 21.5523 5.44772 22 6 22H18C18.5523 22 19 21.5523 19 21V8L13 2Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path d="M13 2V8H19" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.files.total }}</span>
          <span class="stat-label">Files</span>
        </div>
      </div>

      <!-- Templates -->
      <div class="stat-card">
        <div class="stat-icon templates">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path d="M3 9H21" stroke="currentColor" stroke-width="1.5" />
            <path d="M9 9V21" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.templates }}</span>
          <span class="stat-label">Templates</span>
        </div>
      </div>

      <!-- Backups -->
      <div class="stat-card">
        <div class="stat-icon backups">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 16V8M12 8L9 11M12 8L15 11"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M20 16.7428C21.2215 15.734 22 14.2079 22 12.5C22 9.46243 19.5376 7 16.5 7C16.2815 7 16.0771 6.886 15.9661 6.69774C14.6621 4.48484 12.2544 3 9.5 3C5.35786 3 2 6.35786 2 10.5C2 12.5661 2.83545 14.4371 4.18695 15.7935"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path d="M8 20H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.backups }}</span>
          <span class="stat-label">Backups</span>
        </div>
      </div>
    </div>

    <!-- Storage Usage -->
    <div v-if="stats" class="section storage-section">
      <h2 class="section-title">Storage Usage</h2>
      <div class="storage-card">
        <div class="storage-info">
          <div class="storage-detail">
            <span class="storage-detail-label">Total files</span>
            <span class="storage-detail-value">{{ stats.files.total }}</span>
          </div>
          <div class="storage-detail">
            <span class="storage-detail-label">Total size</span>
            <span class="storage-detail-value">{{ formatBytes(stats.files.totalSize) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- System Health -->
    <div v-if="health" class="section health-section">
      <h2 class="section-title">System Health</h2>
      <div class="health-grid">
        <!-- Service statuses -->
        <div class="health-card">
          <div class="health-items">
            <div class="health-item">
              <span
                class="health-dot"
                :class="health.database.status === 'connected' ? 'connected' : 'disconnected'"
              ></span>
              <span class="health-label">Database</span>
              <span class="health-status">{{ health.database.status }}</span>
            </div>
            <div class="health-item">
              <span
                class="health-dot"
                :class="health.storage.status === 'connected' ? 'connected' : 'disconnected'"
              ></span>
              <span class="health-label">Storage</span>
              <span class="health-status">{{ health.storage.status }}</span>
            </div>
            <div class="health-item">
              <span
                class="health-dot"
                :class="health.collaboration.status === 'connected' ? 'connected' : 'disconnected'"
              ></span>
              <span class="health-label">Collaboration</span>
              <span class="health-status">{{ health.collaboration.status }}</span>
            </div>
          </div>
        </div>

        <!-- Server info -->
        <div class="health-card">
          <div class="health-items">
            <div class="health-item">
              <span class="health-item-label">Uptime</span>
              <span class="health-item-value">{{ formatUptime(health.server.uptime) }}</span>
            </div>
            <div class="health-item">
              <span class="health-item-label">Node.js</span>
              <span class="health-item-value">{{ health.server.nodeVersion }}</span>
            </div>
            <div class="health-item">
              <span class="health-item-label">Memory (RSS)</span>
              <span class="health-item-value">{{ formatBytes(health.server.memory.rss) }}</span>
            </div>
            <div class="health-item">
              <span class="health-item-label">Heap Used</span>
              <span class="health-item-value">{{
                formatBytes(health.server.memory.heapUsed)
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <h2 class="section-title">Quick Actions</h2>
      <div class="actions-grid">
        <RouterLink :to="{ name: 'admin-users' }" class="action-card">
          <div class="action-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="7" cy="6" r="3" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M2 18C2 14.686 4.686 12 8 12H6C9.314 12 12 14.686 12 18"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M14 8V14M11 11H17"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <div class="action-content">
            <span class="action-title">Manage Users</span>
            <span class="action-description">View and manage all users</span>
          </div>
          <div class="action-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </RouterLink>

        <RouterLink :to="{ name: 'admin-organizations' }" class="action-card">
          <div class="action-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect
                x="3"
                y="5"
                width="14"
                height="12"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M6 9H8M6 12H8"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <rect x="11" y="9" width="4" height="8" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M7 5V3.5C7 3.22386 7.22386 3 7.5 3H12.5C12.7761 3 13 3.22386 13 3.5V5"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </svg>
          </div>
          <div class="action-content">
            <span class="action-title">Manage Organizations</span>
            <span class="action-description">View and manage all organizations</span>
          </div>
          <div class="action-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </RouterLink>

        <RouterLink :to="{ name: 'admin-settings' }" class="action-card">
          <div class="action-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M16.5 10C16.5 9.5 16.3 9 16 8.5L17.5 6.5L16 4.5L13.5 5.5C13 5 12.5 4.5 12 4.5L11.5 2H8.5L8 4.5C7.5 4.5 7 5 6.5 5.5L4 4.5L2.5 6.5L4 8.5C3.7 9 3.5 9.5 3.5 10C3.5 10.5 3.7 11 4 11.5L2.5 13.5L4 15.5L6.5 14.5C7 15 7.5 15.5 8 15.5L8.5 18H11.5L12 15.5C12.5 15.5 13 15 13.5 14.5L16 15.5L17.5 13.5L16 11.5C16.3 11 16.5 10.5 16.5 10Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="action-content">
            <span class="action-title">System Settings</span>
            <span class="action-description">Configure system preferences</span>
          </div>
          <div class="action-arrow">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 4L10 8L6 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  max-width: 1200px;
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-fast);
}

.stat-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.stat-icon.users {
  color: #5a8a9a;
  background: rgba(90, 138, 154, 0.1);
}

.stat-icon.admins {
  color: #c4973b;
  background: rgba(196, 151, 59, 0.1);
}

.stat-icon.orgs {
  color: #6b8f71;
  background: rgba(107, 143, 113, 0.1);
}

.stat-icon.deleted {
  color: #c45c5c;
  background: rgba(196, 92, 92, 0.1);
}

.stat-icon.pages {
  color: #7b8fb0;
  background: rgba(123, 143, 176, 0.1);
}

.stat-icon.databases {
  color: #9a7bb0;
  background: rgba(154, 123, 176, 0.1);
}

.stat-icon.files {
  color: #5a8a9a;
  background: rgba(90, 138, 154, 0.1);
}

.stat-icon.templates {
  color: #b08f5a;
  background: rgba(176, 143, 90, 0.1);
}

.stat-icon.backups {
  color: #6b8f71;
  background: rgba(107, 143, 113, 0.1);
}

.stat-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--color-info-subtle);
  border-radius: var(--radius-md);
}

.stat-badge.success {
  background: var(--color-success-subtle);
}

.badge-value {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-info);
}

.stat-badge.success .badge-value {
  color: var(--color-success);
}

.badge-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Section */
.section {
  margin-bottom: var(--space-8);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
}

/* Storage Section */
.storage-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
}

.storage-info {
  display: flex;
  gap: var(--space-8);
}

.storage-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.storage-detail-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.storage-detail-value {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Health Section */
.health-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
}

.health-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
}

.health-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.health-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.health-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.health-dot.connected {
  background: var(--color-success);
}

.health-dot.disconnected {
  background: var(--color-error);
}

.health-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
}

.health-status {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.health-item-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  flex: 1;
}

.health-item-value {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Actions Grid */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-4);
}

.action-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.action-card:hover {
  border-color: var(--admin-accent);
  box-shadow: var(--shadow-sm);
}

.action-card:hover .action-arrow {
  transform: translateX(4px);
  color: var(--admin-accent);
}

.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--admin-accent);
  background: var(--admin-accent-subtle);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.action-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.action-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.action-description {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: 2px;
}

.action-arrow {
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
}

@keyframes pulse-subtle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
