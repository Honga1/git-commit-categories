/**
 * Git service for managing git repository operations
 */

import type { GitInterface } from '../git/GitInterface';
import type { RawCommit, EnrichedCommit } from '../types/commits';
import { categorizeFile } from '../utils/file';
import { ConcurrencyLimiter } from '../utils/async';

export class GitService {
  constructor(private readonly gitInterface: GitInterface) {}

  /**
   * Get git log entries from repository
   */
  async getLogEntries(
    repoPath: string,
    options: { count?: number | null } = {}
  ): Promise<string[]> {
    return this.gitInterface.getLogEntries(repoPath, options);
  }

  /**
   * Parse raw commit log entries into structured commits
   */
  async parseCommitEntries(logEntries: string[]): Promise<RawCommit[]> {
    const commits: RawCommit[] = [];

    for (let i = 0; i < logEntries.length; i += 2) {
      const hash = logEntries[i];
      const message = logEntries[i + 1];

      if (
        hash !== undefined &&
        message !== undefined &&
        hash.trim().length > 0 &&
        message.trim().length > 0
      ) {
        commits.push({
          hash: hash.trim(),
          message: message.trim(),
        });
      }
    }

    return commits;
  }

  /**
   * Get commit diff summary for a specific commit
   */
  async getCommitDiffSummary(repoPath: string, hash: string): Promise<string> {
    return this.gitInterface.getCommitDiff(repoPath, hash);
  }

  /**
   * Enrich commits with diff information using concurrent processing
   */
  async enrichCommitsWithDiffs(
    commits: RawCommit[],
    repoPath: string,
    concurrency: number = 4
  ): Promise<EnrichedCommit[]> {
    const limiter = new ConcurrencyLimiter(concurrency);

    console.log(
      `🔄 Fetching diffs for ${commits.length} commits with ${concurrency} concurrent processes...`
    );

    const enrichedCommits = await Promise.all(
      commits.map((commit, index) =>
        limiter.run(async () => {
          const diff = await this.getCommitDiffSummary(repoPath, commit.hash);

          // Progress indicator
          if ((index + 1) % 10 === 0 || index === commits.length - 1) {
            process.stdout.write(`\rFetched diffs: ${index + 1}/${commits.length}`);
          }

          return { ...commit, diff };
        })
      )
    );

    console.log('\n✅ Diff fetching complete');
    return enrichedCommits;
  }

