#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import { encoding_for_model } from 'tiktoken';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// =================================================================
// Configuration & Validation
// =================================================================

interface Config {
  apiKey: string;
  baseUrl: string;
  httpReferer: string;
  xTitle: string;
  classificationModel: string;
  ruleGenerationModel: string;
  maxCommitsToAnalyze: number | null;
  maxCommitsToProcess: number | null;
  initialBatchSize: number;
  minBatchSize: number;
  maxBatchSize: number;
  contextLimitThreshold: number;
  maxRetries: number;
  baseDelay: number;
  growthFactor: number;
  decayFactor: number;
  successThreshold: number;
  diffConcurrency: number;
  syntheticTestMode: boolean;
}

async function getOrCreateApiKey(): Promise<string> {
  // First check if API key is provided via environment
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }

  console.log('🔑 No API key found in environment variables.');
  console.log('🚀 Attempting to get a temporary API key from OpenRouter...');

  try {
    // Try to get a temporary/guest API key from OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Git Commit Analyzer - Temporary Key',
        scoped: true,
        temporary: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.key) {
        console.log('✅ Successfully obtained temporary API key!');
        console.log('💡 For better rate limits, set OPENROUTER_API_KEY in your .env file');
        return data.key;
      }
    }

    // If temporary key fails, try guest access
    console.log('⚠️  Temporary key unavailable, trying guest access...');
    const guestResponse = await fetch('https://openrouter.ai/api/v1/auth/guest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (guestResponse.ok) {
      const guestData = await guestResponse.json();
      if (guestData.key) {
        console.log('✅ Using guest API access (limited usage)');
        console.log('💡 For unlimited usage, get your own API key at https://openrouter.ai/');
        return guestData.key;
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not obtain automatic API key:', error);
  }

  // Fallback: prompt user for manual setup
  console.error('❌ Unable to obtain API key automatically.');
  console.error('📝 Please get an API key from https://openrouter.ai/ and either:');
  console.error('   1. Set OPENROUTER_API_KEY environment variable');
  console.error('   2. Create a .env file with OPENROUTER_API_KEY=your_key_here');
  console.error('   3. Use: export OPENROUTER_API_KEY=your_key_here');
  process.exit(1);
}

async function loadAndValidateConfig(): Promise<Config> {
  const apiKey = await getOrCreateApiKey();

  return {
    apiKey: apiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
    httpReferer: process.env.HTTP_REFERER || 'https://github.com/cline/cline',
    xTitle: process.env.X_TITLE || 'Cline Commit Analyzer',
    classificationModel:
      process.env.AI_CLASSIFICATION_MODEL || 'deepseek/deepseek-r1-distill-llama-70b',
    ruleGenerationModel:
      process.env.RULE_GENERATION_MODEL || 'deepseek/deepseek-r1-distill-llama-70b',
    maxCommitsToAnalyze: process.env.MAX_COMMITS_TO_ANALYZE
      ? parseInt(process.env.MAX_COMMITS_TO_ANALYZE, 10)
      : null,
    maxCommitsToProcess: process.env.MAX_COMMITS_TO_PROCESS
      ? parseInt(process.env.MAX_COMMITS_TO_PROCESS, 10)
      : null,
    initialBatchSize: parseInt(process.env.INITIAL_BATCH_SIZE || '16', 10),
    minBatchSize: parseInt(process.env.MIN_BATCH_SIZE || '2', 10),
    maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '128', 10),
    contextLimitThreshold: parseInt(process.env.CONTEXT_LIMIT_THRESHOLD || '30000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    baseDelay: parseInt(process.env.BASE_DELAY || '500', 10),
    growthFactor: parseFloat(process.env.GROWTH_FACTOR || '1.5'),
    decayFactor: parseFloat(process.env.DECAY_FACTOR || '0.6'),
    successThreshold: parseInt(process.env.SUCCESS_THRESHOLD || '2', 10),
    diffConcurrency: parseInt(process.env.DIFF_CONCURRENCY || '4', 10),
    syntheticTestMode: process.env.SYNTHETIC_TEST_MODE === 'true',
  };
}

// =================================================================
// Core Data Types
// =================================================================

type RawCommit = {
  hash: string;
  message: string;
};

type EnrichedCommit = RawCommit & {
  diff: string;
};

type ClassifiedCommit = EnrichedCommit & {
  conformingPrefix?: string;
  suggestedPrefix?: string;
  reason?: string;
};

type TransformRule = {
  pattern: RegExp;
  replacement: string;
  reason: string;
};

// =================================================================
// Utility Functions
// =================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateTokensAccurately(text: string, model: string = 'gpt-4'): number {
  try {
    const encoder = encoding_for_model(model as Parameters<typeof encoding_for_model>[0]);
    const tokens = encoder.encode(text);
    encoder.free();
    return tokens.length;
  } catch (error) {
    // Fallback to improved estimation if tiktoken fails
    return Math.ceil(text.length / 3.5); // More accurate than /4
  }
}

function categorizeFile(filePath: string): string {
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
  if (extensionMap[ext]) return extensionMap[ext];

  // Fallback to path-based categorization
  if (path.includes('test') || path.includes('spec')) return 'test';
  if (path.includes('doc') || path.includes('readme')) return 'docs';
  if (path.includes('config')) return 'config';
  if (path.includes('package') && path.includes('lock')) return 'deps';
  if (path.includes('build') || path.includes('dist')) return 'build';

  return 'misc';
}

// =================================================================
// Batch Management
// =================================================================

class BatchManager {
  private currentBatchSize: number;
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  private contextOverflowCount = 0;

  constructor(private config: Config) {
    this.currentBatchSize = config.initialBatchSize;
  }

  getCurrentBatchSize(): number {
    return this.currentBatchSize;
  }

  adjustBatchSize(success: boolean, contextOverflow = false): number {
    if (contextOverflow) {
      this.contextOverflowCount++;
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;

      this.currentBatchSize = Math.max(
        this.config.minBatchSize,
        Math.floor(this.currentBatchSize * this.config.decayFactor)
      );
      console.log(`📉 Context overflow detected. Reducing batch size to ${this.currentBatchSize}`);
    } else if (success) {
      this.consecutiveSuccesses++;
      this.consecutiveFailures = 0;

      if (
        this.consecutiveSuccesses >= this.config.successThreshold &&
        this.currentBatchSize < this.config.maxBatchSize
      ) {
        const newSize = Math.min(
          this.config.maxBatchSize,
          Math.floor(this.currentBatchSize * this.config.growthFactor)
        );
        if (newSize > this.currentBatchSize) {
          this.currentBatchSize = newSize;
          this.consecutiveSuccesses = 0;
          console.log(`📈 Increasing batch size to ${this.currentBatchSize}`);
        }
      }
    } else {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;

      const decayRate = Math.min(0.8, this.config.decayFactor + this.consecutiveFailures * 0.1);
      this.currentBatchSize = Math.max(
        this.config.minBatchSize,
        Math.floor(this.currentBatchSize * decayRate)
      );
      console.log(`📉 Reducing batch size to ${this.currentBatchSize} due to failure`);
    }

    return this.currentBatchSize;
  }

