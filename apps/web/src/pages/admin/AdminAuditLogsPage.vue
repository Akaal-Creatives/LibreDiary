<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  getAuditLogs,
  getAuditLogActions,
  type AuditLogEntry,
  type Pagination,
} from '@/services/admin.service';

const loading = ref(true);
const logs = ref<AuditLogEntry[]>([]);
const pagination = ref<Pagination | null>(null);
const actions = ref<string[]>([]);
const currentPage = ref(1);
const itemsPerPage = 50;

// Filters
const actionFilter = ref<string>('');

const totalPages = computed(() => pagination.value?.totalPages ?? 1);

function formatActionLabel(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getUserDisplay(log: AuditLogEntry): string {
  if (!log.userId) return 'System';
  if (!log.user) return 'Deleted user';
  if (log.user.name) return log.user.name;
  return log.user.email;
}

function getUserEmail(log: AuditLogEntry): string | null {
  if (!log.userId || !log.user) return null;
  if (log.user.name) return log.user.email;
  return null;
}

async function loadLogs() {
  loading.value = true;
  try {
    const response = await getAuditLogs({
      page: currentPage.value,
      limit: itemsPerPage,
      action: actionFilter.value || undefined,
    });
    logs.value = response.logs;
    pagination.value = response.pagination;
  } catch (error) {
    console.error('Failed to load audit logs:', error);
  } finally {
    loading.value = false;
  }
}

async function loadActions() {
  try {
    actions.value = await getAuditLogActions();
  } catch (error) {
    console.error('Failed to load audit log actions:', error);
  }
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadLogs();
  }
}

function clearFilters() {
  actionFilter.value = '';
  currentPage.value = 1;
  loadLogs();
}

watch(actionFilter, () => {
  currentPage.value = 1;
  loadLogs();
});

onMounted(() => {
  loadLogs();
  loadActions();
});
</script>

<template>
  <div class="admin-audit-logs">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Audit Logs</h1>
        <p class="page-description">Activity trail for security and compliance</p>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="toolbar">
      <div class="filters">
        <select v-model="actionFilter" class="filter-action filter-select">
          <option value="">All actions</option>
          <option v-for="action in actions" :key="action" :value="action">
            {{ formatActionLabel(action) }}
          </option>
        </select>

        <button v-if="actionFilter" class="clear-filters-btn" @click="clearFilters">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          Clear filters
        </button>
      </div>

      <div class="toolbar-stats">
        <span v-if="pagination" class="stats-text">
          {{ pagination.total }} {{ pagination.total === 1 ? 'entry' : 'entries' }}
        </span>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>User</th>
            <th>Organisation</th>
            <th>Resource</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading -->
          <template v-if="loading">
            <tr v-for="i in 8" :key="i" class="skeleton-row">
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-badge"></div></td>
              <td><div class="skeleton-name"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-short"></div></td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="logs.length === 0">
            <td colspan="6" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect
                    x="8"
                    y="6"
                    width="32"
                    height="36"
                    rx="3"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <path
                    d="M16 16H32M16 24H28M16 32H24"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                <span>No audit logs found</span>
              </div>
            </td>
          </tr>

          <!-- Log Rows -->
          <tr v-for="log in logs" v-else :key="log.id">
            <td>
              <span class="date-text">{{ formatDate(log.createdAt) }}</span>
            </td>
            <td>
              <span class="action-badge">{{ formatActionLabel(log.action) }}</span>
            </td>
            <td>
              <div class="user-cell">
                <span class="user-display">{{ getUserDisplay(log) }}</span>
                <span v-if="getUserEmail(log)" class="user-email">{{ getUserEmail(log) }}</span>
              </div>
            </td>
            <td>
              <span v-if="log.organization" class="org-text">{{ log.organization.name }}</span>
              <span v-else class="muted-text">-</span>
            </td>
            <td>
              <span v-if="log.resourceType" class="resource-text">
                {{ log.resourceType
                }}<span v-if="log.resourceId" class="resource-id"
                  >#{{ log.resourceId.substring(0, 8) }}</span
                >
              </span>
              <span v-else class="muted-text">-</span>
            </td>
            <td>
              <span v-if="log.ipAddress" class="ip-text">{{ log.ipAddress }}</span>
              <span v-else class="muted-text">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination && pagination.totalPages > 1" class="pagination">
      <button
        class="page-btn page-btn-prev"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 4L6 8L10 12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>

      <button
        class="page-btn page-btn-next"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.admin-audit-logs {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-6);
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

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.filters {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.filter-select {
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  outline: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 180px;
}

.filter-select:focus {
  border-color: var(--admin-accent);
  box-shadow: 0 0 0 3px var(--admin-accent-subtle);
}

.clear-filters-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.clear-filters-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}

.toolbar-stats {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

/* Table */
.table-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border-subtle);
}

.data-table th {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-surface-sunken);
}

.data-table tr:last-child td {
  border-bottom: none;
}

/* Action Badge */
.action-badge {
  display: inline-flex;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--admin-accent);
  background: var(--admin-accent-subtle);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

/* User Cell */
.user-cell {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-display {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.user-email {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Data cells */
.date-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.org-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.resource-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.resource-id {
  font-family: var(--font-mono, monospace);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-left: var(--space-1);
}

.ip-text {
  font-size: var(--text-sm);
  font-family: var(--font-mono, monospace);
  color: var(--color-text-tertiary);
}

.muted-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Skeleton Loading */
.skeleton-row td {
  padding: var(--space-4);
}

.skeleton-badge {
  width: 90px;
  height: 22px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-short {
  width: 80px;
  height: 16px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-name {
  width: 120px;
  height: 16px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

/* Empty State */
.empty-cell {
  padding: var(--space-12) !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-tertiary);
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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

/* Responsive */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filters {
    flex-wrap: wrap;
  }
}
</style>
