import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import redos from 'eslint-plugin-redos';

/** @type {import('eslint').Linter.Config[]} */
export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // ReDoS gate: flag catastrophic-backtracking regex. CI has no dedicated
    // ReDoS ruleset, so this local rule is the primary control. Advisory
    // ('warn') on adoption so it never breaks existing lint/CI; promote to
    // 'error' once the pre-existing findings are triaged and cleared.
    plugins: { redos },
    rules: { 'redos/no-vulnerable': 'warn' },
  },
  {
    // Test files use controlled, in-repo fixtures — ReDoS analysis there is noise.
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'],
    rules: { 'redos/no-vulnerable': 'off' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '.turbo/', 'coverage/'],
  },
];
