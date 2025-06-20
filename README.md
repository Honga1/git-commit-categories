# Git Commit Categories Analyzer & Rewriter

A powerful TypeScript tool that analyzes, categorizes, and can rewrite git commit messages using AI to help standardize your commit history according to conventional commit standards.

## Features

- 🤖 **AI-Powered Analysis**: Uses OpenRouter API to classify commit messages intelligently
- 🔄 **Commit Message Rewriting**: Actually rewrite git history with conventional prefixes (DESTRUCTIVE!)
- 📚 **Comprehensive Documentation**: Includes detailed conventional commits guide with examples
- 📊 **Comprehensive Reporting**: Generates detailed analysis reports with statistics
- 🔧 **Rule Generation**: Automatically creates transformation rules for standardizing commits
- ⚡ **Adaptive Batch Processing**: Optimizes API usage with intelligent batch sizing
- 🎯 **Rate Limiting**: Built-in rate limiting to respect API quotas
- 🛡️ **Safety Features**: Automatic backups, dry-run mode, and interactive confirmations
- 🧪 **Synthetic Testing**: Test mode for development and validation
- 📈 **Progress Tracking**: Real-time progress indicators for long-running analyses

## Installation

### Global Installation (Recommended)

Install the tool globally to use it from anywhere:

```bash
# Install globally from npm (if published)
npm install -g git-commit-categories

# Or install directly from this repository
npm install -g .
```

After global installation, you can use either command:

- `git-commit-analyzer` (full name)
- `gca` (short alias)

### Local Installation

Clone and build locally:

```bash
git clone <repository-url>
cd git-commit-categories
npm install
npm run build
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and add your OpenRouter API key:

```bash
OPENROUTER_API_KEY=your_api_key_here
```

3. (Optional) Customize other settings in `.env`:

```bash
# AI Models
AI_CLASSIFICATION_MODEL=deepseek/deepseek-r1-distill-llama-70b
RULE_GENERATION_MODEL=deepseek/deepseek-r1-distill-llama-70b

# Processing Limits
MAX_COMMITS_TO_ANALYZE=500
MAX_COMMITS_TO_PROCESS=1000
INITIAL_BATCH_SIZE=16
DIFF_CONCURRENCY=4

# API Configuration
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions
HTTP_REFERER=https://github.com/your-org/your-repo
X_TITLE=Your Project Commit Analyzer
```

## Usage

### Basic Usage

```bash
# Analyze a repository (global installation)
git-commit-analyzer /path/to/your/repo

# Or using the short alias
gca /path/to/your/repo

# Local usage
npm start /path/to/your/repo
```

### Advanced Usage

```bash
# Analyze only the last 100 commits
gca /path/to/repo --max-commits 100

# Custom batch size and concurrency
gca /path/to/repo --batch-size 32 --concurrency 8

# Run synthetic tests
gca --synthetic-test

# Get help
gca --help
```

### Commit Message Rewriting (⚠️ DESTRUCTIVE!)

**⚠️ WARNING: These operations modify git history and are DESTRUCTIVE! Always use --dry-run first and ensure you have backups.**

```bash
# Preview what would be changed (SAFE)
gca /path/to/repo --dry-run

# Actually rewrite commit messages (DESTRUCTIVE!)
gca /path/to/repo --rewrite

# Rewrite without backup (VERY DANGEROUS!)
gca /path/to/repo --rewrite --no-backup

# Non-interactive rewrite
gca /path/to/repo --rewrite --no-interactive
```

### Documentation Generation

```bash
# Generate conventional commits guide only
gca --generate-guide

# Include guide in target repository after analysis
gca /path/to/repo --include-guide
```

### Command Line Options

#### Analysis Options

| Option             | Short | Description                          | Default |
| ------------------ | ----- | ------------------------------------ | ------- |
| `--help`           | `-h`  | Show help message                    | -       |
| `--max-commits`    | `-m`  | Maximum commits to analyze           | all     |
| `--max-process`    | `-p`  | Maximum commits to process for rules | all     |
| `--batch-size`     | `-b`  | Initial batch size for API calls     | 16      |
| `--concurrency`    | `-c`  | Concurrent git operations            | 4       |
| `--synthetic-test` | `-t`  | Run synthetic tests                  | false   |

#### Rewrite Options (⚠️ DESTRUCTIVE!)

| Option             | Short | Description                      | Default |
| ------------------ | ----- | -------------------------------- | ------- |
| `--rewrite`        | `-r`  | Actually rewrite commit messages | false   |
| `--dry-run`        | `-d`  | Preview changes without applying | false   |
| `--no-backup`      | -     | Skip creating backup branch      | false   |
| `--no-interactive` | -     | Skip interactive confirmations   | false   |
| `--branch`         | `-B`  | Specify target branch name       | current |

#### Documentation Options

| Option             | Short | Description                         | Default |
| ------------------ | ----- | ----------------------------------- | ------- |
| `--generate-guide` | `-g`  | Generate conventional commits guide | false   |
| `--include-guide`  | -     | Include guide in target repository  | false   |

## Output

The tool generates comprehensive reports including:

- **Prefix Distribution**: Current vs. suggested commit prefixes
- **Conformance Analysis**: Percentage of commits following conventional standards
- **Transformation Rules**: AI-generated rules for standardizing commits
- **Recommendations**: Actionable suggestions for improving commit practices

### Example Output

```
📊 COMMIT ANALYSIS REPORT
================================================================================