  getStats() {
    return {
      currentBatchSize: this.currentBatchSize,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      contextOverflowCount: this.contextOverflowCount,
    };
  }
}

// =================================================================
// Git Operations
// =================================================================

async function getGitLogEntries(repoPath: string, count: number | null): Promise<string[]> {
  try {
    // Use NUL separator to handle commit messages with special characters
    const command =
      count === null
        ? `git log -z --pretty=format:"%h%x00%s"`
        : `git log -z --pretty=format:"%h%x00%s" -${count}`;

    const { stdout } = await execAsync(command, {
      cwd: repoPath,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    return stdout.split('\0').filter((line) => line.trim() !== '');
  } catch (error) {
    console.error('Error fetching git log:', error);
    return [];
  }
}

async function parseCommitEntries(logEntries: string[]): Promise<RawCommit[]> {
  const commits: RawCommit[] = [];

  for (let i = 0; i < logEntries.length; i += 2) {
    const hash = logEntries[i];
    const message = logEntries[i + 1];

    if (hash && message) {
      commits.push({ hash: hash.trim(), message: message.trim() });
    }
  }

  return commits;
}

async function getCommitDiffSummary(repoPath: string, hash: string): Promise<string> {
  try {
    // Single command to get both message and file changes
    const { stdout: combined } = await execAsync(
      `git show --pretty=format:"%s%n%b" --name-status ${hash}`,
      {
        cwd: repoPath,
        maxBuffer: 2 * 1024 * 1024, // 2MB buffer
      }
    );

    const lines = combined.split('\n');
    let messageEndIndex = 0;

    // Find where the message ends and file changes begin
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^[AMDRC]/)) {
        messageEndIndex = i;
        break;
      }
    }

    const message = lines.slice(0, messageEndIndex).join('\n').trim();
    const fileChanges = lines
      .slice(messageEndIndex)
      .filter((line) => line.trim() && line.match(/^[AMDRC]/));

    // Summarize changes efficiently
    const fileSummaries = fileChanges.slice(0, 15).map((line) => {
      const [status, ...fileParts] = line.split('\t');
      const file = fileParts.join('\t');
      const changeType =
        {
          A: 'added',
          M: 'modified',
          D: 'deleted',
          R: 'renamed',
          C: 'copied',
        }[status] || 'changed';

      const category = categorizeFile(file);
      return `${changeType} ${category}: ${file}`;
    });

    let summary = `Message: ${message}\n\nFiles changed (${fileChanges.length} total):\n`;
    summary += fileSummaries.join('\n');

    if (fileChanges.length > 15) {
      summary += `\n... and ${fileChanges.length - 15} more files`;
    }

    return summary;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
    ) {
      console.warn(`⚠️  Commit ${hash} has extremely large diff, using minimal summary`);
      try {
        const { stdout: summary } = await execAsync(
          `git show --name-only --pretty=format:"%s" ${hash}`,
          { cwd: repoPath, maxBuffer: 512 * 1024 }
        );
        return `Large commit summary:\n${summary}`;
      } catch {
        return `Large commit ${hash} - details unavailable`;
      }
    }
    console.error(`Error fetching diff summary for commit ${hash}:`, error);
    return `Commit ${hash} - summary unavailable`;
  }
}

// Simple concurrency limiter implementation
class ConcurrencyLimiter {
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.running++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
          }
        }
      };

      if (this.running < this.limit) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }
}

