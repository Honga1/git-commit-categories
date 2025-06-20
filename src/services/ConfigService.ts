/**
 * Configuration service for loading and validating application configuration
 */

import * as dotenv from 'dotenv';
import type { Config } from '../types/config';
import {
  validateRequiredProperties,
  isPositiveNumber,
  isNonNegativeNumber,
} from '../utils/validation';

export class ConfigService {
  private static instance: ConfigService | undefined;
  private cachedConfig: Config | null = null;

  private constructor() {
    // Load environment variables
    dotenv.config();
  }

  static getInstance(): ConfigService {
    ConfigService.instance ??= new ConfigService();
    return ConfigService.instance;
  }

  /**
   * Load and validate configuration from environment variables
   */
  async loadConfig(apiKey?: string): Promise<Config> {
    if (this.cachedConfig !== null && apiKey === undefined) {
      return this.cachedConfig;
    }

    const config: Config = {
      apiKey: apiKey ?? process.env['OPENROUTER_API_KEY'] ?? '',
      baseUrl:
        process.env['OPENROUTER_BASE_URL'] ?? 'https://openrouter.ai/api/v1/chat/completions',
      httpReferer: process.env['HTTP_REFERER'] ?? 'https://github.com/cline/cline',
      xTitle: process.env['X_TITLE'] ?? 'Cline Commit Analyzer',
      classificationModel:
        process.env['AI_CLASSIFICATION_MODEL'] ?? 'deepseek/deepseek-r1-distill-llama-70b',
      ruleGenerationModel:
        process.env['RULE_GENERATION_MODEL'] ?? 'deepseek/deepseek-r1-distill-llama-70b',
      maxCommitsToAnalyze:
        process.env['MAX_COMMITS_TO_ANALYZE'] !== undefined &&
        process.env['MAX_COMMITS_TO_ANALYZE'] !== ''
          ? parseInt(process.env['MAX_COMMITS_TO_ANALYZE'], 10)
          : null,
      maxCommitsToProcess:
        process.env['MAX_COMMITS_TO_PROCESS'] !== undefined &&
        process.env['MAX_COMMITS_TO_PROCESS'] !== ''
          ? parseInt(process.env['MAX_COMMITS_TO_PROCESS'], 10)
          : null,
      initialBatchSize: parseInt(process.env['INITIAL_BATCH_SIZE'] ?? '16', 10),
      minBatchSize: parseInt(process.env['MIN_BATCH_SIZE'] ?? '2', 10),
      maxBatchSize: parseInt(process.env['MAX_BATCH_SIZE'] ?? '128', 10),
      contextLimitThreshold: parseInt(process.env['CONTEXT_LIMIT_THRESHOLD'] ?? '30000', 10),
      maxRetries: parseInt(process.env['MAX_RETRIES'] ?? '3', 10),
      baseDelay: parseInt(process.env['BASE_DELAY'] ?? '500', 10),
      growthFactor: parseFloat(process.env['GROWTH_FACTOR'] ?? '1.5'),
      decayFactor: parseFloat(process.env['DECAY_FACTOR'] ?? '0.6'),
      successThreshold: parseInt(process.env['SUCCESS_THRESHOLD'] ?? '2', 10),
      diffConcurrency: parseInt(process.env['DIFF_CONCURRENCY'] ?? '4', 10),
      syntheticTestMode: process.env['SYNTHETIC_TEST_MODE'] === 'true',
    };

    const validation = this.validateConfig(config);
    if (validation.isValid === false) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    // Cache valid config
    if (apiKey === undefined) {
      this.cachedConfig = config;
    }

    return config;
  }

  /**
   * Validate configuration object
   */
  private validateConfig(config: Config): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required properties
    const requiredCheck = validateRequiredProperties(config as unknown as Record<string, unknown>, [
      'apiKey',
      'baseUrl',
      'classificationModel',
      'ruleGenerationModel',
    ]);

    if (!requiredCheck.isValid) {
      requiredCheck.missingProps.forEach((prop) => {
        errors.push(`Missing required configuration: ${String(prop)}`);
      });
    }

    // Validate API key format (basic check)
    if (config.apiKey !== '' && config.apiKey.length < 10) {
      errors.push('API key appears to be too short');
    }

    // Validate URL format
    try {
      new URL(config.baseUrl);
    } catch {
      errors.push('Invalid base URL format');
    }

    // Validate numeric ranges
    if (!isPositiveNumber(config.initialBatchSize)) {
      errors.push('Initial batch size must be a positive number');
    }

