import { vi } from 'vitest';

// Shared mock setup for pages service tests
export const mockPrismaPage = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  aggregate: vi.fn(),
};

export const mockPrismaFavorite = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  aggregate: vi.fn(),
};

export const mockPrisma = {
  page: mockPrismaPage,
  favorite: mockPrismaFavorite,
  $transaction: vi.fn(),
};

export function resetMocks() {
  Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaFavorite).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
}

// Shared test data
export const now = new Date();

export const mockPage = {
  id: 'page-123',
  organizationId: 'org-123',
  parentId: null,
  position: 0,
  title: 'Test Page',
  icon: null,
  coverUrl: null,
  yjsState: null,
  isPublic: false,
  publicSlug: null,
  trashedAt: null,
  createdById: 'user-123',
  updatedById: null,
  createdAt: now,
  updatedAt: now,
};

export const mockChildPage = {
  ...mockPage,
  id: 'page-456',
  parentId: 'page-123',
  title: 'Child Page',
  position: 0,
};

export const mockFavorite = {
  id: 'fav-123',
  userId: 'user-123',
  pageId: 'page-123',
  position: 0,
  createdAt: now,
};
