/**
 * Core commit-related type definitions
 */

export interface RawCommit {
  readonly hash: string;
  readonly message: string;
}

export interface EnrichedCommit extends RawCommit {
  readonly diff: string;
}

export interface ClassifiedCommit extends EnrichedCommit {
  readonly conformingPrefix?: string;
  readonly suggestedPrefix?: string;
  readonly reason?: string;
}

/**
 * Commit processing phases
 */
export type ProcessingPhase =
  | 'fetching'
  | 'enriching'
  | 'classifying'
  | 'generating_rules'
  | 'applying_rules'
  | 'complete';

/**
 * Discriminated union for commit states
 */
export type CommitState =
  | { type: 'raw'; data: RawCommit }
  | { type: 'enriched'; data: EnrichedCommit }
  | { type: 'classified'; data: ClassifiedCommit };

/**
 * Type guards for commit types
 */
export function isRawCommit(commit: unknown): commit is RawCommit {
  return (
    typeof commit === 'object' &&
    commit !== null &&
    'hash' in commit &&
    'message' in commit &&
    typeof (commit as RawCommit).hash === 'string' &&
    typeof (commit as RawCommit).message === 'string'
  );
}

export function isEnrichedCommit(commit: unknown): commit is EnrichedCommit {
  return (
    isRawCommit(commit) && 'diff' in commit && typeof (commit as EnrichedCommit).diff === 'string'
  );
}

export function isClassifiedCommit(commit: unknown): commit is ClassifiedCommit {
  return (
    isEnrichedCommit(commit) &&
    (typeof (commit as ClassifiedCommit).conformingPrefix === 'string' ||
      (commit as ClassifiedCommit).conformingPrefix === undefined) &&
    (typeof (commit as ClassifiedCommit).suggestedPrefix === 'string' ||
      (commit as ClassifiedCommit).suggestedPrefix === undefined) &&
    (typeof (commit as ClassifiedCommit).reason === 'string' ||
      (commit as ClassifiedCommit).reason === undefined)
  );
}

/**
 * Validation functions
 */
export function validateCommitHash(hash: string): boolean {
  return /^[a-f0-9]{7,40}$/i.test(hash);
}

/**
 * Utility functions for commit transformations
 */
export function rawToEnriched(raw: RawCommit, diff: string): EnrichedCommit {
  return { ...raw, diff };
}

export function enrichedToClassified(
  enriched: EnrichedCommit,
  classification: {
    conformingPrefix?: string;
    suggestedPrefix?: string;
    reason?: string;
  }
): ClassifiedCommit {
  return { ...enriched, ...classification };
}
