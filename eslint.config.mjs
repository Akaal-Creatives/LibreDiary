import vue from './packages/eslint-config/vue.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...vue,
  {
    ignores: ['dist/**', 'prisma/**', 'scripts/**'],
  },
];
