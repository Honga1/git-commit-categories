# End-to-End Testing Plan for Git Commit Categories

## Overview

This document outlines the automated end-to-end testing strategy using cache positioning to start from different fixtures and ensure correct analysis results. The approach leverages the caching system to create reproducible test scenarios.

## Testing Strategy

### Cache-Based Fixture System

The E2E tests use pre-generated cache files as fixtures to ensure consistent, reproducible test scenarios. Each cache file represents a specific repository state with known expected outcomes.

### Test Architecture

```
tests/
├── e2e/
│   ├── fixtures/
│   │   ├── empty-repo.cache.json
│   │   ├── single-commit.cache.json
│   │   ├── mixed-commits.cache.json
│   │   ├── large-repo.cache.json
│   │   └── conventional-only.cache.json
│   ├── helpers/
│   │   ├── cache-manager.ts
│   │   ├── test-runner.ts
│   │   └── assertions.ts
│   └── specs/
│       ├── basic-analysis.spec.ts
│       ├── commit-categorization.spec.ts
│       ├── performance.spec.ts
│       └── error-handling.spec.ts
```

## Test Fixtures

### Fixture 1: Empty Repository

**File**: `empty-repo.cache.json`
**Purpose**: Test handling of repositories with no commits
**Expected Results**:

- Total commits: 0
- Should trigger validation error
- Exit code: 1

### Fixture 2: Single Commit Repository

**File**: `single-commit.cache.json`
**Purpose**: Test minimal functionality
**Cache Content**:

```json
{
  "repositoryPath": "/test/single-commit",
  "commits": [
    {
      "hash": "abc123",
      "message": "Initial commit",
      "author": "Test User",
      "date": "2024-01-01T00:00:00Z",
      "files": ["README.md"]
    }
  ],
  "insights": {
    "totalCommits": 1,
    "currentBranch": "main",
    "isClean": true,
    "commonFileTypes": { ".md": 1 }
  }
}
```

**Expected Results**:

- Total commits: 1
- Conventional commits: 0 (0%)
- Non-conventional commits: 1 (100%)
- File types: .md (1)

### Fixture 3: Mixed Commits Repository

**File**: `mixed-commits.cache.json`
**Purpose**: Test commit categorization accuracy
**Cache Content**:

```json
{
  "repositoryPath": "/test/mixed-commits",
  "commits": [
    {
      "hash": "def456",
      "message": "feat: add user authentication",
      "author": "Dev User",
      "date": "2024-01-02T00:00:00Z",
      "files": ["auth.js"]
    },
    {
      "hash": "ghi789",
      "message": "fix: resolve login bug",
      "author": "Dev User",
      "date": "2024-01-03T00:00:00Z",
      "files": ["auth.js"]
    },
    {
      "hash": "jkl012",
      "message": "update readme",
      "author": "Dev User",
      "date": "2024-01-04T00:00:00Z",
      "files": ["README.md"]
    },
    {
      "hash": "mno345",
      "message": "docs: add API documentation",
      "author": "Dev User",
      "date": "2024-01-05T00:00:00Z",
      "files": ["docs/api.md"]
    }
  ],
  "insights": {
    "totalCommits": 4,
    "currentBranch": "main",
    "isClean": true,
    "commonFileTypes": { ".js": 1, ".md": 2 }
  }
}
```

**Expected Results**:

- Total commits: 4
- Conventional commits: 3 (75%)
- Non-conventional commits: 1 (25%)
- Sample non-conventional: "update readme"

### Fixture 4: Large Repository

**File**: `large-repo.cache.json`
**Purpose**: Test performance with many commits
**Cache Content**: 100 commits with mixed conventional/non-conventional
**Expected Results**:

- Total commits: 100
- Processing time: < 5 seconds
- Memory usage: < 100MB
- Conventional commits: ~67% (based on fixture pattern)

### Fixture 5: Conventional Only Repository

**File**: `conventional-only.cache.json`
**Purpose**: Test perfect conventional commit compliance
**Expected Results**:

- Total commits: 10
- Conventional commits: 10 (100%)
- Non-conventional commits: 0 (0%)
- Should show "Great job!" recommendation

## Test Implementation

### Test Helper Functions

```typescript
// tests/e2e/helpers/cache-manager.ts
export class CacheManager {
  static async loadFixture(fixtureName: string): Promise<CacheData> {
    const fixturePath = path.join(__dirname, '../fixtures', `${fixtureName}.cache.json`);
    const cacheData = await fs.readFile(fixturePath, 'utf-8');
    return JSON.parse(cacheData);
  }

  static async setupTestCache(fixtureName: string): Promise<string> {
    const fixture = await this.loadFixture(fixtureName);
    const tempCacheFile = path.join(os.tmpdir(), `test-${Date.now()}.cache.json`);
    await fs.writeFile(tempCacheFile, JSON.stringify(fixture, null, 2));
    return tempCacheFile;
  }

  static async cleanup(cacheFile: string): Promise<void> {
    await fs.unlink(cacheFile).catch(() => {}); // Ignore errors
  }
}
```

```typescript
// tests/e2e/helpers/test-runner.ts
export class TestRunner {
  static async runAnalysis(cacheFile: string): Promise<AnalysisResult> {
    const command = `node dist/main.js --restore ${cacheFile}`;
    const result = await exec(command);
    return this.parseOutput(result.stdout);
  }

  private static parseOutput(output: string): AnalysisResult {
    // Parse the CLI output to extract structured data
    const totalCommitsMatch = output.match(/Total commits: (\d+)/);
    const conventionalMatch = output.match(/Conventional commits: (\d+)\/(\d+) \((\d+)%\)/);

    return {
      totalCommits: totalCommitsMatch ? parseInt(totalCommitsMatch[1]) : 0,
      conventionalCommits: conventionalMatch ? parseInt(conventionalMatch[1]) : 0,
      conventionalPercentage: conventionalMatch ? parseInt(conventionalMatch[3]) : 0,
      // ... parse other metrics
    };
  }
}
```