async function enrichCommitsWithDiffs(
  commits: RawCommit[],
  repoPath: string,
  concurrency: number
): Promise<EnrichedCommit[]> {
  const limiter = new ConcurrencyLimiter(concurrency);

  console.log(
    `🔄 Fetching diffs for ${commits.length} commits with ${concurrency} concurrent processes...`
  );

  const enrichedCommits = await Promise.all(
    commits.map((commit, index) =>
      limiter.run(async () => {
        const diff = await getCommitDiffSummary(repoPath, commit.hash);

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

// =================================================================
// Rate Limiting & API Management
// =================================================================

interface RateLimitInfo {
  requestsThisMinute: number;
  minuteStartTime: number;
  dailyRequests: number;
  dayStartTime: number;
  creditsRemaining: number | null;
  isFreeTier: boolean;
}

class RateLimitManager {
  private rateLimitInfo: RateLimitInfo = {
    requestsThisMinute: 0,
    minuteStartTime: Date.now(),
    dailyRequests: 0,
    dayStartTime: Date.now(),
    creditsRemaining: null,
    isFreeTier: true,
  };

  constructor(private config: Config) {}

  async checkRateLimits(): Promise<void> {
    const now = Date.now();

    // Reset minute counter if needed
    if (now - this.rateLimitInfo.minuteStartTime >= 60000) {
      this.rateLimitInfo.requestsThisMinute = 0;
      this.rateLimitInfo.minuteStartTime = now;
    }

    // Reset daily counter if needed
    if (now - this.rateLimitInfo.dayStartTime >= 86400000) {
      this.rateLimitInfo.dailyRequests = 0;
      this.rateLimitInfo.dayStartTime = now;
    }

    // Check free tier limits
    if (this.rateLimitInfo.isFreeTier) {
      // 20 requests per minute for free models
      if (this.rateLimitInfo.requestsThisMinute >= 20) {
        const waitTime = 60000 - (now - this.rateLimitInfo.minuteStartTime);
        console.log(`⏳ Rate limit: waiting ${Math.ceil(waitTime / 1000)}s for minute reset...`);
        await sleep(waitTime + 1000); // Add 1s buffer
        this.rateLimitInfo.requestsThisMinute = 0;
        this.rateLimitInfo.minuteStartTime = Date.now();
      }

      // Daily limits based on credit purchase
      const dailyLimit =
        this.rateLimitInfo.creditsRemaining && this.rateLimitInfo.creditsRemaining >= 10
          ? 1000
          : 50;
      if (this.rateLimitInfo.dailyRequests >= dailyLimit) {
        console.log(
          `⏳ Daily limit reached (${dailyLimit}). Consider upgrading or waiting until tomorrow.`
        );
        throw new Error(`Daily rate limit exceeded: ${dailyLimit} requests per day`);
      }
    }
  }

  async updateApiKeyInfo(): Promise<void> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (response.ok) {
        const keyInfo = await response.json();
        this.rateLimitInfo.creditsRemaining = keyInfo.data.limit - keyInfo.data.usage;
        this.rateLimitInfo.isFreeTier = keyInfo.data.is_free_tier;

        console.log(
          `💳 API Key Status: ${this.rateLimitInfo.isFreeTier ? 'Free Tier' : 'Paid'}, Credits: ${this.rateLimitInfo.creditsRemaining || 'Unlimited'}`
        );
      }
    } catch (error) {
      console.warn('⚠️  Could not fetch API key info, assuming free tier limits');
    }
  }

  recordRequest(): void {
    this.rateLimitInfo.requestsThisMinute++;
    this.rateLimitInfo.dailyRequests++;
  }

  getStats() {
    return {
      requestsThisMinute: this.rateLimitInfo.requestsThisMinute,
      dailyRequests: this.rateLimitInfo.dailyRequests,
      creditsRemaining: this.rateLimitInfo.creditsRemaining,
      isFreeTier: this.rateLimitInfo.isFreeTier,
    };
  }
}

// =================================================================
// LLM Operations with Rate Limiting & Prompt Caching
// =================================================================

async function callLLMWithRetry(
  config: Config,
  model: string,
  prompt: string,
  rateLimitManager: RateLimitManager,
  retryCount = 0
): Promise<string> {
  // Check rate limits before making request
  await rateLimitManager.checkRateLimits();

  try {
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'HTTP-Referer': config.httpReferer,
        'X-Title': config.xTitle,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        stream: false,
        provider: { sort: 'throughput' },
        // Enable prompt caching for OpenRouter
        cache: {
          enabled: true,
          ttl: 3600, // 1 hour cache
        },
      }),
    });

    // Record successful request
    rateLimitManager.recordRequest();

    if (!response.ok) {
      if (response.status === 429 && retryCount < config.maxRetries) {
        const delay = config.baseDelay * Math.pow(2, retryCount);
        console.log(
          `⏳ Rate limited. Retrying in ${delay}ms... (attempt ${retryCount + 1}/${config.maxRetries})`
        );
        await sleep(delay);
        return callLLMWithRetry(config, model, prompt, rateLimitManager, retryCount + 1);
      }

      if (response.status === 402) {
        console.error('💳 Insufficient credits. Please add credits to your OpenRouter account.');
        throw new Error('Insufficient credits - please add credits to continue');
      }

      throw new Error(`HTTP error! status: ${response.status}, body: ${await response.text()}`);
    }

    const data = await response.json();

    // Log cache hit information if available
    if (response.headers.get('x-cache-status')) {
      console.log(`🎯 Cache: ${response.headers.get('x-cache-status')}`);
    }

    return data.choices[0].message.content || '{}';
  } catch (error) {
    if (retryCount < config.maxRetries) {
      const delay = config.baseDelay * Math.pow(2, retryCount);
      console.log(
        `🔄 API error. Retrying in ${delay}ms... (attempt ${retryCount + 1}/${config.maxRetries})`
      );
      await sleep(delay);
      return callLLMWithRetry(config, model, prompt, rateLimitManager, retryCount + 1);
    }
    console.error('Error calling LLM API after retries:', error);
    throw error;
  }
}

function createClassificationPrompt(commits: EnrichedCommit[]): string {
  // Pre-truncate diffs to save tokens
  const commitsWithTruncatedDiffs = commits.map((c) => ({
    ...c,
    diff: c.diff.substring(0, 800), // Truncate before sending
  }));

  return `Classify these ${commits.length} commit messages according to conventional commit standards.
The available prefixes are: feat, fix, docs, style, refactor, test, chore, build, ci, perf, revert.
If a new, logical category emerges, you can suggest it.

Commits to classify:
${commitsWithTruncatedDiffs
  .map(
    (c, i) =>
      `${i + 1}. Hash: ${c.hash}
   Message: "${c.message}"
   Diff: ${c.diff}${c.diff.length >= 800 ? '...' : ''}
`
  )
  .join('\n')}

Respond with a JSON object with this structure:
{
  "classifications": [
    {
      "hash": "<commit hash>",
      "conformingPrefix": "<the prefix if it conforms, otherwise null>",
      "suggestedPrefix": "<your suggested prefix>",
      "reason": "<a brief explanation for your suggestion>"
    }
  ]
}`;
}

async function classifyCommitsBatch(
  config: Config,
  commits: EnrichedCommit[],
  rateLimitManager: RateLimitManager
): Promise<ClassifiedCommit[]> {
  const prompt = createClassificationPrompt(commits);

  try {
    const responseContent = await callLLMWithRetry(
      config,
      config.classificationModel,
      prompt,
      rateLimitManager
    );

    // Robust JSON parsing with fallback
    let result;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      console.warn(
        `⚠️  JSON parse error for batch of ${commits.length} commits. Response: ${responseContent.substring(0, 200)}...`
      );
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error(`Failed to parse JSON response: ${responseContent.substring(0, 200)}...`);
        }
      } else {
        throw parseError;
      }
    }

    const classifiedCommits: ClassifiedCommit[] = commits.map((commit) => {
      const classification = result.classifications?.find(
        (c: {
          hash: string;
          conformingPrefix?: string;
          suggestedPrefix?: string;
          reason?: string;
        }) => c.hash === commit.hash
      );
      if (classification) {
        return {
          ...commit,
          conformingPrefix: classification.conformingPrefix,
          suggestedPrefix: classification.suggestedPrefix,
          reason: classification.reason,
        };
      }
      return { ...commit };
    });

    return classifiedCommits;
  } catch (error) {
    console.error(`Error classifying batch of ${commits.length} commits:`, error);
    return commits.map((c) => ({ ...c }));
  }
}

// =================================================================
// Rule Generation and Processing
// =================================================================

