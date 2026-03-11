<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores';
import { useTheme } from '@/composables';

const router = useRouter();
const authStore = useAuthStore();
const { theme, toggleTheme } = useTheme();

const currentStep = ref(1);
const totalSteps = 4;
const loading = ref(false);
const error = ref('');

// Step 1: Use-case selection
const selectedUseCase = ref<string | null>(null);
const useCases = [
  {
    id: 'personal',
    icon: 'journal',
    title: 'Personal Notes',
    description: 'Private journal, daily notes, and personal knowledge base.',
  },
  {
    id: 'team',
    icon: 'team',
    title: 'Team Wiki',
    description: 'Shared documentation, meeting notes, and team knowledge.',
  },
  {
    id: 'project',
    icon: 'project',
    title: 'Project Tracker',
    description: 'Tasks, databases, and project planning tools.',
  },
] as const;

// Step 2: Preferences
const displayName = ref(authStore.user?.name || '');

// Step 3: First action
type FirstAction = 'blank' | 'template';
const firstAction = ref<FirstAction>('blank');

// Validation
const step1Valid = computed(() => !!selectedUseCase.value);
const step2Valid = computed(() => displayName.value.trim().length > 0);
const step3Valid = computed(() => !!firstAction.value);

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return step1Valid.value;
    case 2:
      return step2Valid.value;
    case 3:
      return step3Valid.value;
    default:
      return false;
  }
});

// Navigation
function nextStep() {
  if (currentStep.value < totalSteps && canProceed.value) {
    error.value = '';
    currentStep.value++;
    // Focus the panel on step change for accessibility
    nextTick(() => {
      const panel = document.querySelector('.step-panel') as HTMLElement | null;
      panel?.focus();
    });
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    error.value = '';
    currentStep.value--;
  }
}

function selectUseCase(id: string) {
  selectedUseCase.value = id;
}

// Complete onboarding
async function completeOnboarding() {
  if (!canProceed.value) return;

  loading.value = true;
  error.value = '';

  try {
    // Persist use-case selection for future reference
    if (selectedUseCase.value) {
      localStorage.setItem('librediary-use-case', selectedUseCase.value);
    }

    // Update display name if changed
    if (displayName.value.trim() !== (authStore.user?.name || '')) {
      const { authService } = await import('@/services');
      await authService.updateProfile({ name: displayName.value.trim() });
    }

    await authStore.completeOnboarding();
    currentStep.value = 4;

    // Redirect to dashboard after a brief moment on success screen
    setTimeout(() => {
      if (firstAction.value === 'template') {
        router.push({ name: 'templates' });
      } else {
        router.push({ name: 'dashboard' });
      }
    }, 2400);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Something went wrong';
  } finally {
    loading.value = false;
  }
}

// If already onboarded, redirect
onMounted(() => {
  if (authStore.isOnboardingCompleted) {
    router.replace({ name: 'dashboard' });
  }
});
</script>