  /**
   * Get current HEAD commit hash
   */
  async getCurrentHead(repoPath: string): Promise<string> {
    return this.gitInterface.getCurrentHead(repoPath);
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(repoPath: string): Promise<string> {
    return this.gitInterface.getCurrentBranch(repoPath);
  }

  /**
   * Get git version
   */
  async getGitVersion(): Promise<string> {
    return this.gitInterface.getGitVersion();
  }

  /**
   * Get repository status
   */
  async getStatus(repoPath: string): Promise<string> {
    return this.gitInterface.getStatus(repoPath);
  }

  /**
   * Create a new branch
   */
  async createBranch(repoPath: string, branchName: string): Promise<void> {
    return this.gitInterface.createBranch(repoPath, branchName);
  }

  /**
   * Execute interactive rebase
   */
  async executeInteractiveRebase(
    repoPath: string,
    commitRange: string,
    options: { env?: Record<string, string> } = {}
  ): Promise<void> {
    return this.gitInterface.executeInteractiveRebase(repoPath, commitRange, options);
  }

  /**
   * Check if repository is clean (no uncommitted changes)
   */
  async isRepositoryClean(repoPath: string): Promise<boolean> {
    try {
      const status = await this.getStatus(repoPath);
      return status.trim() === '';
    } catch (error) {
      console.error('❌ Failed to check git status:', error);
      return false;
    }
  }

  /**
   * Get repository information summary
   */
  async getRepositoryInfo(repoPath: string): Promise<{
    currentBranch: string;
    currentHead: string;
    isClean: boolean;
    gitVersion: string;
  }> {
    const [currentBranch, currentHead, isClean, gitVersion] = await Promise.all([
      this.getCurrentBranch(repoPath),
      this.getCurrentHead(repoPath),
      this.isRepositoryClean(repoPath),
      this.getGitVersion(),
    ]);

    return {
      currentBranch,
      currentHead,
      isClean,
      gitVersion,
    };
  }

  /**
   * Get commit statistics from diff
   */
  getCommitStats(diff: string): {
    filesChanged: number;
    insertions: number;
    deletions: number;
    fileTypes: Record<string, number>;
  } {
    const lines = diff.split('\n');
    const stats = {
      filesChanged: 0,
      insertions: 0,
      deletions: 0,
      fileTypes: {} as Record<string, number>,
    };

    let currentFile = '';
    let inDiffHeader = false;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        inDiffHeader = true;
        stats.filesChanged++;

        // Extract file path from diff header
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (match?.[2] !== undefined) {
          currentFile = match[2]; // Use the "b/" path (destination)
          const fileType = categorizeFile(currentFile);
          stats.fileTypes[fileType] = (stats.fileTypes[fileType] ?? 0) + 1;
        }
      } else if (line.startsWith('@@')) {
        inDiffHeader = false;
      } else if (!inDiffHeader) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          stats.insertions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          stats.deletions++;
        }
      }
    }

    return stats;
  }

  /**
   * Create enhanced diff summary with file categorization
   */
  createEnhancedDiffSummary(diff: string, originalMessage: string): string {
    const stats = this.getCommitStats(diff);
    const fileTypeSummary = Object.entries(stats.fileTypes)
      .map(([type, count]) => `${type} (${count})`)
      .join(', ');

    let summary = `Message: ${originalMessage}\n\n`;
    summary += `Files changed (${stats.filesChanged} total):\n`;

    if (fileTypeSummary.length > 0) {
      summary += `File types: ${fileTypeSummary}\n`;
    }

    if (stats.insertions > 0 || stats.deletions > 0) {
      summary += `Changes: +${stats.insertions} insertions, -${stats.deletions} deletions\n`;
    }

    // Add a sample of the actual diff (truncated for context)
    const diffLines = diff.split('\n');
    const relevantLines = diffLines
      .filter(
        (line) =>
          line.startsWith('+++') ||
          line.startsWith('---') ||
          line.startsWith('@@') ||
          (line.startsWith('+') && !line.startsWith('+++')) ||
          (line.startsWith('-') && !line.startsWith('---'))
      )
      .slice(0, 20); // Limit to first 20 relevant lines

    if (relevantLines.length > 0) {
      summary += '\nSample changes:\n';
      summary += relevantLines.join('\n');
      if (diffLines.length > relevantLines.length + 10) {
        summary += '\n... (truncated)';
      }
    }

    return summary;
  }

  /**
   * Get commits with enhanced diff summaries
   */
  async getCommitsWithEnhancedDiffs(
    repoPath: string,
    options: {
      count?: number | null;
      concurrency?: number;
      enhanceDiffs?: boolean;
    } = {}
  ): Promise<EnrichedCommit[]> {
    const { count, concurrency = 4, enhanceDiffs = false } = options;

    // Get raw commit log entries
    const logEntries = await this.getLogEntries(repoPath, count !== undefined ? { count } : {});
    const rawCommits = await this.parseCommitEntries(logEntries);

    console.log(`📋 Found ${rawCommits.length} commits`);

    // Enrich with diffs
    const enrichedCommits = await this.enrichCommitsWithDiffs(rawCommits, repoPath, concurrency);

    // Optionally enhance diffs with additional analysis
    if (enhanceDiffs) {
      console.log('🔍 Enhancing diff summaries...');
      return enrichedCommits.map((commit) => ({
        ...commit,
        diff: this.createEnhancedDiffSummary(commit.diff, commit.message),
      }));
    }

    return enrichedCommits;
  }

  /**
   * Validate repository accessibility
   */
  async validateRepository(repoPath: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if it's a git repository
      await this.getCurrentHead(repoPath);
    } catch (_error) {
      errors.push('Not a valid git repository or repository is corrupted');
      return { isValid: false, errors, warnings };
    }

    try {
      // Check if repository is clean
      const isClean = await this.isRepositoryClean(repoPath);
      if (!isClean) {
        warnings.push('Repository has uncommitted changes');
      }
    } catch (_error) {
      warnings.push('Could not check repository status');
    }

    try {
      // Check git version
      const gitVersion = await this.getGitVersion();
      const versionMatch = gitVersion.match(/(\d+)\.(\d+)\.(\d+)/);
      if (versionMatch?.[1] !== undefined && versionMatch[2] !== undefined) {
        const major = versionMatch[1];
        const minor = versionMatch[2];
        const majorNum = parseInt(major, 10);
        const minorNum = parseInt(minor, 10);

        if (majorNum < 2 || (majorNum === 2 && minorNum < 20)) {
          warnings.push(`Git version ${gitVersion} is quite old, consider upgrading`);
        }
      }
    } catch (_error) {
      warnings.push('Could not determine git version');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get commit count in repository
   */
  async getCommitCount(repoPath: string): Promise<number> {
    try {
      const logEntries = await this.getLogEntries(repoPath, {});
      return Math.floor(logEntries.length / 2); // Each commit has hash + message
    } catch (error) {
      console.warn('⚠️  Could not get commit count:', error);
      return 0;
    }
  }

  /**
   * Create a backup branch before destructive operations
   */
  async createBackupBranch(repoPath: string, baseName: string = 'backup'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBranchName = `${baseName}-${timestamp}`;

    try {
      await this.createBranch(repoPath, backupBranchName);
      console.log(`📦 Created backup branch: ${backupBranchName}`);
      return backupBranchName;
    } catch (error) {
      console.error('❌ Failed to create backup branch:', error);
      throw new Error(`Failed to create backup branch: ${error}`);
    }
  }

  /**
   * Get repository insights for analysis
   */
  async getRepositoryInsights(repoPath: string): Promise<{
    totalCommits: number;
    currentBranch: string;
    isClean: boolean;
    recentCommits: RawCommit[];
    commonFileTypes: Record<string, number>;
  }> {
    const [totalCommits, currentBranch, isClean, recentLogEntries] = await Promise.all([
      this.getCommitCount(repoPath),
      this.getCurrentBranch(repoPath),
      this.isRepositoryClean(repoPath),
      this.getLogEntries(repoPath, { count: 20 }), // Get last 20 for analysis
    ]);

    const recentCommits = await this.parseCommitEntries(recentLogEntries);

    // Get file type distribution from recent commits
    const commonFileTypes: Record<string, number> = {};

    // Sample a few recent commits for file type analysis
    const sampleCommits = recentCommits.slice(0, 5);
    for (const commit of sampleCommits) {
      try {
        const diff = await this.getCommitDiffSummary(repoPath, commit.hash);
        const stats = this.getCommitStats(diff);

        Object.entries(stats.fileTypes).forEach(([type, count]) => {
          commonFileTypes[type] = (commonFileTypes[type] ?? 0) + count;
        });
      } catch (_error) {
        // Skip commits with diff errors
        continue;
      }
    }

    return {
      totalCommits,
      currentBranch,
      isClean,
      recentCommits,
      commonFileTypes,
    };
  }
}
