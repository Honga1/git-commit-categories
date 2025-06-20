# Manual Testing Plan for Git Commit Categories

## Overview

This document outlines the manual testing procedures to ensure the git-commit-categories tool works correctly across different scenarios and repository states.

## Prerequisites

- Node.js 18+ installed
- Git installed and configured
- Built project (`npm run build`)

## Test Environment Setup

### Create Test Repository

```bash
# Create a fresh test repository
mkdir test-repo
cd test-repo
git init
git config user.name "Test User"
git config user.email "test@example.com"
```

## Test Scenarios

### Scenario 1: Empty Repository

**Purpose**: Test behavior with no commits

**Setup**:

```bash
# In empty test-repo
```

**Test Command**:

```bash
node ../git-commit-categories/dist/main.js .
```

**Expected Result**:

- Should show validation error about no commits
- Should exit gracefully with error message

### Scenario 2: Single Commit Repository

**Purpose**: Test basic functionality with minimal data

**Setup**:

```bash
echo "# Test Project" > README.md
git add README.md
git commit -m "Initial commit"
```

**Test Command**:

```bash
node ../git-commit-categories/dist/main.js .
```

**Expected Result**:

- Should analyze 1 commit
- Should categorize as non-conventional (no prefix)
- Should show 0% conventional commits

### Scenario 3: Mixed Conventional and Non-Conventional Commits

**Purpose**: Test commit categorization accuracy

**Setup**:

```bash
# Add conventional commits
echo "console.log('hello');" > app.js
git add app.js
git commit -m "feat: add hello world functionality"

echo "console.log('world');" >> app.js
git add app.js
git commit -m "fix: correct output message"

# Add non-conventional commits
echo "// comment" >> app.js
git add app.js
git commit -m "updated app.js"

echo "const x = 1;" >> app.js
git add app.js
git commit -m "WIP: working on feature"

# Add more conventional commits
touch test.js
git add test.js
git commit -m "test: add test file"

echo "# Documentation" > docs.md
git add docs.md
git commit -m "docs: add documentation"
```

**Test Command**:

```bash
node ../git-commit-categories/dist/main.js .
```

**Expected Result**:

- Should analyze 7 commits total (including initial)
- Should show ~71% conventional commits (5/7)
- Should list non-conventional commits in sample
- Should show file type distribution

### Scenario 4: Large Repository Simulation

**Purpose**: Test performance with many commits

**Setup**:

```bash
# Create 50 commits with mixed types
for i in {1..50}; do
  echo "line $i" >> large-file.txt
  git add large-file.txt

  # Alternate between conventional and non-conventional
  if [ $((i % 3)) -eq 0 ]; then
    git commit -m "feat: add line $i"
  elif [ $((i % 3)) -eq 1 ]; then
    git commit -m "fix: update line $i"
  else
    git commit -m "update line $i"
  fi
done
```

**Test Command**:

```bash
node ../git-commit-categories/dist/main.js .
```

**Expected Result**:

- Should analyze all commits (57 total)
- Should show performance metrics
- Should complete within reasonable time (< 30 seconds)
- Should show correct percentage breakdown

### Scenario 5: Repository with Uncommitted Changes

**Purpose**: Test handling of dirty working directory

**Setup**:

```bash
echo "uncommitted change" >> app.js
# Don't commit this change
```

**Test Command**:

```bash
node ../git-commit-categories/dist/main.js .
```

**Expected Result**:

- Should show warning about uncommitted changes
- Should still analyze commits successfully
- Should show "Has uncommitted changes" in status

### Scenario 6: Different File Types

**Purpose**: Test file type detection and reporting

**Setup**:

```bash
# Add various file types
echo "body { color: red; }" > styles.css
git add styles.css
git commit -m "style: add CSS styles"

echo "<html><body>Hello</body></html>" > index.html
git add index.html
git commit -m "feat: add HTML page"

echo "def hello(): pass" > script.py
git add script.py
git commit -m "feat: add Python script"

echo '{"name": "test"}' > package.json
git add package.json
git commit -m "chore: add package.json"
```

