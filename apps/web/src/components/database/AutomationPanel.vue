<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDatabasesStore } from '@/stores';
import type { Automation, AutomationLog, AutomationTriggerType, AutomationActionType } from '@librediary/shared';

const databasesStore = useDatabasesStore();

// ===========================
// STATE
// ===========================

const view = ref<'list' | 'create' | 'edit' | 'logs'>('list');
const selectedAutomation = ref<Automation | null>(null);
const logs = ref<AutomationLog[]>([]);
const logsLoading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

// Form state
const formName = ref('');
const formTriggerType = ref<AutomationTriggerType>('ROW_CREATED');
const formTriggerPropertyId = ref('');
const formTriggerMatchValue = ref('');
const formTriggerDaysBefore = ref(0);
const formActionType = ref<AutomationActionType>('SEND_NOTIFICATION');
const formActionPropertyId = ref('');
const formActionValue = ref('');
const formActionMessage = ref('');
const formActionPageTitle = ref('');

// ===========================
// OPTIONS
// ===========================

const triggerOptions: Array<{ value: AutomationTriggerType; label: string; hint: string }> = [
  { value: 'ROW_CREATED', label: 'Row created', hint: 'Fires when any new row is added' },
  {
    value: 'PROPERTY_UPDATED',
    label: 'Property updated',
    hint: 'Fires when a specific property changes',
  },
  { value: 'DATE_REACHED', label: 'Date reached', hint: 'Fires when a date property arrives' },
];

const actionOptions: Array<{ value: AutomationActionType; label: string }> = [
  { value: 'UPDATE_PROPERTY', label: 'Update a property' },
  { value: 'SEND_NOTIFICATION', label: 'Send notification' },
  { value: 'CREATE_PAGE', label: 'Create page' },
];

const dateProperties = computed(() =>
  databasesStore.sortedProperties.filter((p) => p.type === 'DATE')
);

const allProperties = computed(() => databasesStore.sortedProperties);

// ===========================
// LIFECYCLE
// ===========================

onMounted(async () => {
  await databasesStore.fetchAutomations();
});

// ===========================
// NAVIGATION
// ===========================

function openCreate() {
  resetForm();
  error.value = null;
  view.value = 'create';
}

function openEdit(automation: Automation) {
  selectedAutomation.value = automation;
  formName.value = automation.name;
  formTriggerType.value = automation.triggerType;
  const tc = (automation.triggerConfig ?? {}) as Record<string, unknown>;
  formTriggerPropertyId.value = (tc.propertyId as string) ?? '';
  formTriggerMatchValue.value = (tc.matchValue as string) ?? '';
  formTriggerDaysBefore.value = (tc.daysBeforeDate as number) ?? 0;
  formActionType.value = automation.actionType;
  const ac = (automation.actionConfig ?? {}) as Record<string, unknown>;
  formActionPropertyId.value = (ac.propertyId as string) ?? '';
  formActionValue.value = ac.value !== undefined ? String(ac.value) : '';
  formActionMessage.value = (ac.message as string) ?? '';
  formActionPageTitle.value = (ac.pageTitle as string) ?? '';
  error.value = null;
  view.value = 'edit';
}

async function openLogs(automation: Automation) {
  selectedAutomation.value = automation;
  view.value = 'logs';
  logsLoading.value = true;
  try {
    logs.value = await databasesStore.fetchAutomationLogs(automation.id);
  } finally {
    logsLoading.value = false;
  }
}

function back() {
  view.value = 'list';
  selectedAutomation.value = null;
  logs.value = [];
}

function resetForm() {
  formName.value = '';
  formTriggerType.value = 'ROW_CREATED';
  formTriggerPropertyId.value = '';
  formTriggerMatchValue.value = '';
  formTriggerDaysBefore.value = 0;
  formActionType.value = 'SEND_NOTIFICATION';
  formActionPropertyId.value = '';
  formActionValue.value = '';
  formActionMessage.value = '';
  formActionPageTitle.value = '';
}

// ===========================
// SAVE / DELETE
// ===========================