📈 Current Prefix Distribution:
┌─────────┬───────┬───────┐
│ (index) │ prefix│ count │
├─────────┼───────┼───────┤
│    0    │ 'none'│  45   │
│    1    │ 'feat'│  23   │
│    2    │ 'fix' │  18   │
└─────────┴───────┴───────┘

🎯 Suggested Prefix Distribution:
┌─────────┬───────┬───────┐
│ (index) │ prefix│ count │
├─────────┼───────┼───────┤
│    0    │ 'feat'│  35   │
│    1    │ 'fix' │  28   │
│    2    │ 'chore'│ 15   │
└─────────┴───────┴───────┘

✅ Conforming commits: 41/86 (48%)
❌ Non-conforming commits: 45/86 (52%)
```

## Development

### Building

```bash
npm run build
```

### Linting and Formatting

```bash
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run lint:knip     # Check for unused dependencies
npm run check         # Run all checks
```

### Testing

```bash
# Run synthetic tests
npm start -- --synthetic-test

# Or set environment variable
SYNTHETIC_TEST_MODE=true npm start
```

## Environment Variables

| Variable                  | Description                        | Default                                         |
| ------------------------- | ---------------------------------- | ----------------------------------------------- |
| `OPENROUTER_API_KEY`      | Your OpenRouter API key (required) | -                                               |
| `OPENROUTER_BASE_URL`     | OpenRouter API endpoint            | `https://openrouter.ai/api/v1/chat/completions` |
| `AI_CLASSIFICATION_MODEL` | Model for commit classification    | `deepseek/deepseek-r1-distill-llama-70b`        |
| `RULE_GENERATION_MODEL`   | Model for rule generation          | `deepseek/deepseek-r1-distill-llama-70b`        |
| `MAX_COMMITS_TO_ANALYZE`  | Max commits to analyze             | all                                             |
| `MAX_COMMITS_TO_PROCESS`  | Max commits to process             | all                                             |
| `INITIAL_BATCH_SIZE`      | Starting batch size                | 16                                              |
| `MIN_BATCH_SIZE`          | Minimum batch size                 | 2                                               |
| `MAX_BATCH_SIZE`          | Maximum batch size                 | 128                                             |
| `CONTEXT_LIMIT_THRESHOLD` | Token limit threshold              | 30000                                           |
| `DIFF_CONCURRENCY`        | Concurrent git operations          | 4                                               |
| `SYNTHETIC_TEST_MODE`     | Enable test mode                   | false                                           |
| `OUTPUT_JSON`             | Output JSON report                 | false                                           |

## Conventional Commit Standards

The tool analyzes commits against conventional commit standards:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `build:` - Build system changes
- `ci:` - CI/CD changes
- `perf:` - Performance improvements
- `revert:` - Reverting changes

## Authentication

🎉 **NEW: OAuth Authentication with Secure Credential Storage!**

The tool now supports multiple authentication methods for maximum convenience and security.

### Option 1: OAuth Login (Recommended)

The easiest and most secure way to authenticate:

```bash
# Login with OAuth (opens browser, stores credentials securely)
gca --login

# Check authentication status
gca --status

# Logout and clear stored credentials
gca --logout
```

**Benefits:**

- ✅ Secure browser-based authentication
- ✅ Credentials stored locally and encrypted
- ✅ Automatic token refresh
- ✅ No manual API key management
- ✅ Full access to your OpenRouter account

### Option 2: Manual API Key

For automated environments or if you prefer manual setup:

```bash
# Set environment variable
export OPENROUTER_API_KEY=your_api_key_here

# Or add to .env file
echo "OPENROUTER_API_KEY=your_api_key_here" >> .env
```

**Steps:**

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get your API key from the dashboard
3. Add credits to your account (free tier available)
4. Set the `OPENROUTER_API_KEY` environment variable

### Option 3: Automatic Temporary Access

For quick testing without any setup:

- Just run the tool - it will automatically get a temporary API key
- Very limited usage but perfect for trying out the tool
- No configuration needed

### Authentication Priority

The tool checks for authentication in this order:

1. Environment variable (`OPENROUTER_API_KEY`)
2. Stored OAuth credentials (`~/.config/git-commit-analyzer/credentials.json`)
3. Automatic temporary access (fallback)

### Managing Stored Credentials

```bash
# Check what's currently configured
gca --status

# Login with OAuth (recommended for regular use)
gca --login

# Clear stored credentials
gca --logout
```

Stored credentials are kept in `~/.config/git-commit-analyzer/credentials.json` and include:

- Encrypted API key
- Expiration date (30 days)
- User information (email, name)

## Troubleshooting

### Common Issues

1. **Missing API Key**: Ensure `OPENROUTER_API_KEY` is set in your `.env` file
2. **Rate Limiting**: The tool handles rate limits automatically, but you may need to wait or upgrade your plan
3. **Large Repositories**: Use `--max-commits` to limit analysis scope for very large repos
4. **Memory Issues**: Reduce `--batch-size` and `--concurrency` for resource-constrained environments

### Debug Mode

Set `DEBUG=1` to enable verbose logging:

```bash
DEBUG=1 gca /path/to/repo
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting: `npm run check`
5. Submit a pull request

## License

ISC License - see LICENSE file for details.

## Changelog

### v1.0.0

- Initial release
- AI-powered commit classification
- Adaptive batch processing
- Comprehensive reporting
- Global CLI tool support
