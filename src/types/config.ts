/**
 * Configuration and environment-related type definitions
 */

export interface Config {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly httpReferer: string;
  readonly xTitle: string;
  readonly classificationModel: string;
  readonly ruleGenerationModel: string;
  readonly maxCommitsToAnalyze: number | null;
  readonly maxCommitsToProcess: number | null;
  readonly initialBatchSize: number;
  readonly minBatchSize: number;
  readonly maxBatchSize: number;
  readonly contextLimitThreshold: number;
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly growthFactor: number;
  readonly decayFactor: number;
  readonly successThreshold: number;
  readonly diffConcurrency: number;
  readonly syntheticTestMode: boolean;
}

/**
 * OAuth and authentication-related types
 */
export interface StoredCredentials {
  readonly apiKey: string;
  readonly expiresAt?: number;
  readonly userInfo?: {
    readonly email?: string;
    readonly name?: string;
  };
}

export interface OAuthTokenResponse {
  readonly key: string;
  readonly user?: {
    readonly email?: string;
    readonly name?: string;
  };
}

/**
 * Rate limiting and API management types
 */
export interface RateLimitInfo {
  requestsThisMinute: number;
  minuteStartTime: number;
  dailyRequests: number;
  dayStartTime: number;
  creditsRemaining: number | null;
  isFreeTier: boolean;
}

export interface ApiKeyInfo {
  readonly limit: number;
  readonly usage: number;
  readonly is_free_tier: boolean;
  readonly credits_remaining?: number;
}

/**
 * Batch processing configuration
 */
export interface BatchConfig {
  readonly initialSize: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly growthFactor: number;
  readonly decayFactor: number;
  readonly successThreshold: number;
  readonly contextLimitThreshold: number;
}

/**
 * Git operations configuration
 */
export interface GitConfig {
  readonly diffConcurrency: number;
  readonly maxDiffSize: number;
  readonly timeoutMs: number;
}

/**
 * LLM API configuration
 */
export interface LLMConfig {
  readonly baseUrl: string;
  readonly classificationModel: string;
  readonly ruleGenerationModel: string;
  readonly maxRetries: number;
  readonly baseDelay: number;
  readonly timeoutMs: number;
  readonly httpReferer: string;
  readonly xTitle: string;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  readonly enabled: boolean;
  readonly maxAge: number; // in milliseconds
  readonly maxSize: number; // in bytes
  readonly compressionEnabled: boolean;
}

/**
 * Environment variables mapping
 */
export interface EnvironmentVariables {
  readonly OPENROUTER_API_KEY?: string;
  readonly OPENROUTER_BASE_URL?: string;
  readonly HTTP_REFERER?: string;
  readonly X_TITLE?: string;
  readonly AI_CLASSIFICATION_MODEL?: string;
  readonly RULE_GENERATION_MODEL?: string;
  readonly MAX_COMMITS_TO_ANALYZE?: string;
  readonly MAX_COMMITS_TO_PROCESS?: string;
  readonly INITIAL_BATCH_SIZE?: string;
  readonly MIN_BATCH_SIZE?: string;
  readonly MAX_BATCH_SIZE?: string;
  readonly CONTEXT_LIMIT_THRESHOLD?: string;
  readonly MAX_RETRIES?: string;
  readonly BASE_DELAY?: string;
  readonly GROWTH_FACTOR?: string;
  readonly DECAY_FACTOR?: string;
  readonly SUCCESS_THRESHOLD?: string;
  readonly DIFF_CONCURRENCY?: string;
  readonly SYNTHETIC_TEST_MODE?: string;
  readonly OUTPUT_JSON?: string;
}

/**
 * Configuration validation errors
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Omit<Config, 'apiKey'> = {
  baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  httpReferer: 'https://github.com/cline/cline',
  xTitle: 'Cline Commit Analyzer',
  classificationModel: 'deepseek/deepseek-r1-distill-llama-70b',
  ruleGenerationModel: 'deepseek/deepseek-r1-distill-llama-70b',
  maxCommitsToAnalyze: null,
  maxCommitsToProcess: null,
  initialBatchSize: 16,
  minBatchSize: 2,
  maxBatchSize: 128,
  contextLimitThreshold: 30000,
  maxRetries: 3,
  baseDelay: 500,
  growthFactor: 1.5,
  decayFactor: 0.6,
  successThreshold: 2,
  diffConcurrency: 4,
  syntheticTestMode: false,
};

/**
 * Type guards for configuration validation
 */
export function isValidConfig(config: unknown): config is Config {
  return (
    typeof config === 'object' &&
    config !== null &&
    'apiKey' in config &&
    typeof (config as Config).apiKey === 'string' &&
    (config as Config).apiKey.length > 0
  );
}

export function isStoredCredentials(creds: unknown): creds is StoredCredentials {
  return (
    typeof creds === 'object' &&
    creds !== null &&
    'apiKey' in creds &&
    typeof (creds as StoredCredentials).apiKey === 'string'
  );
}

/**
 * Configuration utility functions
 */
export function parseIntegerConfig(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value.trim() === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function parseFloatConfig(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value.trim() === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function parseBooleanConfig(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') return defaultValue;
  return value.toLowerCase() === 'true';
}

export function parseNullableIntegerConfig(
  value: string | undefined,
  defaultValue: number | null
): number | null {
  if (value === undefined || value.trim() === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
