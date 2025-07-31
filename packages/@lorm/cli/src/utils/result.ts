import { Result, Success, Failure } from '../types.js';

export type { Result, Success, Failure };

/**
 * Create a successful result
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function failure<E>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Type guard to check if result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success;
}

/**
 * Type guard to check if result is a failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.success;
}

/**
 * Map over a successful result
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  return isSuccess(result) ? success(fn(result.data)) : result;
}

/**
 * Chain results together
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  return isSuccess(result) ? fn(result.data) : result;
}

/**
 * Map over a failed result
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return isFailure(result) ? failure(fn(result.error)) : result;
}

/**
 * Get the value from a result or throw the error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isSuccess(result)) {
    return result.data;
  }
  throw result.error;
}

/**
 * Get the value from a result or return a default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isSuccess(result) ? result.data : defaultValue;
}

/**
 * Convert a promise to a Result
 */
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const data = await promise;
    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Convert a function that might throw to a Result
 */
export function fromThrowable<T, Args extends unknown[]>(
  fn: (...args: Args) => T
): (...args: Args) => Result<T, Error> {
  return (...args: Args) => {
    try {
      return success(fn(...args));
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

/**
 * Combine multiple results into one
 */
export function combine<T extends readonly unknown[], E>(
  results: { [K in keyof T]: Result<T[K], E> }
): Result<T, E> {
  const values: unknown[] = [];
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (isFailure(result)) {
      return result;
    }
    values[i] = result.data;
  }
  
  return success(values as unknown as T);
}