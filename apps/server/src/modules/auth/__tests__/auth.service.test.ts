import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===========================================
// MOCKS
// ===========================================

const {
  mockPrisma,
  mockHash,
  mockVerify,
  mockCreateSession,
  mockDeleteSession,
  mockGetUserSessions,
  mockDeleteSessionByToken,
  mockSendVerificationEmail,
  mockSendPasswordResetEmail,
  mockSendInviteEmail,
  mockGenerateVerificationToken,
  mockGenerateInviteToken,
  mockExpiresIn,
  mockIsExpired,
} = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    invite: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    organizationMember: { findMany: vi.fn(), create: vi.fn() },
    verificationToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  mockHash: vi.fn(),
  mockVerify: vi.fn(),
  mockCreateSession: vi.fn(),
  mockDeleteSession: vi.fn(),
  mockGetUserSessions: vi.fn(),
  mockDeleteSessionByToken: vi.fn(),
  mockSendVerificationEmail: vi.fn(),
  mockSendPasswordResetEmail: vi.fn(),
  mockSendInviteEmail: vi.fn(),
  mockGenerateVerificationToken: vi.fn(),
  mockGenerateInviteToken: vi.fn(),
  mockExpiresIn: vi.fn(),
  mockIsExpired: vi.fn(),
}));

vi.mock('../../../lib/prisma.js', () => ({ prisma: mockPrisma }));
vi.mock('@node-rs/argon2', () => ({ hash: mockHash, verify: mockVerify }));
vi.mock('../../../services/session.service.js', () => ({
  createSession: mockCreateSession,
  deleteSession: mockDeleteSession,
  getUserSessions: mockGetUserSessions,
  deleteSessionByToken: mockDeleteSessionByToken,
}));
vi.mock('../../../services/email.service.js', () => ({
  sendVerificationEmail: mockSendVerificationEmail,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  sendInviteEmail: mockSendInviteEmail,
}));
vi.mock('../../../utils/tokens.js', () => ({
  generateVerificationToken: mockGenerateVerificationToken,
  generateInviteToken: mockGenerateInviteToken,
  expiresIn: mockExpiresIn,
  isExpired: mockIsExpired,
  EXPIRATION: {
    EMAIL_VERIFICATION: 86400000,
    PASSWORD_RESET: 3600000,
    INVITE: 604800000,
  },
}));

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
} from '../auth.service.js';

// ===========================================
// HELPERS
// ===========================================

function resetMocks() {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === 'function') {
      (model as ReturnType<typeof vi.fn>).mockReset();
    } else {
      for (const method of Object.values(model)) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }
  mockHash.mockReset();
  mockVerify.mockReset();
  mockCreateSession.mockReset();
  mockDeleteSession.mockReset();
  mockGetUserSessions.mockReset();
  mockDeleteSessionByToken.mockReset();
  mockSendVerificationEmail.mockReset();
  mockSendPasswordResetEmail.mockReset();
  mockSendInviteEmail.mockReset();
  mockGenerateVerificationToken.mockReset();
  mockGenerateInviteToken.mockReset();
  mockExpiresIn.mockReset();
  mockIsExpired.mockReset();
}

const mockMeta = { userAgent: 'test-agent', ipAddress: '127.0.0.1' };

// ===========================================
// TESTS
// ===========================================

