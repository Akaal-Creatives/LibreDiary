import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { organizationsService } from '../organizations.service';

describe('Organizations Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // ORGANIZATION CRUD
  // ===========================================

  describe('createOrganization', () => {
    it('should POST to correct endpoint with input', async () => {
      mockApi.post.mockResolvedValue({ organization: { id: 'org-1' } });

      await organizationsService.createOrganization({ name: 'My Org' });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations', {
        name: 'My Org',
      });
    });
  });

  describe('getOrganizations', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ organizations: [] });

      await organizationsService.getOrganizations();

      expect(mockApi.get).toHaveBeenCalledWith('/organizations');
    });
  });

  describe('getOrganization', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ organization: { id: 'org-1' } });

      await organizationsService.getOrganization('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1');
    });
  });

  describe('updateOrganization', () => {
    it('should PATCH to correct endpoint with input', async () => {
      mockApi.patch.mockResolvedValue({ organization: { id: 'org-1', name: 'Updated' } });

      await organizationsService.updateOrganization('org-1', { name: 'Updated' });

      expect(mockApi.patch).toHaveBeenCalledWith('/organizations/org-1', {
        name: 'Updated',
      });
    });
  });

  describe('deleteOrganization', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted' });

      await organizationsService.deleteOrganization('org-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1');
    });
  });

  // ===========================================
  // MEMBER MANAGEMENT
  // ===========================================

  describe('getMembers', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ members: [] });

      await organizationsService.getMembers('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/members');
    });
  });

  describe('updateMemberRole', () => {
    it('should PATCH to correct endpoint with role', async () => {
      mockApi.patch.mockResolvedValue({ member: { id: 'mem-1', role: 'ADMIN' } });

      await organizationsService.updateMemberRole('org-1', 'mem-1', 'ADMIN' as any);

      expect(mockApi.patch).toHaveBeenCalledWith('/organizations/org-1/members/mem-1', {
        role: 'ADMIN',
      });
    });
  });

  describe('removeMember', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'removed' });

      await organizationsService.removeMember('org-1', 'mem-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/members/mem-1');
    });
  });

  describe('leaveOrganization', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ message: 'left' });

      await organizationsService.leaveOrganization('org-1');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/leave');
    });
  });

  describe('transferOwnership', () => {
    it('should POST to correct endpoint with newOwnerId', async () => {
      mockApi.post.mockResolvedValue({ message: 'transferred' });

      await organizationsService.transferOwnership('org-1', 'user-2');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/transfer-ownership', {
        newOwnerId: 'user-2',
      });
    });
  });

  // ===========================================
  // INVITE MANAGEMENT
  // ===========================================

  describe('createInvite', () => {
    it('should POST to correct endpoint with input', async () => {
      mockApi.post.mockResolvedValue({ invite: { id: 'inv-1' } });

      await organizationsService.createInvite('org-1', {
        email: 'new@example.com',
        role: 'MEMBER' as any,
      });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/invites', {
        email: 'new@example.com',
        role: 'MEMBER',
      });
    });
  });

  describe('getInvites', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ invites: [] });

      await organizationsService.getInvites('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/invites');
    });
  });

  describe('cancelInvite', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'cancelled' });

      await organizationsService.cancelInvite('org-1', 'inv-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/invites/inv-1');
    });
  });

  describe('resendInvite', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ invite: { id: 'inv-1' }, message: 'resent' });

      await organizationsService.resendInvite('org-1', 'inv-1');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/invites/inv-1/resend');
    });
  });
});
