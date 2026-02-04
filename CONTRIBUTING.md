# Contributing to LibreDiary

Thank you for your interest in contributing to LibreDiary! This document provides guidelines and instructions for contributing.

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

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm dev:web` | Start frontend only |
| `pnpm dev:server` | Start backend only |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint errors |
| `pnpm format` | Format with Prettier |
| `pnpm typecheck` | Type check all packages |
| `pnpm test` | Run tests |
| `pnpm clean` | Clean all build artifacts |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |

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

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a pull request

### PR Checklist

- [ ] Code follows the style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Reporting Issues

When reporting bugs, please include:

1. Description of the issue
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Environment (OS, Node version, browser)
6. Screenshots (if applicable)

## License

By contributing to LibreDiary, you agree that your contributions will be licensed under the **GNU AGPLv3** license.

## Questions?

Feel free to open an issue for questions or discussions.

---

Developed by [Akaal Creatives](https://www.akaalcreatives.com)
