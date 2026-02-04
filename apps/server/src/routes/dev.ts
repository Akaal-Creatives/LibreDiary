import type { FastifyInstance } from 'fastify';
import { type ApiResponse, type DeveloperInfo, DEVELOPER_INFO } from '@librediary/shared';

export async function devRoutes(fastify: FastifyInstance) {
  fastify.get<{ Reply: ApiResponse<{ developer: DeveloperInfo }> }>(
    '/dev',
    async (_request, reply) => {
      const response: ApiResponse<{ developer: DeveloperInfo }> = {
        success: true,
        data: {
          developer: DEVELOPER_INFO,
        },
      };

      return reply.send(response);
    }
  );
}
