/**
 * Git Interface - Abstraction layer for git operations
 *
 * This interface provides a clean abstraction over git commands,
 * enabling dependency injection and testability by allowing
 * real and mock implementations to be swapped easily.
 */

export interface RebaseOptions {
  interactive?: boolean;
  scriptPath?: string;
  maxCommits?: number;
  env?: Record<string, string>;
}

export interface GitLogOptions {
  count?: number | null;
  format?: string;
  separator?: string;
  maxBuffer?: number;
}

export interface GitShowOptions {
  format?: string;
  nameStatus?: boolean;
  maxBuffer?: number;
}

export interface GitStatusOptions {
  porcelain?: boolean;
}

/**
 * Core Git Interface
 *
 * Provides methods for all git operations used by the commit analyzer.
 * Implementations should handle errors consistently and provide meaningful
 * error messages for debugging.
 */
export interface GitInterface {
  // =================================================================
  // Core Log and Commit Operations
  // =================================================================

  /**
   * Get git log entries with specified formatting
   * @param repoPath - Path to the git repository
   * @param options - Git log options including count, format, etc.
   * @returns Array of log entry strings
   */
  getLogEntries(repoPath: string, options?: GitLogOptions): Promise<string[]>;

  /**
   * Get detailed commit information including diff summary
   * @param repoPath - Path to the git repository
   * @param hash - Commit hash
   * @param options - Git show options
   * @returns Formatted commit diff summary
   */
  getCommitDiff(repoPath: string, hash: string, options?: GitShowOptions): Promise<string>;

  // =================================================================
  // Repository Information
  // =================================================================

  /**
   * Get the current HEAD commit hash
   * @param repoPath - Path to the git repository
   * @returns Current HEAD commit hash
   */
  getCurrentHead(repoPath: string): Promise<string>;

  /**
   * Get git version information
   * @returns Git version string
   */
  getGitVersion(): Promise<string>;

  /**
   * Get repository status
   * @param repoPath - Path to the git repository
   * @param options - Status options
   * @returns Git status output
   */
  getStatus(repoPath: string, options?: GitStatusOptions): Promise<string>;

  /**
   * Get current branch name
   * @param repoPath - Path to the git repository
   * @returns Current branch name
   */
  getCurrentBranch(repoPath: string): Promise<string>;

  // =================================================================
  // Branch Operations
  // =================================================================

  /**
   * Create a new branch
   * @param repoPath - Path to the git repository
   * @param branchName - Name of the new branch
   */
  createBranch(repoPath: string, branchName: string): Promise<void>;

  /**
   * Switch to a branch
   * @param repoPath - Path to the git repository
   * @param branchName - Name of the branch to switch to
   */
  checkoutBranch(repoPath: string, branchName: string): Promise<void>;

  /**
   * Delete a branch
   * @param repoPath - Path to the git repository
   * @param branchName - Name of the branch to delete
   * @param force - Whether to force delete
   */
  deleteBranch(repoPath: string, branchName: string, force?: boolean): Promise<void>;

  // =================================================================
  // Rebase Operations
  // =================================================================

  /**
   * Execute an interactive rebase
   * @param repoPath - Path to the git repository
   * @param targetCommit - Target commit for rebase (e.g., "HEAD~5")
   * @param options - Rebase options
   */
  executeInteractiveRebase(
    repoPath: string,
    targetCommit: string,
    options?: RebaseOptions
  ): Promise<void>;

  /**
   * Get commits in range for rebase planning
   * @param repoPath - Path to the git repository
   * @param range - Commit range (e.g., "HEAD~5..HEAD")
   * @returns Array of commit information
   */
  getCommitsInRange(repoPath: string, range: string): Promise<string[]>;
}

/**
 * Git operation error with context
 */
export class GitError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly exitCode?: number,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'GitError';
  }
}

/**
 * Git command execution result
 */
export interface GitCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
