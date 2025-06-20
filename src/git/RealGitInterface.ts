import { exec } from 'child_process';
import { promisify } from 'util';
import {
  type GitInterface,
  type GitLogOptions,
  type GitShowOptions,
  type GitStatusOptions,
  type RebaseOptions,
  type GitCommandResult,
  GitError,
} from './GitInterface';

const execAsync = promisify(exec);

/**
 * Real Git Interface Implementation
 *
 * This class provides the actual implementation of git operations
 * by executing shell commands. It wraps the existing git command
 * functionality from the original commit-analyzer.ts file.
 */
export class RealGitInterface implements GitInterface {
  /**
   * Execute a git command with proper error handling
   * @param command - Git command to execute
   * @param cwd - Working directory for the command
   * @param maxBuffer - Maximum buffer size for command output
   * @returns Command execution result
   */
  private async executeGitCommand(
    command: string,
    cwd: string,
    maxBuffer = 10 * 1024 * 1024
  ): Promise<GitCommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        maxBuffer,
      });
      return {
        stdout,
        stderr,
        exitCode: 0,
      };
    } catch (error: unknown) {
      const execError = error as { code?: number; stderr?: string; message?: string };
      const exitCode = execError.code ?? 1;
      const stderr = execError.stderr ?? execError.message ?? '';
      // const _stdout = error.stdout ?? ''; // Available for debugging if needed

      throw new GitError(`Git command failed: ${command}`, command, exitCode, stderr);
    }
  }

  // =================================================================
  // Core Log and Commit Operations
  // =================================================================

  async getLogEntries(repoPath: string, options: GitLogOptions = {}): Promise<string[]> {
    const {
      count = null,
      format = '%h%x00%s',
      separator = '\0',
      maxBuffer = 10 * 1024 * 1024,
    } = options;

    try {
      // Use NUL separator to handle commit messages with special characters
      const command =
        count === null
          ? `git log -z --pretty=format:"${format}"`
          : `git log -z --pretty=format:"${format}" -${count}`;

      const result = await this.executeGitCommand(command, repoPath, maxBuffer);
      return result.stdout.split(separator).filter((line) => line.trim() !== '');
    } catch (error) {
      console.error('Error fetching git log:', error);
      return [];
    }
  }

  async getCommitDiff(
    repoPath: string,
    hash: string,
    options: GitShowOptions = {}
  ): Promise<string> {
    const { format = '%s%n%b', nameStatus = true, maxBuffer = 2 * 1024 * 1024 } = options;

    try {
      // Single command to get both message and file changes
      const command =
        nameStatus === true
          ? `git show --pretty=format:"${format}" --name-status ${hash}`
          : `git show --pretty=format:"${format}" ${hash}`;

      const result = await this.executeGitCommand(command, repoPath, maxBuffer);
      const lines = result.stdout.split('\n');
      let messageEndIndex = 0;

      // Find where the message ends and file changes begin
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line?.match(/^[AMDRC]/) !== null) {
          messageEndIndex = i;
          break;
        }
      }

      const message = lines.slice(0, messageEndIndex).join('\n').trim();
      const fileChanges = lines.slice(messageEndIndex).filter((line) => {
        if (line.trim() === '') {
          return false;
        }
        const match = line.match(/^[AMDRC]/);
        return match !== null;
      });

      // Summarize changes efficiently
      const fileSummaries = fileChanges.slice(0, 15).map((line) => {
        const [status, ...fileParts] = line.split('\t');
        const file = fileParts.join('\t');
        if (file.length === 0) return ''; // Handle cases where file path might be empty
        const changeType =
          {
            A: 'added',
            M: 'modified',
            D: 'deleted',
            R: 'renamed',
            C: 'copied',
          }[status ?? ''] ?? 'changed';

        const category = this.categorizeFile(file);
        return `${changeType} ${category}: ${file}`;
      });

      let summary = `Message: ${message}\n\nFiles changed (${fileChanges.length} total):\n`;
      summary += fileSummaries.join('\n');

      if (fileChanges.length > 15) {
        summary += `\n... and ${fileChanges.length - 15} more files`;
      }

      return summary;
    } catch (error: unknown) {
      const execError = error as { code?: string };
      if (execError.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
        console.warn(`⚠️  Commit ${hash} has extremely large diff, using minimal summary`);
        try {
          const result = await this.executeGitCommand(
            `git show --name-only --pretty=format:"${format}" ${hash}`,
            repoPath,
            512 * 1024
          );
          return `Large commit summary:\n${result.stdout}`;
        } catch {
          return `Large commit ${hash} - details unavailable`;
        }
      }
      console.error(`Error fetching diff summary for commit ${hash}:`, error);
      return `Commit ${hash} - summary unavailable`;
    }
  }

  // =================================================================
  // Repository Information
  // =================================================================

  async getCurrentHead(repoPath: string): Promise<string> {
    try {
      const result = await this.executeGitCommand('git rev-parse HEAD', repoPath);
      return result.stdout.trim();
    } catch (error) {
      console.warn('⚠️  Could not get repository hash:', error);
      return 'unknown';
    }
  }

  async getGitVersion(): Promise<string> {
    try {
      const result = await this.executeGitCommand('git --version', '.');
      return result.stdout.trim();
    } catch (_error) {
      return 'unknown';
    }
  }

  async getStatus(repoPath: string, options: GitStatusOptions = {}): Promise<string> {
    const { porcelain = true } = options;
    const command = porcelain === true ? 'git status --porcelain' : 'git status';

    try {
      const result = await this.executeGitCommand(command, repoPath);
      return result.stdout.trim();
    } catch (error) {
      console.error('❌ Failed to check git status:', error);
      throw error;
    }
  }

  async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      const result = await this.executeGitCommand('git branch --show-current', repoPath);
      return result.stdout.trim();
    } catch (error) {
      console.error('❌ Failed to get current branch:', error);
      throw error;
    }
  }

  // =================================================================
  // Branch Operations
  // =================================================================

  async createBranch(repoPath: string, branchName: string): Promise<void> {
    try {
      await this.executeGitCommand(`git branch ${branchName}`, repoPath);
      console.log(`✅ Created backup branch: ${branchName}`);
    } catch (error) {
      console.error('❌ Failed to create backup branch:', error);
      throw error;
    }
  }

  async checkoutBranch(repoPath: string, branchName: string): Promise<void> {
    try {
      await this.executeGitCommand(`git checkout ${branchName}`, repoPath);
    } catch (error) {
      console.error(`❌ Failed to checkout branch ${branchName}:`, error);
      throw error;
    }
  }

  async deleteBranch(repoPath: string, branchName: string, force = false): Promise<void> {
    const flag = force === true ? '-D' : '-d';
    try {
      await this.executeGitCommand(`git branch ${flag} ${branchName}`, repoPath);
    } catch (error) {
      console.error(`❌ Failed to delete branch ${branchName}:`, error);
      throw error;
    }
  }

  // =================================================================
  // Rebase Operations
  // =================================================================

  async executeInteractiveRebase(
    repoPath: string,
    targetCommit: string,
    options: RebaseOptions = {}
  ): Promise<void> {
    const { env = {} } = options;
    // Note: interactive parameter available in options but not used in current implementation

    console.log('\n🎯 Starting interactive rebase...');
    console.log('💡 Your editor will open for each commit marked as "reword"');
    console.log('💡 Modify the commit messages as needed and save/close the editor');
    console.log('💡 Press Ctrl+C to abort the rebase if needed');

    try {
      const { spawn } = await import('child_process');

      const rebaseProcess = spawn('git', ['rebase', '-i', targetCommit], {
        cwd: repoPath,
        env: { ...process.env, ...env },
        stdio: 'inherit', // This allows the user to interact with the editor
      });

      // Wait for the rebase to complete
      await new Promise<void>((resolve, reject) => {
        rebaseProcess.on('close', (code) => {
          if (code === 0) {
            console.log('\n✅ Interactive rebase completed successfully!');
            resolve();
          } else {
            console.log(`\n❌ Rebase exited with code ${code}`);
            if (code === 1) {
              console.log('💡 This might be due to conflicts or user cancellation');
              console.log('💡 Check git status and resolve any conflicts if needed');
            }
            reject(new Error(`Rebase failed with exit code ${code}`));
          }
        });

        rebaseProcess.on('error', (error) => {
          console.error('\n❌ Failed to start rebase process:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ Error during interactive rebase:', error);
      throw error;
    }
  }

  async getCommitsInRange(repoPath: string, range: string): Promise<string[]> {
    try {
      const result = await this.executeGitCommand(`git log --reverse --oneline ${range}`, repoPath);

      return result.stdout
        .trim()
        .split('\n')
        .filter((line) => line.trim() !== '');
    } catch (error) {
      console.error(`Error getting commits in range ${range}:`, error);
      return [];
    }
  }

  // =================================================================
  // Helper Methods
  // =================================================================

  /**
   * Categorize a file based on its path and extension
   * @param filePath - Path to the file
   * @returns File category string
   */
  private categorizeFile(filePath: string): string {
    const path = filePath.toLowerCase();
    const extensionMap: Record<string, string> = {
      '.ts': 'code',
      '.js': 'code',
      '.tsx': 'code',
      '.jsx': 'code',
      '.py': 'code',
      '.css': 'style',
      '.scss': 'style',
      '.less': 'style',
      '.sass': 'style',
      '.md': 'docs',
      '.txt': 'docs',
      '.rst': 'docs',
      '.json': 'config',
      '.yaml': 'config',
      '.yml': 'config',
      '.toml': 'config',
      '.png': 'asset',
      '.jpg': 'asset',
      '.svg': 'asset',
      '.gif': 'asset',
      '.ico': 'asset',
      '.proto': 'proto',
      '.sh': 'build',
      '.bat': 'build',
      '.ps1': 'build',
    };

    // Get file extension
    const ext = filePath.substring(filePath.lastIndexOf('.'));
    if (extensionMap[ext] !== undefined) {
      return extensionMap[ext];
    }

    // Fallback to path-based categorization
    if (path.includes('test') === true || path.includes('spec') === true) return 'test';
    if (path.includes('doc') === true || path.includes('readme') === true) return 'docs';
    if (path.includes('config') === true) return 'config';
    if (path.includes('package') === true && path.includes('lock') === true) return 'deps';
    if (path.includes('build') === true || path.includes('dist') === true) return 'build';

    return 'misc';
  }
}