async function generateTransformationRules(
  config: Config,
  classifiedCommits: ClassifiedCommit[],
  rateLimitManager: RateLimitManager
): Promise<TransformRule[]> {
  console.log('\n🤖 Generating transformation rules using AI...');

  const analysisData = classifiedCommits.map((c) => ({
    message: c.message,
    suggestedPrefix: c.suggestedPrefix,
    reason: c.reason,
  }));

  const prompt = `Analyze these commit message classifications and generate transformation rules for standardizing commit messages to conventional commit format.

Classification Data:
${JSON.stringify(analysisData, null, 2)}

Based on this analysis, generate transformation rules that can be applied to commit messages. Consider:
1. Common patterns in non-conforming messages
2. Logical groupings of similar changes
3. Mechanical transformations (e.g., "Fix" -> "fix:", "Add" -> "feat:")
4. Context-specific rules for this codebase

Respond with a JSON object containing a "rules" array in this format:
{
  "rules": [
    {
      "pattern": "regex pattern as string",
      "replacement": "replacement string",  
      "reason": "explanation of why this rule applies"
    }
  ]
}

Focus on practical, mechanical rules that can be automatically applied.`;

  try {
    const responseContent = await callLLMWithRetry(
      config,
      config.ruleGenerationModel,
      prompt,
      rateLimitManager
    );
    const result = JSON.parse(responseContent);
    const rules: TransformRule[] = (result.rules || []).map(
      (r: { pattern: string; replacement: string; reason: string }) => ({
        pattern: new RegExp(r.pattern, 'i'),
        replacement: r.replacement,
        reason: r.reason,
      })
    );

    console.table(
      rules.map((r) => ({
        pattern: r.pattern.toString(),
        replacement: r.replacement,
        reason: r.reason,
      }))
    );

    return rules;
  } catch (error) {
    console.error('Error generating rules with AI, falling back to basic rules:', error);
    return getBasicTransformRules();
  }
}

function getBasicTransformRules(): TransformRule[] {
  const basicRules: TransformRule[] = [
    {
      pattern: /^(fix|feat|docs|style|refactor|test|chore|build|ci|perf|revert):/i,
      replacement: '$1:',
      reason: 'Already conventional',
    },
    {
      pattern: /^Fix\s+/i,
      replacement: 'fix: ',
      reason: 'Standardize Fix prefix',
    },
    {
      pattern: /^Add\s+/i,
      replacement: 'feat: ',
      reason: 'Standardize Add prefix to feat',
    },
    {
      pattern: /^Update\s+/i,
      replacement: 'chore: ',
      reason: 'Standardize Update prefix to chore',
    },
    {
      pattern: /^Refactor/i,
      replacement: 'refactor: ',
      reason: 'Standardize Refactor prefix',
    },
  ];

  console.table(
    basicRules.map((r) => ({
      pattern: r.pattern.toString(),
      replacement: r.replacement,
      reason: r.reason,
    }))
  );

  return basicRules;
}

function applyTransformRules(commits: RawCommit[], rules: TransformRule[]): ClassifiedCommit[] {
  return commits.map((commit) => {
    let result: ClassifiedCommit = { ...commit, diff: 'Rule application - no diff available' };

    for (const rule of rules) {
      if (rule.pattern.test(commit.message)) {
        const newMessage = commit.message.replace(rule.pattern, rule.replacement);
        // Extract prefix from the replacement, handling $1 substitution
        let suggestedPrefix = rule.replacement.replace(':', '').trim();
        if (suggestedPrefix === '$1') {
          // Extract the actual prefix from the matched pattern
          const match = commit.message.match(rule.pattern);
          if (match && match[1]) {
            suggestedPrefix = match[1].toLowerCase();
          }
        }

        result = {
          ...result,
          message: newMessage,
          suggestedPrefix,
          reason: rule.reason,
        };
        break; // Apply first matching rule
      }
    }

    return result;
  });
}

// =================================================================
// Batch Processing Engine
// =================================================================

async function processCommitsInAdaptiveBatches(
  config: Config,
  commits: EnrichedCommit[]
): Promise<ClassifiedCommit[]> {
  const batchManager = new BatchManager(config);
  const rateLimitManager = new RateLimitManager(config);
  const classifiedCommits: ClassifiedCommit[] = [];

  // Initialize rate limit info
  await rateLimitManager.updateApiKeyInfo();

  console.log(
    `📦 Processing ${commits.length} commits with adaptive batch sizing (starting with ${batchManager.getCurrentBatchSize()})...`
  );

  let i = 0;
  let batchNumber = 1;

  while (i < commits.length) {
    const batchSize = batchManager.getCurrentBatchSize();
    const batch = commits.slice(i, i + batchSize);

    console.log(
      `🔄 Processing batch ${batchNumber} (${batch.length} commits, batch size: ${batchSize})...`
    );

    try {
      // Estimate context usage before making the request
      const prompt = createClassificationPrompt(batch);
      const estimatedTokens = estimateTokensAccurately(prompt, config.classificationModel);

      if (estimatedTokens > config.contextLimitThreshold) {
        console.log(`⚠️  Estimated ${estimatedTokens} tokens, reducing batch size`);
        batchManager.adjustBatchSize(false, true);

        // Guard against infinite loop - if we're at minimum batch size, process anyway with truncation
        if (batchManager.getCurrentBatchSize() === config.minBatchSize && batch.length === 1) {
          console.log(
            '⚠️  Single commit exceeds context limit, processing with maximum truncation'
          );
          // Process with heavily truncated diff
          const truncatedBatch = batch.map((c) => ({
            ...c,
            diff: c.diff.substring(0, 200), // Very short diff for oversized commits
          }));
          const batchResults = await classifyCommitsBatch(config, truncatedBatch, rateLimitManager);
          classifiedCommits.push(...batchResults);
          i += batch.length; // Fixed bug: use batch.length instead of batchSize
          batchNumber++;
        }
        continue; // Retry with smaller batch
      }

      const batchResults = await classifyCommitsBatch(config, batch, rateLimitManager);
      classifiedCommits.push(...batchResults);

      // Success - potentially increase batch size
      batchManager.adjustBatchSize(true);

      i += batch.length; // CRITICAL FIX: Use actual batch length, not current batch size
      batchNumber++;

      process.stdout.write(`\rProcessed ${classifiedCommits.length}/${commits.length} commits...`);

      // Rate limiting between batches
      if (i < commits.length) {
        await sleep(300);
      }
    } catch (error) {
      console.error(`\n❌ Error processing batch ${batchNumber}:`, error);

      batchManager.adjustBatchSize(false);

      // If batch size is at minimum, skip this batch to avoid infinite loop
      if (batchManager.getCurrentBatchSize() === config.minBatchSize) {
        console.log(`⚠️  Skipping problematic batch and continuing...`);
        i += batch.length; // Fixed bug: use batch.length
        batchNumber++;
      }

      await sleep(2000);
    }
  }

  console.log('\n✅ Classification complete');
  const stats = batchManager.getStats();
  console.log(`📊 Batch processing stats:`, stats);
  console.log(`📊 Rate limit stats:`, rateLimitManager.getStats());

  return classifiedCommits;
}

// =================================================================
// Analysis and Reporting
// =================================================================

