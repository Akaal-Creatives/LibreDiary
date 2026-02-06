<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from '@/composables';
import { adminService, type AdminUser, type Pagination } from '@/services';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';

const toast = useToast();

// State
const loading = ref(true);
const users = ref<AdminUser[]>([]);
const pagination = ref<Pagination | null>(null);
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 20;

// Modal state
const showConfirmDialog = ref(false);
const confirmDialogConfig = ref({
  title: '',
  message: '',
  confirmText: 'Confirm',
  variant: 'destructive' as 'default' | 'destructive',
  onConfirm: () => {},
});

// Computed
const totalPages = computed(() => pagination.value?.totalPages ?? 1);

// Load users
async function loadUsers() {
  loading.value = true;
  try {
    const response = await adminService.getUsers({
      page: currentPage.value,
      limit: itemsPerPage,
      search: searchQuery.value || undefined,
    });
    users.value = response.users;
    pagination.value = response.pagination;
  } catch (error) {
    console.error('Failed to load users:', error);
    toast.error('Failed to load users');
  } finally {
    loading.value = false;
  }
}

// Search with debounce
let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    loadUsers();
  }, 300);
});

// Pagination
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadUsers();
  }
}

// Toggle super admin status
async function toggleSuperAdmin(user: AdminUser) {
  const newStatus = !user.isSuperAdmin;
  const action = newStatus ? 'grant' : 'revoke';

  confirmDialogConfig.value = {
    title: `${newStatus ? 'Grant' : 'Revoke'} Super Admin`,
    message: `Are you sure you want to ${action} super admin privileges for ${user.name || user.email}?`,
    confirmText: newStatus ? 'Grant Access' : 'Revoke Access',
    variant: 'destructive',
    onConfirm: async () => {
      try {
        await adminService.updateUser(user.id, { isSuperAdmin: newStatus });
        toast.success(`Super admin ${action}ed successfully`);
        await loadUsers();
      } catch (error) {
        console.error('Failed to update user:', error);
        toast.error('Failed to update user');
      }
    },
  };
  showConfirmDialog.value = true;
}

// Delete user
function confirmDeleteUser(user: AdminUser) {
  confirmDialogConfig.value = {
    title: 'Delete User',
    message: `Are you sure you want to delete ${user.name || user.email}? This action can be undone by restoring the user.`,
    confirmText: 'Delete User',
    variant: 'destructive',
    onConfirm: async () => {
      try {
        await adminService.deleteUser(user.id);
        toast.success('User deleted successfully');
        await loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
        toast.error('Failed to delete user');
      }
    },
  };
  showConfirmDialog.value = true;
}

