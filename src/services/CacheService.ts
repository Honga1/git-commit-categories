/**
 * Cache service for managing application cache operations
 */

import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { GcaCache } from '../types/cache';
import type { Config } from '../types/config';
import type { RawCommit, EnrichedCommit, ClassifiedCommit } from '../types/commits';
import type { TransformRule, SerializableTransformRule } from '../types/rules';
import type { GitInterface } from '../git/GitInterface';
import { fileExists, readJsonFile, writeJsonFile } from '../utils/file';

export class CacheService {
  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly DEFAULT_CACHE_FILE = '.gca-cache.json';
  private static readonly BACKUP_CACHE_FILE = '.gca-cache.backup.json';

  constructor(private readonly gitInterface: GitInterface) {}

  /**
   * Get cache file path
   */
  getCacheFilePath(customPath?: string): string {
    if (customPath !== undefined && customPath.trim() !== '') {
      return path.resolve(customPath);
    }
    return path.resolve(CacheService.DEFAULT_CACHE_FILE);
  }

  /**
   * Load cache from file
   */
  async loadCache(cachePath?: string): Promise<GcaCache | null> {
    try {
      const filePath = this.getCacheFilePath(cachePath);

      if (!(await fileExists(filePath))) {
        console.log('📂 No existing cache found');
        return null;
      }

      const cache: GcaCache = await readJsonFile(filePath);

      // Validate cache version
      if (cache.version !== CacheService.CACHE_VERSION) {
        console.log(
          `⚠️  Cache version mismatch. Expected ${CacheService.CACHE_VERSION}, got ${cache.version}`
        );
        return null;
      }

      console.log(`📂 Loaded cache from ${filePath}`);
      console.log(`🕒 Cache created: ${new Date(cache.timestamp).toLocaleString()}`);
      console.log(
        `📊 Progress: ${cache.progress.phase} (${cache.progress.processedCommits}/${cache.progress.totalCommits})`
      );

      return cache;
    } catch (error) {
      console.warn('⚠️  Error loading cache:', error);
      return null;
    }
  }

