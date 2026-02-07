import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MemberRoleBadge from '../MemberRoleBadge.vue';

describe('MemberRoleBadge', () => {
  it('renders "Owner" for OWNER role', () => {
    const wrapper = mount(MemberRoleBadge, {
      props: { role: 'OWNER' },
    });

    expect(wrapper.text()).toBe('Owner');
  });

  it('renders "Admin" for ADMIN role', () => {
    const wrapper = mount(MemberRoleBadge, {
      props: { role: 'ADMIN' },
    });

    expect(wrapper.text()).toBe('Admin');
  });

  it('renders "Member" for MEMBER role', () => {
    const wrapper = mount(MemberRoleBadge, {
      props: { role: 'MEMBER' },
    });

    expect(wrapper.text()).toBe('Member');
  });

  it('applies md class by default', () => {
    const wrapper = mount(MemberRoleBadge, {
      props: { role: 'OWNER' },
    });

    const badge = wrapper.find('.role-badge');
    expect(badge.classes()).toContain('md');
  });

  it('applies sm class when size="sm"', () => {
    const wrapper = mount(MemberRoleBadge, {
      props: { role: 'OWNER', size: 'sm' },
    });

    const badge = wrapper.find('.role-badge');
    expect(badge.classes()).toContain('sm');
  });
});
