<script setup lang="ts">
import { useGettingStarted } from '@/composables/useGettingStarted';

const emit = defineEmits<{
  navigate: [route: { name: string }];
}>();

const { items, completedCount, totalCount, progress, isVisible, dismiss, markCompleted } =
  useGettingStarted();

function handleItemClick(id: string, route?: { name: string }) {
  markCompleted(id);
  if (route) {
    emit('navigate', route);
  }
}
</script>

<template>
  <section v-if="isVisible" class="checklist" aria-label="Getting started checklist">
    <!-- Header -->
    <div class="checklist-header">
      <div class="checklist-header-left">
        <svg class="checklist-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect
            x="2"
            y="2"
            width="14"
            height="14"
            rx="3"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M6 9L8 11L12 7"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <h2 class="checklist-title">Getting started</h2>
        <span class="checklist-counter">{{ completedCount }}/{{ totalCount }}</span>
      </div>
      <button type="button" class="dismiss-btn" aria-label="Dismiss checklist" @click="dismiss">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 3L11 11M11 3L3 11"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Progress bar -->
    <div
      class="checklist-progress"
      role="progressbar"
      :aria-valuenow="completedCount"
      :aria-valuemin="0"
      :aria-valuemax="totalCount"
    >
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <!-- Items -->
    <ul class="checklist-items" role="list">
      <li
        v-for="(item, index) in items"
        :key="item.id"
        class="checklist-item"
        :class="{ completed: item.completed, clickable: !!item.route }"
        :style="{ '--stagger': `${index * 40}ms` }"
      >
        <component
          :is="item.route ? 'button' : 'div'"
          :type="item.route ? 'button' : undefined"
          class="item-inner"
          @click="item.route ? handleItemClick(item.id, item.route) : undefined"
        >
          <!-- Check indicator -->
          <div class="item-check" :class="{ done: item.completed }">
            <svg v-if="item.completed" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6L5 8.5L9.5 3.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-else class="item-step">{{ index + 1 }}</span>
          </div>

          <!-- Text -->
          <div class="item-text">
            <span class="item-title">{{ item.title }}</span>
            <span class="item-desc">{{ item.description }}</span>
          </div>

          <!-- Arrow for navigable items -->
          <svg
            v-if="item.route && !item.completed"
            class="item-arrow"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M5 3L9 7L5 11"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </component>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.checklist {
  padding: var(--space-5);
  margin-bottom: var(--space-8);
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  animation: checklist-enter 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes checklist-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

/* Header */
.checklist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.checklist-header-left {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.checklist-icon {
  color: var(--color-accent);
}

.checklist-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.checklist-counter {
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-full);
}

.dismiss-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.dismiss-btn:hover {
  color: var(--color-text-secondary);
  background: var(--color-hover);
}

/* Progress */
.checklist-progress {
  margin-bottom: var(--space-4);
}

.progress-track {
  height: 4px;
  overflow: hidden;
  background: var(--color-border);
  border-radius: var(--radius-full);
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Items */
.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.checklist-item {
  animation: item-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1) var(--stagger) both;
}

@keyframes item-enter {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
}

.item-inner {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-3);
  font-family: inherit;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: var(--radius-lg);
  transition: background var(--transition-fast);
}

.clickable .item-inner {
  cursor: pointer;
}

.clickable .item-inner:hover {
  background: var(--color-hover);
}

.clickable .item-inner:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

/* Check indicator */
.item-check {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  border: 1.5px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.item-check.done {
  color: var(--color-text-inverse);
  background: var(--color-success, var(--color-accent));
  border-color: var(--color-success, var(--color-accent));
}

.item-step {
  line-height: 1;
}

/* Text */
.item-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.item-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  transition: color var(--transition-fast);
}

.completed .item-title {
  color: var(--color-text-tertiary);
  text-decoration: line-through;
  text-decoration-color: var(--color-border-strong);
}

.item-desc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.completed .item-desc {
  opacity: 0.6;
}

/* Arrow */
.item-arrow {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: all var(--transition-fast);
}

.clickable .item-inner:hover .item-arrow {
  opacity: 1;
  transform: translateX(2px);
}

/* Responsive */
@media (max-width: 600px) {
  .checklist {
    padding: var(--space-4);
  }

  .item-desc {
    display: none;
  }
}
</style>
