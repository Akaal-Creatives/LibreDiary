import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { healthRoutes } from '../health.js';

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(healthRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 with success true', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it('should return status as healthy', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = response.json();
      expect(body.data.status).toBe('healthy');
    });

    it('should return a valid ISO timestamp string', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = response.json();
      expect(typeof body.data.timestamp).toBe('string');
      // Verify it is a valid ISO date string
      const parsed = new Date(body.data.timestamp);
      expect(parsed.toISOString()).toBe(body.data.timestamp);
    });

    it('should return a numeric uptime', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = response.json();
      expect(typeof body.data.uptime).toBe('number');
      expect(body.data.uptime).toBeGreaterThan(0);
    });

    it('should return a version string', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const body = response.json();
      expect(typeof body.data.version).toBe('string');
      expect(body.data.version.length).toBeGreaterThan(0);
    });
  });
});
