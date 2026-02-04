<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores';
import { useOrganizationsStore } from '@/stores/organizations';
import { ApiError } from '@/services';
import type { OrgRole } from '@librediary/shared';
import MemberRoleBadge from '@/components/MemberRoleBadge.vue';
import InviteMemberModal from '@/components/InviteMemberModal.vue';

const authStore = useAuthStore();
const orgsStore = useOrganizationsStore();

const loading = ref(true);
const error = ref<string | null>(null);
const showInviteModal = ref(false);

// Selected member for actions
const selectedMember = ref<string | null>(null);
const selectedMemberAction = ref<'role' | 'remove' | null>(null);
const newRole = ref<OrgRole>('MEMBER');
const actionLoading = ref(false);

// Load members
async function loadMembers() {
  loading.value = true;
  error.value = null;
  try {
    await orgsStore.fetchOrganization();
    await orgsStore.fetchMembers();
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to load members';
    }
  } finally {
    loading.value = false;
  }
}

// Watch for organization changes
watch(
  () => authStore.currentOrganizationId,
  () => {
    loadMembers();
  }
);

onMounted(loadMembers);

// Check if current user can modify a member
function canModifyMember(memberRole: OrgRole, memberUserId: string): boolean {
  // Can't modify yourself via member actions
  if (memberUserId === authStore.user?.id) return false;
  // Owners can modify anyone
  if (orgsStore.isOwner) return true;
  // Admins can only modify members
  if (orgsStore.isAdmin && memberRole === 'MEMBER') return true;
  return false;
}

// Open role change modal
function openRoleChange(memberId: string, currentRole: OrgRole) {
  selectedMember.value = memberId;
  selectedMemberAction.value = 'role';
  newRole.value = currentRole;
}

// Open remove confirmation
function openRemoveConfirm(memberId: string) {
  selectedMember.value = memberId;
  selectedMemberAction.value = 'remove';
}

// Close action modal
function closeActionModal() {
  selectedMember.value = null;
  selectedMemberAction.value = null;
  actionLoading.value = false;
}

// Handle role change
async function handleRoleChange() {
  if (!selectedMember.value) return;

  actionLoading.value = true;
  error.value = null;

  try {
    await orgsStore.updateMemberRole(selectedMember.value, newRole.value);
    closeActionModal();
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to update role';
    }
    actionLoading.value = false;
  }
}

// Handle member removal
async function handleRemoveMember() {
  if (!selectedMember.value) return;

  actionLoading.value = true;
  error.value = null;

  try {
    await orgsStore.removeMember(selectedMember.value);
    closeActionModal();
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to remove member';
    }
    actionLoading.value = false;
  }
}

// Get selected member info
const selectedMemberInfo = computed(() => {
  if (!selectedMember.value) return null;
  return orgsStore.members.find((m) => m.id === selectedMember.value);
});

// Available roles for assignment
const availableRoles = computed<{ value: OrgRole; label: string }[]>(() => {
  if (orgsStore.isOwner) {
    return [
      { value: 'MEMBER', label: 'Member' },
      { value: 'ADMIN', label: 'Admin' },
      { value: 'OWNER', label: 'Owner' },
    ];
  }
  return [{ value: 'MEMBER', label: 'Member' }];
});
</script>

