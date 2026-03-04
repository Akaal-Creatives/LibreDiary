import node from '@librediary/eslint-config/node';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...node,
  {
    ignores: ['prisma/**', 'dist/**'],
  },
];
