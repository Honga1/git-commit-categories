# Git Commit Categories

A TypeScript CLI tool for analyzing git commit message patterns and categorizing them according to conventional commit standards.

## Features

- Analyzes git repositories for commit message patterns
- Categorizes commits as conventional vs non-conventional
- Provides detailed statistics and recommendations
- Caches analysis results for improved performance
- Supports custom rules and transformations

## Installation

```bash
npm install -g @honga/repo
```

## Usage

```bash
# Analyze current repository
git-commit-categories

# Analyze specific repository
git-commit-categories /path/to/repo

# Show help
git-commit-categories --help
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Run E2E tests
npm run test:e2e
```

## Testing

The project includes comprehensive testing:

- **Manual Testing Plan**: See [MANUAL_TESTING_PLAN.md](MANUAL_TESTING_PLAN.md)
- **E2E Testing Plan**: See [E2E_TESTING_PLAN.md](E2E_TESTING_PLAN.md)
- **Automated Tests**: Run with `npm test`

## Architecture

The project follows clean architecture principles with:

- **Services**: Core business logic (GitService, CacheService, ConfigService)
- **Types**: Comprehensive TypeScript type definitions
- **Utils**: Utility functions for file operations, validation, and async operations
- **Git Interface**: Abstraction layer for git operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.