function buildPayload() {
  const triggerConfig: Record<string, unknown> = {};
  if (formTriggerType.value === 'PROPERTY_UPDATED') {
    if (formTriggerPropertyId.value) triggerConfig.propertyId = formTriggerPropertyId.value;
    if (formTriggerMatchValue.value) triggerConfig.matchValue = formTriggerMatchValue.value;
  } else if (formTriggerType.value === 'DATE_REACHED') {
    if (formTriggerPropertyId.value) triggerConfig.propertyId = formTriggerPropertyId.value;
    triggerConfig.daysBeforeDate = formTriggerDaysBefore.value;
  }

  const actionConfig: Record<string, unknown> = {};
  if (formActionType.value === 'UPDATE_PROPERTY') {
    actionConfig.propertyId = formActionPropertyId.value;
    actionConfig.value = formActionValue.value;
  } else if (formActionType.value === 'SEND_NOTIFICATION') {
    if (formActionMessage.value) actionConfig.message = formActionMessage.value;
  } else if (formActionType.value === 'CREATE_PAGE') {
    if (formActionPageTitle.value) actionConfig.pageTitle = formActionPageTitle.value;
  }

  return {
    name: formName.value.trim(),
    triggerType: formTriggerType.value,
    triggerConfig: Object.keys(triggerConfig).length ? triggerConfig : undefined,
    actionType: formActionType.value,
    actionConfig: Object.keys(actionConfig).length ? actionConfig : undefined,
  };
}

async function saveCreate() {
  if (!formName.value.trim()) {
    error.value = 'Name is required';
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await databasesStore.createAutomation(buildPayload());
    back();
  } catch {
    error.value = 'Failed to save automation';
  } finally {
    saving.value = false;
  }
}

async function saveEdit() {
  if (!selectedAutomation.value || !formName.value.trim()) {
    error.value = 'Name is required';
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await databasesStore.updateAutomation(selectedAutomation.value.id, buildPayload());
    back();
  } catch {
    error.value = 'Failed to save automation';
  } finally {
    saving.value = false;
  }
}

async function toggleEnabled(automation: Automation) {
  await databasesStore.updateAutomation(automation.id, { isEnabled: !automation.isEnabled });
}

async function confirmDelete(automation: Automation) {
  if (!confirm(`Delete automation "${automation.name}"?`)) return;
  await databasesStore.deleteAutomation(automation.id);
}

// ===========================
// FORMATTING
// ===========================

