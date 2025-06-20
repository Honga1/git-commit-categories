/**
 * CLI-related type definitions
 */

export interface RewriteOptions {
  readonly dryRun: boolean;
  readonly createBackup: boolean;
  readonly interactive: boolean;
  readonly maxCommits?: number;
  readonly branchName?: string;
}

export interface CliArguments {
  readonly repoPath: string;
  readonly maxCommits?: number;
  readonly maxProcess?: number;
  readonly batchSize?: number;
  readonly concurrency?: number;
  readonly syntheticTest?: boolean;
  readonly help?: boolean;
  readonly rewrite?: boolean;
  readonly dryRun?: boolean;
  readonly backup?: boolean;
  readonly interactive?: boolean;
  readonly branchName?: string;
  readonly generateGuide?: boolean;
  readonly includeGuide?: boolean;
  readonly login?: boolean;
  readonly logout?: boolean;
  readonly status?: boolean;
  // Cache management options
  readonly restore?: string | boolean;
  readonly importCache?: string;
  readonly exportCache?: string;
  readonly listCaches?: boolean;
  readonly cacheInfo?: string;
  readonly validateCache?: string;
  readonly checkCompatibility?: string;
  readonly cleanCache?: boolean;
  readonly olderThan?: string;
  readonly ignoreCache?: boolean;
  readonly clearCache?: boolean;
  readonly cacheOnly?: boolean;
}

/**
 * Command types
 */
export type Command =
  | 'analyze'
  | 'rewrite'
  | 'dry-run'
  | 'login'
  | 'logout'
  | 'status'
  | 'generate-guide'
  | 'synthetic-test'
  | 'cache-list'
  | 'cache-info'
  | 'cache-clear'
  | 'cache-validate'
  | 'help';

export interface CommandContext {
  readonly command: Command;
  readonly args: CliArguments;
  readonly workingDirectory: string;
  readonly environment: Record<string, string | undefined>;
}

/**
 * CLI validation errors
 */
export class CliValidationError extends Error {
  constructor(
    message: string,
    public readonly argument: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'CliValidationError';
  }
}

/**
 * Help section types
 */
export interface HelpSection {
  readonly title: string;
  readonly items: Array<{
    readonly flag: string;
    readonly description: string;
    readonly example?: string;
  }>;
}

export interface UsageExample {
  readonly description: string;
  readonly command: string;
  readonly explanation?: string;
}

/**
 * CLI output formatting types
 */
export interface TableRow {
  readonly [key: string]: string | number | boolean;
}

export interface ProgressInfo {
  readonly current: number;
  readonly total: number;
  readonly phase: string;
  readonly message?: string;
}

/**
 * Type guards for CLI validation
 */
export function isValidRepoPath(path: string): boolean {
  return typeof path === 'string' && path.length > 0 && !path.startsWith('-');
}

export function isValidCommand(command: string): command is Command {
  const validCommands: Command[] = [
    'analyze',
    'rewrite',
    'dry-run',
    'login',
    'logout',
    'status',
    'generate-guide',
    'synthetic-test',
    'cache-list',
    'cache-info',
    'cache-clear',
    'cache-validate',
    'help',
  ];
  return validCommands.includes(command as Command);
}

export function isValidCliArguments(args: unknown): args is CliArguments {
  return (
    typeof args === 'object' &&
    args !== null &&
    'repoPath' in args &&
    typeof (args as CliArguments).repoPath === 'string'
  );
}

/**
 * Default CLI configuration
 */
export const DEFAULT_CLI_CONFIG = {
  maxCommits: undefined,
  batchSize: 16,
  concurrency: 4,
  backup: true,
  interactive: true,
  includeGuide: false,
  syntheticTest: false,
  ignoreCache: false,
} as const;

/**
 * CLI argument aliases
 */
export const CLI_ALIASES = {
  '--help': ['-h'],
  '--max-commits': ['-m'],
  '--max-process': ['-p'],
  '--batch-size': ['-b'],
  '--concurrency': ['-c'],
  '--synthetic-test': ['-t'],
  '--rewrite': ['-r'],
  '--dry-run': ['-d'],
  '--branch': ['-B'],
  '--generate-guide': ['-g'],
} as const;

/**
 * Safety warnings for destructive operations
 */
export const SAFETY_WARNINGS = {
  REWRITE: '⚠️  The --rewrite option modifies git history and is DESTRUCTIVE!',
  NO_BACKUP: '⚠️  --no-backup disables safety backups (dangerous!)',
  NON_INTERACTIVE: '⚠️  --no-interactive skips confirmation prompts',
  FORCE_OPERATIONS: '⚠️  This operation cannot be easily undone',
} as const;

/**
 * Exit codes
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGUMENTS: 2,
  AUTHENTICATION_ERROR: 3,
  GIT_ERROR: 4,
  API_ERROR: 5,
  CACHE_ERROR: 6,
  USER_CANCELLED: 130,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
