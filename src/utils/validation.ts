/**
 * Validation utility functions
 */

/**
 * Check if a value is defined and not null
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if a string is not empty
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a number is positive
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

/**
 * Check if a number is non-negative
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && !isNaN(value);
}

/**
 * Check if value is a valid integer
 */
export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Check if value is within a range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Check if a string matches an email pattern
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is valid (basic validation)
 */
export function isValidPath(path: string): boolean {
  if (isNonEmptyString(path) === false) return false;

  // Check for invalid characters (varies by OS, this is a basic check)
  const invalidChars = /[<>:"|?*]/;
  return invalidChars.test(path) === false;
}

/**
 * Check if a string is a valid git hash
 */
export function isValidGitHash(hash: string): boolean {
  if (isNonEmptyString(hash) === false) return false;

  // Git hashes are 40-character hexadecimal strings (or 7+ for short hashes)
  const gitHashRegex = /^[a-f0-9]{7,40}$/i;
  return gitHashRegex.test(hash);
}

/**
 * Check if a commit message follows conventional commits format
 */
export function isValidConventionalCommit(message: string): boolean {
  if (isNonEmptyString(message) === false) return false;

  const conventionalRegex =
    /^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?!?:\s.+/;
  return conventionalRegex.test(message);
}

/**
 * Validate configuration object has required properties
 */
export function validateRequiredProperties<T extends Record<string, unknown>>(
  obj: T,
  requiredProps: (keyof T)[]
): { isValid: boolean; missingProps: (keyof T)[] } {
  const missingProps: (keyof T)[] = [];

  for (const prop of requiredProps) {
    if (isDefined(obj[prop]) === false) {
      missingProps.push(prop);
    }
  }

  return {
    isValid: missingProps.length === 0,
    missingProps,
  };
}

/**
 * Validate an array has at least one element
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    value.constructor === Object
  );
}

/**
 * Sanitize a string by removing potentially harmful characters
 */
export function sanitizeString(input: string): string {
  return (
    input
      .replace(/[<>'"&]/g, '') // Remove basic HTML/script injection chars
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
      .trim()
  );
}

/**
 * Validate and sanitize a commit message
 */
export function validateCommitMessage(message: string): {
  isValid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];

  if (isNonEmptyString(message) === false) {
    errors.push('Commit message cannot be empty');
  }

  const sanitized = sanitizeString(message);

  if (sanitized.length > 500) {
    errors.push('Commit message is too long (max 500 characters)');
  }

  if (sanitized.length < 3) {
    errors.push('Commit message is too short (min 3 characters)');
  }

  // Check for common issues
  if (sanitized.endsWith('.')) {
    errors.push('Commit message should not end with a period');
  }

  if (sanitized !== sanitized.trim()) {
    errors.push('Commit message has leading or trailing whitespace');
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  };
}

/**
 * Create a validator function that checks multiple conditions
 */
export function createValidator<T>(
  validators: Array<{
    check: (value: T) => boolean;
    message: string;
  }>
): (value: T) => { isValid: boolean; errors: string[] } {
  return (value: T) => {
    const errors: string[] = [];

    for (const validator of validators) {
      if (validator.check(value) === false) {
        errors.push(validator.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };
}

/**
 * Validate file extension
 */
export function hasValidExtension(filename: string, allowedExtensions: string[]): boolean {
  if (isNonEmptyString(filename) === false) return false;

  const extension = filename.toLowerCase().split('.').pop();
  if (extension === undefined || extension.trim() === '') return false;

  return allowedExtensions.some((ext) => ext.toLowerCase() === extension);
}

/**
 * Check if a port number is valid
 */
export function isValidPort(port: unknown): port is number {
  return isInteger(port) && isInRange(port, 1, 65535);
}

/**
 * Validate environment variable value
 */
export function validateEnvVar(
  name: string,
  value: string | undefined,
  options: {
    required?: boolean;
    pattern?: RegExp;
    allowedValues?: string[];
  } = {}
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (options.required === true && isDefined(value) === false) {
    errors.push(`Environment variable ${name} is required`);
    return { isValid: false, errors };
  }

  if (isDefined(value) === false) {
    return { isValid: true, errors };
  }

  if (options.pattern !== undefined && options.pattern.test(value) === false) {
    errors.push(`Environment variable ${name} does not match required pattern`);
  }

  if (options.allowedValues !== undefined && options.allowedValues.includes(value) === false) {
    errors.push(`Environment variable ${name} must be one of: ${options.allowedValues.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validation result type
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  data?: T;
}

/**
 * Create a successful validation result
 */
export function createValidResult<T>(data?: T): ValidationResult<T> {
  const result: ValidationResult<T> = {
    isValid: true,
    errors: [],
  };

  if (data !== undefined) {
    result.data = data;
  }

  return result;
}

/**
 * Create a failed validation result
 */
export function createInvalidResult<T>(errors: string[], warnings?: string[]): ValidationResult<T> {
  const result: ValidationResult<T> = {
    isValid: false,
    errors,
  };

  if (warnings !== undefined && warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults<T>(results: ValidationResult<T>[]): ValidationResult<T[]> {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const validData: T[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
    if (result.warnings !== undefined) {
      allWarnings.push(...result.warnings);
    }
    if (result.isValid && result.data !== undefined) {
      validData.push(result.data);
    }
  }

  const result: ValidationResult<T[]> = {
    isValid: allErrors.length === 0,
    errors: allErrors,
    data: validData,
  };

  if (allWarnings.length > 0) {
    result.warnings = allWarnings;
  }

  return result;
}