### Test Specifications

```typescript
// tests/e2e/specs/basic-analysis.spec.ts
describe('Basic Analysis E2E Tests', () => {
  let cacheFile: string;

  afterEach(async () => {
    if (cacheFile) {
      await CacheManager.cleanup(cacheFile);
    }
  });

  test('should analyze single commit repository correctly', async () => {
    cacheFile = await CacheManager.setupTestCache('single-commit');
    const result = await TestRunner.runAnalysis(cacheFile);

    expect(result.totalCommits).toBe(1);
    expect(result.conventionalCommits).toBe(0);
    expect(result.conventionalPercentage).toBe(0);
  });

  test('should categorize mixed commits correctly', async () => {
    cacheFile = await CacheManager.setupTestCache('mixed-commits');
    const result = await TestRunner.runAnalysis(cacheFile);

    expect(result.totalCommits).toBe(4);
    expect(result.conventionalCommits).toBe(3);
    expect(result.conventionalPercentage).toBe(75);
  });

  test('should handle perfect conventional compliance', async () => {
    cacheFile = await CacheManager.setupTestCache('conventional-only');
    const result = await TestRunner.runAnalysis(cacheFile);

    expect(result.totalCommits).toBe(10);
    expect(result.conventionalCommits).toBe(10);
    expect(result.conventionalPercentage).toBe(100);
    expect(result.recommendation).toContain('Great job!');
  });
});
```

```typescript
// tests/e2e/specs/performance.spec.ts
describe('Performance E2E Tests', () => {
  test('should process large repository within time limits', async () => {
    const cacheFile = await CacheManager.setupTestCache('large-repo');
    const startTime = Date.now();

    const result = await TestRunner.runAnalysis(cacheFile);
    const processingTime = Date.now() - startTime;

    expect(result.totalCommits).toBe(100);
    expect(processingTime).toBeLessThan(5000); // 5 seconds

    await CacheManager.cleanup(cacheFile);
  });

  test('should handle memory efficiently', async () => {
    const cacheFile = await CacheManager.setupTestCache('large-repo');
    const initialMemory = process.memoryUsage().heapUsed;

    await TestRunner.runAnalysis(cacheFile);
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB

    await CacheManager.cleanup(cacheFile);
  });
});
```

```typescript
// tests/e2e/specs/error-handling.spec.ts
describe('Error Handling E2E Tests', () => {
  test('should handle empty repository gracefully', async () => {
    const cacheFile = await CacheManager.setupTestCache('empty-repo');

    try {
      await TestRunner.runAnalysis(cacheFile);
      fail('Should have thrown an error for empty repository');
    } catch (error) {
      expect(error.code).toBe(1);
      expect(error.message).toContain('validation failed');
    }

    await CacheManager.cleanup(cacheFile);
  });

  test('should handle corrupted cache file', async () => {
    const corruptedCache = path.join(os.tmpdir(), 'corrupted.cache.json');
    await fs.writeFile(corruptedCache, '{ invalid json');

    try {
      await TestRunner.runAnalysis(corruptedCache);
      fail('Should have thrown an error for corrupted cache');
    } catch (error) {
      expect(error.message).toContain('cache file');
    }

    await fs.unlink(corruptedCache);
  });
});
```

## Test Data Integrity Verification

### Cache Validation Tests

```typescript
describe('Cache Data Integrity', () => {
  test('all fixture files should be valid JSON', async () => {
    const fixturesDir = path.join(__dirname, '../fixtures');
    const fixtureFiles = await fs.readdir(fixturesDir);

    for (const file of fixtureFiles) {
      if (file.endsWith('.cache.json')) {
        const content = await fs.readFile(path.join(fixturesDir, file), 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      }
    }
  });

  test('fixture data should match expected schema', async () => {
    const fixture = await CacheManager.loadFixture('mixed-commits');

    expect(fixture).toHaveProperty('repositoryPath');
    expect(fixture).toHaveProperty('commits');
    expect(fixture).toHaveProperty('insights');
    expect(Array.isArray(fixture.commits)).toBe(true);

    fixture.commits.forEach((commit) => {
      expect(commit).toHaveProperty('hash');
      expect(commit).toHaveProperty('message');
      expect(commit).toHaveProperty('author');
      expect(commit).toHaveProperty('date');
    });
  });
});
```

## Continuous Integration Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-test-results
          path: test-results/
```

## Test Execution Commands

```json
{
  "scripts": {
    "test:e2e": "jest tests/e2e --testTimeout=30000",
    "test:e2e:watch": "jest tests/e2e --watch",
    "test:e2e:coverage": "jest tests/e2e --coverage",
    "test:fixtures": "jest tests/e2e/fixtures --testNamePattern='fixture'",
    "test:performance": "jest tests/e2e/specs/performance.spec.ts"
  }
}
```

## Expected Benefits

1. **Reproducibility**: Cache-based fixtures ensure consistent test conditions
2. **Speed**: No need to create real git repositories for each test
3. **Isolation**: Tests don't interfere with each other
4. **Coverage**: Can test edge cases that are hard to reproduce manually
5. **Regression Prevention**: Ensures changes don't break existing functionality
6. **Data Integrity**: Validates that analysis results are mathematically correct

## Maintenance

- Update fixtures when adding new features
- Regenerate cache files when data format changes
- Monitor test performance and adjust timeouts as needed
- Add new fixtures for discovered edge cases
- Validate fixture data integrity regularly
