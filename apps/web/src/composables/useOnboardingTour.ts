import { ref, computed, onMounted } from 'vue';

export interface TourStep {
  id: string;
  targetSelector: string;
  placement: 'top' | 'right' | 'bottom' | 'left' | 'centre';
  titleKey: string;
  descriptionKey: string;
}

const STORAGE_KEY = 'librediary-tour-completed';

const steps: TourStep[] = [
  {
    id: 'sidebar-nav',
    targetSelector: '.sidebar-nav',
    placement: 'right',
    titleKey: 'tour.sidebarTitle',
    descriptionKey: 'tour.sidebarDescription',
  },
  {
    id: 'create-page',
    targetSelector: '.create-btn',
    placement: 'right',
    titleKey: 'tour.createPageTitle',
    descriptionKey: 'tour.createPageDescription',
  },
  {
    id: 'search',
    targetSelector: '.search-wrapper',
    placement: 'right',
    titleKey: 'tour.searchTitle',
    descriptionKey: 'tour.searchDescription',
  },
  {
    id: 'editor',
    targetSelector: '.app-content',
    placement: 'centre',
    titleKey: 'tour.editorTitle',
    descriptionKey: 'tour.editorDescription',
  },
  {
    id: 'settings',
    targetSelector: '.sidebar-footer',
    placement: 'top',
    titleKey: 'tour.settingsTitle',
    descriptionKey: 'tour.settingsDescription',
  },
];

const isActive = ref(false);
const currentStep = ref(0);
const hasCompleted = ref(false);

const totalSteps = computed(() => steps.length);

const currentStepData = computed<TourStep | null>(() => {
  if (!isActive.value || currentStep.value < 0 || currentStep.value >= steps.length) {
    return null;
  }
  return steps[currentStep.value] ?? null;
});

function loadCompletionState() {
  if (typeof localStorage === 'undefined') return;
  hasCompleted.value = localStorage.getItem(STORAGE_KEY) === 'true';
}

function saveCompletionState() {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'true');
}

export function useOnboardingTour() {
  onMounted(() => {
    loadCompletionState();
  });

  function start(): void {
    currentStep.value = 0;
    isActive.value = true;
  }

  function next(): void {
    if (currentStep.value < steps.length - 1) {
      currentStep.value++;
    } else {
      complete();
    }
  }

  function previous(): void {
    if (currentStep.value > 0) {
      currentStep.value--;
    }
  }

  function skip(): void {
    isActive.value = false;
    hasCompleted.value = true;
    saveCompletionState();
  }

  function complete(): void {
    isActive.value = false;
    hasCompleted.value = true;
    saveCompletionState();
  }

  function resetTour(): void {
    hasCompleted.value = false;
    currentStep.value = 0;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return {
    isActive,
    currentStep,
    totalSteps,
    currentStepData,
    start,
    next,
    previous,
    skip,
    complete,
    hasCompleted,
    resetTour,
  };
}
