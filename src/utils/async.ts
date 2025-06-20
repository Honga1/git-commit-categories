/**
 * Async utility functions and helpers
 */

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  backoffFactor: number = 2,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
      await sleep(delay);
    }
  }

  if (lastError !== undefined) {
    throw lastError;
  }
  // This path should not be reachable if the loop runs at least once,
  // but we throw an error to satisfy control flow analysis and type safety.
  throw new Error('RetryWithBackoff failed without capturing an error.');
}

/**
 * Timeout wrapper for promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Concurrency limiter for async operations
 */
export class ConcurrencyLimiter {
  private running = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async (): Promise<void> => {
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
            if (next !== undefined) {
              next();
            }
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

  getStats(): { running: number; queued: number; limit: number } {
    return {
      running: this.running,
      queued: this.queue.length,
      limit: this.limit,
    };
  }
}

/**
 * Batch process an array of items with concurrency control
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    concurrency?: number;
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { concurrency = 5, batchSize = items.length, onProgress } = options;
  const results: R[] = [];
  const limiter = new ConcurrencyLimiter(concurrency);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item, batchIndex) =>
      limiter.run(() => processor(item, i + batchIndex))
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (onProgress !== undefined) {
      onProgress(results.length, items.length);
    }
  }

  return results;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delayMs) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Execute functions in sequence with error handling
 */
export async function sequence<T>(
  tasks: Array<() => Promise<T>>,
  options: {
    stopOnError?: boolean;
    onError?: (error: Error, index: number) => void;
  } = {}
): Promise<Array<T | Error>> {
  const { stopOnError = false, onError } = options;
  const results: Array<T | Error> = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task === undefined) {
      results.push(new Error(`Task at index ${i} is undefined`));
      continue;
    }

    try {
      const result = await task();
      results.push(result);
    } catch (error) {
      const err = error as Error;
      results.push(err);

      if (onError !== undefined) {
        onError(err, i);
      }

      if (stopOnError) {
        break;
      }
    }
  }

  return results;
}

/**
 * Parallel execution with error collection
 */
export async function parallel<T>(
  tasks: Array<() => Promise<T>>,
  options: {
    concurrency?: number;
    onError?: (error: Error, index: number) => void;
  } = {}
): Promise<Array<T | Error>> {
  const { concurrency = Infinity, onError } = options;
  const limiter = new ConcurrencyLimiter(concurrency);

  const promises = tasks.map((task, index) =>
    limiter.run(async () => {
      try {
        return await task();
      } catch (error) {
        const err = error as Error;
        if (onError !== undefined) {
          onError(err, index);
        }
        return err;
      }
    })
  );

  return Promise.all(promises);
}

/**
 * Create a cancelable promise
 */
export interface CancelablePromise<T> extends Promise<T> {
  cancel: () => void;
  isCanceled: () => boolean;
}

export function makeCancelable<T>(promise: Promise<T>): CancelablePromise<T> {
  let canceled = false;

  const cancelablePromise = new Promise<T>((resolve, reject) => {
    promise.then(
      (value) => {
        if (canceled === false) {
          resolve(value);
        }
      },
      (error) => {
        if (canceled === false) {
          reject(error);
        }
      }
    );
  }) as CancelablePromise<T>;

  cancelablePromise.cancel = (): void => {
    canceled = true;
  };

  cancelablePromise.isCanceled = (): boolean => canceled;

  return cancelablePromise;
}

/**
 * Memoize async function results
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);

    const cachedPromise = cache.get(key);
    if (cachedPromise !== undefined) {
      return cachedPromise;
    }

    const promise = fn(...args) as ReturnType<T>;
    cache.set(key, promise);

    // Remove from cache on error to allow retries
    promise.catch(() => {
      cache.delete(key);
    });

    return promise;
  }) as unknown as T;
}