function formatStatus(status: AutomationLog['status']) {
  return status === 'SUCCESS' ? 'Success' : status === 'FAILED' ? 'Failed' : 'Skipped';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <div class="automation-panel">
    <!-- Header -->
    <div class="ap-header">
      <button v-if="view !== 'list'" class="ap-back" @click="back">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span class="ap-title">
        {{ view === 'list' ? 'Automations' : view === 'logs' ? 'Logs' : view === 'edit' ? 'Edit automation' : 'New automation' }}
      </span>
      <button v-if="view === 'list'" class="ap-new-btn" @click="openCreate">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <path d="M2 6H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        New
      </button>
    </div>

    <!-- LIST VIEW -->
    <div v-if="view === 'list'" class="ap-list">
      <div v-if="databasesStore.automations.length === 0" class="ap-empty">
        No automations yet. Click New to create one.
      </div>
      <div
        v-for="auto in databasesStore.automations"
        :key="auto.id"
        class="ap-item"
        :class="{ 'ap-item--disabled': !auto.isEnabled }"
      >
        <div class="ap-item-info">
          <span class="ap-item-name">{{ auto.name }}</span>
          <span class="ap-item-meta">
            {{ triggerOptions.find((t) => t.value === auto.triggerType)?.label }}
            &rarr;
            {{ actionOptions.find((a) => a.value === auto.actionType)?.label }}
          </span>
        </div>
        <div class="ap-item-actions">
          <button class="ap-icon-btn" title="View logs" @click="openLogs(auto)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="3" width="10" height="8" rx="1" stroke="currentColor" stroke-width="1.2" />
              <path d="M4 6H10" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
              <path d="M4 8.5H8" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
            </svg>
          </button>
          <button class="ap-icon-btn" title="Edit" @click="openEdit(auto)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
            </svg>
          </button>
          <button
            class="ap-icon-btn"
            :title="auto.isEnabled ? 'Disable' : 'Enable'"
            @click="toggleEnabled(auto)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="4" width="12" height="6" rx="3" :fill="auto.isEnabled ? 'var(--color-accent)' : 'var(--color-border)'" />
              <circle :cx="auto.isEnabled ? 10 : 4" cy="7" r="2.5" fill="white" />
            </svg>
          </button>
          <button class="ap-icon-btn ap-icon-btn--danger" title="Delete" @click="confirmDelete(auto)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 4H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
              <path d="M5 4V2.5H9V4" stroke="currentColor" stroke-width="1.2" />
              <path d="M3.5 4L4 11.5H10L10.5 4" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- CREATE / EDIT FORM -->
    <div v-else-if="view === 'create' || view === 'edit'" class="ap-form">
      <div v-if="error" class="ap-error">{{ error }}</div>

      <div class="ap-field">
        <label class="ap-label">Name</label>
        <input v-model="formName" class="ap-input" type="text" placeholder="Automation name" />
      </div>

      <div class="ap-section-title">Trigger</div>

      <div class="ap-field">
        <label class="ap-label">When…</label>
        <select v-model="formTriggerType" class="ap-select">
          <option v-for="t in triggerOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <span class="ap-hint">{{ triggerOptions.find((t) => t.value === formTriggerType)?.hint }}</span>
      </div>

      <div v-if="formTriggerType === 'PROPERTY_UPDATED'" class="ap-field">
        <label class="ap-label">Property</label>
        <select v-model="formTriggerPropertyId" class="ap-select">
          <option value="">Any property</option>
          <option v-for="p in allProperties" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <div v-if="formTriggerType === 'PROPERTY_UPDATED' && formTriggerPropertyId" class="ap-field">
        <label class="ap-label">Only when value is</label>
        <input v-model="formTriggerMatchValue" class="ap-input" type="text" placeholder="Leave blank to fire on any change" />
      </div>

      <div v-if="formTriggerType === 'DATE_REACHED'" class="ap-field">
        <label class="ap-label">Date property</label>
        <select v-model="formTriggerPropertyId" class="ap-select">
          <option value="">Select…</option>
          <option v-for="p in dateProperties" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <div v-if="formTriggerType === 'DATE_REACHED'" class="ap-field">
        <label class="ap-label">Days before date</label>
        <input v-model.number="formTriggerDaysBefore" class="ap-input" type="number" min="0" max="365" />
        <span class="ap-hint">0 = on the date itself</span>
      </div>

      <div class="ap-section-title">Action</div>

      <div class="ap-field">
        <label class="ap-label">Then…</label>
        <select v-model="formActionType" class="ap-select">
          <option v-for="a in actionOptions" :key="a.value" :value="a.value">{{ a.label }}</option>
        </select>
      </div>

      <div v-if="formActionType === 'UPDATE_PROPERTY'">
        <div class="ap-field">
          <label class="ap-label">Property to update</label>
          <select v-model="formActionPropertyId" class="ap-select">
            <option value="">Select…</option>
            <option v-for="p in allProperties" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="ap-field">
          <label class="ap-label">Set value to</label>
          <input v-model="formActionValue" class="ap-input" type="text" placeholder="New value" />
        </div>
      </div>

      <div v-if="formActionType === 'SEND_NOTIFICATION'" class="ap-field">
        <label class="ap-label">Message (optional)</label>
        <input v-model="formActionMessage" class="ap-input" type="text" placeholder="Notification message" />
      </div>

      <div v-if="formActionType === 'CREATE_PAGE'" class="ap-field">
        <label class="ap-label">Page title</label>
        <input v-model="formActionPageTitle" class="ap-input" type="text" placeholder="Automated Page" />
      </div>

      <div class="ap-form-actions">
        <button class="ap-cancel-btn" :disabled="saving" @click="back">Cancel</button>
        <button
          class="ap-save-btn"
          :disabled="saving"
          @click="view === 'create' ? saveCreate() : saveEdit()"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- LOGS VIEW -->
    <div v-else-if="view === 'logs'" class="ap-logs">
      <div v-if="logsLoading" class="ap-empty">Loading logs…</div>
      <div v-else-if="logs.length === 0" class="ap-empty">No logs yet for this automation.</div>
      <div v-for="log in logs" :key="log.id" class="ap-log-row" :class="`ap-log-row--${log.status.toLowerCase()}`">
        <span class="ap-log-status">{{ formatStatus(log.status) }}</span>
        <span class="ap-log-date">{{ formatDate(log.createdAt) }}</span>
        <span v-if="log.durationMs != null" class="ap-log-duration">{{ log.durationMs }}ms</span>
        <span v-if="log.errorMessage" class="ap-log-error">{{ log.errorMessage }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.automation-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  min-width: 320px;
  max-width: 420px;
}

.ap-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ap-back {
  display: flex;
  align-items: center;
  padding: var(--space-1);
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
}
.ap-back:hover { background: var(--color-hover); color: var(--color-text-primary); }

.ap-title {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.ap-new-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  background: transparent;
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.ap-new-btn:hover { background: var(--color-accent); color: var(--color-text-inverse); }

/* LIST */
.ap-list { display: flex; flex-direction: column; gap: var(--space-2); }

.ap-empty {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: center;
  padding: var(--space-4) 0;
}

.ap-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-2-5);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  gap: var(--space-2);
}
.ap-item--disabled { opacity: 0.55; }

