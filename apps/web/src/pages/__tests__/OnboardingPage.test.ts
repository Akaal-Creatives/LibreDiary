import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

const mockAuthStore = vi.hoisted(() => ({
  user: {
    id: 'u1',
    email: 'test@example.com',
    name: 'Test User',
    onboardingCompletedAt: null,
    isSuperAdmin: false,
    emailVerified: true,
  },
  isOnboardingCompleted: false,
  completeOnboarding: vi.fn(),
}));

const mockTheme = vi.hoisted(() => ({
  theme: 'light',
  toggleTheme: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('@/stores', () => ({
  useAuthStore: () => mockAuthStore,
}));

vi.mock('@/composables', () => ({
  useTheme: () => mockTheme,
}));

vi.mock('@/services', () => ({
  authService: {
    updateProfile: vi.fn().mockResolvedValue({}),
  },
}));

import OnboardingPage from '../OnboardingPage.vue';

function mountPage() {
  return mount(OnboardingPage, {
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  });
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore.user = {
      id: 'u1',
      email: 'test@example.com',
      name: 'Test User',
      onboardingCompletedAt: null,
      isSuperAdmin: false,
      emailVerified: true,
    };
    mockAuthStore.isOnboardingCompleted = false;
    mockAuthStore.completeOnboarding.mockResolvedValue(undefined);
    localStorage.clear();
  });

  // ---- Step 1: Use Case ----

  it('renders step 1 with use-case selection by default', () => {
    const wrapper = mountPage();

    expect(wrapper.find('h2').text()).toContain('How will you use LibreDiary?');
    expect(wrapper.findAll('.use-case-card')).toHaveLength(3);
  });

  it('shows progress steps with Use Case, Profile, Get Started labels', () => {
    const wrapper = mountPage();

    const stepLabels = wrapper.findAll('.step-label');
    expect(stepLabels.map((s) => s.text())).toEqual(['Use Case', 'Profile', 'Get Started']);
  });

  it('disables Continue button when no use case is selected', () => {
    const wrapper = mountPage();

    const continueBtn = wrapper.find('.btn-primary');
    expect(continueBtn.attributes('disabled')).toBeDefined();
  });

  it('enables Continue button after selecting a use case', async () => {
    const wrapper = mountPage();

    await wrapper.findAll('.use-case-card')[0].trigger('click');

    const continueBtn = wrapper.find('.btn-primary');
    expect(continueBtn.attributes('disabled')).toBeUndefined();
  });

  it('marks selected use case with aria-checked', async () => {
    const wrapper = mountPage();

    await wrapper.findAll('.use-case-card')[1].trigger('click');

    const cards = wrapper.findAll('.use-case-card');
    expect(cards[0].attributes('aria-checked')).toBe('false');
    expect(cards[1].attributes('aria-checked')).toBe('true');
    expect(cards[2].attributes('aria-checked')).toBe('false');
  });

  it('advances to step 2 when Continue is clicked with selection', async () => {
    const wrapper = mountPage();

    await wrapper.findAll('.use-case-card')[0].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.find('h2').text()).toContain('Set up your profile');
  });

  // ---- Step 2: Profile ----

  it('renders step 2 with display name pre-filled from user', async () => {
    const wrapper = mountPage();

    // Go to step 2
    await wrapper.findAll('.use-case-card')[0].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');

    const input = wrapper.find('#displayName').element as HTMLInputElement;
    expect(input.value).toBe('Test User');
  });

  it('shows avatar preview with first letter of display name', async () => {
    const wrapper = mountPage();

    await wrapper.findAll('.use-case-card')[0].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.find('.avatar-circle').text()).toBe('T');
  });

  it('disables Continue on step 2 when display name is empty', async () => {
    const wrapper = mountPage();

    await wrapper.findAll('.use-case-card')[0].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('#displayName').setValue('');

    const continueBtn = wrapper.find('.btn-primary');
    expect(continueBtn.attributes('disabled')).toBeDefined();
  });

  it('navigates back to step 1 when Back is clicked on step 2', async () => {
    const wrapper = mountPage();

    await wrapper.findAll('.use-case-card')[0].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');

    await wrapper.find('.btn-secondary').trigger('click');
    expect(wrapper.find('h2').text()).toContain('How will you use LibreDiary?');
  });

  // ---- Step 3: Get Started ----

  it('renders step 3 with first action options', async () => {
    const wrapper = mountPage();

    // Navigate to step 3
    await wrapper.findAll('.use-case-card')[0].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('.btn-primary').trigger('click');

    expect(wrapper.find('h2').text()).toContain('Create your first page');
    expect(wrapper.findAll('.action-option')).toHaveLength(2);
  });

  it('defaults to blank page option selected', async () => {
    const wrapper = mountPage();

    await wrapper.findAll('.use-case-card')[0].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('.btn-primary').trigger('click');

    const options = wrapper.findAll('.action-option');
    expect(options[0].classes()).toContain('selected');
    expect(options[1].classes()).not.toContain('selected');
  });

  // ---- Complete Onboarding ----

  it('completes onboarding and shows success step', async () => {
    const wrapper = mountPage();

    // Step 1
    await wrapper.findAll('.use-case-card')[2].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');

    // Step 2
    await wrapper.find('.btn-primary').trigger('click');

    // Step 3 — click "Let's go"
    await wrapper.find('.btn-primary').trigger('click');
    await flushPromises();

    expect(mockAuthStore.completeOnboarding).toHaveBeenCalled();
    expect(wrapper.text()).toContain("You're all set!");
  });

  it('stores use-case selection in localStorage', async () => {
    const wrapper = mountPage();

    await wrapper.findAll('.use-case-card')[1].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('.btn-primary').trigger('click');
    await flushPromises();

    expect(localStorage.getItem('librediary-use-case')).toBe('team');
  });

  it('shows error when onboarding fails', async () => {
    mockAuthStore.completeOnboarding.mockRejectedValue(new Error('Network error'));

    const wrapper = mountPage();

    await wrapper.findAll('.use-case-card')[0].trigger('click');
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('.btn-primary').trigger('click');
    await wrapper.find('.btn-primary').trigger('click');
    await flushPromises();

    expect(wrapper.find('.error-banner').text()).toContain('Network error');
  });

  it('redirects to dashboard if onboarding already completed', () => {
    mockAuthStore.isOnboardingCompleted = true;
    mountPage();

    expect(mockRouter.replace).toHaveBeenCalledWith({ name: 'dashboard' });
  });

  it('displays welcome message with user name', () => {
    const wrapper = mountPage();

    expect(wrapper.find('.title').text()).toContain('Test User');
  });

  it('renders developer attribution in footer', () => {
    const wrapper = mountPage();

    expect(wrapper.find('.onboarding-footer').text()).toContain('Akaal Creatives');
  });

  it('has radiogroup with accessible role on use-case grid', () => {
    const wrapper = mountPage();

    const grid = wrapper.find('[role="radiogroup"]');
    expect(grid.exists()).toBe(true);
    expect(grid.attributes('aria-label')).toBe('Use case selection');
  });
});
