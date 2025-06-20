/**
 * Rule-related type definitions for commit message transformations
 */

export interface TransformRule {
  readonly pattern: RegExp;
  readonly replacement: string;
  readonly reason: string;
}

/**
 * Serializable version of TransformRule for JSON storage
 */
export interface SerializableTransformRule {
  readonly pattern: string;
  readonly flags: string;
  readonly replacement: string;
  readonly reason: string;
}

/**
 * Rule application result
 */
export interface RuleApplicationResult {
  readonly applied: boolean;
  readonly originalMessage: string;
  readonly transformedMessage: string;
  readonly appliedRule?: TransformRule;
}

/**
 * Rule generation context
 */
export interface RuleGenerationContext {
  readonly totalCommits: number;
  readonly nonConformingCommits: number;
  readonly mostCommonPatterns: Array<{
    pattern: string;
    count: number;
    suggestedPrefix: string;
  }>;
}

/**
 * Serialization utilities for TransformRule
 */
export function serializeTransformRule(rule: TransformRule): SerializableTransformRule {
  return {
    pattern: rule.pattern.source,
    flags: rule.pattern.flags,
    replacement: rule.replacement,
    reason: rule.reason,
  };
}

export function deserializeTransformRule(serializable: SerializableTransformRule): TransformRule {
  return {
    pattern: new RegExp(serializable.pattern, serializable.flags),
    replacement: serializable.replacement,
    reason: serializable.reason,
  };
}

export function serializeTransformRules(rules: TransformRule[]): SerializableTransformRule[] {
  return rules.map(serializeTransformRule);
}

export function deserializeTransformRules(rules: SerializableTransformRule[]): TransformRule[] {
  return rules.map(deserializeTransformRule);
}

/**
 * Type guard for TransformRule
 */
export function isTransformRule(rule: unknown): rule is TransformRule {
  return (
    typeof rule === 'object' &&
    rule !== null &&
    'pattern' in rule &&
    'replacement' in rule &&
    'reason' in rule &&
    rule.pattern instanceof RegExp &&
    typeof (rule as TransformRule).replacement === 'string' &&
    typeof (rule as TransformRule).reason === 'string'
  );
}

/**
 * Type guard for SerializableTransformRule
 */
export function isSerializableTransformRule(rule: unknown): rule is SerializableTransformRule {
  return (
    typeof rule === 'object' &&
    rule !== null &&
    'pattern' in rule &&
    'flags' in rule &&
    'replacement' in rule &&
    'reason' in rule &&
    typeof (rule as SerializableTransformRule).pattern === 'string' &&
    typeof (rule as SerializableTransformRule).flags === 'string' &&
    typeof (rule as SerializableTransformRule).replacement === 'string' &&
    typeof (rule as SerializableTransformRule).reason === 'string'
  );
}

/**
 * Utility to create a basic transform rule
 */
export function createTransformRule(
  pattern: string | RegExp,
  replacement: string,
  reason: string,
  flags: string = 'i'
): TransformRule {
  const regexPattern = typeof pattern === 'string' ? new RegExp(pattern, flags) : pattern;
  return {
    pattern: regexPattern,
    replacement,
    reason,
  };
}

/**
 * Conventional commit prefixes
 */
export const CONVENTIONAL_PREFIXES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'test',
  'chore',
  'build',
  'ci',
  'perf',
  'revert',
] as const;

export type ConventionalPrefix = (typeof CONVENTIONAL_PREFIXES)[number];

/**
 * Check if a string is a valid conventional commit prefix
 */
export function isConventionalPrefix(prefix: string): prefix is ConventionalPrefix {
  return CONVENTIONAL_PREFIXES.includes(prefix as ConventionalPrefix);
}
