import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('@/composables', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
  }),
}));

import NotFoundPage from '../NotFoundPage.vue';

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the 404 error code', () => {
    const wrapper = mount(NotFoundPage);

    expect(wrapper.find('.error-code').text()).toBe('404');
  });

  it('renders the page not found title', () => {
    const wrapper = mount(NotFoundPage);

    expect(wrapper.find('.error-title').text()).toBe('Page not found');
  });

  it('renders a descriptive error message', () => {
    const wrapper = mount(NotFoundPage);

    expect(wrapper.find('.error-description').text()).toContain("doesn't exist or has been moved");
  });

  it('renders Go Home and Go Back action buttons', () => {
    const wrapper = mount(NotFoundPage);

    const buttons = wrapper.findAll('.error-actions button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text()).toContain('Go Home');
    expect(buttons[1].text()).toContain('Go Back');
  });

  it('navigates to / when Go Home button is clicked', async () => {
    const wrapper = mount(NotFoundPage);

    await wrapper.find('.btn-primary').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('calls router.back() when Go Back button is clicked', async () => {
    const wrapper = mount(NotFoundPage);

    await wrapper.find('.btn-secondary').trigger('click');

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('renders the search illustration', () => {
    const wrapper = mount(NotFoundPage);

    expect(wrapper.find('.illustration').exists()).toBe(true);
    expect(wrapper.find('.illustration-circle').exists()).toBe(true);
  });

  it('renders three animated dots', () => {
    const wrapper = mount(NotFoundPage);

    const dots = wrapper.findAll('.dot');
    expect(dots).toHaveLength(3);
  });
});
