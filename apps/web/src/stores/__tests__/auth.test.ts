import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../auth';
import { authService } from '@/services';
import type { User, Organization } from '@librediary/shared';
import type { OrgMembership } from '@/services/auth.service';

vi.mock('@/services', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerificationEmail: vi.fn(),
  },
}));

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockUser: User = {
  id: 'u1',
  email: 'test@example.com',
  name: 'Test User',
  isSuperAdmin: false,
  emailVerified: true,
  avatarUrl: null,
  locale: 'en',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockOrg: Organization = {
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  logoUrl: null,
  accentColor: null,
  allowedDomains: [],
  aiEnabled: false,
};

const mockMembership: OrgMembership = {
  organizationId: 'org-1',
  role: 'OWNER',
};

describe('Auth Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should start with null user and empty collections', () => {
      const store = useAuthStore();

      expect(store.user).toBeNull();
      expect(store.organizations).toEqual([]);
      expect(store.memberships).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.initialized).toBe(false);
    });
  });

  describe('computed getters', () => {
    it('isAuthenticated should be true when user exists', () => {
      const store = useAuthStore();
      store.setUser(mockUser);

      expect(store.isAuthenticated).toBe(true);
    });

    it('isAuthenticated should be false when user is null', () => {
      const store = useAuthStore();

      expect(store.isAuthenticated).toBe(false);
    });

    it('currentOrganization should match currentOrganizationId', () => {
      const store = useAuthStore();
      store.setOrganizations([mockOrg], [mockMembership]);

      expect(store.currentOrganization).toEqual(mockOrg);
    });

    it('currentUserRole should return role for current org', () => {
      const store = useAuthStore();
      store.setOrganizations([mockOrg], [mockMembership]);

      expect(store.currentUserRole).toBe('OWNER');
    });

    it('isSuperAdmin should reflect user flag', () => {
      const store = useAuthStore();
      store.setUser({ ...mockUser, isSuperAdmin: true });

      expect(store.isSuperAdmin).toBe(true);
    });

    it('isEmailVerified should reflect user flag', () => {
      const store = useAuthStore();
      store.setUser({ ...mockUser, emailVerified: false });

      expect(store.isEmailVerified).toBe(false);
    });
  });

  describe('setOrganizations', () => {
    it('should auto-select first org when none selected', () => {
      const store = useAuthStore();

      store.setOrganizations([mockOrg], [mockMembership]);

      expect(store.currentOrganizationId).toBe('org-1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('currentOrganizationId', 'org-1');
    });

    it('should keep current org if it still exists', () => {
      const store = useAuthStore();
      store.setCurrentOrganization('org-1');

      store.setOrganizations([mockOrg], [mockMembership]);

      expect(store.currentOrganizationId).toBe('org-1');
    });

    it('should switch to first org if current org no longer exists', () => {
      const store = useAuthStore();
      store.setCurrentOrganization('deleted-org');

      const newOrg = { ...mockOrg, id: 'org-new' };
      store.setOrganizations([newOrg]);

      expect(store.currentOrganizationId).toBe('org-new');
    });
  });

  describe('getRoleForOrg', () => {
    it('should return role for specified org', () => {
      const store = useAuthStore();
      store.setOrganizations([mockOrg], [mockMembership]);

      expect(store.getRoleForOrg('org-1')).toBe('OWNER');
    });

    it('should return null for unknown org', () => {
      const store = useAuthStore();

      expect(store.getRoleForOrg('unknown')).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should fetch and set user data', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue({
        user: mockUser,
        organizations: [mockOrg],
        memberships: [mockMembership],
      });
      const store = useAuthStore();

      await store.initialize();

      expect(store.user).toEqual(mockUser);
      expect(store.organizations).toEqual([mockOrg]);
      expect(store.initialized).toBe(true);
      expect(store.loading).toBe(false);
    });

    it('should set null user on failure', async () => {
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Network error'));
      const store = useAuthStore();

      await store.initialize();

      expect(store.user).toBeNull();
      expect(store.organizations).toEqual([]);
      expect(store.initialized).toBe(true);
    });

    it('should not re-initialise if already initialised', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue({
        user: mockUser,
        organizations: [mockOrg],
        memberships: [mockMembership],
      });
      const store = useAuthStore();

      await store.initialize();
      await store.initialize();

      expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should set user and orgs on successful login', async () => {
      vi.mocked(authService.login).mockResolvedValue({
        user: mockUser,
        organizations: [mockOrg],
        memberships: [mockMembership],
      });
      const store = useAuthStore();

      await store.login('test@example.com', 'password');

      expect(store.user).toEqual(mockUser);
      expect(store.organizations).toEqual([mockOrg]);
      expect(store.loading).toBe(false);
    });

    it('should propagate error on failed login', async () => {
      vi.mocked(authService.login).mockRejectedValue(new Error('Invalid credentials'));
      const store = useAuthStore();

      await expect(store.login('a@b.com', 'wrong')).rejects.toThrow('Invalid credentials');
      expect(store.loading).toBe(false);
    });
  });

  describe('register', () => {
    it('should set user and orgs on successful registration', async () => {
      vi.mocked(authService.register).mockResolvedValue({
        user: mockUser,
        organizations: [mockOrg],
        memberships: [mockMembership],
      });
      const store = useAuthStore();

      await store.register('test@example.com', 'password', 'token-123', 'Test');

      expect(store.user).toEqual(mockUser);
      expect(authService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        inviteToken: 'token-123',
        name: 'Test',
      });
    });
  });

  describe('logout', () => {
    it('should clear all state', async () => {
      vi.mocked(authService.logout).mockResolvedValue(undefined);
      const store = useAuthStore();
      store.setUser(mockUser);
      store.setOrganizations([mockOrg], [mockMembership]);

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.organizations).toEqual([]);
      expect(store.memberships).toEqual([]);
      expect(store.currentOrganizationId).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('currentOrganizationId');
    });

    it('should clear state even if logout API call fails', async () => {
      vi.mocked(authService.logout).mockRejectedValue(new Error('Network error'));
      const store = useAuthStore();
      store.setUser(mockUser);

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.loading).toBe(false);
    });
  });

  describe('verifyEmail', () => {
    it('should update user emailVerified flag', async () => {
      vi.mocked(authService.verifyEmail).mockResolvedValue({
        user: mockUser,
        message: 'Email verified',
      });
      const store = useAuthStore();
      store.setUser({ ...mockUser, emailVerified: false });

      await store.verifyEmail('verify-token');

      expect(store.user!.emailVerified).toBe(true);
      expect(authService.verifyEmail).toHaveBeenCalledWith('verify-token');
    });

    it('should do nothing if no user is set', async () => {
      vi.mocked(authService.verifyEmail).mockResolvedValue({
        user: mockUser,
        message: 'Email verified',
      });
      const store = useAuthStore();

      await store.verifyEmail('token');

      expect(store.user).toBeNull();
    });
  });

  describe('refreshUser', () => {
    it('should refresh user data', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      vi.mocked(authService.getCurrentUser).mockResolvedValue({
        user: updatedUser,
        organizations: [mockOrg],
        memberships: [mockMembership],
      });
      const store = useAuthStore();
      store.setUser(mockUser);

      await store.refreshUser();

      expect(store.user!.name).toBe('Updated Name');
    });

    it('should clear state if refresh fails', async () => {
      vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Expired'));
      const store = useAuthStore();
      store.setUser(mockUser);

      await store.refreshUser();

      expect(store.user).toBeNull();
    });
  });
});