function generateAnalysisReport(
  classifiedCommits: ClassifiedCommit[],
  finalCommits: ClassifiedCommit[],
  rules: TransformRule[]
): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMMIT ANALYSIS REPORT');
  console.log('='.repeat(80));

  // Prefix frequency analysis
  const prefixCounts = new Map<string, number>();
  const suggestedPrefixCounts = new Map<string, number>();

  classifiedCommits.forEach((commit) => {
    const currentPrefix = commit.message.match(/^(\w+):/)?.[1] || 'none';
    prefixCounts.set(currentPrefix, (prefixCounts.get(currentPrefix) || 0) + 1);

    if (commit.suggestedPrefix) {
      suggestedPrefixCounts.set(
        commit.suggestedPrefix,
        (suggestedPrefixCounts.get(commit.suggestedPrefix) || 0) + 1
      );
    }
  });

  console.log('\n📈 Current Prefix Distribution:');
  console.table(Array.from(prefixCounts.entries()).map(([prefix, count]) => ({ prefix, count })));

  console.log('\n🎯 Suggested Prefix Distribution:');
  console.table(
    Array.from(suggestedPrefixCounts.entries()).map(([prefix, count]) => ({ prefix, count }))
  );

  // Conformance analysis
  const conformingCommits = classifiedCommits.filter((c) => c.conformingPrefix);
  const nonConformingCommits = classifiedCommits.filter((c) => !c.conformingPrefix);

  console.log(
    `\n✅ Conforming commits: ${conformingCommits.length}/${classifiedCommits.length} (${Math.round((conformingCommits.length / classifiedCommits.length) * 100)}%)`
  );
  console.log(
    `❌ Non-conforming commits: ${nonConformingCommits.length}/${classifiedCommits.length} (${Math.round((nonConformingCommits.length / classifiedCommits.length) * 100)}%)`
  );

  // Rule effectiveness
  const rulesApplied = finalCommits.filter(
    (c) => c.suggestedPrefix && c.suggestedPrefix !== ''
  ).length;
  console.log(`\n🔧 Rules applied to: ${rulesApplied}/${finalCommits.length} commits`);

  console.log('\n📋 Generated Rules Summary:');
  rules.forEach((rule, index) => {
    console.log(`${index + 1}. ${rule.reason}`);
    console.log(`   Pattern: ${rule.pattern}`);
    console.log(`   Replacement: "${rule.replacement}"`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('🎯 RECOMMENDATIONS');
  console.log('='.repeat(80));

  if (nonConformingCommits.length > conformingCommits.length) {
    console.log('• Consider implementing commit message linting in your CI/CD pipeline');
    console.log('• Add a commit-msg git hook to enforce conventional commit format');
  }

  const mostCommonSuggestion = Array.from(suggestedPrefixCounts.entries()).sort(
    ([, a], [, b]) => b - a
  )[0];
  if (mostCommonSuggestion) {
    console.log(
      `• Most suggested prefix: "${mostCommonSuggestion[0]}" (${mostCommonSuggestion[1]} commits)`
    );
  }

  console.log(
    '• Review the generated rules and consider implementing them in your development workflow'
  );
  console.log('='.repeat(80));
}

// =================================================================
// Synthetic Testing (Simplified)
// =================================================================

function generateMockCommits(): EnrichedCommit[] {
  return [
    {
      hash: 'a1b2c3d',
      message: 'feat: add new login button',
      diff: 'Message: feat: add new login button\n\nFiles changed (2 total):\nmodified code: src/components/LoginButton.tsx\nmodified style: src/styles/login.css',
    },
    {
      hash: 'd4e5f6g',
      message: 'fix(auth): resolve issue with token refresh',
      diff: 'Message: fix(auth): resolve issue with token refresh\n\nFiles changed (1 total):\nmodified code: src/auth/tokenService.ts',
    },
    {
      hash: 'h7i8j9k',
      message: 'refactor: simplify user service',
      diff: 'Message: refactor: simplify user service\n\nFiles changed (3 total):\nmodified code: src/services/userService.ts\ndeleted test: src/services/userService.old.ts\nmodified test: src/services/userService.test.ts',
    },
    {
      hash: 'l0m1n2o',
      message: 'docs: update installation guide',
      diff: 'Message: docs: update installation guide\n\nFiles changed (1 total):\nmodified docs: README.md',
    },
    {
      hash: 'p3q4r5s',
      message: 'Initial commit',
      diff: 'Message: Initial commit\n\nFiles changed (5 total):\nadded config: package.json\nadded docs: README.md\nadded code: src/index.ts\nadded config: tsconfig.json\nadded misc: .gitignore',
    },
  ];
}

async function runSyntheticTests(config: Config): Promise<void> {
  console.log('🧪 Running Synthetic Tests...');
  const mockCommits = generateMockCommits();

  console.log('\n--- Testing Data Extraction ---');
  console.log(`Extracted ${mockCommits.length} commits.`);
  console.table(mockCommits.map((c) => ({ hash: c.hash, message: c.message })));

  console.log('\n--- Testing AI Classification (Simulated) ---');
  const classifiedCommits = await processCommitsInAdaptiveBatches(config, mockCommits);
  console.table(
    classifiedCommits.map((c) => ({
      hash: c.hash,
      message: c.message,
      suggestedPrefix: c.suggestedPrefix,
      reason: c.reason,
    }))
  );

  console.log('\n--- Testing Rule Generation ---');
  const rateLimitManager = new RateLimitManager(config);
  await rateLimitManager.updateApiKeyInfo();
  const rules = await generateTransformationRules(config, classifiedCommits, rateLimitManager);

  console.log('\n--- Testing Rule Application ---');
  const rawCommits: RawCommit[] = mockCommits.map((c) => ({ hash: c.hash, message: c.message }));
  const appliedCommits = applyTransformRules(rawCommits, rules);
  console.table(
    appliedCommits.slice(0, 5).map((c) => ({
      hash: c.hash,
      message: c.message,
      suggestedPrefix: c.suggestedPrefix,
    }))
  );

  console.log('\n--- Testing Analysis Report ---');
  generateAnalysisReport(classifiedCommits, appliedCommits, rules);

  console.log('\n🎉 All synthetic tests completed!');
}

// =================================================================
// Git History Rewriting Functions
// =================================================================

interface RewriteOptions {
  dryRun: boolean;
  createBackup: boolean;
  interactive: boolean;
  maxCommits?: number;
  branchName?: string;
}

async function createGitBackup(repoPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupBranch = `backup-before-rewrite-${timestamp}`;

  try {
    await execAsync(`git branch ${backupBranch}`, { cwd: repoPath });
    console.log(`✅ Created backup branch: ${backupBranch}`);
    return backupBranch;
  } catch (error) {
    console.error('❌ Failed to create backup branch:', error);
    throw error;
  }
}

async function checkGitStatus(repoPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
    return stdout.trim() === '';
  } catch (error) {
    console.error('❌ Failed to check git status:', error);
    return false;
  }
}

async function getCurrentBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execAsync('git branch --show-current', { cwd: repoPath });
    return stdout.trim();
  } catch (error) {
    console.error('❌ Failed to get current branch:', error);
    throw error;
  }
}

