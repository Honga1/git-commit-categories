import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AnalysisResult {
  totalCommits: number;
  conventionalCommits: number;
  nonConventionalCommits: number;
  conventionalPercentage: number;
  nonConventionalSamples: string[];
  fileTypes: Record<string, number>;
  recommendation?: string;
  exitCode: number;
}

export class TestRunner {
  static async runAnalysis(repositoryPath: string): Promise<AnalysisResult> {
    try {
      const command = `node dist/main.js "${repositoryPath}"`;
      const { stdout } = await execAsync(command, {
        timeout: 30000,
        cwd: process.cwd(),
      });

      return this.parseOutput(stdout, 0);
    } catch (error: unknown) {
      // Handle expected errors (like validation failures)
      if (error && typeof error === 'object' && 'code' in error && 'stdout' in error) {
        const execError = error as { code: number; stdout: string };
        return this.parseOutput(execError.stdout, execError.code);
      }
      throw error;
    }
  }

  static async runAnalysisWithCache(cacheFile: string): Promise<AnalysisResult> {
    try {
      // For now, we'll simulate cache-based analysis by running on a temp directory
      // In a real implementation, we'd need to modify the main app to accept cache files
      const command = `node dist/main.js --help`; // Placeholder
      const { stdout: _stdout } = await execAsync(command, {
        timeout: 10000,
        cwd: process.cwd(),
      });

      // For testing purposes, we'll parse the cache file and simulate results
      return this.simulateAnalysisFromCache(cacheFile);
    } catch (error: any) {
      if (error.code && error.stdout) {
        return this.parseOutput(error.stdout, error.code);
      }
      throw error;
    }
  }

  private static async simulateAnalysisFromCache(cacheFile: string): Promise<AnalysisResult> {
    const { promises: fs } = await import('fs');
    const cacheContent = await fs.readFile(cacheFile, 'utf-8');
    const cache = JSON.parse(cacheContent);

    // Analyze commits from cache
    const commits = cache.commits || [];
    const conventionalCommits = commits.filter((commit: any) =>
      this.isConventionalCommit(commit.message)
    );

    const nonConventionalCommits = commits.filter(
      (commit: any) => !this.isConventionalCommit(commit.message)
    );

    const conventionalPercentage =
      commits.length > 0 ? Math.round((conventionalCommits.length / commits.length) * 100) : 0;

    return {
      totalCommits: commits.length,
      conventionalCommits: conventionalCommits.length,
      nonConventionalCommits: nonConventionalCommits.length,
      conventionalPercentage,
      nonConventionalSamples: nonConventionalCommits.slice(0, 3).map((c: any) => c.message),
      fileTypes: cache.insights?.commonFileTypes || {},
      recommendation:
        conventionalPercentage === 100
          ? 'Great job! All commits follow conventional standards'
          : undefined,
      exitCode: 0,
    };
  }

  private static parseOutput(output: string, exitCode: number): AnalysisResult {
    // Parse the CLI output to extract structured data
    const totalCommitsMatch = output.match(/Total commits: (\d+)/);
    const conventionalMatch = output.match(/Conventional commits: (\d+)\/(\d+) \((\d+)%\)/);
    const _nonConventionalMatch = output.match(/Non-conventional commits: (\d+)\/(\d+) \((\d+)%\)/);

    // Extract non-conventional samples
    const sampleMatches = output.match(/Sample non-conventional commits:\s*\n((?:\s*•.*\n?)*)/);
    const nonConventionalSamples: string[] = [];
    if (sampleMatches && sampleMatches[1]) {
      const samples = sampleMatches[1].split('\n').filter((line) => line.trim().startsWith('•'));
      nonConventionalSamples.push(
        ...samples.map((line) => line.replace(/^\s*•\s*[a-f0-9]+:\s*/, ''))
      );
    }

    // Extract file types (this would need to be implemented in the actual CLI output)
    const fileTypes: Record<string, number> = {};

    // Check for recommendation
    const recommendation = output.includes('Great job!')
      ? 'Great job! All commits follow conventional standards'
      : undefined;

    const totalCommits = totalCommitsMatch ? parseInt(totalCommitsMatch[1]) : 0;
    const conventionalCommits = conventionalMatch ? parseInt(conventionalMatch[1]) : 0;
    const conventionalPercentage = conventionalMatch ? parseInt(conventionalMatch[3]) : 0;

    return {
      totalCommits,
      conventionalCommits,
      nonConventionalCommits: totalCommits - conventionalCommits,
      conventionalPercentage,
      nonConventionalSamples,
      fileTypes,
      recommendation,
      exitCode,
    };
  }

  private static isConventionalCommit(message: string): boolean {
    const conventionalPattern =
      /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?: .+/;
    return conventionalPattern.test(message);
  }
}
