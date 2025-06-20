import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
// Simple type for test fixtures
interface TestCacheData {
  repositoryPath: string;
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
    files: string[];
    diff?: string;
  }>;
  insights: {
    totalCommits: number;
    currentBranch: string;
    isClean: boolean;
    commonFileTypes: Record<string, number>;
  };
  metadata?: {
    cacheVersion: string;
    createdAt: string;
    toolVersion: string;
  };
}

export class CacheManager {
  static async loadFixture(fixtureName: string): Promise<TestCacheData> {
    const fixturePath = path.join(__dirname, '../fixtures', `${fixtureName}.cache.json`);
    const cacheData = await fs.readFile(fixturePath, 'utf-8');
    return JSON.parse(cacheData) as TestCacheData;
  }

  static async setupTestCache(fixtureName: string): Promise<string> {
    const fixture = await this.loadFixture(fixtureName);
    const tempCacheFile = path.join(
      os.tmpdir(),
      `test-${Date.now()}-${Math.random().toString(36).substring(7)}.cache.json`
    );
    await fs.writeFile(tempCacheFile, JSON.stringify(fixture, null, 2));
    return tempCacheFile;
  }

  static async cleanup(cacheFile: string): Promise<void> {
    try {
      await fs.unlink(cacheFile);
    } catch {
      // Ignore cleanup errors
    }
  }

  static async validateFixture(fixtureName: string): Promise<boolean> {
    try {
      const fixture = await this.loadFixture(fixtureName);

      // Basic structure validation
      if (!fixture.repositoryPath || !Array.isArray(fixture.commits) || !fixture.insights) {
        return false;
      }

      // Validate each commit has required fields
      for (const commit of fixture.commits) {
        if (!commit.hash || !commit.message || !commit.author || !commit.date) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }
}