async function rewriteCommitMessages(
  repoPath: string,
  finalCommits: ClassifiedCommit[],
  options: RewriteOptions
): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 GIT COMMIT MESSAGE REWRITING');
  console.log('='.repeat(80));

  // Safety checks
  const isClean = await checkGitStatus(repoPath);
  if (!isClean) {
    console.error('❌ Repository has uncommitted changes. Please commit or stash them first.');
    return;
  }

  const currentBranch = await getCurrentBranch(repoPath);
  console.log(`📍 Current branch: ${currentBranch}`);

  // Filter commits that need rewriting
  const commitsToRewrite = finalCommits.filter((commit) => {
    const hasPrefix = /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert):/i.test(
      commit.message
    );
    const needsRewrite = commit.suggestedPrefix && !hasPrefix;
    return needsRewrite;
  });

  if (commitsToRewrite.length === 0) {
    console.log('✅ No commits need rewriting - all are already in conventional format!');
    return;
  }

  console.log(`📝 Found ${commitsToRewrite.length} commits that need rewriting:`);
  console.table(
    commitsToRewrite.slice(0, 10).map((c) => ({
      hash: c.hash.substring(0, 8),
      current: c.message.substring(0, 50) + (c.message.length > 50 ? '...' : ''),
      suggested: `${c.suggestedPrefix}: ${c.message}`.substring(0, 50) + '...',
    }))
  );

  if (commitsToRewrite.length > 10) {
    console.log(`... and ${commitsToRewrite.length - 10} more commits`);
  }

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made');
    console.log('\nProposed changes:');
    commitsToRewrite.forEach((commit) => {
      const newMessage = commit.suggestedPrefix
        ? `${commit.suggestedPrefix}: ${commit.message.replace(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert):\s*/i, '')}`
        : commit.message;
      console.log(`${commit.hash}: "${commit.message}" → "${newMessage}"`);
    });
    return;
  }

  // Create backup
  let backupBranch = '';
  if (options.createBackup) {
    backupBranch = await createGitBackup(repoPath);
  }

  // Interactive confirmation - ALWAYS required for destructive operations unless explicitly disabled
  if (options.interactive) {
    console.log('\n⚠️  This will rewrite git history. This action cannot be undone easily.');
    console.log('📋 Summary:');
    console.log(`   • ${commitsToRewrite.length} commits will be rewritten`);
    console.log(`   • Current branch: ${currentBranch}`);
    if (backupBranch) {
      console.log(`   • Backup created: ${backupBranch}`);
    }

    console.log('\n❌ BLOCKING: Interactive confirmation required for destructive operations!');
    console.log('💡 To proceed, you would need to confirm this action in a real implementation.');
    console.log('💡 To skip confirmation, use --no-interactive (not recommended)');
    console.log('💡 For safety, use --dry-run to preview changes first');

    // Block execution until proper confirmation is implemented
    console.log('\n🛑 Aborting rewrite operation for safety. Use --dry-run to preview changes.');
    return;
  } else {
    // Non-interactive mode - provide detailed logging
    console.log('\n📝 NON-INTERACTIVE MODE: Detailed operation log:');
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log(`📍 Repository: ${repoPath}`);
    console.log(`🌿 Branch: ${currentBranch}`);
    console.log(`💾 Backup: ${backupBranch || 'NONE (--no-backup specified)'}`);
    console.log(`📊 Commits to rewrite: ${commitsToRewrite.length}`);

    console.log('\n📋 Detailed commit changes:');
    commitsToRewrite.forEach((commit, index) => {
      const newMessage = commit.suggestedPrefix
        ? `${commit.suggestedPrefix}: ${commit.message.replace(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert):\s*/i, '')}`
        : commit.message;
      console.log(`${index + 1}. ${commit.hash}`);
      console.log(`   FROM: "${commit.message}"`);
      console.log(`   TO:   "${newMessage}"`);
      console.log(`   REASON: ${commit.reason || 'No reason provided'}`);
    });

    console.log('\n⚠️  Proceeding with non-interactive rewrite...');
  }

  try {
    // Create a rebase script
    const rebaseScript = await createRebaseScript(repoPath, commitsToRewrite);

    // Execute the rebase
    await executeInteractiveRebase(repoPath, rebaseScript, options.maxCommits);

    console.log('\n✅ Commit message rewriting completed successfully!');
    console.log(`📊 Rewrote ${commitsToRewrite.length} commit messages`);

    if (backupBranch) {
      console.log(`🔄 To restore original state: git checkout ${backupBranch}`);
      console.log(`🗑️  To remove backup: git branch -D ${backupBranch}`);
    }
  } catch (error) {
    console.error('❌ Error during rebase:', error);
    if (backupBranch) {
      console.log(`🔄 Restoring from backup: ${backupBranch}`);
      try {
        await execAsync(`git checkout ${backupBranch}`, { cwd: repoPath });
        await execAsync(`git branch -D ${currentBranch}`, { cwd: repoPath });
        await execAsync(`git checkout -b ${currentBranch}`, { cwd: repoPath });
      } catch (restoreError) {
        console.error('❌ Failed to restore from backup:', restoreError);
      }
    }
    throw error;
  }
}

async function createRebaseScript(
  repoPath: string,
  commitsToRewrite: ClassifiedCommit[]
): Promise<string> {
  const scriptLines: string[] = [];

  // Create a map for quick lookup
  const rewriteMap = new Map(
    commitsToRewrite.map((c) => [
      c.hash,
      c.suggestedPrefix
        ? `${c.suggestedPrefix}: ${c.message.replace(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert):\s*/i, '')}`
        : c.message,
    ])
  );

  // Get the commit range for rebase
  const oldestCommit = commitsToRewrite[commitsToRewrite.length - 1];
  const { stdout: rebaseList } = await execAsync(
    `git log --reverse --oneline ${oldestCommit.hash}~1..HEAD`,
    { cwd: repoPath }
  );

  const commits = rebaseList
    .trim()
    .split('\n')
    .filter((line) => line.trim());

  for (const commitLine of commits) {
    const [hash] = commitLine.split(' ');
    const shortHash = hash.substring(0, 7);

    if (rewriteMap.has(shortHash) || rewriteMap.has(hash)) {
      scriptLines.push(`reword ${hash}`);
    } else {
      scriptLines.push(`pick ${hash}`);
    }
  }

  return scriptLines.join('\n');
}