describe('Auth Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // -----------------------------------------
  // register
  // -----------------------------------------

  describe('register', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
      inviteToken: 'valid-invite-token',
    };

    const mockInvite = {
      id: 'invite-1',
      token: 'valid-invite-token',
      email: 'test@example.com',
      organizationId: 'org-1',
      role: 'MEMBER',
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      organization: { id: 'org-1', name: 'Test Org' },
    };

    it('should register a new user with a valid invite token', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue(mockInvite);
      mockIsExpired.mockReturnValue(false);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockHash.mockResolvedValue('hashed-password');

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: false,
      };
      mockPrisma.$transaction.mockImplementation(async (cb: unknown) => {
        if (typeof cb === 'function') return cb(mockPrisma);
        return cb;
      });
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.organizationMember.create.mockResolvedValue({});
      mockPrisma.invite.update.mockResolvedValue({});

      const mockSession = { id: 'session-1', token: 'session-token', userId: 'user-1' };
      mockCreateSession.mockResolvedValue(mockSession);

      mockGenerateVerificationToken.mockReturnValue('verification-token');
      mockExpiresIn.mockReturnValue(new Date());
      mockPrisma.verificationToken.create.mockResolvedValue({});
      mockSendVerificationEmail.mockResolvedValue(undefined);

      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          organizationId: 'org-1',
          role: 'MEMBER',
          organization: { id: 'org-1', name: 'Test Org' },
        },
      ]);

      const result = await register(validInput, mockMeta);

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.organizations).toHaveLength(1);
      expect(result.memberships[0].role).toBe('MEMBER');
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'verification-token',
        'Test User'
      );
    });

    it('should throw for invalid invite token', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue(null);

      await expect(register(validInput, mockMeta)).rejects.toThrow('Invalid invite token');
    });

    it('should throw if invite has already been used', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        ...mockInvite,
        acceptedAt: new Date(),
      });

      await expect(register(validInput, mockMeta)).rejects.toThrow('Invite has already been used');
    });

    it('should throw if invite has expired', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue(mockInvite);
      mockIsExpired.mockReturnValue(true);

      await expect(register(validInput, mockMeta)).rejects.toThrow('Invite has expired');
    });

    it('should throw if email does not match invite', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        ...mockInvite,
        email: 'other@example.com',
      });
      mockIsExpired.mockReturnValue(false);

      await expect(register(validInput, mockMeta)).rejects.toThrow('Email does not match invite');
    });

    it('should throw if user already exists', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue(mockInvite);
      mockIsExpired.mockReturnValue(false);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(register(validInput, mockMeta)).rejects.toThrow('User already exists');
    });
  });

  // -----------------------------------------
  // login
  // -----------------------------------------

  describe('login', () => {
    const loginInput = { email: 'test@example.com', password: 'SecurePass123!' };

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      name: 'Test User',
      deletedAt: null,
    };

    it('should return user, session, and organisations for valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockVerify.mockResolvedValue(true);
      const mockSession = { id: 'session-1', token: 'tok', userId: 'user-1' };
      mockCreateSession.mockResolvedValue(mockSession);
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          organizationId: 'org-1',
          role: 'MEMBER',
          organization: { id: 'org-1', name: 'Test Org' },
        },
      ]);

      const result = await login(loginInput, mockMeta);

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.organizations).toHaveLength(1);
      expect(result.memberships[0]).toEqual({ organizationId: 'org-1', role: 'MEMBER' });
      expect(mockCreateSession).toHaveBeenCalledWith({
        userId: 'user-1',
        userAgent: 'test-agent',
        ipAddress: '127.0.0.1',
      });
    });

    it('should throw "Invalid credentials" if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(login(loginInput, mockMeta)).rejects.toThrow('Invalid credentials');
    });

    it('should throw "Invalid credentials" if user has no password hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });

      await expect(login(loginInput, mockMeta)).rejects.toThrow('Invalid credentials');
    });

    it('should throw "Account has been deleted" for soft-deleted user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(login(loginInput, mockMeta)).rejects.toThrow('Account has been deleted');
    });

    it('should throw "Invalid credentials" if password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockVerify.mockResolvedValue(false);

      await expect(login(loginInput, mockMeta)).rejects.toThrow('Invalid credentials');
    });

    it('should normalise email to lowercase and trim', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockVerify.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue({ id: 'session-1' });
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);

      await login({ email: '  TEST@Example.COM  ', password: 'pass' }, mockMeta);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  // -----------------------------------------
  // logout
  // -----------------------------------------

  describe('logout', () => {
    it('should call deleteSessionByToken', async () => {
      mockDeleteSessionByToken.mockResolvedValue(undefined);

      await logout('session-token');

      expect(mockDeleteSessionByToken).toHaveBeenCalledWith('session-token');
    });
  });

  // -----------------------------------------
  // getCurrentUser
  // -----------------------------------------

  describe('getCurrentUser', () => {
    it('should return user with organisations and memberships', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          organizationId: 'org-1',
          role: 'OWNER',
          organization: { id: 'org-1', name: 'My Org' },
        },
        {
          organizationId: 'org-2',
          role: 'MEMBER',
          organization: { id: 'org-2', name: 'Other Org' },
        },
      ]);

      const result = await getCurrentUser('user-1');

      expect(result.user).toEqual(mockUser);
      expect(result.organizations).toHaveLength(2);
      expect(result.memberships).toEqual([
        { organizationId: 'org-1', role: 'OWNER' },
        { organizationId: 'org-2', role: 'MEMBER' },
      ]);
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(getCurrentUser('user-999')).rejects.toThrow('User not found');
    });
  });

  // -----------------------------------------
  // verifyEmail
  // -----------------------------------------

  describe('verifyEmail', () => {
    const validToken = {
      id: 'token-1',
      token: 'verify-token',
      identifier: 'test@example.com',
      type: 'EMAIL_VERIFICATION',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
    };

    it('should update user emailVerified and mark token as used', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(validToken);
      mockIsExpired.mockReturnValue(false);

      const updatedUser = { id: 'user-1', emailVerified: true };
      // verifyEmail uses array transaction: $transaction([prisma.user.update, prisma.verificationToken.update])
      mockPrisma.user.update.mockReturnValue(updatedUser);
      mockPrisma.verificationToken.update.mockReturnValue({});
      mockPrisma.$transaction.mockResolvedValue([updatedUser, {}]);

      const result = await verifyEmail('verify-token');

      expect(result).toEqual(updatedUser);
    });

    it('should throw for invalid token', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      await expect(verifyEmail('bad-token')).rejects.toThrow('Invalid verification token');
    });

    it('should throw for already used token', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        ...validToken,
        usedAt: new Date(),
      });

      await expect(verifyEmail('verify-token')).rejects.toThrow('Token has already been used');
    });

    it('should throw for expired token', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(validToken);
      mockIsExpired.mockReturnValue(true);

      await expect(verifyEmail('verify-token')).rejects.toThrow('Token has expired');
    });

    it('should throw for wrong token type', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        ...validToken,
        type: 'PASSWORD_RESET',
      });
      mockIsExpired.mockReturnValue(false);

      await expect(verifyEmail('verify-token')).rejects.toThrow('Invalid token type');
    });
  });

  // -----------------------------------------
  // resendVerificationEmail
  // -----------------------------------------

  describe('resendVerificationEmail', () => {
    it('should delete old tokens and send new verification email', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: false,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({});
      mockGenerateVerificationToken.mockReturnValue('new-token');
      mockExpiresIn.mockReturnValue(new Date());
      mockPrisma.verificationToken.create.mockResolvedValue({});
      mockSendVerificationEmail.mockResolvedValue(undefined);

      await resendVerificationEmail('user-1');

      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier: 'test@example.com',
          type: 'EMAIL_VERIFICATION',
        },
      });
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'new-token',
        'Test'
      );
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(resendVerificationEmail('user-999')).rejects.toThrow('User not found');
    });

    it('should throw if email is already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: true,
      });

      await expect(resendVerificationEmail('user-1')).rejects.toThrow('Email is already verified');
    });
  });

  // -----------------------------------------
  // forgotPassword
  // -----------------------------------------

  describe('forgotPassword', () => {
    it('should create a password reset token and send email', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({});
      mockGenerateVerificationToken.mockReturnValue('reset-token');
      mockExpiresIn.mockReturnValue(new Date());
      mockPrisma.verificationToken.create.mockResolvedValue({});
      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      await forgotPassword('test@example.com');

      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier: 'test@example.com',
          type: 'PASSWORD_RESET',
        },
      });
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'reset-token',
        'Test'
      );
    });

    it('should silently return for unknown email (prevent enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Should NOT throw
      await expect(forgotPassword('unknown@example.com')).resolves.toBeUndefined();

      // Should NOT send any email
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------
  // resetPassword
  // -----------------------------------------

  describe('resetPassword', () => {
    const validResetToken = {
      id: 'token-1',
      token: 'reset-token',
      identifier: 'test@example.com',
      type: 'PASSWORD_RESET',
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600000),
    };

    it('should hash new password and update user via transaction', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(validResetToken);
      mockIsExpired.mockReturnValue(false);
      mockHash.mockResolvedValue('new-hashed-password');

      // resetPassword uses array transaction
      mockPrisma.user.update.mockReturnValue({ id: 'user-1' });
      mockPrisma.verificationToken.update.mockReturnValue({});
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await resetPassword('reset-token', 'NewSecurePass!');

      expect(mockHash).toHaveBeenCalledWith('NewSecurePass!', expect.any(Object));
    });

    it('should throw for invalid reset token', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      await expect(resetPassword('bad-token', 'NewPass!')).rejects.toThrow('Invalid reset token');
    });

    it('should throw for already used token', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        ...validResetToken,
        usedAt: new Date(),
      });

      await expect(resetPassword('reset-token', 'NewPass!')).rejects.toThrow(
        'Token has already been used'
      );
    });

    it('should throw for expired token', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue(validResetToken);
      mockIsExpired.mockReturnValue(true);

      await expect(resetPassword('reset-token', 'NewPass!')).rejects.toThrow('Token has expired');
    });

    it('should throw for wrong token type', async () => {
      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        ...validResetToken,
        type: 'EMAIL_VERIFICATION',
      });
      mockIsExpired.mockReturnValue(false);

      await expect(resetPassword('reset-token', 'NewPass!')).rejects.toThrow('Invalid token type');
    });
  });

  // -----------------------------------------
  // getSessions
  // -----------------------------------------

  describe('getSessions', () => {
    it('should delegate to getUserSessions', async () => {
      const mockSessions = [
        { id: 'session-1', userId: 'user-1' },
        { id: 'session-2', userId: 'user-1' },
      ];
      mockGetUserSessions.mockResolvedValue(mockSessions);

      const result = await getSessions('user-1');

      expect(result).toEqual(mockSessions);
      expect(mockGetUserSessions).toHaveBeenCalledWith('user-1');
    });
  });

  // -----------------------------------------
  // revokeSession
  // -----------------------------------------

  describe('revokeSession', () => {
    it('should delete session if it belongs to the user', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
      });
      mockDeleteSession.mockResolvedValue(undefined);

      await revokeSession('session-1', 'user-1');

      expect(mockDeleteSession).toHaveBeenCalledWith('session-1');
    });

    it('should throw if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(revokeSession('session-999', 'user-1')).rejects.toThrow('Session not found');
    });

    it('should throw if session belongs to a different user', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        userId: 'user-2',
      });

      await expect(revokeSession('session-1', 'user-1')).rejects.toThrow('Session not found');
    });
  });

  // -----------------------------------------
  // createInvite
  // -----------------------------------------

  describe('createInvite', () => {
    const inviteInput = {
      email: 'new@example.com',
      organizationId: 'org-1',
      role: 'MEMBER' as const,
      invitedById: 'user-1',
    };

    it('should create invite and send email', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // no existing user
        .mockResolvedValueOnce({ id: 'user-1', email: 'inviter@example.com', name: 'Inviter' }); // inviter
      mockPrisma.invite.findFirst.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
      });
      mockGenerateInviteToken.mockReturnValue('invite-token');
      mockExpiresIn.mockReturnValue(new Date());
      mockPrisma.invite.create.mockResolvedValue({});
      mockSendInviteEmail.mockResolvedValue(undefined);

      const result = await createInvite(inviteInput);

      expect(result).toBe('invite-token');
      expect(mockSendInviteEmail).toHaveBeenCalledWith(
        'new@example.com',
        'invite-token',
        'Test Org',
        'Inviter'
      );
    });

    it('should throw if user is already a member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'new@example.com',
        memberships: [{ organizationId: 'org-1' }],
      });

      await expect(createInvite(inviteInput)).rejects.toThrow(
        'User is already a member of this organization'
      );
    });

    it('should throw if a pending invite already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'new@example.com',
        memberships: [],
      });
      mockPrisma.invite.findFirst.mockResolvedValue({ id: 'invite-existing' });

      await expect(createInvite(inviteInput)).rejects.toThrow(
        'An invite has already been sent to this email'
      );
    });

    it('should throw if organisation or inviter not found', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // no existing user
        .mockResolvedValueOnce(null); // inviter not found
      mockPrisma.invite.findFirst.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(createInvite(inviteInput)).rejects.toThrow('Organization or inviter not found');
    });
  });

  // -----------------------------------------
  // getInviteByToken
  // -----------------------------------------

  describe('getInviteByToken', () => {
    it('should return invite data for a valid token', async () => {
      const mockOrg = { id: 'org-1', name: 'Test Org' };
      mockPrisma.invite.findUnique.mockResolvedValue({
        email: 'test@example.com',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        organization: mockOrg,
      });
      mockIsExpired.mockReturnValue(false);

      const result = await getInviteByToken('valid-token');

      expect(result).toEqual({
        email: 'test@example.com',
        organization: mockOrg,
      });
    });

    it('should return null for missing invite', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue(null);

      const result = await getInviteByToken('nonexistent-token');

      expect(result).toBeNull();
    });

    it('should return null for accepted invite', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        email: 'test@example.com',
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        organization: { id: 'org-1' },
      });

      const result = await getInviteByToken('accepted-token');

      expect(result).toBeNull();
    });

    it('should return null for expired invite', async () => {
      mockPrisma.invite.findUnique.mockResolvedValue({
        email: 'test@example.com',
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 86400000),
        organization: { id: 'org-1' },
      });
      mockIsExpired.mockReturnValue(true);

      const result = await getInviteByToken('expired-token');

      expect(result).toBeNull();
    });
  });
});
