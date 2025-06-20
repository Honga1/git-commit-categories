/**
 * CLI utilities for parsing command line arguments and displaying help
 */

import type { CliArguments } from '../types/cli';

/**
 * Parse command line arguments
 */
export function parseCommandLineArgs(): CliArguments {
  const args = process.argv.slice(2);
  const result: Record<string, unknown> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === undefined || arg.length === 0) continue;

    const nextArg = args[i + 1];
    const hasValue = nextArg !== undefined && !nextArg.startsWith('-');

    if (arg === '--help' || arg === '-h') {
      result['help'] = true;
    } else if (arg === '--max-commits' || arg === '-m') {
      if (hasValue) {
        result['maxCommits'] = parseInt(nextArg, 10);
        i++;
      }
    } else if (arg === '--max-process' || arg === '-p') {
      if (hasValue) {
        result['maxProcess'] = parseInt(nextArg, 10);
        i++;
      }
    } else if (arg === '--batch-size' || arg === '-b') {
      if (hasValue) {
        result['batchSize'] = parseInt(nextArg, 10);
        i++;
      }
    } else if (arg === '--concurrency' || arg === '-c') {
      if (hasValue) {
        result['concurrency'] = parseInt(nextArg, 10);
        i++;
      }
    } else if (arg === '--synthetic-test' || arg === '-t') {
      result['syntheticTest'] = true;
    } else if (arg === '--rewrite' || arg === '-r') {
      result['rewrite'] = true;
    } else if (arg === '--dry-run' || arg === '-d') {
      result['dryRun'] = true;
    } else if (arg === '--no-backup') {
      result['backup'] = false;
    } else if (arg === '--no-interactive') {
      result['interactive'] = false;
    } else if (arg === '--branch' || arg === '-B') {
      if (hasValue) {
        result['branchName'] = nextArg;
        i++;
      }
    } else if (arg === '--generate-guide' || arg === '-g') {
      result['generateGuide'] = true;
    } else if (arg === '--include-guide') {
      result['includeGuide'] = true;
    } else if (arg === '--login') {
      result['login'] = true;
    } else if (arg === '--logout') {
      result['logout'] = true;
    } else if (arg === '--status') {
      result['status'] = true;
    } else if (arg === '--restore') {
      if (hasValue) {
        result['restore'] = nextArg;
        i++;
      } else {
        result['restore'] = true;
      }
    } else if (arg === '--import-cache') {
      if (hasValue) {
        result['importCache'] = nextArg;
        i++;
      }
    } else if (arg === '--export-cache') {
      if (hasValue) {
        result['exportCache'] = nextArg;
        i++;
      }
    } else if (arg === '--list-caches') {
      result['listCaches'] = true;
    } else if (arg === '--cache-info') {
      if (hasValue) {
        result['cacheInfo'] = nextArg;
        i++;
      }
    } else if (arg === '--validate-cache') {
      if (hasValue) {
        result['validateCache'] = nextArg;
        i++;
      }
    } else if (arg === '--check-compatibility') {
      if (hasValue) {
        result['checkCompatibility'] = nextArg;
        i++;
      }
    } else if (arg === '--clean-cache') {
      result['cleanCache'] = true;
    } else if (arg === '--older-than') {
      if (hasValue) {
        result['olderThan'] = nextArg;
        i++;
      }
    } else if (arg === '--ignore-cache') {
      result['ignoreCache'] = true;
    } else if (arg === '--clear-cache') {
      result['clearCache'] = true;
    } else if (arg === '--cache-only') {
      result['cacheOnly'] = true;
    } else if (!arg.startsWith('-')) {
      // First non-flag argument is the repo path
      if (result['repoPath'] === undefined) {
        result['repoPath'] = arg;
      }
    } else {
      console.warn(`⚠️  Unknown argument: ${arg}`);
    }
  }

  // Ensure required repoPath is present or set to empty string
  if (result['repoPath'] === undefined) {
    result['repoPath'] = '';
  }

  return result as unknown as CliArguments;
}

/**
 * Display usage information
 */
export function printUsage(): void {
  console.log(`
🔍 Git Commit Analyzer & Rewriter

USAGE:
  npm start [REPO_PATH] [OPTIONS]
  node dist/main.js [REPO_PATH] [OPTIONS]

ARGUMENTS:
  REPO_PATH                 Path to the git repository to analyze

ANALYSIS OPTIONS:
  -h, --help               Show this help message
  -m, --max-commits NUM    Maximum commits to analyze (default: all)
  -p, --max-process NUM    Maximum commits to process for rules (default: all)
  -b, --batch-size NUM     Initial batch size for API calls (default: 16)
  -c, --concurrency NUM    Number of concurrent git operations (default: 4)
  -t, --synthetic-test     Run synthetic tests instead of real analysis

REWRITE OPTIONS:
  -r, --rewrite            Actually rewrite commit messages (DESTRUCTIVE!)
  -d, --dry-run            Show what would be changed without making changes
  --no-backup              Skip creating backup branch (not recommended)
  --no-interactive         Skip interactive confirmation prompts
  -B, --branch NAME        Specify target branch name for rewrite

AUTHENTICATION OPTIONS:
  --login                  Login with OAuth to OpenRouter (stores credentials)
  --logout                 Logout and clear stored credentials
  --status                 Show current authentication status

CACHE MANAGEMENT OPTIONS:
  --restore [FILE]         Restore from cache file (default: .gca-cache.json)
  --list-caches            List all available cache files
  --cache-info FILE        Show detailed information about a cache file
  --validate-cache FILE    Validate cache file compatibility
  --clear-cache            Delete the default cache file
  --ignore-cache           Skip cache creation and usage

DOCUMENTATION OPTIONS:
  -g, --generate-guide     Generate conventional commits guide only
  --include-guide          Include guide in target repository after analysis

EXAMPLES:
  # Authentication
  gca --login                                    # Login with OAuth (recommended)
  gca --logout                                   # Logout and clear credentials
  gca --status                                   # Check authentication status
  
  # Analysis only (safe)
  npm start ../my-repo                           # Analyze all commits
  npm start ../my-repo -m 100                    # Analyze last 100 commits
  npm start ../my-repo -m 500 -b 32 -c 8        # Custom limits and performance
  
  # Rewriting (destructive - use with caution!)
  npm start ../my-repo --dry-run                 # Preview changes without applying
  npm start ../my-repo --rewrite                 # Actually rewrite commit messages
  npm start ../my-repo --rewrite --no-backup    # Rewrite without backup (dangerous!)
  
  # Documentation
  npm start ../my-repo --include-guide           # Analyze and copy guide to repo
  npm start --generate-guide                     # Generate guide only
  
  # Testing
  npm start -t                                   # Run synthetic tests

SAFETY NOTES:
  ⚠️  The --rewrite option modifies git history and is DESTRUCTIVE!
  ⚠️  Always use --dry-run first to preview changes
  ⚠️  Backup branches are created by default (disable with --no-backup)
  ⚠️  Only use on repositories you can afford to lose or have backed up
  ⚠️  Coordinate with your team before rewriting shared repository history

ENVIRONMENT VARIABLES:
  OPENROUTER_API_KEY       Your OpenRouter API key (required)
  SYNTHETIC_TEST_MODE      Set to 'true' to enable test mode
  MAX_COMMITS_TO_ANALYZE   Default max commits to analyze
  MAX_COMMITS_TO_PROCESS   Default max commits to process
  INITIAL_BATCH_SIZE       Default initial batch size
  DIFF_CONCURRENCY         Default concurrency for git operations

For more configuration options, see .env.example
`);
}
