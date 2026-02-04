import type { FastifyInstance } from 'fastify';
import type { ApiResponse } from '@librediary/shared';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
}

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get<{ Reply: ApiResponse<HealthResponse> }>('/health', async (_request, reply) => {
    const response: ApiResponse<HealthResponse> = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version ?? '0.0.0',
      },
    };

    return reply.send(response);
  });
}
