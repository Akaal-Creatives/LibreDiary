import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10000,
    // Increase teardown timeout for cleanup
    teardownTimeout: 60000,
    // Set environment variables early, before modules are loaded
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