    if (!isPositiveNumber(config.minBatchSize)) {
      errors.push('Minimum batch size must be a positive number');
    }

    if (!isPositiveNumber(config.maxBatchSize)) {
      errors.push('Maximum batch size must be a positive number');
    }

    if (config.minBatchSize >= config.maxBatchSize) {
      errors.push('Minimum batch size must be less than maximum batch size');
    }

    if (
      config.initialBatchSize < config.minBatchSize ||
      config.initialBatchSize > config.maxBatchSize
    ) {
      errors.push('Initial batch size must be between min and max batch sizes');
    }

    if (!isPositiveNumber(config.contextLimitThreshold)) {
      errors.push('Context limit threshold must be a positive number');
    }

    if (!isNonNegativeNumber(config.maxRetries)) {
      errors.push('Max retries must be a non-negative number');
    }

    if (!isPositiveNumber(config.baseDelay)) {
      errors.push('Base delay must be a positive number');
    }

    if (!isPositiveNumber(config.growthFactor)) {
      errors.push('Growth factor must be a positive number');
    }

    if (!isPositiveNumber(config.decayFactor) || config.decayFactor >= 1) {
      errors.push('Decay factor must be a positive number less than 1');
    }

    if (!isPositiveNumber(config.successThreshold)) {
      errors.push('Success threshold must be a positive number');
    }

    if (!isPositiveNumber(config.diffConcurrency)) {
      errors.push('Diff concurrency must be a positive number');
    }

    // Validate optional numeric values
    if (
      config.maxCommitsToAnalyze !== null &&
      isPositiveNumber(config.maxCommitsToAnalyze) === false
    ) {
      errors.push('Max commits to analyze must be a positive number or null');
    }

    if (
      config.maxCommitsToProcess !== null &&
      isPositiveNumber(config.maxCommitsToProcess) === false
    ) {
      errors.push('Max commits to process must be a positive number or null');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update configuration with new values
   */
  updateConfig(updates: Partial<Config>): void {
    if (this.cachedConfig !== null) {
      this.cachedConfig = { ...this.cachedConfig, ...updates };
    }
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.cachedConfig = null;
  }

  /**
   * Get current configuration without loading (returns null if not loaded)
   */
  getCurrentConfig(): Config | null {
    return this.cachedConfig;
  }

  /**
   * Create configuration for testing
   */
  createTestConfig(overrides: Partial<Config> = {}): Config {
    const defaultConfig: Config = {
      apiKey: 'test-api-key-12345',
      baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
      httpReferer: 'https://github.com/test/test',
      xTitle: 'Test Commit Analyzer',
      classificationModel: 'test-model',
      ruleGenerationModel: 'test-model',
      maxCommitsToAnalyze: 100,
      maxCommitsToProcess: 50,
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
      syntheticTestMode: true,
    };

    return { ...defaultConfig, ...overrides };
  }

  /**
   * Export configuration for debugging/logging (with sensitive data masked)
   */
  exportSafeConfig(config?: Config): Record<string, unknown> {
    const currentConfig = config ?? this.cachedConfig;
    if (currentConfig === null) {
      return {};
    }

    return {
      ...currentConfig,
      apiKey:
        currentConfig.apiKey !== '' ? `${currentConfig.apiKey.substring(0, 8)}...` : 'not-set',
    };
  }

  /**
   * Validate specific configuration values
   */
  validateBatchSizes(
    initial: number,
    min: number,
    max: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (isPositiveNumber(initial) === false) {
      errors.push('Initial batch size must be positive');
    }

    if (isPositiveNumber(min) === false) {
      errors.push('Minimum batch size must be positive');
    }

    if (isPositiveNumber(max) === false) {
      errors.push('Maximum batch size must be positive');
    }

    if (min >= max) {
      errors.push('Minimum batch size must be less than maximum');
    }

    if (initial < min || initial > max) {
      errors.push('Initial batch size must be between min and max');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get environment-specific defaults
   */
  getEnvironmentDefaults(): Partial<Config> {
    const env = process.env['NODE_ENV'] ?? 'development';

    switch (env) {
      case 'test':
        return {
          syntheticTestMode: true,
          maxRetries: 1,
          baseDelay: 100,
          diffConcurrency: 2,
        };

      case 'development':
        return {
          maxCommitsToAnalyze: 50,
          maxCommitsToProcess: 25,
          initialBatchSize: 8,
        };

      case 'production':
        return {
          maxRetries: 5,
          baseDelay: 1000,
          diffConcurrency: 8,
        };

      default:
        return {};
    }
  }
}

// Export singleton instance
export const configService = ConfigService.getInstance();
