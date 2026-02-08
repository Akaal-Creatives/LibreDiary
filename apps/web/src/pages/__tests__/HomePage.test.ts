import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

const mockTheme = vi.hoisted(() => ({
  theme: { value: 'light' },
  toggleTheme: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('@/composables', () => ({
  useTheme: () => ({
    theme: mockTheme.theme.value,
    toggleTheme: mockTheme.toggleTheme,
  }),
}));

vi.mock('@librediary/shared', () => ({
  DEVELOPER_INFO: {
    name: 'Akaal Creatives',
    website: 'https://www.akaalcreatives.com',
  },
}));

import HomePage from '../HomePage.vue';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme.theme.value = 'light';
  });

  it('renders the page with brand name', () => {
    const wrapper = mount(HomePage);

    expect(wrapper.find('.brand-name').text()).toBe('LibreDiary');
  });

  it('displays the hero section with title and subtitle', () => {
    const wrapper = mount(HomePage);

    expect(wrapper.find('.hero-title').text()).toContain('Your ideas deserve');
    expect(wrapper.find('.hero-subtitle').text()).toContain('workspace for notes');
  });

  it('displays the hero badge text', () => {
    const wrapper = mount(HomePage);

    expect(wrapper.find('.hero-badge').text()).toContain('Open Source');
  });

  it('navigates to /login when Sign In button is clicked', async () => {
    const wrapper = mount(HomePage);

    await wrapper.find('.nav-link').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('navigates to /login when Get Started button is clicked', async () => {
    const wrapper = mount(HomePage);

    await wrapper.find('.btn-primary').trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('renders four feature cards', () => {
    const wrapper = mount(HomePage);

    const featureCards = wrapper.findAll('.feature-card');
    expect(featureCards).toHaveLength(4);

    const titles = featureCards.map((card) => card.find('h3').text());
    expect(titles).toEqual(['Block Editor', 'Real-Time Sync', 'Self-Hosted', 'Databases']);
  });

  it('renders footer with developer attribution', () => {
    const wrapper = mount(HomePage);

    expect(wrapper.find('.footer-attribution').text()).toContain('Akaal Creatives');
  });

  it('renders footer with licence text', () => {
    const wrapper = mount(HomePage);

    expect(wrapper.find('.footer-license').text()).toContain('AGPLv3');
  });

  it('calls toggleTheme when theme toggle button is clicked', async () => {
    const wrapper = mount(HomePage);

    await wrapper.find('.theme-toggle').trigger('click');

    expect(mockTheme.toggleTheme).toHaveBeenCalled();
  });

  it('renders the GitHub link with correct attributes', () => {
    const wrapper = mount(HomePage);

    const githubLink = wrapper.find('.btn-secondary');
    expect(githubLink.attributes('href')).toBe('https://github.com');
    expect(githubLink.attributes('target')).toBe('_blank');
    expect(githubLink.text()).toContain('View on GitHub');
  });
});
