# Git Commit Categories Analyzer

A production-ready TypeScript tool that analyzes git commit messages using AI to classify them according to conventional commit standards and generate transformation rules for standardizing commit messages.

## Features

- **🔐 Secure Configuration**: Environment-based configuration with no hardcoded secrets
- **🚀 High Performance**: Parallel processing with adaptive batch sizing for optimal throughput
- **🤖 AI-Powered Classification**: Uses advanced language models to analyze commit messages and diffs
- **📊 Comprehensive Analysis**: Detailed reporting with statistics and recommendations
- **⚡ Rate Limiting**: Intelligent rate limiting with API key status awareness
- **🔧 Rule Generation**: Automatically generates transformation rules based on analysis
- **🧪 Testing Support**: Built-in synthetic testing mode for development
- **💻 CLI Interface**: Easy-to-use command-line interface with flexible options

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment:**

   ```bash
   cp .env.example .env
   # Edit .env and add your OpenRouter API key
   ```

3. **Run analysis:**
   ```bash
   npm start -- /path/to/your/git/repo
   ```

## Command Line Usage

### Basic Usage

```bash
# Analyze all commits in a repository
npm start -- /path/to/repo

# Analyze last 100 commits only
npm start -- /path/to/repo -m 100

# Run synthetic tests
npm start -- -t

# Show help
npm start -- --help
```

### Command Line Options

```
🔍 Git Commit Analyzer

USAGE:
  npm start -- [REPO_PATH] [OPTIONS]

ARGUMENTS:
  REPO_PATH                 Path to the git repository to analyze

OPTIONS:
  -h, --help               Show help message
  -m, --max-commits NUM    Maximum commits to analyze (default: all)
  -p, --max-process NUM    Maximum commits to process for rules (default: all)
  -b, --batch-size NUM     Initial batch size for API calls (default: 16)
  -c, --concurrency NUM    Number of concurrent git operations (default: 4)
  -t, --synthetic-test     Run synthetic tests instead of real analysis

EXAMPLES:
  npm start -- ../my-repo                           # Analyze all commits
  npm start -- ../my-repo -m 100                    # Analyze last 100 commits
  npm start -- ../my-repo -m 500 -b 32 -c 8        # Custom performance settings
  npm start -- -t                                   # Run synthetic tests
```

## Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Required
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional - API Configuration
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1/chat/completions
HTTP_REFERER=https://github.com/cline/cline
X_TITLE=Cline Commit Analyzer

# Optional - Models
AI_CLASSIFICATION_MODEL=deepseek/deepseek-r1-distill-llama-70b
RULE_GENERATION_MODEL=deepseek/deepseek-r1-distill-llama-70b

# Optional - Processing Limits
MAX_COMMITS_TO_ANALYZE=null
MAX_COMMITS_TO_PROCESS=null
INITIAL_BATCH_SIZE=16
DIFF_CONCURRENCY=4

# Optional - Performance Tuning
MIN_BATCH_SIZE=2
MAX_BATCH_SIZE=128
CONTEXT_LIMIT_THRESHOLD=30000
MAX_RETRIES=3
BASE_DELAY=500

# Optional - Testing
SYNTHETIC_TEST_MODE=false
OUTPUT_JSON=false
```

## How It Works

1. **📋 Data Extraction**: Fetches commit messages and diff summaries from git repository
2. **🔄 Parallel Processing**: Enriches commits with diff information using concurrent git operations
3. **🤖 AI Classification**: Analyzes commits in adaptive batches using LLM APIs
4. **📏 Rule Generation**: Creates transformation rules based on classification patterns
5. **⚙️ Rule Application**: Applies generated rules to standardize commit messages
6. **📊 Analysis Report**: Generates comprehensive statistics and recommendations

## Performance Features

### Adaptive Batch Processing

- **Dynamic Sizing**: Automatically adjusts batch size based on success/failure rates
- **Context Awareness**: Reduces batch size when approaching token limits
- **Rate Limiting**: Respects API rate limits with intelligent backoff

### Parallel Operations

- **Concurrent Git Operations**: Fetches diffs in parallel with configurable concurrency
- **Token Estimation**: Uses tiktoken for accurate token counting
- **Prompt Caching**: Leverages API caching to reduce redundant requests

### Error Handling

- **Graceful Degradation**: Continues processing even when individual batches fail
- **Infinite Loop Prevention**: Guards against context overflow scenarios
- **Robust JSON Parsing**: Handles malformed API responses with fallback extraction

## Example Output

```
📊 COMMIT ANALYSIS REPORT
================================================================================

📈 Current Prefix Distribution:
┌─────────┬────────────┬───────┐
│ (index) │   prefix   │ count │
├─────────┼────────────┼───────┤
│    0    │   'feat'   │  45   │
│    1    │   'fix'    │  32   │
│    2    │   'chore'  │  28   │
│    3    │   'docs'   │  15   │
│    4    │   'none'   │  23   │
└─────────┴────────────┴───────┘

🎯 Suggested Prefix Distribution:
┌─────────┬────────────┬───────┐
│ (index) │   prefix   │ count │
├─────────┼────────────┼───────┤
│    0    │   'feat'   │  52   │
│    1    │   'fix'    │  38   │
│    2    │   'chore'  │  35   │
│    3    │ 'refactor' │  18   │
└─────────┴────────────┴───────┘

✅ Conforming commits: 120/143 (84%)
❌ Non-conforming commits: 23/143 (16%)

🔧 Rules applied to: 23/143 commits

📋 Generated Rules Summary:
1. Standardize Fix prefix
   Pattern: /^Fix\s+/i
   Replacement: "fix: "
2. Convert 'Add' to 'feat'
   Pattern: /^Add\s+/i
   Replacement: "feat: "
3. Standardize Update prefix to chore
   Pattern: /^Update\s+/i
   Replacement: "chore: "

================================================================================
🎯 RECOMMENDATIONS
================================================================================
• Most suggested prefix: "feat" (52 commits)
• Consider implementing commit message linting in your CI/CD pipeline
• Add a commit-msg git hook to enforce conventional commit format
• Review the generated rules and consider implementing them in your development workflow
================================================================================
```

## Architecture

The tool is built with a modular, production-ready architecture:

- **🔧 Configuration Management**: Environment-based config with validation
- **📊 Batch Management**: Adaptive batch sizing with performance monitoring
- **⏱️ Rate Limiting**: Sophisticated rate limiting with API key awareness
- **🔄 Concurrency Control**: Parallel processing with configurable limits
- **🛡️ Error Handling**: Comprehensive error handling with graceful degradation
- **🧪 Testing Framework**: Built-in synthetic testing capabilities

## Development

### Running Tests

```bash
# Run synthetic tests
npm start -- -t

# Run with custom test data
SYNTHETIC_TEST_MODE=true npm start
```

### Linting and Formatting

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Check for unused dependencies
npm run lint:knip
```

## API Requirements

- **OpenRouter API Key**: Required for AI classification and rule generation
- **Supported Models**: Works with any OpenRouter-compatible model
- **Rate Limits**: Automatically handles free and paid tier limits
- **Cost Optimization**: Uses prompt caching and accurate token estimation

## Contributing

This tool demonstrates production-ready TypeScript development with:

- Comprehensive error handling and logging
- Performance optimization techniques
- Security best practices
- Clean architecture patterns
- Extensive testing capabilities

Feel free to contribute improvements or adapt for your specific needs.

## License

ISC
