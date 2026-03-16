import type { FastifyInstance } from 'fastify';
import type { ApiResponse } from '@librediary/shared';

interface VersionResponse {
  version: string;
}

export async function versionRoutes(fastify: FastifyInstance) {
  fastify.get<{ Reply: ApiResponse<VersionResponse> }>('/version', async (_request, reply) => {
    const response: ApiResponse<VersionResponse> = {
      success: true,
      data: {
        version: process.env.npm_package_version ?? '0.0.0',
      },
    };

    return reply.send(response);
  });
}