  /**
   * Save cache to file
   */
  async saveCache(cache: GcaCache, cachePath?: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(cachePath);

      // Update metadata
      cache.metadata.cacheSize = Buffer.byteLength(JSON.stringify(cache), 'utf8');
      cache.progress.lastUpdateTime = new Date().toISOString();

      // Create backup of existing cache
      try {
        const backupPath = this.getCacheFilePath(CacheService.BACKUP_CACHE_FILE);
        if (await fileExists(filePath)) {
          await fs.copyFile(filePath, backupPath);
        }
      } catch (error) {
        // Backup failed, but continue with save
        console.warn('⚠️  Could not create cache backup:', error);
      }

      // Save cache
      await writeJsonFile(filePath, cache);

      console.log(
        `💾 Cache saved to ${filePath} (${Math.round(cache.metadata.cacheSize / 1024)}KB)`
      );
    } catch (error) {
      console.error('❌ Error saving cache:', error);
      throw error;
    }
  }

  /**
   * Validate cache compatibility
   */
  async validateCache(cache: GcaCache, repoPath: string, config: Config): Promise<boolean> {
    try {
      // Check if repository has changed
      const currentRepoHash = await this.getRepoHash(repoPath);
      if (cache.repoHash !== currentRepoHash) {
        console.log('⚠️  Repository has changed since cache was created');
        return false;
      }

      // Check config compatibility (key settings)
      const configHash = this.createConfigHash(config);
      const cacheConfigHash = this.createConfigHash({
        ...cache.config,
        apiKey: config.apiKey, // Use current API key
      } as Config);

      if (configHash !== cacheConfigHash) {
        console.log('⚠️  Configuration has changed since cache was created');
        return false;
      }

      // Check if cache is too old (7 days)
      const cacheAge = Date.now() - new Date(cache.timestamp).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (cacheAge > maxAge) {
        console.log('⚠️  Cache is too old (>7 days)');
        return false;
      }

      return true;
    } catch (error) {
      console.warn('⚠️  Error validating cache:', error);
      return false;
    }
  }

  /**
   * Create new cache instance
   */
  async createCache(repoPath: string, config: Config): Promise<GcaCache> {
    const repoHash = await this.getRepoHash(repoPath);
    const { version: nodeVersion, platform } = process;

    return {
      version: CacheService.CACHE_VERSION,
      timestamp: new Date().toISOString(),
      repoPath,
      repoHash,
      config: this.sanitizeConfig(config),
      environment: {
        nodeVersion,
        platform,
        cwd: process.cwd(),
        gitVersion: await this.getGitVersion(),
      },
      progress: {
        phase: 'fetching',
        totalCommits: 0,
        processedCommits: 0,
        startTime: new Date().toISOString(),
        lastUpdateTime: new Date().toISOString(),
      },
      data: {},
      metadata: {
        cacheSize: 0,
      },
    };
  }

  /**
   * Clear cache file
   */
  async clearCache(cachePath?: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(cachePath);
      await fs.unlink(filePath);
      console.log(`🗑️  Cache cleared: ${filePath}`);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code !== 'ENOENT') {
        console.warn('⚠️  Error clearing cache:', error);
      }
    }
  }

  /**
   * List available cache files
   */
  async listCaches(): Promise<void> {
    try {
      const files = await fs.readdir('.');
      const cacheFiles = files.filter(
        (f: string) => f.endsWith('.gca-cache.json') || f === '.gca-cache.json'
      );

      if (cacheFiles.length === 0) {
        console.log('📂 No cache files found');
        return;
      }

      console.log('📂 Available cache files:');
      for (const file of cacheFiles) {
        try {
          const filePath = path.resolve(file);
          const stats = await fs.stat(filePath);
          const cache = await this.loadCache(filePath);

          console.log(`\n📄 ${file}`);
          console.log(`   Size: ${Math.round(stats.size / 1024)}KB`);
          console.log(`   Modified: ${stats.mtime.toLocaleString()}`);

          if (cache !== null) {
            console.log(`   Repo: ${cache.repoPath}`);
            console.log(`   Phase: ${cache.progress.phase}`);
            console.log(
              `   Progress: ${cache.progress.processedCommits}/${cache.progress.totalCommits}`
            );
          }
        } catch (error) {
          console.log(`   ❌ Error reading cache: ${error}`);
        }
      }
    } catch (error) {
      console.error('❌ Error listing caches:', error);
    }
  }

  /**
   * Get cache information
   */
  async getCacheInfo(cachePath: string): Promise<Record<string, unknown> | null> {
    const cache = await this.loadCache(cachePath);
    if (cache === null) {
      return null;
    }

    return {
      file: cachePath,
      created: new Date(cache.timestamp).toLocaleString(),
      repository: cache.repoPath,
      repoHash: cache.repoHash,
      phase: cache.progress.phase,
      progress: `${cache.progress.processedCommits}/${cache.progress.totalCommits}`,
      size: `${Math.round(cache.metadata.cacheSize / 1024)}KB`,
      configHash: cache.config.apiKeyHash,
      environment: `${cache.environment.platform} ${cache.environment.nodeVersion}`,
    };
  }

  /**
   * Update cache progress
   */
  updateCacheProgress(
    cache: GcaCache,
    phase: GcaCache['progress']['phase'],
    processedCommits?: number,
    totalCommits?: number
  ): void {
    cache.progress.phase = phase;
    if (processedCommits !== undefined) {
      cache.progress.processedCommits = processedCommits;
    }
    if (totalCommits !== undefined) {
      cache.progress.totalCommits = totalCommits;
    }
    cache.progress.lastUpdateTime = new Date().toISOString();
  }

  /**
   * Store raw commits in cache
   */
  storeRawCommits(cache: GcaCache, commits: RawCommit[]): void {
    cache.data.rawCommits = commits;
    this.updateCacheProgress(cache, 'enriching', 0, commits.length);
  }

  /**
   * Store enriched commits in cache
   */
  storeEnrichedCommits(cache: GcaCache, commits: EnrichedCommit[]): void {
    cache.data.enrichedCommits = commits;
    this.updateCacheProgress(cache, 'classifying', commits.length);
  }

  /**
   * Store classified commits in cache
   */
  storeClassifiedCommits(cache: GcaCache, commits: ClassifiedCommit[]): void {
    cache.data.classifiedCommits = commits;
    this.updateCacheProgress(cache, 'generating_rules', commits.length);
  }

  /**
   * Store transform rules in cache
   */
  storeTransformRules(cache: GcaCache, rules: TransformRule[]): void {
    cache.data.transformRules = this.serializeTransformRules(rules);
    this.updateCacheProgress(cache, 'applying_rules');
  }

  /**
   * Store final commits in cache
   */
  storeFinalCommits(cache: GcaCache, commits: ClassifiedCommit[]): void {
    cache.data.finalCommits = commits;
    this.updateCacheProgress(cache, 'complete', commits.length);
  }

  /**
   * Serialize transform rules for storage
   */
  serializeTransformRules(rules: TransformRule[]): SerializableTransformRule[] {
    return rules.map((rule) => ({
      pattern: rule.pattern.source,
      flags: rule.pattern.flags,
      replacement: rule.replacement,
      reason: rule.reason,
    }));
  }

  /**
   * Deserialize transform rules from storage
   */
  deserializeTransformRules(rules: SerializableTransformRule[]): TransformRule[] {
    return rules.map((rule) => ({
      pattern: new RegExp(rule.pattern, rule.flags),
      replacement: rule.replacement,
      reason: rule.reason,
    }));
  }

  /**
   * Get repository hash for cache validation
   */
  private async getRepoHash(repoPath: string): Promise<string> {
    try {
      return await this.gitInterface.getCurrentHead(repoPath);
    } catch (error) {
      console.warn('⚠️  Could not get repository hash:', error);
      return 'unknown';
    }
  }

  /**
   * Get git version for environment tracking
   */
  private async getGitVersion(): Promise<string> {
    try {
      return await this.gitInterface.getGitVersion();
    } catch (_error) {
      return 'unknown';
    }
  }

  /**
   * Sanitize config for storage (remove sensitive data)
   */
  private sanitizeConfig(config: Config): Omit<Config, 'apiKey'> & { apiKeyHash: string } {
    const { apiKey, ...sanitizedConfig } = config;
    return {
      ...sanitizedConfig,
      apiKeyHash: createHash('sha256').update(apiKey).digest('hex').substring(0, 16),
    };
  }

  /**
   * Create configuration hash for validation
   */
  private createConfigHash(config: Config): string {
    const relevantConfig = {
      classificationModel: config.classificationModel,
      ruleGenerationModel: config.ruleGenerationModel,
      maxCommitsToAnalyze: config.maxCommitsToAnalyze,
      maxCommitsToProcess: config.maxCommitsToProcess,
      initialBatchSize: config.initialBatchSize,
      contextLimitThreshold: config.contextLimitThreshold,
    };
    return createHash('sha256')
      .update(JSON.stringify(relevantConfig))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Check if cache can be resumed from a specific phase
   */
  canResumeFromPhase(cache: GcaCache, phase: GcaCache['progress']['phase']): boolean {
    const phaseOrder: GcaCache['progress']['phase'][] = [
      'fetching',
      'enriching',
      'classifying',
      'generating_rules',
      'applying_rules',
      'complete',
    ];

    const currentPhaseIndex = phaseOrder.indexOf(cache.progress.phase);
    const targetPhaseIndex = phaseOrder.indexOf(phase);

    return currentPhaseIndex >= targetPhaseIndex;
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(cache: GcaCache): Record<string, unknown> {
    const startTime = new Date(cache.progress.startTime).getTime();
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;

    return {
      phase: cache.progress.phase,
      progress: {
        completed: cache.progress.processedCommits,
        total: cache.progress.totalCommits,
        percentage:
          cache.progress.totalCommits > 0
            ? Math.round((cache.progress.processedCommits / cache.progress.totalCommits) * 100)
            : 0,
      },
      timing: {
        startTime: cache.progress.startTime,
        lastUpdate: cache.progress.lastUpdateTime,
        elapsedTime: Math.round(elapsedTime / 1000), // seconds
      },
      data: {
        rawCommits: cache.data.rawCommits?.length ?? 0,
        enrichedCommits: cache.data.enrichedCommits?.length ?? 0,
        classifiedCommits: cache.data.classifiedCommits?.length ?? 0,
        transformRules: cache.data.transformRules?.length ?? 0,
        finalCommits: cache.data.finalCommits?.length ?? 0,
      },
      metadata: {
        size: cache.metadata.cacheSize,
        sizeFormatted: `${Math.round(cache.metadata.cacheSize / 1024)}KB`,
        version: cache.version,
      },
    };
  }
}
