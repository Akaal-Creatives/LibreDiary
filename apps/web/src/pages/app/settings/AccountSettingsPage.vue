<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores';
import { useToast } from '@/composables/useToast';
import { resolveUploadUrl } from '@/utils/uploadUrl';

const { t } = useI18n();
const authStore = useAuthStore();
const toast = useToast();

// Profile
const displayName = ref(authStore.user?.name ?? '');
const savingProfile = ref(false);

watch(
  () => authStore.user?.name,
  (name) => {
    displayName.value = name ?? '';
  }
);

const initials = computed(() => {
  const name = authStore.user?.name ?? authStore.user?.email ?? '?';
  return name
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('');
});

async function saveProfile() {
  const trimmed = displayName.value.trim();
  if (!trimmed) return;
  savingProfile.value = true;
  try {
    await authService.updateProfile({ name: trimmed });
    await authStore.refreshUser();
    toast.success(t('account.profileSaved'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('account.profileSaveError');
    toast.error(msg);
  } finally {
    savingProfile.value = false;
  }
}

// Email
const showEmailForm = ref(false);
const newEmail = ref('');
const emailPassword = ref('');
const savingEmail = ref(false);

async function saveEmail() {
  if (!newEmail.value.trim() || !emailPassword.value) return;
  savingEmail.value = true;
  try {
    await authService.changeEmail(newEmail.value.trim(), emailPassword.value);
    await authStore.refreshUser();
    toast.success(t('account.emailChanged'));
    showEmailForm.value = false;
    newEmail.value = '';
    emailPassword.value = '';
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('account.emailChangeError');
    toast.error(msg);
  } finally {
    savingEmail.value = false;
  }
}

// Password
const showPasswordForm = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const savingPassword = ref(false);

const passwordMismatch = computed(
  () => confirmPassword.value.length > 0 && newPassword.value !== confirmPassword.value
);
const passwordTooShort = computed(
  () => newPassword.value.length > 0 && newPassword.value.length < 8
);
const canSubmitPassword = computed(
  () =>
    currentPassword.value.length > 0 &&
    newPassword.value.length >= 8 &&
    newPassword.value === confirmPassword.value &&
    !savingPassword.value
);

async function savePassword() {
  if (!canSubmitPassword.value) return;
  savingPassword.value = true;
  try {
    await authService.changePassword(currentPassword.value, newPassword.value);
    toast.success(t('account.passwordChanged'));
    showPasswordForm.value = false;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('account.passwordChangeError');
    toast.error(msg);
  } finally {
    savingPassword.value = false;
  }
}
</script>

<template>
  <div class="account-page">
    <header class="page-header">
      <h1 class="page-title">{{ $t('account.title') }}</h1>
      <p class="page-description">{{ $t('account.description') }}</p>
    </header>

    <!-- Profile Section -->
    <section class="settings-section" aria-labelledby="profile-heading">
      <div class="section-header">
        <div class="section-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="7" r="3.5" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M3 17C3 14.2386 5.23858 12 8 12H12C14.7614 12 17 14.2386 17 17"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <h2 id="profile-heading" class="section-title">{{ $t('account.profileSection') }}</h2>
      </div>

      <div class="section-content">
        <div class="profile-layout">
          <div class="avatar-area">
            <div
              v-if="authStore.user?.avatarUrl"
              class="avatar"
              :style="{ backgroundImage: `url(${resolveUploadUrl(authStore.user.avatarUrl)})` }"
              role="img"
              :aria-label="$t('account.avatar')"
            />
            <div
              v-else
              class="avatar avatar-initials"
              role="img"
              :aria-label="$t('account.avatar')"
            >
              {{ initials }}
            </div>
          </div>

          <form class="profile-form" @submit.prevent="saveProfile">
            <div class="form-field">
              <label class="field-label" for="display-name">{{ $t('account.displayName') }}</label>
              <input
                id="display-name"
                v-model="displayName"
                type="text"
                class="field-input"
                maxlength="255"
                :placeholder="$t('account.displayNamePlaceholder')"
              />
            </div>
            <div class="form-actions">
              <button
                type="submit"
                class="btn-primary"
                :disabled="savingProfile || !displayName.trim()"
              >
                {{ savingProfile ? $t('common.saving') : $t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>

    <!-- Email Section -->
    <section class="settings-section" aria-labelledby="email-heading">
      <div class="section-header">
        <div class="section-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect
              x="2"
              y="4"
              width="16"
              height="12"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M2 7L10 12L18 7"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <h2 id="email-heading" class="section-title">{{ $t('account.emailSection') }}</h2>
      </div>

      <div class="section-content">
        <div class="email-current">
          <div class="email-display">
            <span class="email-value">{{ authStore.user?.email }}</span>
            <span
              class="verification-badge"
              :class="authStore.isEmailVerified ? 'verified' : 'unverified'"
            >
              <svg
                v-if="authStore.isEmailVerified"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M6 3.5V6.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <circle cx="6" cy="8.5" r="0.75" fill="currentColor" />
              </svg>
              {{ authStore.isEmailVerified ? $t('account.verified') : $t('account.unverified') }}
            </span>
          </div>

          <button v-if="!showEmailForm" class="btn-outline" @click="showEmailForm = true">
            {{ $t('account.changeEmail') }}
          </button>
        </div>

        <Transition name="expand">
          <form v-if="showEmailForm" class="change-form" @submit.prevent="saveEmail">
            <div class="form-field">
              <label class="field-label" for="new-email">{{ $t('account.newEmail') }}</label>
              <input
                id="new-email"
                v-model="newEmail"
                type="email"
                class="field-input"
                :placeholder="$t('account.newEmailPlaceholder')"
                required
                autocomplete="email"
              />
            </div>
            <div class="form-field">
              <label class="field-label" for="email-password">{{
                $t('account.confirmPassword')
              }}</label>
              <input
                id="email-password"
                v-model="emailPassword"
                type="password"
                class="field-input"
                :placeholder="$t('account.passwordPlaceholder')"
                required
                autocomplete="current-password"
              />
            </div>
            <p class="form-hint">{{ $t('account.emailChangeHint') }}</p>
            <div class="form-actions">
              <button
                type="button"
                class="btn-ghost"
                @click="
                  showEmailForm = false;
                  newEmail = '';
                  emailPassword = '';
                "
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                class="btn-primary"
                :disabled="savingEmail || !newEmail.trim() || !emailPassword"
              >
                {{ savingEmail ? $t('common.saving') : $t('account.updateEmail') }}
              </button>
            </div>
          </form>
        </Transition>
      </div>
    </section>

    <!-- Password Section -->
    <section class="settings-section" aria-labelledby="password-heading">
      <div class="section-header">
        <div class="section-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect
              x="4"
              y="9"
              width="12"
              height="8"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M7 9V6C7 4.34315 8.34315 3 10 3C11.6569 3 13 4.34315 13 6V9"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <circle cx="10" cy="13" r="1" fill="currentColor" />
          </svg>
        </div>
        <h2 id="password-heading" class="section-title">{{ $t('account.passwordSection') }}</h2>
      </div>

      <div class="section-content">
        <button v-if="!showPasswordForm" class="btn-outline" @click="showPasswordForm = true">
          {{ $t('account.changePassword') }}
        </button>

        <Transition name="expand">
          <form v-if="showPasswordForm" class="change-form" @submit.prevent="savePassword">
            <div class="form-field">
              <label class="field-label" for="current-password">{{
                $t('account.currentPassword')
              }}</label>
              <input
                id="current-password"
                v-model="currentPassword"
                type="password"
                class="field-input"
                :placeholder="$t('account.currentPasswordPlaceholder')"
                required
                autocomplete="current-password"
              />
            </div>
            <div class="form-field">
              <label class="field-label" for="new-password">{{ $t('account.newPassword') }}</label>
              <input
                id="new-password"
                v-model="newPassword"
                type="password"
                class="field-input"
                :class="{ 'field-error': passwordTooShort }"
                :placeholder="$t('account.newPasswordPlaceholder')"
                required
                autocomplete="new-password"
              />
              <p v-if="passwordTooShort" class="field-validation">
                {{ $t('account.passwordMinLength') }}
              </p>
            </div>
            <div class="form-field">
              <label class="field-label" for="confirm-password">{{
                $t('account.confirmNewPassword')
              }}</label>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                class="field-input"
                :class="{ 'field-error': passwordMismatch }"
                :placeholder="$t('account.confirmPasswordPlaceholder')"
                required
                autocomplete="new-password"
              />
              <p v-if="passwordMismatch" class="field-validation">
                {{ $t('account.passwordsMustMatch') }}
              </p>
            </div>
            <div class="form-actions">
              <button
                type="button"
                class="btn-ghost"
                @click="
                  showPasswordForm = false;
                  currentPassword = '';
                  newPassword = '';
                  confirmPassword = '';
                "
              >
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="btn-primary" :disabled="!canSubmitPassword">
                {{ savingPassword ? $t('common.saving') : $t('account.updatePassword') }}
              </button>
            </div>
          </form>
        </Transition>
      </div>
    </section>
  </div>
</template>

<style scoped>
.account-page {
  max-width: 680px;
  padding: var(--space-6);
}

/* Page Header */
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
  line-height: var(--leading-relaxed);
}

/* Section Cards */
.settings-section {
  margin-bottom: var(--space-6);
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.section-header {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-5) var(--space-6);
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

.section-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-content {
  padding: var(--space-5) var(--space-6) var(--space-6);
}

/* Profile Layout */
.profile-layout {
  display: flex;
  gap: var(--space-6);
  align-items: flex-start;
}

.avatar-area {
  flex-shrink: 0;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background-size: cover;
  background-position: center;
  border: 2px solid var(--color-border);
}

.avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: 700;
  color: white;
  background: var(--color-accent);
  border-color: var(--color-accent-hover);
  letter-spacing: 0.02em;
  user-select: none;
}

.profile-form {
  flex: 1;
  min-width: 0;
}

/* Form Fields */
.form-field {
  margin-bottom: var(--space-4);
}

.field-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.field-input {
  width: 100%;
  padding: var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.field-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-subtle);
}

.field-input.field-error {
  border-color: var(--color-error);
}

.field-input.field-error:focus {
  box-shadow: 0 0 0 3px var(--color-error-subtle);
}

.field-validation {
  margin: var(--space-1) 0 0;
  font-size: var(--text-xs);
  color: var(--color-error);
}

.form-hint {
  margin: 0 0 var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: var(--leading-relaxed);
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

/* Buttons */
.btn-primary {
  padding: var(--space-2) var(--space-5);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: white;
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition:
    background var(--transition-fast),
    opacity var(--transition-fast);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-primary:active:not(:disabled) {
  background: var(--color-accent-active);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-outline {
  padding: var(--space-2) var(--space-4);
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

.btn-outline:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
  background: var(--color-hover);
}

.btn-ghost {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: color var(--transition-fast);
}

.btn-ghost:hover {
  color: var(--color-text-primary);
}

/* Email Display */
.email-current {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.email-display {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  min-width: 0;
}

.email-value {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.verification-badge {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: var(--radius-full);
  letter-spacing: 0.02em;
}

.verification-badge.verified {
  color: var(--color-success);
  background: var(--color-success-subtle);
}

.verification-badge.unverified {
  color: var(--color-warning);
  background: var(--color-warning-subtle);
}

/* Change Form */
.change-form {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

/* Expand Transition */
.expand-enter-active,
.expand-leave-active {
  transition: all var(--transition-slow);
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Responsive */
@media (max-width: 540px) {
  .profile-layout {
    flex-direction: column;
    align-items: center;
  }

  .profile-form {
    width: 100%;
  }

  .email-current {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .btn-primary,
  .form-actions .btn-ghost {
    width: 100%;
    text-align: center;
  }
}
</style>
