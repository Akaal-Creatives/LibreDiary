import helmet from '@fastify/helmet';
import type { FastifyHelmetOptions } from '@fastify/helmet';
import type { FastifyInstance } from 'fastify';

export async function helmetPlugin(fastify: FastifyInstance) {
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: [
          "'self'",
          'https://www.youtube-nocookie.com',
          'https://player.vimeo.com',
          'https://www.figma.com',
          'https://maps.google.com',
        ],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // permissionsPolicy is supported at runtime via helmet but not
    // yet reflected in @fastify/helmet's TypeScript definitions.
    permissionsPolicy: {
      features: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
      },
    },
  } as FastifyHelmetOptions);
}