async function executeInteractiveRebase(
  repoPath: string,
  rebaseScript: string,
  maxCommits?: number
): Promise<void> {
  console.log('🚀 Starting interactive rebase with your editor...');
  console.log('📝 Commits marked for reword will open in your editor for modification');

  try {
    // Write the rebase script to a temporary file
    const { writeFile, unlink } = await import('fs/promises');
    const { join } = await import('path');
    const { tmpdir } = await import('os');

    const tempScriptPath = join(tmpdir(), `git-rebase-script-${Date.now()}.txt`);
    await writeFile(tempScriptPath, rebaseScript);

    console.log(`📄 Rebase script written to: ${tempScriptPath}`);
    console.log('📝 Script preview:');
    console.log(rebaseScript.split('\n').slice(0, 10).join('\n'));
    if (rebaseScript.split('\n').length > 10) {
      console.log(`... and ${rebaseScript.split('\n').length - 10} more lines`);
    }

    // Set up environment for interactive rebase
    const env = {
      ...process.env,
      GIT_SEQUENCE_EDITOR: `cp "${tempScriptPath}" "$1"`, // Use our pre-built script
      GIT_EDITOR: process.env.GIT_EDITOR || process.env.EDITOR || 'nano', // Respect user's editor preference
    };

    // Find the oldest commit to rebase from
    const oldestCommitLine = rebaseScript.split('\n').find((line) => line.trim());
    if (!oldestCommitLine) {
      throw new Error('No commits found in rebase script');
    }

    const oldestCommitHash = oldestCommitLine.split(' ')[1];

    console.log('\n🎯 Starting interactive rebase...');
    console.log('💡 Your editor will open for each commit marked as "reword"');
    console.log('💡 Modify the commit messages as needed and save/close the editor');
    console.log('💡 Press Ctrl+C to abort the rebase if needed');

    // Execute the interactive rebase
    const { spawn } = await import('child_process');

    const rebaseProcess = spawn('git', ['rebase', '-i', `${oldestCommitHash}~1`], {
      cwd: repoPath,
      env,
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

    // Clean up temporary file
    try {
      await unlink(tempScriptPath);
    } catch (error) {
      console.warn('⚠️  Could not clean up temporary script file:', error);
    }
  } catch (error) {
    console.error('❌ Error during interactive rebase:', error);
    throw error;
  }
}

async function generateConventionalCommitsGuide(outputPath: string): Promise<void> {
  console.log('\n📚 Generating Conventional Commits Guide...');

  // The guide is already created as CONVENTIONAL_COMMITS_GUIDE.md
  // Here we could copy it to the target repository or create a customized version

  try {
    const guidePath = `${outputPath}/CONVENTIONAL_COMMITS_GUIDE.md`;
    await execAsync(`cp CONVENTIONAL_COMMITS_GUIDE.md "${guidePath}"`, {});
    console.log(`✅ Conventional Commits Guide saved to: ${guidePath}`);
  } catch (error) {
    console.warn('⚠️  Could not copy guide to target repository:', error);
    console.log('📖 Guide is available in the current directory as CONVENTIONAL_COMMITS_GUIDE.md');
  }
}

// =================================================================
// Main Execution Logic
// =================================================================

async function main(): Promise<void> {
  const config = await loadAndValidateConfig();
  const cliArgs = parseCommandLineArgs();

  if (cliArgs.help) {
    printUsage();
    return;
  }

  if (cliArgs.generateGuide) {
    const outputPath = cliArgs.repoPath || '.';
    await generateConventionalCommitsGuide(outputPath);
    return;
  }

  const repoPath = cliArgs.repoPath;
  if (!repoPath) {
    console.error('Please provide the path to the git repository as an argument.');
    console.error('Use --help for usage information.');
    process.exit(1);
  }

  console.log(`Analyzing git repository at: ${repoPath}`);
  console.log('Starting commit analysis script...');

  if (config.syntheticTestMode) {
    await runSyntheticTests(config);
    console.log(
      '\nSynthetic test run complete. To run on real data, set SYNTHETIC_TEST_MODE=false in .env'
    );
    return;
  }

  // Real data processing
  console.log('\n🔍 Fetching commit log...');
  const logEntries = await getGitLogEntries(repoPath, config.maxCommitsToAnalyze);
  const rawCommits = await parseCommitEntries(logEntries);
  console.log(`📋 Found ${rawCommits.length} commits`);

  console.log('\n📊 Enriching commits with diff summaries...');
  const enrichedCommits = await enrichCommitsWithDiffs(
    rawCommits,
    repoPath,
    config.diffConcurrency
  );

  console.log('\n🤖 Classifying commits with AI...');
  const classifiedCommits = await processCommitsInAdaptiveBatches(config, enrichedCommits);

  console.log('\n🔧 Generating transformation rules...');
  const rateLimitManager = new RateLimitManager(config);
  await rateLimitManager.updateApiKeyInfo();
  const rules = await generateTransformationRules(config, classifiedCommits, rateLimitManager);

  console.log('\n⚙️  Applying rules to all commits...');
  const allRawCommits = await parseCommitEntries(
    await getGitLogEntries(repoPath, config.maxCommitsToProcess)
  );
  const finalCommits = applyTransformRules(allRawCommits, rules);

  console.log('\n📊 Generating analysis report...');
  generateAnalysisReport(classifiedCommits, finalCommits, rules);

  // Handle rewrite operations - ONLY if explicitly requested
  if (cliArgs.rewrite || cliArgs.dryRun) {
    const rewriteOptions: RewriteOptions = {
      dryRun: cliArgs.dryRun || false,
      createBackup: cliArgs.backup !== false, // Default to true unless explicitly disabled
      interactive: cliArgs.interactive !== false, // Default to true unless explicitly disabled
      maxCommits: cliArgs.maxCommits,
      branchName: cliArgs.branchName,
    };

    await rewriteCommitMessages(repoPath, finalCommits, rewriteOptions);
  } else {
    // Default behavior is safe analysis only
    console.log('\n✅ Analysis complete! This was a safe, read-only operation.');
    console.log('💡 To preview potential changes, use: --dry-run');
    console.log('⚠️  To actually rewrite commit messages, use: --rewrite (DESTRUCTIVE!)');
  }

  // Generate guide if requested
  if (cliArgs.includeGuide) {
    await generateConventionalCommitsGuide(repoPath);
  }

  // Optional JSON output
  if (process.env.OUTPUT_JSON === 'true') {
    const jsonReport = {
      summary: {
        totalCommits: classifiedCommits.length,
        conformingCommits: classifiedCommits.filter((c) => c.conformingPrefix).length,
        nonConformingCommits: classifiedCommits.filter((c) => !c.conformingPrefix).length,
      },
      classifiedCommits,
      rules: rules.map((r) => ({
        pattern: r.pattern.source,
        replacement: r.replacement,
        reason: r.reason,
      })),
      finalCommits: finalCommits.slice(0, 50), // Limit output size
    };

    console.log('\n📄 JSON Report:');
    console.log(JSON.stringify(jsonReport, null, 2));
  }
}

// =================================================================
// Command Line Interface
// =================================================================

function parseCommandLineArgs(): {
  repoPath: string;
  maxCommits?: number;
  maxProcess?: number;
  batchSize?: number;
  concurrency?: number;
  syntheticTest?: boolean;
  help?: boolean;
  rewrite?: boolean;
  dryRun?: boolean;
  backup?: boolean;
  interactive?: boolean;
  branchName?: string;
  generateGuide?: boolean;
  includeGuide?: boolean;
} {
  const args = process.argv.slice(2);
  const result: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--max-commits' || arg === '-m') {
      result.maxCommits = parseInt(args[++i], 10);
    } else if (arg === '--max-process' || arg === '-p') {
      result.maxProcess = parseInt(args[++i], 10);
    } else if (arg === '--batch-size' || arg === '-b') {
      result.batchSize = parseInt(args[++i], 10);
    } else if (arg === '--concurrency' || arg === '-c') {
      result.concurrency = parseInt(args[++i], 10);
    } else if (arg === '--synthetic-test' || arg === '-t') {
      result.syntheticTest = true;
    } else if (arg === '--rewrite' || arg === '-r') {
      result.rewrite = true;
    } else if (arg === '--dry-run' || arg === '-d') {
      result.dryRun = true;
    } else if (arg === '--no-backup') {
      result.backup = false;
    } else if (arg === '--no-interactive') {
      result.interactive = false;
    } else if (arg === '--branch' || arg === '-B') {
      result.branchName = args[++i];
    } else if (arg === '--generate-guide' || arg === '-g') {
      result.generateGuide = true;
    } else if (arg === '--include-guide') {
      result.includeGuide = true;
    } else if (!arg.startsWith('-')) {
      // First non-flag argument is the repo path
      if (!result.repoPath) {
        result.repoPath = arg;
      }
    } else {
      console.warn(`⚠️  Unknown argument: ${arg}`);
    }
  }

  return result;
}

