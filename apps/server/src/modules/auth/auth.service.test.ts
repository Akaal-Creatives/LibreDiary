import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrisma,
  mockPrismaUser,
  mockPrismaInvite,
  mockPrismaVerificationToken,
  mockPrismaOrganizationMember,
  mockPrismaOrganization,
  mockPrismaSession,
  resetPrismaMocks,
} from '../../../tests/mocks/prisma.js';

// Mock dependencies
vi.mock('../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../services/session.service.js', () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getUserSessions: vi.fn(),
  deleteSessionByToken: vi.fn(),
}));

vi.mock('../../services/email.service.js', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInviteEmail: vi.fn(),
}));

vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn(),
  verify: vi.fn(),
}));

// Import mocked modules
import {
  createSession,
  deleteSession,
  getUserSessions,
  deleteSessionByToken,
} from '../../services/session.service.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInviteEmail,
} from '../../services/email.service.js';
import { hash, verify } from '@node-rs/argon2';

// Import service under test (after mocks)
import {
  register,
  login,
  logout,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  getSessions,
  revokeSession,
  createInvite,
  getInviteByToken,
} from './auth.service.js';

describe('Auth Service', () => {
  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      name: 'Test User',
      deletedAt: null,
    };

    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      token: 'session-token',
    };

    const mockOrganization = {
      id: 'org-123',
      name: 'Test Org',
    };

    it('should login successfully with valid credentials', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      vi.mocked(verify).mockResolvedValue(true);
      vi.mocked(createSession).mockResolvedValue(mockSession);
      mockPrismaOrganizationMember.findMany.mockResolvedValue([{ organization: mockOrganization }]);

      const result = await login(
        { email: 'test@example.com', password: 'password123' },
        { userAgent: 'Mozilla/5.0', ipAddress: '127.0.0.1' }
      );

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(verify).toHaveBeenCalledWith(mockUser.passwordHash, 'password123', expect.any(Object));
      expect(createSession).toHaveBeenCalledWith({
        userId: 'user-123',
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
      });
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.organizations).toEqual([mockOrganization]);
    });

    it('should normalize email to lowercase', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      vi.mocked(verify).mockResolvedValue(true);
      vi.mocked(createSession).mockResolvedValue(mockSession);
      mockPrismaOrganizationMember.findMany.mockResolvedValue([]);

      await login({ email: '  TEST@EXAMPLE.COM  ', password: 'password123' }, {});

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw error for non-existent user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(
        login({ email: 'nonexistent@example.com', password: 'password' }, {})
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for user without password', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });

      await expect(login({ email: 'test@example.com', password: 'password' }, {})).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw error for deleted user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(login({ email: 'test@example.com', password: 'password' }, {})).rejects.toThrow(
        'Account has been deleted'
      );
    });

    it('should throw error for invalid password', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      vi.mocked(verify).mockResolvedValue(false);

      await expect(
        login({ email: 'test@example.com', password: 'wrong-password' }, {})
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should delete session by token', async () => {
      vi.mocked(deleteSessionByToken).mockResolvedValue(undefined);

      await logout('session-token-123');

      expect(deleteSessionByToken).toHaveBeenCalledWith('session-token-123');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user with organizations and memberships', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockOrg = { id: 'org-123', name: 'Test Org' };
      const mockMembership = {
        id: 'member-123',
        organizationId: 'org-123',
        userId: 'user-123',
        role: 'OWNER',
        organization: mockOrg,
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPrismaOrganizationMember.findMany.mockResolvedValue([mockMembership]);

      const result = await getCurrentUser('user-123');

      expect(result.user).toEqual(mockUser);
      expect(result.organizations).toEqual([mockOrg]);
      expect(result.memberships).toEqual([
        {
          organizationId: 'org-123',
          role: 'OWNER',
        },
      ]);
    });

    it('should throw error if user not found', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(getCurrentUser('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('verifyEmail', () => {
    const futureDate = new Date('2024-01-16T12:00:00.000Z');
    const pastDate = new Date('2024-01-14T12:00:00.000Z');

    it('should verify email with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        identifier: 'test@example.com',
        token: 'verify-token',
        type: 'EMAIL_VERIFICATION',
        expiresAt: futureDate,
        usedAt: null,
      };
      const mockUser = { id: 'user-123', email: 'test@example.com', emailVerified: true };

      mockPrismaVerificationToken.findUnique.mockResolvedValue(mockToken);
      mockPrisma.$transaction.mockResolvedValue([mockUser, {}]);

      const result = await verifyEmail('verify-token');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      mockPrismaVerificationToken.findUnique.mockResolvedValue(null);

      await expect(verifyEmail('invalid-token')).rejects.toThrow('Invalid verification token');
    });

    it('should throw error for already used token', async () => {
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'used-token',
        type: 'EMAIL_VERIFICATION',
        expiresAt: futureDate,
        usedAt: new Date(),
      });

      await expect(verifyEmail('used-token')).rejects.toThrow('Token has already been used');
    });

    it('should throw error for expired token', async () => {
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'expired-token',
        type: 'EMAIL_VERIFICATION',
        expiresAt: pastDate,
        usedAt: null,
      });

      await expect(verifyEmail('expired-token')).rejects.toThrow('Token has expired');
    });

    it('should throw error for wrong token type', async () => {
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'wrong-type-token',
        type: 'PASSWORD_RESET',
        expiresAt: futureDate,
        usedAt: null,
      });

      await expect(verifyEmail('wrong-type-token')).rejects.toThrow('Invalid token type');
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email for existing user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test' };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPrismaVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaVerificationToken.create.mockResolvedValue({});
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);

      await forgotPassword('test@example.com');

      expect(mockPrismaVerificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          identifier: 'test@example.com',
          type: 'PASSWORD_RESET',
        }),
      });
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should silently succeed for non-existent user (prevent enumeration)', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(forgotPassword('nonexistent@example.com')).resolves.not.toThrow();

      expect(mockPrismaVerificationToken.create).not.toHaveBeenCalled();
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await forgotPassword('  TEST@EXAMPLE.COM  ');

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('resetPassword', () => {
    const futureDate = new Date('2024-01-16T12:00:00.000Z');
    const pastDate = new Date('2024-01-14T12:00:00.000Z');

    it('should reset password with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        identifier: 'test@example.com',
        token: 'reset-token',
        type: 'PASSWORD_RESET',
        expiresAt: futureDate,
        usedAt: null,
      };

      mockPrismaVerificationToken.findUnique.mockResolvedValue(mockToken);
      vi.mocked(hash).mockResolvedValue('new-hashed-password');
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await resetPassword('reset-token', 'newPassword123');

      expect(hash).toHaveBeenCalledWith('newPassword123', expect.any(Object));
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error for invalid token', async () => {
      mockPrismaVerificationToken.findUnique.mockResolvedValue(null);

      await expect(resetPassword('invalid', 'newpass')).rejects.toThrow('Invalid reset token');
    });

    it('should throw error for expired token', async () => {
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'expired-token',
        type: 'PASSWORD_RESET',
        expiresAt: pastDate,
        usedAt: null,
      });

      await expect(resetPassword('expired-token', 'newpass')).rejects.toThrow('Token has expired');
    });
  });

  describe('getSessions', () => {
    it('should return user sessions', async () => {
      const mockSessions = [
        { id: 'session-1', userId: 'user-123' },
        { id: 'session-2', userId: 'user-123' },
      ];

      vi.mocked(getUserSessions).mockResolvedValue(mockSessions);

      const result = await getSessions('user-123');

      expect(getUserSessions).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockSessions);
    });
  });

  describe('revokeSession', () => {
    it('should revoke session owned by user', async () => {
      mockPrismaSession.findUnique.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
      });
      vi.mocked(deleteSession).mockResolvedValue(undefined);

      await revokeSession('session-123', 'user-123');

      expect(deleteSession).toHaveBeenCalledWith('session-123');
    });

    it('should throw error if session not found', async () => {
      mockPrismaSession.findUnique.mockResolvedValue(null);

      await expect(revokeSession('nonexistent', 'user-123')).rejects.toThrow('Session not found');
    });

    it('should throw error if session belongs to different user', async () => {
      mockPrismaSession.findUnique.mockResolvedValue({
        id: 'session-123',
        userId: 'other-user',
      });

      await expect(revokeSession('session-123', 'user-123')).rejects.toThrow('Session not found');
    });
  });

  describe('getInviteByToken', () => {
    const futureDate = new Date('2024-01-22T12:00:00.000Z');
    const pastDate = new Date('2024-01-14T12:00:00.000Z');

    it('should return invite details for valid token', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'new@example.com',
        token: 'invite-token',
        expiresAt: futureDate,
        acceptedAt: null,
        organization: { id: 'org-123', name: 'Test Org' },
      };

      mockPrismaInvite.findUnique.mockResolvedValue(mockInvite);

      const result = await getInviteByToken('invite-token');

      expect(result).toEqual({
        email: 'new@example.com',
        organization: mockInvite.organization,
      });
    });

    it('should return null for non-existent token', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue(null);

      const result = await getInviteByToken('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for already accepted invite', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue({
        id: 'invite-123',
        email: 'new@example.com',
        expiresAt: futureDate,
        acceptedAt: new Date(),
        organization: {},
      });

      const result = await getInviteByToken('accepted-token');

      expect(result).toBeNull();
    });

    it('should return null for expired invite', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue({
        id: 'invite-123',
        email: 'new@example.com',
        expiresAt: pastDate,
        acceptedAt: null,
        organization: {},
      });

      const result = await getInviteByToken('expired-token');

      expect(result).toBeNull();
    });
  });

  describe('createInvite', () => {
    it('should create and send invite', async () => {
      mockPrismaUser.findUnique
        .mockResolvedValueOnce(null) // Email not taken
        .mockResolvedValueOnce({
          id: 'inviter-123',
          name: 'Inviter',
          email: 'inviter@example.com',
        });
      mockPrismaInvite.findFirst.mockResolvedValue(null); // No existing invite
      mockPrismaOrganization.findUnique.mockResolvedValue({ id: 'org-123', name: 'Test Org' });
      mockPrismaInvite.create.mockResolvedValue({});
      vi.mocked(sendInviteEmail).mockResolvedValue(undefined);

      const token = await createInvite({
        email: 'new@example.com',
        organizationId: 'org-123',
        invitedById: 'inviter-123',
      });

      expect(token).toBeDefined();
      expect(mockPrismaInvite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@example.com',
          organizationId: 'org-123',
          role: 'MEMBER',
          invitedById: 'inviter-123',
        }),
      });
      expect(sendInviteEmail).toHaveBeenCalledWith(
        'new@example.com',
        expect.any(String),
        'Test Org',
        'Inviter'
      );
    });

    it('should throw error if user already in organization', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
        memberships: [{ organizationId: 'org-123' }],
      });

      await expect(
        createInvite({
          email: 'existing@example.com',
          organizationId: 'org-123',
          invitedById: 'inviter-123',
        })
      ).rejects.toThrow('User is already a member of this organization');
    });

    it('should throw error if pending invite exists', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaInvite.findFirst.mockResolvedValue({ id: 'existing-invite' });

      await expect(
        createInvite({
          email: 'new@example.com',
          organizationId: 'org-123',
          invitedById: 'inviter-123',
        })
      ).rejects.toThrow('An invite has already been sent to this email');
    });
  });

  describe('register', () => {
    const futureDate = new Date('2024-01-22T12:00:00.000Z');
    const mockInvite = {
      id: 'invite-123',
      email: 'new@example.com',
      token: 'invite-token',
      organizationId: 'org-123',
      role: 'MEMBER',
      expiresAt: futureDate,
      acceptedAt: null,
      organization: { id: 'org-123', name: 'Test Org' },
    };

    it('should register user with valid invite', async () => {
      const mockUser = { id: 'user-123', email: 'new@example.com', name: 'New User' };
      const mockSession = { id: 'session-123', token: 'session-token' };

      mockPrismaInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaUser.findUnique.mockResolvedValue(null); // User doesn't exist
      vi.mocked(hash).mockResolvedValue('hashed-password');
      mockPrisma.$transaction.mockImplementation(async (fn) =>
        fn({
          user: {
            create: vi.fn().mockResolvedValue(mockUser),
          },
          organizationMember: {
            create: vi.fn().mockResolvedValue({}),
          },
          invite: {
            update: vi.fn().mockResolvedValue({}),
          },
        })
      );
      vi.mocked(createSession).mockResolvedValue(mockSession);
      mockPrismaVerificationToken.create.mockResolvedValue({});
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined);
      mockPrismaOrganizationMember.findMany.mockResolvedValue([
        { organization: mockInvite.organization },
      ]);

      const result = await register(
        {
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
          inviteToken: 'invite-token',
        },
        { userAgent: 'Mozilla/5.0' }
      );

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw error for invalid invite token', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue(null);

      await expect(
        register({ email: 'new@example.com', password: 'pass', inviteToken: 'invalid' }, {})
      ).rejects.toThrow('Invalid invite token');
    });

    it('should throw error for already used invite', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue({
        ...mockInvite,
        acceptedAt: new Date(),
      });

      await expect(
        register({ email: 'new@example.com', password: 'pass', inviteToken: 'used' }, {})
      ).rejects.toThrow('Invite has already been used');
    });

    it('should throw error for expired invite', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue({
        ...mockInvite,
        expiresAt: new Date('2024-01-14T12:00:00.000Z'),
      });

      await expect(
        register({ email: 'new@example.com', password: 'pass', inviteToken: 'expired' }, {})
      ).rejects.toThrow('Invite has expired');
    });

    it('should throw error if email does not match invite', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue(mockInvite);

      await expect(
        register(
          { email: 'different@example.com', password: 'pass', inviteToken: 'invite-token' },
          {}
        )
      ).rejects.toThrow('Email does not match invite');
    });

    it('should throw error if user already exists', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaUser.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        register({ email: 'new@example.com', password: 'pass', inviteToken: 'invite-token' }, {})
      ).rejects.toThrow('User already exists');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: false,
      };

      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockPrismaVerificationToken.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaVerificationToken.create.mockResolvedValue({});
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined);

      await resendVerificationEmail('user-123');

      expect(mockPrismaVerificationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier: 'test@example.com',
          type: 'EMAIL_VERIFICATION',
        },
      });
      expect(mockPrismaVerificationToken.create).toHaveBeenCalled();
      expect(sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(resendVerificationEmail('nonexistent')).rejects.toThrow('User not found');
    });

    it('should throw error if email already verified', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
      });

      await expect(resendVerificationEmail('user-123')).rejects.toThrow(
        'Email is already verified'
      );
    });
  });
});
