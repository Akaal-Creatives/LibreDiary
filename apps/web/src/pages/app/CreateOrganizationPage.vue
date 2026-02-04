<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useOrganizationsStore } from '@/stores/organizations';
import { ApiError } from '@/services';

const router = useRouter();
const orgsStore = useOrganizationsStore();

const form = ref({
  name: '',
  slug: '',
});

const loading = ref(false);
const error = ref<string | null>(null);

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

function handleNameChange() {
  // Auto-generate slug from name if slug is empty or matches previous auto-generated slug
  form.value.slug = generateSlug(form.value.name);
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    error.value = 'Organization name is required';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    await orgsStore.createOrganization({
      name: form.value.name.trim(),
      slug: form.value.slug.trim() || undefined,
    });
    router.push({ name: 'dashboard' });
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Failed to create organization';
    }
  } finally {
    loading.value = false;
  }
}

function handleCancel() {
  router.back();
}
</script>

<template>
  <div class="create-org-page">
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Create Organization</h1>
        <p class="page-subtitle">Create a new organization to collaborate with your team.</p>
      </div>

      <div v-if="error" class="alert alert-error">
        {{ error }}
      </div>

      <form class="create-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="org-name" class="form-label">Organization name</label>
          <input
            id="org-name"
            v-model="form.name"
            type="text"
            class="form-input"
            placeholder="My Organization"
            :disabled="loading"
            @input="handleNameChange"
          />
        </div>

        <div class="form-group">
          <label for="org-slug" class="form-label">URL slug</label>
          <div class="input-prefix-wrapper">
            <span class="input-prefix">librediary.app/</span>
            <input
              id="org-slug"
              v-model="form.slug"
              type="text"
              class="form-input slug-input"
              placeholder="my-organization"
              :disabled="loading"
            />
          </div>
          <p class="form-help">
            Used in URLs to identify your organization. Only lowercase letters, numbers, and
            hyphens.
          </p>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" :disabled="loading" @click="handleCancel">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Creating...' : 'Create Organization' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create-org-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 100px);
  padding: var(--space-6);
}

.page-container {
  width: 100%;
  max-width: 480px;
}

.page-header {
  margin-bottom: var(--space-8);
  text-align: center;
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

.alert {
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  border-radius: var(--radius-md);
}

.alert-error {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.create-form {
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-input {
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

.form-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.form-input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.input-prefix-wrapper {
  display: flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.input-prefix-wrapper:focus-within {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.input-prefix {
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
  border-right: 1px solid var(--color-border);
}

.slug-input {
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.slug-input:focus {
  box-shadow: none;
}

.form-help {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.form-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding-top: var(--space-4);
  margin-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: var(--space-3) var(--space-5);
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

.btn-secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-hover);
}

.btn-primary {
  color: white;
  background: var(--color-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}
</style>
