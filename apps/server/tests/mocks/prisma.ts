import { vi } from 'vitest';

export const mockPrismaSession = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
};

export const mockPrismaUser = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

export const mockPrismaVerificationToken = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
};

export const mockPrismaInvite = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

export const mockPrismaOrganization = {
  findUnique: vi.fn(),
};

export const mockPrismaOrganizationMember = {
  create: vi.fn(),
  findMany: vi.fn(),
};

export const mockPrisma = {
  session: mockPrismaSession,
  user: mockPrismaUser,
  verificationToken: mockPrismaVerificationToken,
  invite: mockPrismaInvite,
  organization: mockPrismaOrganization,
  organizationMember: mockPrismaOrganizationMember,
  $transaction: vi.fn(),
};

export function resetPrismaMocks() {
  Object.values(mockPrismaSession).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaVerificationToken).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaInvite).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganization).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
}
