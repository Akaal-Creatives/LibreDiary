<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useOnboardingTour } from '@/composables/useOnboardingTour';

const { t } = useI18n();
const tour = useOnboardingTour();

const tooltipStyle = ref<Record<string, string>>({});
const spotlightStyle = ref<Record<string, string>>({});

function positionTooltip() {
  const stepData = tour.currentStepData.value;
  if (!stepData) return;

  const target = document.querySelector(stepData.targetSelector);
  if (!target) {
    // If target not found, centre the tooltip
    tooltipStyle.value = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
    spotlightStyle.value = { display: 'none' };
    return;
  }

  const rect = target.getBoundingClientRect();
  const padding = 8;

  // Spotlight cutout
  spotlightStyle.value = {
    top: `${rect.top - padding}px`,
    left: `${rect.left - padding}px`,
    width: `${rect.width + padding * 2}px`,
    height: `${rect.height + padding * 2}px`,
    borderRadius: '8px',
  };

  // Tooltip position
  const tooltipWidth = 320;
  const tooltipHeight = 180;
  const margin = 8; // Minimum distance from viewport edges

  let top = 0;
  let left = 0;

  switch (stepData.placement) {
    case 'right':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + 16;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - 16;
      break;
    case 'top':
      top = rect.top - tooltipHeight - 16;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'bottom':
      top = rect.bottom + 16;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      break;
    case 'centre':
    default:
      tooltipStyle.value = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
      return;
  }

  // Clamp to viewport bounds
  left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin));

  tooltipStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
  };
}

watch(
  () => [tour.isActive.value, tour.currentStep.value],
  async () => {
    if (tour.isActive.value) {
      await nextTick();
      positionTooltip();
    }
  },
  { immediate: true }
);

// Reposition on resize
function handleResize() {
  if (tour.isActive.value) {
    positionTooltip();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', handleResize);
}

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div
        v-if="tour.isActive.value"
        class="tour-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('tour.title')"
      >
        <!-- Full-screen backdrop with spotlight cutout -->
        <div class="tour-backdrop">
          <div class="tour-spotlight" :style="spotlightStyle" />
        </div>

        <!-- Tooltip -->
        <div class="tour-tooltip" :style="tooltipStyle">
          <div class="tooltip-header">
            <h3 class="tooltip-title">
              {{ tour.currentStepData.value ? t(tour.currentStepData.value.titleKey) : '' }}
            </h3>
            <button class="skip-btn" @click="tour.skip()">
              {{ t('tour.skip') }}
            </button>
          </div>

          <p class="tooltip-description">
            {{ tour.currentStepData.value ? t(tour.currentStepData.value.descriptionKey) : '' }}
          </p>

          <div class="tooltip-footer">
            <span class="step-indicator">
              {{
                t('tour.stepIndicator', {
                  current: tour.currentStep.value + 1,
                  total: tour.totalSteps.value,
                })
              }}
            </span>
            <div class="tooltip-actions">
              <button
                v-if="tour.currentStep.value > 0"
                class="tour-btn tour-btn-secondary"
                @click="tour.previous()"
              >
                {{ t('tour.previous') }}
              </button>
              <button class="tour-btn tour-btn-primary" @click="tour.next()">
                {{
                  tour.currentStep.value === tour.totalSteps.value - 1
                    ? t('tour.finish')
                    : t('tour.next')
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tour-overlay {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-tooltip) + 10);
}

.tour-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.tour-spotlight {
  position: absolute;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
  background: transparent;
  pointer-events: none;
}

.tour-tooltip {
  position: fixed;
  width: 320px;
  padding: var(--space-5);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  z-index: 1;
}

.tooltip-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.tooltip-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.skip-btn {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.skip-btn:hover {
  color: var(--color-text-secondary);
  background: var(--color-hover);
}

.tooltip-description {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
}

.tooltip-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.step-indicator {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.tooltip-actions {
  display: flex;
  gap: var(--space-2);
}

.tour-btn {
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.tour-btn-primary {
  color: var(--color-text-inverse);
  background: var(--color-accent);
}

.tour-btn-primary:hover {
  background: var(--color-accent-hover);
}

.tour-btn-secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
}

.tour-btn-secondary:hover {
  background: var(--color-hover);
}

/* Transitions */
.tour-fade-enter-active,
.tour-fade-leave-active {
  transition: opacity var(--transition-slow);
}

.tour-fade-enter-from,
.tour-fade-leave-to {
  opacity: 0;
}
</style>