<template>
  <div class="members-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Members</h1>
        <p class="page-subtitle">
          Manage who has access to {{ authStore.currentOrganization?.name }}
        </p>
      </div>
      <button
        v-if="orgsStore.canManageMembers"
        class="btn btn-primary"
        @click="showInviteModal = true"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 3V13M3 8H13"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <span>Invite Member</span>
      </button>
    </div>

    <div v-if="error" class="alert alert-error">
      {{ error }}
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading members...</p>
    </div>

    <div v-else class="members-list">
      <div v-for="member in orgsStore.members" :key="member.id" class="member-card">
        <div class="member-avatar">
          {{
            member.user.name?.charAt(0).toUpperCase() || member.user.email.charAt(0).toUpperCase()
          }}
        </div>
        <div class="member-info">
          <div class="member-name">
            {{ member.user.name || member.user.email }}
            <span v-if="member.userId === authStore.user?.id" class="you-badge">(You)</span>
          </div>
          <div class="member-email">{{ member.user.email }}</div>
        </div>
        <MemberRoleBadge :role="member.role" />
        <div v-if="canModifyMember(member.role, member.userId)" class="member-actions">
          <button
            class="action-btn"
            title="Change role"
            @click="openRoleChange(member.id, member.role)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2.5 12.5L6 9L2.5 5.5M9 3H13.5M9 8H11.5M9 13H13.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            class="action-btn action-danger"
            title="Remove member"
            @click="openRemoveConfirm(member.id)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2.5 4.5H13.5M6 4.5V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4.5M12 4.5V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V4.5H12Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="orgsStore.members.length === 0" class="empty-state">
        <p>No members found</p>
      </div>
    </div>

    <!-- Invite Modal -->
    <InviteMemberModal
      :open="showInviteModal"
      @close="showInviteModal = false"
      @invited="loadMembers()"
    />

    <!-- Role Change Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="selectedMemberAction === 'role'"
          class="modal-overlay"
          @click.self="closeActionModal"
        >
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title">Change Role</h2>
            </div>
            <div class="modal-body">
              <p class="modal-text">
                Change role for
                <strong>{{
                  selectedMemberInfo?.user.name || selectedMemberInfo?.user.email
                }}</strong>
              </p>
              <div class="form-group">
                <label for="new-role" class="form-label">Role</label>
                <select
                  id="new-role"
                  v-model="newRole"
                  class="form-select"
                  :disabled="actionLoading"
                >
                  <option v-for="role in availableRoles" :key="role.value" :value="role.value">
                    {{ role.label }}
                  </option>
                </select>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" :disabled="actionLoading" @click="closeActionModal">
                Cancel
              </button>
              <button class="btn btn-primary" :disabled="actionLoading" @click="handleRoleChange">
                {{ actionLoading ? 'Updating...' : 'Update Role' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Remove Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="selectedMemberAction === 'remove'"
          class="modal-overlay"
          @click.self="closeActionModal"
        >
          <div class="modal danger-modal">
            <div class="modal-header">
              <h2 class="modal-title">Remove Member</h2>
            </div>
            <div class="modal-body">
              <p class="modal-text">
                Are you sure you want to remove
                <strong>{{
                  selectedMemberInfo?.user.name || selectedMemberInfo?.user.email
                }}</strong>
                from this organization? They will lose access to all organization content.
              </p>
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" :disabled="actionLoading" @click="closeActionModal">
                Cancel
              </button>
              <button class="btn btn-danger" :disabled="actionLoading" @click="handleRemoveMember">
                {{ actionLoading ? 'Removing...' : 'Remove Member' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.members-page {
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

.btn-secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-hover);
}

.btn-danger {
  color: white;
  background: var(--color-error);
}

.btn-danger:hover:not(:disabled) {
  filter: brightness(0.9);
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

.members-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.member-card {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.member-card:hover {
  border-color: var(--color-border-strong);
}

.member-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: var(--text-base);
  font-weight: 600;
  color: white;
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  font-weight: 500;
  color: var(--color-text-primary);
}

.you-badge {
  font-size: var(--text-xs);
  font-weight: normal;
  color: var(--color-text-tertiary);
}

.member-email {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.member-actions {
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

.action-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.action-btn.action-danger:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.empty-state {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-tertiary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.5);
}

.modal {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
}

.danger-modal .modal-title {
  color: var(--color-error);
}

.modal-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-body {
  padding: var(--space-6);
}

.modal-text {
  margin: 0 0 var(--space-4);
  color: var(--color-text-secondary);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-select {
  width: 100%;
  padding: var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: all var(--transition-fast);
}

.form-select:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.form-select:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.modal-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95) translateY(10px);
}
</style>
