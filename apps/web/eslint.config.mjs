import vue from '@librediary/eslint-config/vue';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...vue,
  {
    ignores: ['dist/**'],
  },
];