<template>
  <div class="onboarding-page">
    <!-- Background decorations (matching SetupWizardPage) -->
    <div class="bg-decoration">
      <div class="leaf leaf-1"></div>
      <div class="leaf leaf-2"></div>
      <div class="leaf leaf-3"></div>
      <div class="glow"></div>
    </div>

    <!-- Theme Toggle -->
    <button class="theme-toggle" :title="`Theme: ${theme}`" @click="toggleTheme">
      <svg v-if="theme === 'light'" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="4" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M10 2.5V4M10 16V17.5M2.5 10H4M16 10H17.5M4.7 4.7L5.76 5.76M14.24 14.24L15.3 15.3M4.7 15.3L5.76 14.24M14.24 5.76L15.3 4.7"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      <svg v-else-if="theme === 'dark'" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M17.5 11.5C16.5 12.5 15.1 13.1 13.6 13.1C10.5 13.1 8 10.6 8 7.5C8 5.9 8.6 4.5 9.6 3.5C5.8 4.2 3 7.5 3 11.5C3 16 6.6 19.5 11 19.5C15 19.5 18.3 16.7 19 12.9C18.6 12.5 18.1 12 17.5 11.5Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect
          x="2.5"
          y="4"
          width="15"
          height="11"
          rx="1.5"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path d="M6.5 18H13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M10 15V18" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>

    <div class="onboarding-container">
      <!-- Header -->
      <div class="onboarding-header">
        <div class="logo">
          <svg class="logo-icon" width="48" height="48" viewBox="0 0 28 28" fill="none">
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
        </div>
        <h1 class="title">Welcome{{ authStore.user?.name ? `, ${authStore.user.name}` : '' }}</h1>
        <p class="subtitle">Let's set up your workspace in a few quick steps.</p>
      </div>

      <!-- Progress Indicator -->
      <div
        v-if="currentStep < 4"
        class="progress-container"
        role="progressbar"
        :aria-valuenow="currentStep"
        :aria-valuemin="1"
        :aria-valuemax="3"
      >
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${((currentStep - 1) / (totalSteps - 2)) * 100}%` }"
          ></div>
        </div>
        <div class="progress-steps">
          <div
            v-for="step in 3"
            :key="step"
            class="progress-step"
            :class="{
              active: step === currentStep,
              completed: step < currentStep,
            }"
          >
            <div class="step-dot">
              <svg v-if="step < currentStep" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6L5 8.5L9.5 4"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span v-else>{{ step }}</span>
            </div>
            <span class="step-label">{{ ['Use Case', 'Profile', 'Get Started'][step - 1] }}</span>
          </div>
        </div>
      </div>

      <!-- Error Banner -->
      <Transition name="fade">
        <div v-if="error" class="error-banner" role="alert">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M9 5.5V9.5M9 12V12.01"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>{{ error }}</span>
        </div>
      </Transition>

      <!-- Step Content -->
      <div class="step-content">
        <Transition name="slide" mode="out-in">
          <!-- Step 1: Use Case -->
          <div v-if="currentStep === 1" key="step1" class="step-panel" tabindex="-1">
            <div class="step-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M8 6H24C25.1 6 26 6.9 26 8V24C26 25.1 25.1 26 24 26H8C6.9 26 6 25.1 6 24V8C6 6.9 6.9 6 8 6Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path d="M6 12H26" stroke="currentColor" stroke-width="1.5" />
                <path d="M13 12V26" stroke="currentColor" stroke-width="1.5" />
              </svg>
            </div>
            <h2>How will you use LibreDiary?</h2>
            <p class="step-description">
              This helps us tailor your experience. You can always change this later.
            </p>

            <div class="use-case-grid" role="radiogroup" aria-label="Use case selection">
              <button
                v-for="uc in useCases"
                :key="uc.id"
                type="button"
                class="use-case-card"
                :class="{ selected: selectedUseCase === uc.id }"
                role="radio"
                :aria-checked="selectedUseCase === uc.id"
                @click="selectUseCase(uc.id)"
                @keydown.enter="selectUseCase(uc.id)"
              >
                <div class="use-case-icon">
                  <!-- Journal icon -->
                  <svg
                    v-if="uc.icon === 'journal'"
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                  >
                    <rect
                      x="5"
                      y="3"
                      width="18"
                      height="22"
                      rx="2"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                    <path
                      d="M9 8H19M9 12H19M9 16H15"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                  <!-- Team icon -->
                  <svg
                    v-else-if="uc.icon === 'team'"
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                  >
                    <circle cx="10" cy="9" r="3" stroke="currentColor" stroke-width="1.5" />
                    <circle cx="19" cy="9" r="3" stroke="currentColor" stroke-width="1.5" />
                    <path
                      d="M4 22C4 18.7 6.7 16 10 16C11.3 16 12.5 16.4 13.5 17.1"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M14.5 17.1C15.5 16.4 16.7 16 18 16C21.3 16 24 18.7 24 22"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                  <!-- Project icon -->
                  <svg v-else width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect
                      x="4"
                      y="6"
                      width="20"
                      height="16"
                      rx="2"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                    <path d="M4 11H24" stroke="currentColor" stroke-width="1.5" />
                    <path d="M9 11V22" stroke="currentColor" stroke-width="1.5" />
                    <rect
                      x="11"
                      y="14"
                      width="4"
                      height="2"
                      rx="0.5"
                      stroke="currentColor"
                      stroke-width="1"
                    />
                    <rect
                      x="11"
                      y="18"
                      width="6"
                      height="2"
                      rx="0.5"
                      stroke="currentColor"
                      stroke-width="1"
                    />
                  </svg>
                </div>
                <div class="use-case-text">
                  <h3>{{ uc.title }}</h3>
                  <p>{{ uc.description }}</p>
                </div>
                <div class="use-case-check">
                  <svg
                    v-if="selectedUseCase === uc.id"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <circle cx="10" cy="10" r="8" fill="currentColor" />
                    <path
                      d="M6.5 10L9 12.5L13.5 8"
                      stroke="var(--color-text-inverse)"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <div v-else class="check-empty"></div>
                </div>
              </button>
            </div>
          </div>

          <!-- Step 2: Profile -->
          <div v-else-if="currentStep === 2" key="step2" class="step-panel" tabindex="-1">
            <div class="step-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="12" r="5" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M6 28C6 22.4772 10.4772 18 16 18C21.5228 18 26 22.4772 26 28"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <h2>Set up your profile</h2>
            <p class="step-description">How would you like to be known in your workspace?</p>

            <div class="form-grid">
              <div class="form-field">
                <label for="displayName">Display name</label>
                <input
                  id="displayName"
                  v-model="displayName"
                  type="text"
                  placeholder="Your name"
                  maxlength="255"
                  autocomplete="name"
                  autofocus
                />
                <span class="field-hint">This is how you'll appear to other members.</span>
              </div>
            </div>

            <!-- Avatar preview -->
            <div class="profile-preview">
              <div class="avatar-circle">
                {{ displayName.trim() ? displayName.trim()[0]?.toUpperCase() : '?' }}
              </div>
              <div class="preview-details">
                <span class="preview-name">{{ displayName.trim() || 'Your Name' }}</span>
                <span class="preview-email">{{ authStore.user?.email }}</span>
              </div>
            </div>
          </div>

          <!-- Step 3: Get Started -->
          <div v-else-if="currentStep === 3" key="step3" class="step-panel" tabindex="-1">
            <div class="step-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 6V26M6 16H26"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <rect
                  x="6"
                  y="6"
                  width="20"
                  height="20"
                  rx="4"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
              </svg>
            </div>
            <h2>Create your first page</h2>
            <p class="step-description">
              Start with a blank page or browse templates for inspiration.
            </p>

            <div class="action-options" role="radiogroup" aria-label="First page action">
              <button
                type="button"
                class="action-option"
                :class="{ selected: firstAction === 'blank' }"
                role="radio"
                :aria-checked="firstAction === 'blank'"
                @click="firstAction = 'blank'"
              >
                <div class="action-option-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 21L7.5 17.5M7.5 17.5L16 9C16.9 8.1 18.4 8.1 19.3 9C20.2 9.9 20.2 11.4 19.3 12.3L10.8 20.8H7.5V17.5Z"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <div class="action-option-text">
                  <h3>Start with a blank page</h3>
                  <p>Jump straight in and start writing.</p>
                </div>
                <div class="option-radio">
                  <div v-if="firstAction === 'blank'" class="radio-filled"></div>
                </div>
              </button>

              <button
                type="button"
                class="action-option"
                :class="{ selected: firstAction === 'template' }"
                role="radio"
                :aria-checked="firstAction === 'template'"
                @click="firstAction = 'template'"
              >
                <div class="action-option-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="4"
                      width="16"
                      height="16"
                      rx="2"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                    <path d="M4 9H20" stroke="currentColor" stroke-width="1.5" />
                    <path d="M9 9V20" stroke="currentColor" stroke-width="1.5" />
                  </svg>
                </div>
                <div class="action-option-text">
                  <h3>Browse templates</h3>
                  <p>Choose from ready-made templates to get started faster.</p>
                </div>
                <div class="option-radio">
                  <div v-if="firstAction === 'template'" class="radio-filled"></div>
                </div>
              </button>
            </div>
          </div>

          <!-- Step 4: Success -->
          <div
            v-else-if="currentStep === 4"
            key="step4"
            class="step-panel success-panel"
            tabindex="-1"
          >
            <div class="success-animation">
              <div class="success-circle">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path
                    class="check-path"
                    d="M12 24L20 32L36 16"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div class="success-rings">
                <div class="ring ring-1"></div>
                <div class="ring ring-2"></div>
                <div class="ring ring-3"></div>
              </div>
            </div>
            <h2>You're all set!</h2>
            <p class="step-description">Your workspace is ready. Taking you to your dashboard...</p>
          </div>
        </Transition>
      </div>

      <!-- Navigation Buttons -->
      <div v-if="currentStep < 4" class="step-navigation">
        <button v-if="currentStep > 1" class="btn-secondary" @click="prevStep">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Back
        </button>
        <div v-else class="spacer"></div>

        <button
          v-if="currentStep < 3"
          class="btn-primary"
          :disabled="!canProceed"
          @click="nextStep"
        >
          Continue
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

        <button
          v-else-if="currentStep === 3"
          class="btn-primary"
          :disabled="!canProceed || loading"
          @click="completeOnboarding"
        >
          <span v-if="loading" class="loading-spinner"></span>
          <template v-else>
            Let's go
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8L6 11L13 4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </template>
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="onboarding-footer">
      <p>
        Developed by
        <a href="https://www.akaalcreatives.com" target="_blank" rel="noopener">Akaal Creatives</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Base Layout */
.onboarding-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-6);
  overflow: hidden;
  background: var(--color-background);
}

/* Background Decorations */
.bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.leaf {
  position: absolute;
  width: 300px;
  height: 300px;
  background: var(--color-accent);
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  opacity: 0.04;
}

.leaf-1 {
  top: -100px;
  right: -50px;
  animation: float 20s ease-in-out infinite;
}

.leaf-2 {
  bottom: -80px;
  left: -100px;
  width: 400px;
  height: 400px;
  animation: float 25s ease-in-out infinite reverse;
}

.leaf-3 {
  top: 40%;
  right: 10%;
  width: 200px;
  height: 200px;
  animation: float 18s ease-in-out infinite 5s;
}

.glow {
  position: absolute;
  top: 20%;
  left: 30%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--color-accent-subtle) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 0.5;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(10px, -15px) rotate(5deg);
  }
  50% {
    transform: translate(-5px, 10px) rotate(-3deg);
  }
  75% {
    transform: translate(15px, 5px) rotate(2deg);
  }
}

/* Theme Toggle */
.theme-toggle {
  position: fixed;
  top: var(--space-5);
  right: var(--space-5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* Container */
.onboarding-container {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 520px;
}

/* Header */
.onboarding-header {
  margin-bottom: var(--space-8);
  text-align: center;
}

.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: var(--space-5);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-2xl);
  animation: pulse-glow 3s ease-in-out infinite;
}

.logo-icon {
  color: var(--color-accent);
}

@keyframes pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--color-accent-subtle);
  }
  50% {
    box-shadow: 0 0 0 12px transparent;
  }
}

.title {
  margin-bottom: var(--space-2);
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

/* Progress */
.progress-container {
  width: 100%;
  margin-bottom: var(--space-8);
}

.progress-bar {
  height: 4px;
  margin-bottom: var(--space-4);
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

.progress-steps {
  display: flex;
  justify-content: space-between;
}

.progress-step {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
}

.step-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: all var(--transition-base);
}

.progress-step.active .step-dot {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: 0 0 0 4px var(--color-accent-subtle);
  transform: scale(1.1);
}

.progress-step.completed .step-dot {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.step-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  transition: color var(--transition-fast);
}

.progress-step.active .step-label,
.progress-step.completed .step-label {
  color: var(--color-text-secondary);
}

/* Error Banner */
.error-banner {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-4);
  margin-bottom: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-radius: var(--radius-lg);
}

/* Step Content */
.step-content {
  width: 100%;
  min-height: 380px;
}

.step-panel {
  display: flex;
  flex-direction: column;
  padding: var(--space-8);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  outline: none;
}

.step-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: var(--space-5);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-xl);
}

.step-panel h2 {
  margin-bottom: var(--space-2);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.step-description {
  margin-bottom: var(--space-6);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

/* Use Case Cards */
.use-case-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.use-case-card {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-base);
}

.use-case-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.use-case-card.selected {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
}

.use-case-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-lg);
}

.use-case-card.selected .use-case-icon {
  color: var(--color-text-inverse);
  background: var(--color-accent);
}

.use-case-text {
  flex: 1;
  min-width: 0;
}

.use-case-text h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.use-case-text p {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.use-case-check {
  flex-shrink: 0;
  color: var(--color-accent);
}

.check-empty {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-full);
}

.use-case-card.selected .check-empty {
  border-color: var(--color-accent);
}

/* Form Fields */
.form-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-field label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-field input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-lg);
  outline: none;
  transition: all var(--transition-fast);
}

.form-field input::placeholder {
  color: var(--color-text-tertiary);
}

.form-field input:focus {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

/* Profile Preview */
.profile-preview {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  margin-top: var(--space-6);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-lg);
}

.avatar-circle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

.preview-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.preview-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.preview-email {
  overflow: hidden;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Action Options (Step 3) */
.action-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.action-option {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-base);
}

.action-option:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.action-option.selected {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent);
}

.action-option-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-lg);
}

.action-option.selected .action-option-icon {
  color: var(--color-text-inverse);
  background: var(--color-accent);
}

.action-option-text {
  flex: 1;
  min-width: 0;
}

.action-option-text h3 {
  margin: 0 0 var(--space-1);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.action-option-text p {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.option-radio {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-full);
  transition: border-color var(--transition-fast);
}

.action-option.selected .option-radio {
  border-color: var(--color-accent);
}

.radio-filled {
  width: 10px;
  height: 10px;
  background: var(--color-accent);
  border-radius: var(--radius-full);
  animation: radio-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes radio-pop {
  0% {
    transform: scale(0);
  }
  100% {
    transform: scale(1);
  }
}

/* Success Panel */
.success-panel {
  align-items: center;
  text-align: center;
}

.success-animation {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: var(--space-6);
}

.success-circle {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: 50%;
  animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.check-path {
  stroke-dasharray: 50;
  stroke-dashoffset: 50;
  animation: draw-check 0.4s ease-out 0.3s forwards;
}

@keyframes pop-in {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes draw-check {
  to {
    stroke-dashoffset: 0;
  }
}

.success-rings {
  position: absolute;
  inset: 0;
}

.ring {
  position: absolute;
  inset: 0;
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  opacity: 0;
}

.ring-1 {
  animation: ring-expand 1s ease-out 0.2s;
}
.ring-2 {
  animation: ring-expand 1s ease-out 0.4s;
}
.ring-3 {
  animation: ring-expand 1s ease-out 0.6s;
}

@keyframes ring-expand {
  0% {
    opacity: 0.6;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(2);
  }
}

/* Navigation */
.step-navigation {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: var(--space-6);
}

.spacer {
  flex: 1;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
  height: 48px;
  padding: 0 var(--space-6);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary {
  color: var(--color-text-inverse);
  background: var(--color-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-secondary {
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-text-inverse);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Footer */
.onboarding-footer {
  position: absolute;
  bottom: var(--space-6);
  left: 50%;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  transform: translateX(-50%);
}

.onboarding-footer a {
  color: var(--color-accent);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.onboarding-footer a:hover {
  color: var(--color-accent-hover);
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 600px) {
  .onboarding-page {
    padding: var(--space-4);
  }

  .step-panel {
    padding: var(--space-6);
  }

  .title {
    font-size: var(--text-2xl);
  }

  .step-label {
    display: none;
  }
}
</style>
