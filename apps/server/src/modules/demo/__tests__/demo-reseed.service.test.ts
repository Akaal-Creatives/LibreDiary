import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockWebhookDelivery = { deleteMany: vi.fn() };
  const mockWebhook = { deleteMany: vi.fn() };
  const mockApiToken = { deleteMany: vi.fn() };
  const mockDataExport = { deleteMany: vi.fn() };
  const mockBackup = { deleteMany: vi.fn() };
  const mockAuditLog = { deleteMany: vi.fn() };
  const mockNotification = { deleteMany: vi.fn() };
  const mockMention = { deleteMany: vi.fn() };
  const mockComment = { deleteMany: vi.fn() };
  const mockFavorite = { deleteMany: vi.fn() };
  const mockPagePermission = { deleteMany: vi.fn() };
  const mockPageVersion = { deleteMany: vi.fn() };
  const mockDatabaseRow = { deleteMany: vi.fn() };
  const mockDatabaseView = { deleteMany: vi.fn() };
  const mockDatabaseProperty = { deleteMany: vi.fn() };
  const mockDatabase = { deleteMany: vi.fn() };
  const mockFile = { deleteMany: vi.fn() };
  const mockPage = { deleteMany: vi.fn() };
  const mockTemplate = { deleteMany: vi.fn() };
  const mockInvite = { deleteMany: vi.fn() };
  const mockOrganizationMember = { deleteMany: vi.fn(), create: vi.fn() };
  const mockOrganization = { deleteMany: vi.fn(), create: vi.fn() };
  const mockSession = { deleteMany: vi.fn() };
  const mockAccount = { deleteMany: vi.fn() };
  const mockVerificationToken = { deleteMany: vi.fn() };
  const mockUser = { deleteMany: vi.fn(), create: vi.fn() };
  const mockSystemSettings = { deleteMany: vi.fn() };

  const mockPrisma = {
    webhookDelivery: mockWebhookDelivery,
    webhook: mockWebhook,
    apiToken: mockApiToken,
    dataExport: mockDataExport,
    backup: mockBackup,
    auditLog: mockAuditLog,
    notification: mockNotification,
    mention: mockMention,
    comment: mockComment,
    favorite: mockFavorite,
    pagePermission: mockPagePermission,
    pageVersion: mockPageVersion,
    databaseRow: mockDatabaseRow,
    databaseView: mockDatabaseView,
    databaseProperty: mockDatabaseProperty,
    database: mockDatabase,
    file: mockFile,
    page: mockPage,
    template: mockTemplate,
    invite: mockInvite,
    organizationMember: mockOrganizationMember,
    organization: mockOrganization,
    session: mockSession,
    account: mockAccount,
    verificationToken: mockVerificationToken,
    user: mockUser,
    systemSettings: mockSystemSettings,
    $transaction: vi.fn((callback: (tx: typeof mockPrisma) => Promise<void>) =>
      callback(mockPrisma)
    ),
  };

  function resetMocks() {
    // Reset all deleteMany mocks
    for (const model of Object.values(mockPrisma)) {
      if (model && typeof model === 'object' && !Array.isArray(model)) {
        for (const fn of Object.values(model)) {
          if (typeof fn === 'function' && 'mockReset' in fn) {
            (fn as ReturnType<typeof vi.fn>).mockReset();
          }
        }
      }
    }
    mockPrisma.$transaction.mockReset();
    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrisma) => Promise<void>) => callback(mockPrisma)
    );
  }

  return { mockPrisma, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password_123'),
}));

import { reseedDemoData } from '../demo-reseed.service.js';

