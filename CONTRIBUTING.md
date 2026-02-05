# Contributing to LibreDiary

Thank you for your interest in contributing to LibreDiary! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

## Getting Started

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/librediary.git
   cd librediary
   ```

3. **Add the upstream remote**:

   ```bash
   git remote add upstream https://github.com/akaalcreatives/librediary.git
   ```

## Development Setup

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Docker** and **Docker Compose** (for local PostgreSQL)

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/akaalcreatives/librediary.git
   cd librediary
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Start the database**

   ```bash
   docker compose -f tooling/docker/docker-compose.dev.yml up -d
   ```

5. **Run database migrations**

   ```bash
   pnpm db:migrate
   ```

6. **Start development servers**

   ```bash
   pnpm dev
   ```

   This starts both the frontend (http://localhost:5173) and backend (http://localhost:3000).

### Project Structure

```
librediary/
├── apps/
│   ├── web/              # Vue 3 frontend
│   └── server/           # Fastify backend
├── packages/
│   ├── shared/           # Shared types, schemas, utils
│   ├── tsconfig/         # TypeScript configurations
│   └── eslint-config/    # ESLint configurations
├── tooling/
│   └── docker/           # Docker configurations
├── turbo.json            # Turborepo configuration
└── pnpm-workspace.yaml   # pnpm workspace configuration
```

### Available Scripts

| Command           | Description               |
| ----------------- | ------------------------- |
| `pnpm dev`        | Start all dev servers     |
| `pnpm dev:web`    | Start frontend only       |
| `pnpm dev:server` | Start backend only        |
| `pnpm build`      | Build all packages        |
| `pnpm lint`       | Run ESLint                |
| `pnpm lint:fix`   | Fix ESLint errors         |
| `pnpm format`     | Format with Prettier      |
| `pnpm typecheck`  | Type check all packages   |
| `pnpm test`       | Run tests                 |
| `pnpm clean`      | Clean all build artifacts |
| `pnpm db:migrate` | Run database migrations   |
| `pnpm db:studio`  | Open Prisma Studio        |

## Code Style

- We use **TypeScript** throughout the codebase
- **ESLint** and **Prettier** are configured for code quality
- Run `pnpm lint:fix` and `pnpm format` before committing
- Pre-commit hooks will automatically lint staged files

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**

- `feat(auth): add Google OAuth support`
- `fix(editor): handle empty page title`
- `docs(readme): update installation instructions`

## Pull Request Process

1. **Sync your fork** with upstream:

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Make your changes** and ensure they pass all checks:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

4. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** against the `main` branch and fill out the PR template

### PR Requirements

- All CI checks must pass
- Code must be reviewed by at least one maintainer
- Commits should follow conventional commit guidelines
- Branch should be up to date with `main`

## Reporting Issues

Use our [issue templates](https://github.com/akaalcreatives/librediary/issues/new/choose) to report:

- **Bug Reports**: Something isn't working as expected
- **Feature Requests**: Suggest a new feature or enhancement
- **Documentation**: Report documentation issues or improvements

When reporting bugs, please include:

1. Description of the issue
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Environment (OS, Node version, browser)
6. Screenshots (if applicable)

## Security

Found a security vulnerability? Please report it responsibly by following our [Security Policy](SECURITY.md). Do not open a public issue for security vulnerabilities.

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/akaalcreatives/librediary/discussions)
- **Bugs**: Use the [Bug Report](https://github.com/akaalcreatives/librediary/issues/new?template=bug_report.md) template
- **Features**: Use the [Feature Request](https://github.com/akaalcreatives/librediary/issues/new?template=feature_request.md) template

## License

By contributing to LibreDiary, you agree that your contributions will be licensed under the **GNU AGPLv3** license.

## Questions?

Feel free to open an issue for questions or discussions.

---

Developed by [Akaal Creatives](https://www.akaalcreatives.com)
