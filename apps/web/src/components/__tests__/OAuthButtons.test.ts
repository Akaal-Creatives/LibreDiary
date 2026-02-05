import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import OAuthButtons from '../OAuthButtons.vue';

describe('OAuthButtons', () => {
  it('renders both provider buttons by default', () => {
    const wrapper = mount(OAuthButtons);

    expect(wrapper.find('.oauth-btn--github').exists()).toBe(true);
    expect(wrapper.find('.oauth-btn--google').exists()).toBe(true);
  });

  it('renders only specified providers', () => {
    const wrapper = mount(OAuthButtons, {
      props: {
        availableProviders: ['github'],
      },
    });

    expect(wrapper.find('.oauth-btn--github').exists()).toBe(true);
    expect(wrapper.find('.oauth-btn--google').exists()).toBe(false);
  });

  it('shows login text by default', () => {
    const wrapper = mount(OAuthButtons);

    expect(wrapper.text()).toContain('Continue with GitHub');
    expect(wrapper.text()).toContain('Continue with Google');
  });

  it('shows register text when mode is register', () => {
    const wrapper = mount(OAuthButtons, {
      props: { mode: 'register' },
    });

    expect(wrapper.text()).toContain('Sign up with GitHub');
    expect(wrapper.text()).toContain('Sign up with Google');
  });

  it('shows link text when mode is link', () => {
    const wrapper = mount(OAuthButtons, {
      props: { mode: 'link' },
    });

    expect(wrapper.text()).toContain('Link GitHub');
    expect(wrapper.text()).toContain('Link Google');
  });

  it('emits click event with provider name when button is clicked', async () => {
    const wrapper = mount(OAuthButtons);

    await wrapper.find('.oauth-btn--github').trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
    expect(wrapper.emitted('click')![0]).toEqual(['github']);

    await wrapper.find('.oauth-btn--google').trigger('click');
    expect(wrapper.emitted('click')![1]).toEqual(['google']);
  });

  it('shows loading state for specific provider', () => {
    const wrapper = mount(OAuthButtons, {
      props: {
        loadingProvider: 'github',
      },
    });

    const githubBtn = wrapper.find('.oauth-btn--github');
    const googleBtn = wrapper.find('.oauth-btn--google');

    expect(githubBtn.classes()).toContain('oauth-btn--loading');
    expect(githubBtn.attributes('aria-busy')).toBe('true');
    expect(googleBtn.classes()).not.toContain('oauth-btn--loading');
  });

  it('renders spinner SVG when loading', () => {
    const wrapper = mount(OAuthButtons, {
      props: {
        loadingProvider: 'github',
      },
    });

    const githubBtn = wrapper.find('.oauth-btn--github');
    expect(githubBtn.find('.oauth-btn__spinner').exists()).toBe(true);
  });

  it('disables all buttons when one is loading', async () => {
    const wrapper = mount(OAuthButtons, {
      props: {
        loadingProvider: 'github',
      },
    });

    await wrapper.find('.oauth-btn--google').trigger('click');
    // Should not emit because buttons are disabled during loading
    expect(wrapper.emitted('click')).toBeFalsy();
  });

  it('disables specific providers', async () => {
    const wrapper = mount(OAuthButtons, {
      props: {
        disabledProviders: ['google'],
      },
    });

    const googleBtn = wrapper.find('.oauth-btn--google');
    expect(googleBtn.classes()).toContain('oauth-btn--disabled');
    expect(googleBtn.attributes('disabled')).toBeDefined();

    await googleBtn.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
  });

  it('has proper accessibility attributes', () => {
    const wrapper = mount(OAuthButtons);

    const githubBtn = wrapper.find('.oauth-btn--github');
    const googleBtn = wrapper.find('.oauth-btn--google');

    expect(githubBtn.attributes('aria-label')).toBe('Continue with GitHub');
    expect(googleBtn.attributes('aria-label')).toBe('Continue with Google');
    expect(githubBtn.attributes('type')).toBe('button');
    expect(googleBtn.attributes('type')).toBe('button');
  });

  it('contains GitHub icon SVG', () => {
    const wrapper = mount(OAuthButtons);
    const githubBtn = wrapper.find('.oauth-btn--github');
    const svg = githubBtn.find('.oauth-btn__icon svg');

    expect(svg.exists()).toBe(true);
    expect(svg.attributes('aria-hidden')).toBe('true');
  });

  it('contains Google icon SVG with multiple colors', () => {
    const wrapper = mount(OAuthButtons);
    const googleBtn = wrapper.find('.oauth-btn--google');
    const svg = googleBtn.find('.oauth-btn__icon svg');

    expect(svg.exists()).toBe(true);
    // Google logo has 4 color paths
    expect(svg.findAll('path').length).toBe(4);
  });

  it('has connector element for hover effect', () => {
    const wrapper = mount(OAuthButtons);

    expect(wrapper.find('.oauth-btn--github .oauth-btn__connector').exists()).toBe(true);
    expect(wrapper.find('.oauth-btn--google .oauth-btn__connector').exists()).toBe(true);
  });
});
