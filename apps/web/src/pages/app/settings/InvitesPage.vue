<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores';
import { useOrganizationsStore } from '@/stores/organizations';
import { ApiError } from '@/services';
import MemberRoleBadge from '@/components/MemberRoleBadge.vue';
import InviteMemberModal from '@/components/InviteMemberModal.vue';

const authStore = useAuthStore();
const orgsStore = useOrganizationsStore();

const loading = ref(true);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const showInviteModal = ref(false);
const actionLoading = ref<string | null>(null);

// Load invites
async function loadInvites() {
  loading.value = true;
  error.value = null;
  try {
    await orgsStore.fetchOrganization();
    await orgsStore.fetchInvites();
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to load invites';
    }
  } finally {
    loading.value = false;
  }
}

// Watch for organization changes
watch(
  () => authStore.currentOrganizationId,
  () => {
    loadInvites();
  }
);

onMounted(loadInvites);

// Cancel an invite
async function handleCancel(inviteId: string) {
  actionLoading.value = inviteId;
  error.value = null;
  success.value = null;

  try {
    await orgsStore.cancelInvite(inviteId);
    success.value = 'Invite cancelled';
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to cancel invite';
    }
  } finally {
    actionLoading.value = null;
  }
}

// Resend an invite
async function handleResend(inviteId: string) {
  actionLoading.value = inviteId;
  error.value = null;
  success.value = null;

  try {
    await orgsStore.resendInvite(inviteId);
    success.value = 'Invite resent successfully';
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to resend invite';
    }
  } finally {
    actionLoading.value = null;
  }
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Check if invite is expired
function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
</script>

<template>
  <div class="invites-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Pending Invites</h1>
        <p class="page-subtitle">
          Manage pending invitations to {{ authStore.currentOrganization?.name }}
        </p>
      </div>
      <button class="btn btn-primary" @click="showInviteModal = true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 3V13M3 8H13"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <span>Send Invite</span>
      </button>
    </div>

    <div v-if="error" class="alert alert-error">
      {{ error }}
    </div>

    <div v-if="success" class="alert alert-success">
      {{ success }}
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading invites...</p>
    </div>

    <div v-else class="invites-list">
      <div v-for="invite in orgsStore.invites" :key="invite.id" class="invite-card">
        <div class="invite-avatar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M2 5L10 10L18 5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <rect
              x="2"
              y="4"
              width="16"
              height="12"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
          </svg>
        </div>
        <div class="invite-info">
          <div class="invite-email">{{ invite.email }}</div>
          <div class="invite-meta">
            <span v-if="isExpired(invite.expiresAt)" class="status-expired">Expired</span>
            <template v-else>
              Invited {{ formatDate(invite.createdAt) }} &middot; Expires
              {{ formatDate(invite.expiresAt) }}
            </template>
          </div>
        </div>
        <MemberRoleBadge :role="invite.role" size="sm" />
        <div class="invite-actions">
          <button
            v-if="!isExpired(invite.expiresAt)"
            class="action-btn"
            title="Resend invite"
            :disabled="actionLoading === invite.id"
            @click="handleResend(invite.id)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M1.5 8C1.5 11.5899 4.41015 14.5 8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M5.5 1.5L8 4L5.5 6.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            class="action-btn action-danger"
            title="Cancel invite"
            :disabled="actionLoading === invite.id"
            @click="handleCancel(invite.id)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M4 12L12 4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="orgsStore.invites.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M4 10L20 20L36 10"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <rect
              x="4"
              y="8"
              width="32"
              height="24"
              rx="3"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
        </div>
        <h3>No pending invites</h3>
        <p>Send an invite to add new members to your organization.</p>
        <button class="btn btn-primary" @click="showInviteModal = true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>Send Invite</span>
        </button>
      </div>
    </div>

    <!-- Invite Modal -->
    <InviteMemberModal
      :open="showInviteModal"
      @close="showInviteModal = false"
      @invited="loadInvites()"
    />
  </div>
</template>

<style scoped>
.invites-page {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-6) 0;
}

.page-header {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.page-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.page-subtitle {
  margin: 0;
  color: var(--color-text-secondary);
}

.btn {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-primary {
  color: white;
  background: var(--color-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.alert {
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  border-radius: var(--radius-md);
}

.alert-error {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.alert-success {
  color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-16) 0;
  color: var(--color-text-tertiary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.invites-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.invite-card {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.invite-card:hover {
  border-color: var(--color-border-strong);
}

.invite-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-full);
}

.invite-info {
  flex: 1;
  min-width: 0;
}

.invite-email {
  font-weight: 500;
  color: var(--color-text-primary);
}

.invite-meta {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.status-expired {
  color: var(--color-error);
}

.invite-actions {
  display: flex;
  gap: var(--space-2);
}

.action-btn {
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

.action-btn:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.action-btn.action-danger:hover:not(:disabled) {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-12);
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
}

.empty-state h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.empty-state p {
  margin: 0;
  color: var(--color-text-secondary);
}
</style>
