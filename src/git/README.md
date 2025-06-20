# Git Proxy Interface

This directory contains a proxy interface for git operations that allows for easy testing and mocking of git commands.

## Overview

The git proxy interface provides a clean abstraction layer over git operations, making it easy to:

- **Test git-dependent code** without requiring a real git repository
- **Mock git responses** for predictable testing scenarios
- **Swap implementations** seamlessly between real and mock git operations
- **Track method calls** for verification in tests

## Architecture

```
GitInterface (interface)
├── RealGitInterface (production implementation)
└── MockGitInterface (testing implementation)
```

## Files

- **`GitInterface.ts`** - The main interface defining all git operations
- **`RealGitInterface.ts`** - Production implementation that executes actual git commands
- **`MockGitInterface.ts`** - Testing implementation with configurable mock responses

## Usage

### Basic Usage

```typescript
import { RealGitInterface } from './src/git/RealGitInterface';
import { GitInterface } from './src/git/GitInterface';

// Use in production
const gitInterface: GitInterface = new RealGitInterface();

// Get git log entries
const logEntries = await gitInterface.getLogEntries('/path/to/repo', { count: 10 });

// Get commit diff
const diff = await gitInterface.getCommitDiff('/path/to/repo', 'abc123');

// Check repository status
const status = await gitInterface.getStatus('/path/to/repo');
```

### Testing with Mock

```typescript
import { MockGitInterface } from './src/git/MockGitInterface';

// Create mock git interface
const mockGit = new MockGitInterface();

// Set up typical repository scenario
mockGit.setupTypicalRepository();

// Or configure custom responses
mockGit.setMockResponse('getCurrentBranch', 'feature/new-feature');
mockGit.setMockResponse('getStatus', ''); // Clean repository

// Use in tests
const branch = await mockGit.getCurrentBranch('/fake/repo');
console.log(branch); // 'feature/new-feature'

// Verify method calls
const callHistory = mockGit.getCallHistory();
console.log(callHistory); // Array of method calls with arguments
```

### Error Testing

```typescript
import { GitError } from './src/git/GitInterface';

const mockGit = new MockGitInterface();

// Configure error scenarios
mockGit.setMockError(
  'getCurrentHead',
  new GitError('Not a git repository', 'git rev-parse HEAD', 128, 'fatal: not a git repository')
);

// Test error handling
try {
  await mockGit.getCurrentHead('/not/a/repo');
} catch (error) {
  console.log('Caught expected error:', error.message);
}
```

## Interface Methods

### Core Log and Commit Operations

- `getLogEntries(repoPath, options?)` - Get git log entries
- `getCommitDiff(repoPath, hash, options?)` - Get commit diff summary

### Repository Information

- `getCurrentHead(repoPath)` - Get current HEAD commit hash
- `getGitVersion()` - Get git version
- `getStatus(repoPath, options?)` - Get repository status
- `getCurrentBranch(repoPath)` - Get current branch name

### Branch Operations

- `createBranch(repoPath, branchName)` - Create a new branch
- `checkoutBranch(repoPath, branchName)` - Checkout a branch
- `deleteBranch(repoPath, branchName, force?)` - Delete a branch

### Rebase Operations

- `executeInteractiveRebase(repoPath, targetCommit, options?)` - Execute interactive rebase
- `getCommitsInRange(repoPath, range)` - Get commits in a range

## MockGitInterface Features

### Pre-configured Scenarios

```typescript
const mockGit = new MockGitInterface();

// Set up a typical repository
mockGit.setupTypicalRepository();

// Set up a repository with uncommitted changes
mockGit.setupDirtyRepository();

// Set up error scenarios for testing error handling
mockGit.setupErrorScenarios();

// Set up a large repository for performance testing
mockGit.setupLargeRepository(1000); // 1000 commits
```

### Call History Tracking

```typescript
// Check if a method was called
const wasCalled = mockGit.wasMethodCalled('getLogEntries');

// Get call count
const callCount = mockGit.getMethodCallCount('getCommitDiff');

// Get full call history
const history = mockGit.getCallHistory();
```

### Custom Responses

```typescript
// Set custom responses
mockGit.setMockResponse('getCurrentBranch', 'develop');
mockGit.setMockResponse('getLogEntries', ['hash1', 'message1', 'hash2', 'message2']);

// Set custom commit diffs
mockGit.setMockResponse('getCommitDiff', {
  abc123: 'Custom diff for commit abc123',
  def456: 'Custom diff for commit def456',
});
```

## Integration with Main Script

The main commit analyzer script has been refactored to use the git proxy interface:

```typescript
// Before (direct git calls)
const { stdout } = await execAsync('git log --oneline -n 10', { cwd: repoPath });

// After (using git interface)
const gitInterface = new RealGitInterface();
const logEntries = await gitInterface.getLogEntries(repoPath, { count: 10 });
```

This change makes the entire script testable by allowing you to inject a `MockGitInterface` instead of `RealGitInterface`.

## Benefits

1. **Testability** - Easy to test git-dependent code without real repositories
2. **Reliability** - Predictable responses for consistent testing
3. **Performance** - Fast mock responses for performance testing
4. **Flexibility** - Easy to swap between real and mock implementations
5. **Debugging** - Call history tracking for verification and debugging
6. **Error Testing** - Configurable error scenarios for robust error handling tests

## Example

See `examples/testing-with-mock-git.ts` for a complete example demonstrating all features of the git proxy interface.

## Error Handling

The interface includes a custom `GitError` class that provides detailed information about git command failures:

```typescript
class GitError extends Error {
  constructor(
    message: string,
    public command: string,
    public exitCode: number,
    public stderr: string
  ) {
    super(message);
    this.name = 'GitError';
  }
}
```

This allows for precise error handling and testing of different failure scenarios.