**Test Command**:

```bash
node ../git-commit-categories/dist/main.js .
```

**Expected Result**:

- Should show file type distribution
- Should list .css, .html, .py, .json, .txt, .js, .md files
- Should show counts for each file type

### Scenario 7: CLI Options Testing

**Purpose**: Test various command-line options

**Test Commands**:

```bash
# Help command
node ../git-commit-categories/dist/main.js --help

# Status command
node ../git-commit-categories/dist/main.js --status

# Cache commands
node ../git-commit-categories/dist/main.js --list-caches
node ../git-commit-categories/dist/main.js --clear-cache
```

**Expected Results**:

- `--help`: Should show comprehensive usage information
- `--status`: Should show configuration status (API key missing)
- `--list-caches`: Should show available cache files or empty list
- `--clear-cache`: Should clear cache and show confirmation

### Scenario 8: Invalid Repository Path

**Purpose**: Test error handling for invalid inputs

**Test Commands**:

```bash
# Non-existent directory
node ../git-commit-categories/dist/main.js /non/existent/path

# Non-git directory
mkdir not-git
node ../git-commit-categories/dist/main.js not-git

# File instead of directory
touch somefile.txt
node ../git-commit-categories/dist/main.js somefile.txt
```

**Expected Results**:

- Should show appropriate error messages
- Should exit with non-zero status code
- Should not crash or hang

### Scenario 9: Branch Testing

**Purpose**: Test behavior with different branches

**Setup**:

```bash
# Create and switch to new branch
git checkout -b feature-branch

echo "feature code" > feature.js
git add feature.js
git commit -m "feat: add feature functionality"

# Switch back to main
git checkout main
```

**Test Commands**:

```bash
# Test on main branch
node ../git-commit-categories/dist/main.js .

# Switch to feature branch and test
git checkout feature-branch
node ../git-commit-categories/dist/main.js .
```

**Expected Results**:

- Should show current branch in insights
- Should analyze commits available on current branch
- Should handle branch switching correctly

### Scenario 10: Performance Testing

**Purpose**: Test with commit limit options

**Test Commands**:

```bash
# Test with limited commits (if you have many commits)
node ../git-commit-categories/dist/main.js . --max-commits 10
```

**Expected Results**:

- Should respect commit limits
- Should show correct count in output
- Should process faster with fewer commits

## Test Checklist

For each scenario, verify:

- [ ] Application starts without errors
- [ ] Git repository is detected correctly
- [ ] Commit analysis completes successfully
- [ ] Conventional commit detection is accurate
- [ ] File type detection works correctly
- [ ] Performance is acceptable
- [ ] Error messages are clear and helpful
- [ ] Application exits cleanly
- [ ] No memory leaks or hanging processes

## Expected Output Format

Each successful test should produce output similar to:

```
🔍 Analyzing git repository at: [path]
🔍 Validating repository...
📊 Repository insights:
  • Total commits: [number]
  • Current branch: [branch-name]
  • Repository status: [Clean/Has uncommitted changes]

📋 Fetching last [number] commits for analysis...
✅ Analysis complete! Processed [number] commits

📊 Summary:
  • Conventional commits: [number]/[total] ([percentage]%)
  • Non-conventional commits: [number]/[total] ([percentage]%)

[Additional sections as applicable]

✅ Analysis complete! This was a safe, read-only operation.
```

## Cleanup

After testing:

```bash
# Remove test repository
cd ..
rm -rf test-repo not-git somefile.txt
```

## Notes

- All tests should be non-destructive (read-only operations)
- Test with different operating systems if possible
- Document any unexpected behavior or edge cases discovered
- Consider testing with very large repositories (1000+ commits) for performance validation
