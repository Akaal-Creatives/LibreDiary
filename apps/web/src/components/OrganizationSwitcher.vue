<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores';
import { useOrganizationsStore } from '@/stores/organizations';

const router = useRouter();
const authStore = useAuthStore();
const orgsStore = useOrganizationsStore();

const isOpen = ref(false);

const currentOrg = computed(() => authStore.currentOrganization);
const organizations = computed(() => authStore.organizations);

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

function selectOrganization(orgId: string) {
  if (orgId !== authStore.currentOrganizationId) {
    authStore.setCurrentOrganization(orgId);
    orgsStore.reset();
    // Optionally navigate to dashboard
    router.push({ name: 'dashboard' });
  }
  closeDropdown();
}

function navigateToSettings() {
  closeDropdown();
  router.push({ name: 'organization-settings' });
}

function navigateToMembers() {
  closeDropdown();
  router.push({ name: 'organization-members' });
}

function createNewOrganization() {
  closeDropdown();
  router.push({ name: 'create-organization' });
}
</script>

<template>
  <div class="org-switcher">
    <button class="switcher-button" @click="toggleDropdown">
      <span class="org-icon">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
          <rect
            x="4"
            y="3"
            width="16"
            height="22"
            rx="2"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M8 8H16M8 12H16M8 16H12"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <path
            d="M20 7V23C20 24.1046 20.8954 25 22 25H22C23.1046 25 24 24.1046 24 23V7"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <span class="org-name">{{ currentOrg?.name ?? 'Select Organization' }}</span>
      <span class="org-chevron" :class="{ open: isOpen }">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu">
        <!-- Backdrop for closing -->
        <div class="dropdown-backdrop" @click="closeDropdown"></div>

        <div class="dropdown-content">
          <!-- Current Organization Actions -->
          <div v-if="currentOrg" class="dropdown-section">
            <div class="section-label">{{ currentOrg.name }}</div>
            <button class="dropdown-item" @click="navigateToSettings">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  d="M12.93 9.86C12.8542 10.108 12.8567 10.373 12.9374 10.6195C13.018 10.866 13.1731 11.0824 13.382 11.24L13.438 11.284C13.6055 11.4081 13.7434 11.5677 13.8422 11.7518C13.941 11.9358 13.9985 12.1396 14.0108 12.3484C14.0231 12.5572 13.9899 12.7661 13.9134 12.9601C13.8369 13.1541 13.719 13.3281 13.5678 13.4705C13.4166 13.6129 13.2356 13.7204 13.0375 13.7857C12.8394 13.851 12.629 13.8724 12.4215 13.8481C12.214 13.8239 12.0145 13.7546 11.8373 13.6451C11.6601 13.5357 11.5095 13.389 11.396 13.216L11.352 13.154C11.1906 12.9484 10.9697 12.7971 10.7192 12.7209C10.4687 12.6447 10.2007 12.647 9.952 12.728C9.70839 12.8037 9.49616 12.9537 9.34556 13.1568C9.19495 13.3598 9.11346 13.6054 9.112 13.858V14C9.112 14.4243 8.94358 14.8313 8.64352 15.1314C8.34346 15.4314 7.9365 15.6 7.512 15.6C7.0875 15.6 6.68054 15.4314 6.38048 15.1314C6.08042 14.8313 5.912 14.4243 5.912 14V13.924C5.90365 13.6628 5.81078 13.4114 5.6475 13.2078C5.48422 13.0041 5.25952 12.8594 5.006 12.794C4.75731 12.713 4.48933 12.7107 4.23886 12.7869C3.98839 12.8631 3.76752 13.0144 3.606 13.22L3.562 13.276C3.44851 13.449 3.29787 13.5957 3.12068 13.7051C2.94348 13.8146 2.74399 13.8839 2.53651 13.9081C2.32903 13.9324 2.11858 13.911 1.92052 13.8457C1.72246 13.7804 1.54143 13.6729 1.39022 13.5305C1.23901 13.3881 1.12108 13.2141 1.04459 13.0201C0.968106 12.8261 0.934853 12.6172 0.947168 12.4084C0.959484 12.1996 1.01696 11.9958 1.11576 11.8118C1.21456 11.6277 1.35245 11.4681 1.52 11.344L1.576 11.3C1.78493 11.1424 1.94005 10.926 2.02069 10.6795C2.10133 10.433 2.10386 10.168 2.028 9.92C1.95231 9.67639 1.80227 9.46416 1.59922 9.31356C1.39618 9.16296 1.15064 9.08146 0.898 9.08H0.75C0.325507 9.08 -0.0814271 8.91158 -0.381485 8.61152C-0.681543 8.31146 -0.85 7.9045 -0.85 7.48C-0.85 7.0555 -0.681543 6.64854 -0.381485 6.34848C-0.0814271 6.04842 0.325507 5.88 0.75 5.88H0.826C1.08717 5.87165 1.33857 5.77878 1.54222 5.6155C1.74588 5.45222 1.89064 5.22752 1.956 4.974C2.03699 4.72531 2.03933 4.45733 1.96313 4.20686C1.88693 3.95639 1.73562 3.73552 1.53 3.574L1.474 3.53C1.30092 3.40595 1.15592 3.24781 1.04865 3.06549C0.941386 2.88318 0.874256 2.68078 0.851399 2.47121C0.828542 2.26164 0.850566 2.04952 0.916045 1.84926C0.981524 1.64899 1.08911 1.46513 1.23147 1.31004C1.37383 1.15495 1.54774 1.03215 1.74099 0.949691C1.93425 0.867237 2.14261 0.826919 2.35297 0.831408C2.56333 0.835897 2.76981 0.885095 2.95941 0.975847C3.14902 1.0666 3.31749 1.19699 3.454 1.358L3.51 1.414C3.66745 1.62293 3.88386 1.77805 4.13035 1.85869C4.37685 1.93933 4.64192 1.94186 4.89 1.866L4.974 1.838C5.21761 1.76231 5.42984 1.61227 5.58044 1.40922C5.73104 1.20618 5.81254 0.960644 5.814 0.708V0.56C5.814 0.135507 5.98242 -0.271428 6.28248 -0.571485C6.58254 -0.871543 6.9895 -1.04 7.414 -1.04C7.8385 -1.04 8.24546 -0.871543 8.54552 -0.571485C8.84558 -0.271428 9.014 0.135507 9.014 0.56V0.636C9.02246 0.897172 9.11532 1.14857 9.2786 1.35222C9.44188 1.55588 9.66658 1.70064 9.92 1.766C10.1687 1.84699 10.4367 1.84933 10.6871 1.77313C10.9376 1.69693 11.1585 1.54562 11.32 1.34L11.364 1.284C11.4881 1.11092 11.6462 0.965923 11.8285 0.858662C12.0108 0.751401 12.2132 0.684269 12.4228 0.661413C12.6324 0.638556 12.8445 0.660581 13.0448 0.72606C13.245 0.791539 13.4289 0.899122 13.584 1.04148C13.7391 1.18384 13.8619 1.35774 13.9443 1.55099C14.0268 1.74425 14.0671 1.95261 14.0626 2.16297C14.0581 2.37333 14.0089 2.57981 13.9182 2.76941C13.8274 2.95902 13.697 3.12749 13.536 3.264L13.48 3.32C13.2711 3.47745 13.116 3.69386 13.0353 3.94035C12.9547 4.18685 12.9522 4.45192 13.028 4.7L13.056 4.784C13.1317 5.02761 13.2817 5.23984 13.4848 5.39044C13.6878 5.54104 13.9334 5.62254 14.186 5.624H14.334C14.7585 5.624 15.1655 5.79242 15.4655 6.09248C15.7656 6.39254 15.934 6.7995 15.934 7.224C15.934 7.6485 15.7656 8.05546 15.4655 8.35552C15.1655 8.65558 14.7585 8.824 14.334 8.824H14.258C14.0059 8.82554 13.7604 8.90704 13.5574 9.05764C13.3543 9.20824 13.2043 9.42047 13.128 9.664"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  transform="translate(0.5, 0.5) scale(0.9)"
                />
              </svg>
              <span>Settings</span>
            </button>
            <button class="dropdown-item" @click="navigateToMembers">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M11 14V13C11 11.8954 10.1046 11 9 11H5C3.89543 11 3 11.8954 3 13V14"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  cx="7"
                  cy="6"
                  r="2.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M13 14V13C13 12.0681 12.4016 11.2677 11.5613 11.0291"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M10.5 3.0291C11.3414 3.26689 11.9407 4.06687 11.9407 5C11.9407 5.93313 11.3414 6.73311 10.5 6.9709"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Members</span>
            </button>
          </div>

          <!-- Organizations List -->
          <div class="dropdown-section">
            <div class="section-label">Organizations</div>
            <button
              v-for="org in organizations"
              :key="org.id"
              class="dropdown-item org-item"
              :class="{ active: org.id === authStore.currentOrganizationId }"
              @click="selectOrganization(org.id)"
            >
              <span class="org-avatar" :style="{ backgroundColor: org.accentColor || '#6366f1' }">
                {{ org.name.charAt(0).toUpperCase() }}
              </span>
              <span class="org-item-name">{{ org.name }}</span>
              <svg
                v-if="org.id === authStore.currentOrganizationId"
                class="check-icon"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
              >
                <path
                  d="M11.6667 3.5L5.25 9.91667L2.33333 7"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>

          <!-- Create New -->
          <div class="dropdown-section">
            <button class="dropdown-item create-item" @click="createNewOrganization">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              <span>Create Organization</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.org-switcher {
  position: relative;
}

.switcher-button {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.switcher-button:hover {
  background: var(--color-hover);
}

.org-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
}

.org-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-chevron {
  display: flex;
  align-items: center;
  color: var(--color-text-tertiary);
  transition: transform var(--transition-fast);
}

.org-chevron.open {
  transform: rotate(180deg);
}

/* Dropdown */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  width: 280px;
  margin-top: var(--space-1);
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
}

.dropdown-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.dropdown-section {
  padding: var(--space-2);
}

.dropdown-section:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.section-label {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dropdown-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.dropdown-item:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.dropdown-item.active {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.org-item {
  padding: var(--space-2) var(--space-2);
}

.org-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: white;
  border-radius: var(--radius-sm);
}

.org-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-icon {
  flex-shrink: 0;
  color: var(--color-accent);
}

.create-item {
  color: var(--color-accent);
}

.create-item:hover {
  background: var(--color-accent-subtle);
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
