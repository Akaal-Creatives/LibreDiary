import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.APP_SECRET = 'test-secret-key-must-be-at-least-32-characters';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_FROM = 'test@example.com';
process.env.APP_URL = 'http://localhost:3000';

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
beforeAll(() => {
  // Any global setup
});

afterAll(() => {
  // Any global teardown
});
