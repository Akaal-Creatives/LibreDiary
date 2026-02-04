import { defineConfig } from 'vitest/config';

// Config specifically for pages service tests (memory-intensive)
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/modules/pages/__tests__/*.service.test.ts'],
    // Exclude the problematic file - run it separately
    exclude: ['**/node_modules/**', '**/pages-crud-write.service.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
    teardownTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      APP_SECRET: 'test-secret-key-must-be-at-least-32-characters-long',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      SMTP_FROM: 'test@example.com',
      APP_URL: 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