.ap-item-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.ap-item-name { font-size: var(--text-sm); font-weight: 500; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-item-meta { font-size: var(--text-xs); color: var(--color-text-tertiary); }

.ap-item-actions { display: flex; align-items: center; gap: var(--space-1); flex-shrink: 0; }

.ap-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}
.ap-icon-btn:hover { background: var(--color-hover); color: var(--color-text-primary); }
.ap-icon-btn--danger:hover { color: var(--color-error); }

/* FORM */
.ap-form { display: flex; flex-direction: column; gap: var(--space-2-5); }

.ap-section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: var(--space-1);
}

.ap-field { display: flex; flex-direction: column; gap: var(--space-1); }

.ap-label { font-size: var(--text-xs); font-weight: 500; color: var(--color-text-tertiary); }

.ap-input,
.ap-select {
  padding: var(--space-1-5) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast);
}
.ap-input:focus, .ap-select:focus { border-color: var(--color-accent); }

.ap-hint { font-size: var(--text-xs); color: var(--color-text-tertiary); }

.ap-error {
  padding: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border-radius: var(--radius-sm);
}

.ap-form-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-top: var(--space-1);
}

.ap-cancel-btn {
  padding: var(--space-1-5) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.ap-cancel-btn:hover { background: var(--color-hover); }

.ap-save-btn {
  padding: var(--space-1-5) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ap-save-btn:hover:not(:disabled) { background: var(--color-accent-hover); }
.ap-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* LOGS */
.ap-logs { display: flex; flex-direction: column; gap: var(--space-1-5); }

.ap-log-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  background: var(--color-surface-sunken);
  border-left: 3px solid transparent;
}
.ap-log-row--success { border-color: var(--color-success, #22c55e); }
.ap-log-row--failed { border-color: var(--color-error); }
.ap-log-row--skipped { border-color: var(--color-text-tertiary); }

.ap-log-status { font-weight: 600; }
.ap-log-row--success .ap-log-status { color: var(--color-success, #22c55e); }
.ap-log-row--failed .ap-log-status { color: var(--color-error); }
.ap-log-row--skipped .ap-log-status { color: var(--color-text-tertiary); }

.ap-log-date { color: var(--color-text-tertiary); }
.ap-log-duration { color: var(--color-text-tertiary); margin-left: auto; }
.ap-log-error { width: 100%; color: var(--color-error); font-size: 11px; margin-top: 2px; }
</style>