function printUsage(): void {
  console.log(`
🔍 Git Commit Analyzer & Rewriter

USAGE:
  npm start [REPO_PATH] [OPTIONS]
  node dist/commit-analyzer.js [REPO_PATH] [OPTIONS]

ARGUMENTS:
  REPO_PATH                 Path to the git repository to analyze

ANALYSIS OPTIONS:
  -h, --help               Show this help message
  -m, --max-commits NUM    Maximum commits to analyze (default: all)
  -p, --max-process NUM    Maximum commits to process for rules (default: all)
  -b, --batch-size NUM     Initial batch size for API calls (default: 16)
  -c, --concurrency NUM    Number of concurrent git operations (default: 4)
  -t, --synthetic-test     Run synthetic tests instead of real analysis

REWRITE OPTIONS:
  -r, --rewrite            Actually rewrite commit messages (DESTRUCTIVE!)
  -d, --dry-run            Show what would be changed without making changes
  --no-backup              Skip creating backup branch (not recommended)
  --no-interactive         Skip interactive confirmation prompts
  -B, --branch NAME        Specify target branch name for rewrite

DOCUMENTATION OPTIONS:
  -g, --generate-guide     Generate conventional commits guide only
  --include-guide          Include guide in target repository after analysis

EXAMPLES:
  # Analysis only (safe)
  npm start ../my-repo                           # Analyze all commits
  npm start ../my-repo -m 100                    # Analyze last 100 commits
  npm start ../my-repo -m 500 -b 32 -c 8        # Custom limits and performance
  
  # Rewriting (destructive - use with caution!)
  npm start ../my-repo --dry-run                 # Preview changes without applying
  npm start ../my-repo --rewrite                 # Actually rewrite commit messages
  npm start ../my-repo --rewrite --no-backup    # Rewrite without backup (dangerous!)
  
  # Documentation
  npm start ../my-repo --include-guide           # Analyze and copy guide to repo
  npm start --generate-guide                     # Generate guide only
  
  # Testing
  npm start -t                                   # Run synthetic tests

SAFETY NOTES:
  ⚠️  The --rewrite option modifies git history and is DESTRUCTIVE!
  ⚠️  Always use --dry-run first to preview changes
  ⚠️  Backup branches are created by default (disable with --no-backup)
  ⚠️  Only use on repositories you can afford to lose or have backed up
  ⚠️  Coordinate with your team before rewriting shared repository history

ENVIRONMENT VARIABLES:
  OPENROUTER_API_KEY       Your OpenRouter API key (required)
  SYNTHETIC_TEST_MODE      Set to 'true' to enable test mode
  MAX_COMMITS_TO_ANALYZE   Default max commits to analyze
  MAX_COMMITS_TO_PROCESS   Default max commits to process
  INITIAL_BATCH_SIZE       Default initial batch size
  DIFF_CONCURRENCY         Default concurrency for git operations

For more configuration options, see .env.example
`);
}

// Execute main function
if (require.main === module) {
  const cliArgs = parseCommandLineArgs();

  if (cliArgs.help) {
    printUsage();
    process.exit(0);
  }

  // Override environment variables with CLI arguments
  if (cliArgs.maxCommits !== undefined) {
    process.env.MAX_COMMITS_TO_ANALYZE = cliArgs.maxCommits.toString();
  }
  if (cliArgs.maxProcess !== undefined) {
    process.env.MAX_COMMITS_TO_PROCESS = cliArgs.maxProcess.toString();
  }
  if (cliArgs.batchSize !== undefined) {
    process.env.INITIAL_BATCH_SIZE = cliArgs.batchSize.toString();
  }
  if (cliArgs.concurrency !== undefined) {
    process.env.DIFF_CONCURRENCY = cliArgs.concurrency.toString();
  }
  if (cliArgs.syntheticTest) {
    process.env.SYNTHETIC_TEST_MODE = 'true';
  }

  // Set repo path as argument for main function
  if (cliArgs.repoPath) {
    process.argv[2] = cliArgs.repoPath;
  }

  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
