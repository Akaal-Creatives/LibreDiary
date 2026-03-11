import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuthStore = vi.hoisted(() => ({
  user: { name: null as string | null },
}));

const mockPagesStore = vi.hoisted(() => ({
  rootPages: [] as Array<{ id: string }>,
}));

vi.mock('@/stores', () => ({
  useAuthStore: () => mockAuthStore,
  usePagesStore: () => mockPagesStore,
}));

import { useGettingStarted } from '../useGettingStarted';

describe('useGettingStarted', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAuthStore.user = { name: null };
    mockPagesStore.rootPages = [];
  });

  it('returns 4 checklist items', () => {
    const { items } = useGettingStarted();
    expect(items.value).toHaveLength(4);
  });

  it('starts with 0 completed when no pages, no name', () => {
    const { completedCount } = useGettingStarted();
    expect(completedCount.value).toBe(0);
  });

  it('marks create-page as completed when rootPages exist', () => {
    mockPagesStore.rootPages = [{ id: 'p1' }];
    const { items } = useGettingStarted();
    const createPage = items.value.find((i) => i.id === 'create-page');
    expect(createPage?.completed).toBe(true);
  });

  it('marks set-profile as completed when user has a name', () => {
    mockAuthStore.user = { name: 'Alice' };
    const { items } = useGettingStarted();
    const setProfile = items.value.find((i) => i.id === 'set-profile');
    expect(setProfile?.completed).toBe(true);
  });

  it('markCompleted adds to manuallyCompleted and persists', () => {
    const { markCompleted, items } = useGettingStarted();
    markCompleted('explore-templates');

    const item = items.value.find((i) => i.id === 'explore-templates');
    expect(item?.completed).toBe(true);

    const stored = JSON.parse(localStorage.getItem('librediary-getting-started') || '{}');
    expect(stored.manuallyCompleted).toContain('explore-templates');
  });

  it('does not duplicate manual completions', () => {
    const { markCompleted } = useGettingStarted();
    markCompleted('invite-member');
    markCompleted('invite-member');

    const stored = JSON.parse(localStorage.getItem('librediary-getting-started') || '{}');
    expect(stored.manuallyCompleted.filter((id: string) => id === 'invite-member')).toHaveLength(1);
  });

  it('dismiss hides the checklist', () => {
    const { dismiss, isVisible } = useGettingStarted();
    expect(isVisible.value).toBe(true);

    dismiss();
    expect(isVisible.value).toBe(false);

    const stored = JSON.parse(localStorage.getItem('librediary-getting-started') || '{}');
    expect(stored.dismissed).toBe(true);
  });

  it('isVisible is false when all items are completed', () => {
    mockPagesStore.rootPages = [{ id: 'p1' }];
    mockAuthStore.user = { name: 'Bob' };
    const { markCompleted, isVisible } = useGettingStarted();
    markCompleted('explore-templates');
    markCompleted('invite-member');

    expect(isVisible.value).toBe(false);
  });

  it('restores state from localStorage', () => {
    localStorage.setItem(
      'librediary-getting-started',
      JSON.stringify({ dismissed: false, manuallyCompleted: ['explore-templates'] })
    );

    const { items } = useGettingStarted();
    const item = items.value.find((i) => i.id === 'explore-templates');
    expect(item?.completed).toBe(true);
  });

  it('progress reflects completed percentage', () => {
    mockPagesStore.rootPages = [{ id: 'p1' }];
    mockAuthStore.user = { name: 'Test' };
    const { progress } = useGettingStarted();
    expect(progress.value).toBe(50);
  });

  it('each item has correct routes', () => {
    const { items } = useGettingStarted();
    const routes = items.value.map((i) => ({ id: i.id, route: i.route }));
    expect(routes).toEqual([
      { id: 'create-page', route: { name: 'dashboard' } },
      { id: 'set-profile', route: { name: 'account-settings' } },
      { id: 'explore-templates', route: { name: 'templates' } },
      { id: 'invite-member', route: { name: 'organization-invites' } },
    ]);
  });
});
