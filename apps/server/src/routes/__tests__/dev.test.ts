import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { devRoutes } from '../dev.js';

describe('Dev Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(devRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /dev', () => {
    it('should return 200 with success true', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dev',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().success).toBe(true);
    });

    it('should return developer name as Akaal Creatives', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dev',
      });

      const body = response.json();
      expect(body.data.developer.name).toBe('Akaal Creatives');
    });

    it('should return developer website as https://www.akaalcreatives.com', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dev',
      });

      const body = response.json();
      expect(body.data.developer.website).toBe('https://www.akaalcreatives.com');
    });
  });
});
