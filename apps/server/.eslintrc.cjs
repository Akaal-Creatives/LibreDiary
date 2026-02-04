/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ["@librediary/eslint-config/node"],
  ignorePatterns: ["prisma/**", "dist/**"],
};
