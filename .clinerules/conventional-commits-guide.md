# Comprehensive Guide to Conventional Commits

## Table of Contents

1. [What are Conventional Commits?](#what-are-conventional-commits)
2. [Basic Structure](#basic-structure)
3. [Commit Types](#commit-types)
4. [Scopes](#scopes)
5. [Examples by Category](#examples-by-category)
6. [Best Practices](#best-practices)
7. [Benefits](#benefits)
8. [Tools and Integration](#tools-and-integration)

## What are Conventional Commits?

Conventional Commits is a specification for adding human and machine-readable meaning to commit messages. It provides an easy set of rules for creating an explicit commit history, making it easier to write automated tools on top of.

The specification is inspired by, and supersedes the Angular convention.

## Basic Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Components:

- **type**: A noun describing the kind of change
- **scope**: A noun describing the section of the codebase (optional)
- **description**: A short summary of the code changes
- **body**: A longer explanation of the change (optional)
- **footer**: One or more footers for breaking changes, issues, etc. (optional)

## Commit Types

### 🚀 **feat** - New Features

**When to use:** Adding new functionality, features, or capabilities to the application.

**Examples:**

- `feat: add user authentication system`
- `feat(api): implement GraphQL endpoint for user queries`
- `feat: add dark mode toggle to settings page`
- `feat(mobile): implement push notifications`

**What qualifies:**

- New user-facing features
- New API endpoints
- New configuration options
- New components or modules
- Enhanced existing functionality with new capabilities

---

### 🐛 **fix** - Bug Fixes

**When to use:** Fixing bugs, errors, or issues in existing functionality.

**Examples:**

- `fix: resolve memory leak in image processing`
- `fix(auth): handle expired token edge case`
- `fix: correct calculation in tax computation`
- `fix(ui): prevent button double-click submission`

**What qualifies:**

- Resolving crashes or errors
- Fixing incorrect behavior
- Patching security vulnerabilities
- Correcting logic errors
- Fixing performance issues

---

### 📚 **docs** - Documentation

**When to use:** Changes to documentation only, no code changes.

**Examples:**

- `docs: update API documentation for v2.0`
- `docs(readme): add installation instructions`
- `docs: fix typos in contributing guidelines`
- `docs(api): add examples for authentication endpoints`

**What qualifies:**

- README updates
- API documentation changes
- Code comments improvements
- Wiki or help documentation
- Changelog updates
- License changes

---

### 💄 **style** - Code Style

**When to use:** Changes that don't affect code meaning (formatting, missing semicolons, etc.).

**Examples:**

- `style: format code with prettier`
- `style(css): reorganize stylesheet structure`
- `style: fix linting errors and warnings`
- `style: add missing semicolons`

**What qualifies:**

- Code formatting changes
- Whitespace adjustments
- Missing semicolons or commas
- Linting rule compliance
- Import organization
- Variable naming consistency

---

### ♻️ **refactor** - Code Refactoring

**When to use:** Code changes that neither fix bugs nor add features.

**Examples:**

- `refactor: extract user validation logic into separate module`
- `refactor(database): optimize query performance`
- `refactor: simplify authentication flow`
- `refactor(utils): consolidate string manipulation functions`

**What qualifies:**

- Code restructuring for better maintainability
- Performance optimizations without changing functionality
- Extracting reusable components
- Simplifying complex logic
- Removing code duplication
- Improving code readability

---

### 🧪 **test** - Tests

**When to use:** Adding, updating, or fixing tests.

**Examples:**

- `test: add unit tests for user service`
- `test(integration): add API endpoint testing`
- `test: fix flaky authentication tests`
- `test(e2e): add user registration flow tests`

**What qualifies:**

- Adding new test cases
- Updating existing tests
- Fixing broken tests
- Adding test utilities
- Improving test coverage
- Adding performance benchmarks

---

### 🔧 **chore** - Maintenance

**When to use:** Other changes that don't modify src or test files.

**Examples:**

- `chore: update dependencies to latest versions`
- `chore(deps): bump lodash from 4.17.20 to 4.17.21`
- `chore: update .gitignore for IDE files`
- `chore(config): update ESLint configuration`

**What qualifies:**

- Dependency updates
- Configuration file changes
- Build script modifications
- Development tool updates
- Package.json changes
- Environment setup changes

---

### 🏗️ **build** - Build System

**When to use:** Changes to build system or external dependencies.

**Examples:**

- `build: add webpack configuration for production`
- `build(docker): optimize container image size`
- `build: update CI/CD pipeline configuration`
- `build(npm): add new build scripts`

**What qualifies:**

- Build tool configuration
- Webpack, Rollup, or bundler changes
- Docker configuration
- Makefile changes
- Package manager configuration
- Compilation settings

---

### 👷 **ci** - Continuous Integration

**When to use:** Changes to CI configuration files and scripts.

**Examples:**

- `ci: add automated testing workflow`
- `ci(github): update actions to use Node.js 18`
- `ci: add code coverage reporting`
- `ci(jenkins): optimize build pipeline`

**What qualifies:**

- GitHub Actions workflows
- Jenkins pipeline changes
- Travis CI configuration
- CircleCI setup
- GitLab CI changes
- Automated deployment scripts

---

### ⚡ **perf** - Performance

**When to use:** Code changes that improve performance.

**Examples:**

- `perf: optimize database query execution`
- `perf(images): implement lazy loading for gallery`
- `perf: reduce bundle size by 30%`
- `perf(api): add response caching layer`

**What qualifies:**

- Algorithm optimizations
- Database query improvements
- Bundle size reductions
- Memory usage optimizations
- Loading time improvements
- Caching implementations

---

### ⏪ **revert** - Reverts

**When to use:** Reverting a previous commit.

**Examples:**

- `revert: "feat: add experimental feature X"`
- `revert(api): rollback breaking changes to user endpoint`

**What qualifies:**

- Undoing previous commits
- Rolling back problematic changes
- Reverting failed experiments

## Scopes

Scopes provide additional context about which part of the codebase is affected:

### Common Scopes by Project Type:

**Web Applications:**

- `ui`, `frontend`, `backend`
- `auth`, `api`, `database`
- `components`, `services`, `utils`
- `routing`, `state`, `config`

**Mobile Applications:**

- `ios`, `android`, `mobile`
- `navigation`, `screens`, `components`
- `storage`, `network`, `push`

**Libraries/Packages:**

- `core`, `utils`, `types`
- `parser`, `validator`, `formatter`
- `cli`, `api`, `docs`

**Microservices:**

- Service names: `user-service`, `payment-service`
- `gateway`, `auth`, `monitoring`

## Examples by Category

### Frontend Development

```
feat(ui): add responsive navigation menu
fix(components): resolve button accessibility issues
style(css): implement design system colors
refactor(hooks): optimize state management logic
test(components): add unit tests for form validation
perf(images): implement WebP format with fallbacks
```

### Backend Development

```
feat(api): implement user profile endpoints
fix(database): resolve connection pool exhaustion
refactor(services): extract email notification logic
test(integration): add API endpoint testing suite
perf(queries): optimize user search performance
chore(deps): update security dependencies
```

### DevOps/Infrastructure

```
build(docker): add multi-stage build optimization
ci(github): add automated security scanning
chore(k8s): update deployment configurations
fix(monitoring): resolve alerting rule syntax
feat(infra): add auto-scaling configuration
```

### Documentation

```
docs(api): add OpenAPI specification
docs(readme): update installation instructions
docs(contributing): add code review guidelines
docs(architecture): document microservices design
```

## Best Practices

### 1. **Use Present Tense**

- ✅ `feat: add user authentication`
- ❌ `feat: added user authentication`

### 2. **Keep Descriptions Concise**

- ✅ `fix: resolve memory leak in image processing`
- ❌ `fix: this commit fixes a really bad memory leak that was happening in the image processing module when users uploaded large files`

### 3. **Use Lowercase**

- ✅ `feat: add dark mode toggle`
- ❌ `feat: Add Dark Mode Toggle`

### 4. **No Period at the End**

- ✅ `docs: update installation guide`
- ❌ `docs: update installation guide.`

### 5. **Use Body for Context**

```
feat(auth): implement OAuth2 integration

Add support for Google and GitHub OAuth2 providers.
This enables users to sign in with their existing accounts
and reduces friction in the registration process.

Closes #123
```

### 6. **Breaking Changes**

```
feat(api)!: redesign user authentication endpoints

BREAKING CHANGE: The authentication endpoints have been
redesigned to use JWT tokens instead of session cookies.
Clients must update their authentication logic.
```

### 7. **Reference Issues**

```
fix(ui): resolve button alignment issue

The submit button was misaligned on mobile devices
due to incorrect CSS flexbox properties.

Fixes #456
Closes #789
```

## Benefits

### 1. **Automated Changelog Generation**

Tools can automatically generate changelogs from commit messages:

```
## [2.1.0] - 2024-01-15

### Features
- add user authentication system
- implement dark mode toggle

### Bug Fixes
- resolve memory leak in image processing
- fix button alignment on mobile devices

### Performance Improvements
- optimize database query execution
```

### 2. **Semantic Versioning**

Automatically determine version bumps:

- `feat:` → Minor version bump (1.0.0 → 1.1.0)
- `fix:` → Patch version bump (1.0.0 → 1.0.1)
- `BREAKING CHANGE:` → Major version bump (1.0.0 → 2.0.0)

### 3. **Better Code Reviews**

Reviewers can quickly understand the purpose and scope of changes.

### 4. **Improved Git History**

Clean, searchable commit history that tells the story of your project.

### 5. **Tool Integration**

Many tools support conventional commits:

- Release automation
- Changelog generation
- Issue tracking integration
- CI/CD pipeline decisions

## Tools and Integration

### Commit Message Linting

```bash
# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Add to package.json
{
  "commitlint": {
    "extends": ["@commitlint/config-conventional"]
  }
}
```

### Git Hooks

```bash
# Install husky for git hooks
npm install --save-dev husky

# Add commit-msg hook
npx husky add .husky/commit-msg 'npx commitlint --edit $1'
```

### IDE Extensions

- **VS Code**: Conventional Commits extension
- **IntelliJ**: Git Commit Template plugin
- **Vim**: vim-conventional-commits

### Automated Tools

- **semantic-release**: Automated versioning and package publishing
- **standard-version**: Automated versioning and changelog generation
- **conventional-changelog**: Generate changelogs from git metadata

## Common Mistakes to Avoid

### 1. **Wrong Type Selection**

- ❌ `feat: fix typo in documentation` → Should be `docs:`
- ❌ `fix: add new user endpoint` → Should be `feat:`

### 2. **Too Vague Descriptions**

- ❌ `fix: bug fix`
- ❌ `feat: improvements`
- ❌ `chore: updates`

### 3. **Multiple Changes in One Commit**

- ❌ `feat: add login page and fix navigation bug`
- ✅ Split into two commits:
  - `feat: add user login page`
  - `fix: resolve navigation menu bug`

### 4. **Incorrect Scope Usage**

- ❌ `feat(fix): add new feature` → Scope should describe location, not action
- ✅ `feat(auth): add new authentication feature`

### 5. **Missing Breaking Change Indicators**

- ❌ `refactor: change API response format` → Should include `!` or `BREAKING CHANGE:`
- ✅ `refactor(api)!: change response format to include metadata`

## Conclusion

Conventional Commits provide a structured approach to commit messages that benefits both humans and machines. By following these guidelines, you'll create a more maintainable codebase with clear history, enable powerful automation tools, and improve collaboration within your team.

Remember: consistency is key. Once you adopt conventional commits, use them consistently across your entire project and team.
