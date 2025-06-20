/**
 * Cache-related type definitions
 */

import type { RawCommit, EnrichedCommit, ClassifiedCommit, ProcessingPhase } from './commits';
import type { SerializableTransformRule } from './rules';
import type { Config } from './config';

export interface GcaCache {
  readonly version: string;
  readonly timestamp: string;
  readonly repoPath: string;
  readonly repoHash: string; // Git HEAD hash to detect repo changes

  // Full config storage for restore functionality
  readonly config: Omit<Config, 'apiKey'> & { apiKeyHash: string };

  // Environment context for reproducibility
  readonly environment: {
    readonly nodeVersion: string;
    readonly platform: string;
    readonly cwd: string;
    readonly gitVersion?: string;
  };

  readonly progress: {
    phase: ProcessingPhase;
    totalCommits: number;
    processedCommits: number;
    lastProcessedHash?: string;
    startTime: string;
    lastUpdateTime: string;
  };

  readonly data: {
    rawCommits?: RawCommit[];
    enrichedCommits?: EnrichedCommit[];
    classifiedCommits?: ClassifiedCommit[];
    transformRules?: SerializableTransformRule[];
    finalCommits?: ClassifiedCommit[];
  };

  // State preservation for exact resumption
  readonly batchState?: {
    currentBatchSize: number;
    consecutiveSuccesses: number;
    consecutiveFailures: number;
    contextOverflowCount: number;
  };

  readonly rateLimitState?: {
    requestsThisMinute: number;
    minuteStartTime: number;
    dailyRequests: number;
    dayStartTime: number;
  };

  // Metadata for cache management
  readonly metadata: {
    cacheSize: number;
    compressionUsed?: boolean;
    checksums?: Record<string, string>;
  };
}

/**
 * Cache validation result
 */
export interface CacheValidationResult {
  readonly isValid: boolean;
  readonly reasons: string[];
  readonly cacheAge: number; // in milliseconds
  readonly repoChanged: boolean;
  readonly configChanged: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  readonly totalSize: number;
  readonly itemCount: number;
  readonly compressionRatio?: number;
  readonly ageInDays: number;
  readonly phases: {
    readonly completed: ProcessingPhase[];
    readonly current: ProcessingPhase;
    readonly remaining: ProcessingPhase[];
  };
}

/**
 * Cache operation errors
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly operation: 'load' | 'save' | 'validate' | 'clear',
    public readonly cachePath?: string
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

/**
 * Cache file metadata
 */
export interface CacheFileInfo {
  readonly path: string;
  readonly size: number;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
  readonly version: string;
  readonly phase: ProcessingPhase;
  readonly progress: {
    readonly processed: number;
    readonly total: number;
    readonly percentage: number;
  };
}

/**
 * Type guards for cache validation
 */
export function isValidCache(cache: unknown): cache is GcaCache {
  if (typeof cache !== 'object' || cache === null) {
    return false;
  }

  const cacheObj = cache as Record<string, unknown>;

  return (
    'version' in cacheObj &&
    'timestamp' in cacheObj &&
    'repoPath' in cacheObj &&
    'repoHash' in cacheObj &&
    'config' in cacheObj &&
    'environment' in cacheObj &&
    'progress' in cacheObj &&
    'data' in cacheObj &&
    'metadata' in cacheObj &&
    typeof (cacheObj as unknown as GcaCache).version === 'string' &&
    typeof (cacheObj as unknown as GcaCache).timestamp === 'string' &&
    typeof (cacheObj as unknown as GcaCache).repoPath === 'string' &&
    typeof (cacheObj as unknown as GcaCache).repoHash === 'string'
  );
}

export function isValidCacheProgress(progress: unknown): progress is GcaCache['progress'] {
  if (typeof progress !== 'object' || progress === null) {
    return false;
  }

  const progressObj = progress as Record<string, unknown>;

  return (
    'phase' in progressObj &&
    'totalCommits' in progressObj &&
    'processedCommits' in progressObj &&
    'startTime' in progressObj &&
    'lastUpdateTime' in progressObj &&
    typeof (progressObj as unknown as GcaCache['progress']).phase === 'string' &&
    typeof (progressObj as unknown as GcaCache['progress']).totalCommits === 'number' &&
    typeof (progressObj as unknown as GcaCache['progress']).processedCommits === 'number' &&
    typeof (progressObj as unknown as GcaCache['progress']).startTime === 'string' &&
    typeof (progressObj as unknown as GcaCache['progress']).lastUpdateTime === 'string'
  );
}

/**
 * Cache utility functions
 */
export function calculateCacheAge(cache: GcaCache): number {
  return Date.now() - new Date(cache.timestamp).getTime();
}

export function getCacheProgress(cache: GcaCache): number {
  if (cache.progress.totalCommits === 0) return 0;
  return (cache.progress.processedCommits / cache.progress.totalCommits) * 100;
}

export function getCacheStatistics(cache: GcaCache): CacheStatistics {
  const ageInMs = calculateCacheAge(cache);
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  const allPhases: ProcessingPhase[] = [
    'fetching',
    'enriching',
    'classifying',
    'generating_rules',
    'applying_rules',
    'complete',
  ];

  const currentPhaseIndex = allPhases.indexOf(cache.progress.phase);
  const completed = allPhases.slice(0, currentPhaseIndex);
  const remaining = allPhases.slice(currentPhaseIndex + 1);

  let itemCount = 0;
  if (cache.data.rawCommits !== undefined) itemCount += cache.data.rawCommits.length;
  if (cache.data.enrichedCommits !== undefined) itemCount += cache.data.enrichedCommits.length;
  if (cache.data.classifiedCommits !== undefined) itemCount += cache.data.classifiedCommits.length;
  if (cache.data.transformRules !== undefined) itemCount += cache.data.transformRules.length;
  if (cache.data.finalCommits !== undefined) itemCount += cache.data.finalCommits.length;

  return {
    totalSize: cache.metadata.cacheSize,
    itemCount,
    ageInDays,
    phases: {
      completed,
      current: cache.progress.phase,
      remaining,
    },
  };
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG = {
  version: '1.0.0',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxSize: 100 * 1024 * 1024, // 100MB
  compressionEnabled: false,
} as const;

/**
 * Cache file patterns
 */
export const CACHE_FILES = {
  DEFAULT: '.gca-cache.json',
  BACKUP: '.gca-cache.backup.json',
  LOCK: '.gca-cache.lock',
  PATTERN: /\.gca-cache.*\.json$/,
} as const;
