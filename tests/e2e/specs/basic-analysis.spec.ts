import { describe, test, expect, afterEach } from 'vitest';
import { CacheManager } from '../helpers/cache-manager';
import { TestRunner } from '../helpers/test-runner';

describe('Basic Analysis E2E Tests', () => {
  let cacheFile: string;

  afterEach(async () => {
    if (cacheFile) {
      await CacheManager.cleanup(cacheFile);
    }
  });

  test('should analyze single commit repository correctly', async () => {
    cacheFile = await CacheManager.setupTestCache('single-commit');
    const result = await TestRunner.runAnalysisWithCache(cacheFile);

    expect(result.totalCommits).toBe(1);
    expect(result.conventionalCommits).toBe(0);
    expect(result.conventionalPercentage).toBe(0);
    expect(result.nonConventionalCommits).toBe(1);
    expect(result.exitCode).toBe(0);
  });

  test('should categorize mixed commits correctly', async () => {
    cacheFile = await CacheManager.setupTestCache('mixed-commits');
    const result = await TestRunner.runAnalysisWithCache(cacheFile);

    expect(result.totalCommits).toBe(4);
    expect(result.conventionalCommits).toBe(3);
    expect(result.conventionalPercentage).toBe(75);
    expect(result.nonConventionalCommits).toBe(1);
    expect(result.nonConventionalSamples).toContain('update readme');
    expect(result.exitCode).toBe(0);
  });

  test('should validate fixture data integrity', async () => {
    const isValid = await CacheManager.validateFixture('single-commit');
    expect(isValid).toBe(true);

    const isValidMixed = await CacheManager.validateFixture('mixed-commits');
    expect(isValidMixed).toBe(true);
  });

  test('should handle fixture loading errors gracefully', async () => {
    const isValid = await CacheManager.validateFixture('non-existent-fixture');
    expect(isValid).toBe(false);
  });

  test('should detect conventional commit patterns correctly', async () => {
    cacheFile = await CacheManager.setupTestCache('mixed-commits');
    const fixture = await CacheManager.loadFixture('mixed-commits');

    // Verify our test data has the expected commit types
    const conventionalMessages = [
      'feat: add user authentication',
      'fix: resolve login bug',
      'docs: add API documentation',
    ];

    const nonConventionalMessages = ['update readme'];

    const fixtureMessages = fixture.commits.map((c) => c.message);

    conventionalMessages.forEach((msg) => {
      expect(fixtureMessages).toContain(msg);
    });

    nonConventionalMessages.forEach((msg) => {
      expect(fixtureMessages).toContain(msg);
    });
  });
});