describe('reseedDemoData', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should execute all deletions within a transaction', async () => {
    mockPrisma.organization.create.mockResolvedValue({
      id: 'org-1',
      name: 'Demo Organisation',
      slug: 'demo',
    });
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'demo@librediary.org',
    });
    mockPrisma.organizationMember.create.mockResolvedValue({});

    await reseedDemoData();

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it('should delete all tables in FK-safe order within the transaction', async () => {
    const callOrder: string[] = [];

    // Track the order of deleteMany calls
    mockPrisma.webhookDelivery.deleteMany.mockImplementation(() => {
      callOrder.push('webhookDelivery');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.webhook.deleteMany.mockImplementation(() => {
      callOrder.push('webhook');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.apiToken.deleteMany.mockImplementation(() => {
      callOrder.push('apiToken');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.dataExport.deleteMany.mockImplementation(() => {
      callOrder.push('dataExport');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.backup.deleteMany.mockImplementation(() => {
      callOrder.push('backup');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.auditLog.deleteMany.mockImplementation(() => {
      callOrder.push('auditLog');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.notification.deleteMany.mockImplementation(() => {
      callOrder.push('notification');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.mention.deleteMany.mockImplementation(() => {
      callOrder.push('mention');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.comment.deleteMany.mockImplementation(() => {
      callOrder.push('comment');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.favorite.deleteMany.mockImplementation(() => {
      callOrder.push('favorite');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.pagePermission.deleteMany.mockImplementation(() => {
      callOrder.push('pagePermission');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.pageVersion.deleteMany.mockImplementation(() => {
      callOrder.push('pageVersion');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.databaseRow.deleteMany.mockImplementation(() => {
      callOrder.push('databaseRow');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.databaseView.deleteMany.mockImplementation(() => {
      callOrder.push('databaseView');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.databaseProperty.deleteMany.mockImplementation(() => {
      callOrder.push('databaseProperty');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.database.deleteMany.mockImplementation(() => {
      callOrder.push('database');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.file.deleteMany.mockImplementation(() => {
      callOrder.push('file');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.page.deleteMany.mockImplementation(() => {
      callOrder.push('page');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.template.deleteMany.mockImplementation(() => {
      callOrder.push('template');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.invite.deleteMany.mockImplementation(() => {
      callOrder.push('invite');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.organizationMember.deleteMany.mockImplementation(() => {
      callOrder.push('organizationMember');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.organization.deleteMany.mockImplementation(() => {
      callOrder.push('organization');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.session.deleteMany.mockImplementation(() => {
      callOrder.push('session');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.account.deleteMany.mockImplementation(() => {
      callOrder.push('account');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.verificationToken.deleteMany.mockImplementation(() => {
      callOrder.push('verificationToken');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.user.deleteMany.mockImplementation(() => {
      callOrder.push('user');
      return Promise.resolve({ count: 0 });
    });
    mockPrisma.systemSettings.deleteMany.mockImplementation(() => {
      callOrder.push('systemSettings');
      return Promise.resolve({ count: 0 });
    });

    mockPrisma.organization.create.mockResolvedValue({ id: 'org-1' });
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
    mockPrisma.organizationMember.create.mockResolvedValue({});

    await reseedDemoData();

    // Children must be deleted before parents (FK-safe order)
    const expectedOrder = [
      'webhookDelivery',
      'webhook',
      'apiToken',
      'dataExport',
      'backup',
      'auditLog',
      'notification',
      'mention',
      'comment',
      'favorite',
      'pagePermission',
      'pageVersion',
      'databaseRow',
      'databaseView',
      'databaseProperty',
      'database',
      'file',
      'page',
      'template',
      'invite',
      'organizationMember',
      'organization',
      'session',
      'account',
      'verificationToken',
      'user',
      'systemSettings',
    ];

    expect(callOrder).toEqual(expectedOrder);
  });

  it('should create a demo organisation with correct data', async () => {
    const mockOrg = { id: 'org-1', name: 'Demo Organisation', slug: 'demo' };
    mockPrisma.organization.create.mockResolvedValue(mockOrg);
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
    mockPrisma.organizationMember.create.mockResolvedValue({});

    await reseedDemoData();

    expect(mockPrisma.organization.create).toHaveBeenCalledWith({
      data: {
        name: 'Demo Organisation',
        slug: 'demo',
        accentColor: '#7c9a8c',
      },
    });
  });

  it('should create a demo user with hashed password and correct fields', async () => {
    mockPrisma.organization.create.mockResolvedValue({ id: 'org-1' });
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
    mockPrisma.organizationMember.create.mockResolvedValue({});

    await reseedDemoData();

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'demo@librediary.org',
        name: 'Demo User',
        passwordHash: 'hashed_password_123',
        emailVerified: true,
        emailVerifiedAt: expect.any(Date),
        isSuperAdmin: true,
      },
    });
  });

  it('should hash the password "password"', async () => {
    const { hash } = await import('argon2');

    mockPrisma.organization.create.mockResolvedValue({ id: 'org-1' });
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
    mockPrisma.organizationMember.create.mockResolvedValue({});

    await reseedDemoData();

    expect(hash).toHaveBeenCalledWith('password');
  });

  it('should create an organisation membership with OWNER role', async () => {
    mockPrisma.organization.create.mockResolvedValue({ id: 'org-42' });
    mockPrisma.user.create.mockResolvedValue({ id: 'user-99' });
    mockPrisma.organizationMember.create.mockResolvedValue({});

    await reseedDemoData();

    expect(mockPrisma.organizationMember.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-42',
        userId: 'user-99',
        role: 'OWNER',
      },
    });
  });

  it('should propagate transaction errors', async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error('DB connection lost'));

    await expect(reseedDemoData()).rejects.toThrow('DB connection lost');
  });

  it('should propagate errors from organisation creation', async () => {
    mockPrisma.organization.create.mockRejectedValue(new Error('Unique constraint violation'));

    await expect(reseedDemoData()).rejects.toThrow('Unique constraint violation');
  });

  it('should propagate errors from user creation', async () => {
    mockPrisma.organization.create.mockResolvedValue({ id: 'org-1' });
    mockPrisma.user.create.mockRejectedValue(new Error('Email already exists'));

    await expect(reseedDemoData()).rejects.toThrow('Email already exists');
  });

  it('should create organisation before user and membership', async () => {
    const callOrder: string[] = [];

    mockPrisma.organization.create.mockImplementation(() => {
      callOrder.push('organization.create');
      return Promise.resolve({ id: 'org-1' });
    });
    mockPrisma.user.create.mockImplementation(() => {
      callOrder.push('user.create');
      return Promise.resolve({ id: 'user-1' });
    });
    mockPrisma.organizationMember.create.mockImplementation(() => {
      callOrder.push('organizationMember.create');
      return Promise.resolve({});
    });

    await reseedDemoData();

    expect(callOrder).toEqual(['organization.create', 'user.create', 'organizationMember.create']);
  });

  it('should return void on success', async () => {
    mockPrisma.organization.create.mockResolvedValue({ id: 'org-1' });
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
    mockPrisma.organizationMember.create.mockResolvedValue({});

    const result = await reseedDemoData();

    expect(result).toBeUndefined();
  });
});