// Restore user
async function restoreUser(user: AdminUser) {
  try {
    await adminService.restoreUser(user.id);
    toast.success('User restored successfully');
    await loadUsers();
  } catch (error) {
    console.error('Failed to restore user:', error);
    toast.error('Failed to restore user');
  }
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="admin-users">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Users</h1>
        <p class="page-description">Manage all users in the system</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M14 14L10.5 10.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search users by name or email..."
          class="search-input"
        />
      </div>

      <div class="toolbar-stats">
        <span v-if="pagination" class="stats-text"> {{ pagination.total }} users total </span>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Status</th>
            <th>Organizations</th>
            <th>Joined</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading -->
          <template v-if="loading">
            <tr v-for="i in 5" :key="i" class="skeleton-row">
              <td>
                <div class="user-cell skeleton">
                  <div class="skeleton-avatar"></div>
                  <div class="skeleton-text">
                    <div class="skeleton-name"></div>
                    <div class="skeleton-email"></div>
                  </div>
                </div>
              </td>
              <td><div class="skeleton-badge"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-actions"></div></td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="users.length === 0">
            <td colspan="5" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="16" r="8" stroke="currentColor" stroke-width="2" />
                  <path
                    d="M8 44C8 35.1634 15.1634 28 24 28C32.8366 28 40 35.1634 40 44"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                <span>No users found</span>
              </div>
            </td>
          </tr>

          <!-- User Rows -->
          <tr v-for="user in users" v-else :key="user.id" :class="{ deleted: user.deletedAt }">
            <td>
              <div class="user-cell">
                <div class="user-avatar" :class="{ admin: user.isSuperAdmin }">
                  {{ user.name?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase() }}
                </div>
                <div class="user-info">
                  <span class="user-name">
                    {{ user.name || 'No name' }}
                    <span v-if="user.isSuperAdmin" class="admin-badge">Admin</span>
                  </span>
                  <span class="user-email">{{ user.email }}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="status-badges">
                <span v-if="user.deletedAt" class="badge badge-deleted">Deleted</span>
                <span v-else-if="user.emailVerified" class="badge badge-verified">Verified</span>
                <span v-else class="badge badge-unverified">Unverified</span>
              </div>
            </td>
            <td>
              <span class="org-count">{{ user.organizationCount }}</span>
            </td>
            <td>
              <span class="date-text">{{ formatDate(user.createdAt) }}</span>
            </td>
            <td>
              <div class="actions">
                <button
                  v-if="user.deletedAt"
                  class="action-btn restore"
                  title="Restore user"
                  @click="restoreUser(user)"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M5 2L2 5L5 8"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <template v-else>
                  <button
                    class="action-btn"
                    :class="{ warning: !user.isSuperAdmin, danger: user.isSuperAdmin }"
                    :title="user.isSuperAdmin ? 'Revoke super admin' : 'Grant super admin'"
                    @click="toggleSuperAdmin(user)"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 2L10 6L14 6.5L11 9.5L12 14L8 12L4 14L5 9.5L2 6.5L6 6L8 2Z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    class="action-btn danger"
                    title="Delete user"
                    @click="confirmDeleteUser(user)"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M3 5H13"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                      <path
                        d="M6 5V3.5C6 3.22386 6.22386 3 6.5 3H9.5C9.77614 3 10 3.22386 10 3.5V5"
                        stroke="currentColor"
                        stroke-width="1.5"
                      />
                      <path
                        d="M4 5L5 13C5 13.5523 5.44772 14 6 14H10C10.5523 14 11 13.5523 11 13L12 5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination && pagination.totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
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

      <span class="page-info"> Page {{ currentPage }} of {{ totalPages }} </span>

      <button
        class="page-btn"
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

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :open="showConfirmDialog"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      :confirm-text="confirmDialogConfig.confirmText"
      :variant="confirmDialogConfig.variant"
      @confirm="confirmDialogConfig.onConfirm"
      @close="showConfirmDialog = false"
    />
  </div>
</template>

<style scoped>
.admin-users {
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

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-10);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  outline: none;
  transition: all var(--transition-fast);
}

.search-input:focus {
  border-color: var(--admin-accent);
  box-shadow: 0 0 0 3px var(--admin-accent-subtle);
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

.data-table tr.deleted {
  opacity: 0.6;
}

.actions-col {
  width: 100px;
  text-align: right !important;
}

/* User Cell */
.user-cell {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.user-avatar.admin {
  background: var(--admin-accent);
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.admin-badge {
  display: inline-flex;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--admin-accent);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: var(--admin-accent-subtle);
  border-radius: var(--radius-sm);
}

.user-email {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Status Badges */
.status-badges {
  display: flex;
  gap: var(--space-2);
}

.badge {
  display: inline-flex;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-full);
}

.badge-verified {
  color: var(--color-success);
  background: var(--color-success-subtle);
}

.badge-unverified {
  color: var(--color-warning);
  background: var(--color-warning-subtle);
}

.badge-deleted {
  color: var(--color-error);
  background: var(--color-error-subtle);
}

.org-count {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.date-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Actions */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

.action-btn.warning:hover {
  color: var(--color-warning);
  background: var(--color-warning-subtle);
  border-color: var(--color-warning);
}

.action-btn.danger:hover {
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-color: var(--color-error);
}

.action-btn.restore:hover {
  color: var(--color-success);
  background: var(--color-success-subtle);
  border-color: var(--color-success);
}

/* Skeleton Loading */
.skeleton-row td {
  padding: var(--space-4);
}

.skeleton-avatar {
  width: 36px;
  height: 36px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.skeleton-name {
  width: 120px;
  height: 16px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-email {
  width: 160px;
  height: 12px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-badge {
  width: 70px;
  height: 22px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-short {
  width: 40px;
  height: 16px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-actions {
  width: 70px;
  height: 32px;
  margin-left: auto;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
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
</style>
