// High-Performance Result Pattern using Neverthrow
// Battle-tested, ergonomic, and feature-rich error handling

import {
  err,
  errAsync,
  Result as NeverthrowResult,
  ok,
  okAsync,
  ResultAsync,
} from 'neverthrow';

// Re-export Neverthrow types with backward compatibility
export type Result<T, E = Error> = NeverthrowResult<T, E>;

// Core constructors with backward compatibility wrapper
export const Ok = <T>(value: T) => {
  const result = ok(value);
  // Add backward compatibility property
  (result as typeof result & { success: boolean }).success = true;
  return result;
};

export const Err = <E>(error: E) => {
  const result = err(error);
  // Add backward compatibility property
  (result as typeof result & { success: boolean }).success = false;
  return result;
};

// Async constructors
export const OkAsync = okAsync;
export const ErrAsync = errAsync;

// Type guards (backwards compatible)
export const isOk = <T, E>(result: Result<T, E>): result is Result<T, never> =>
  result.isOk();

export const isErr = <T, E>(result: Result<T, E>): result is Result<never, E> =>
  result.isErr();

// Helper functions for safe property access (backwards compatible)
export const getValue = <T, E>(result: Result<T, E>): T => {
  if (result.isOk()) {
    return result.value;
  }
  throw new Error('Cannot get value from Err result');
};

export const getError = <T, E>(result: Result<T, E>): E => {
  if (result.isErr()) {
    return result.error;
  }
  throw new Error('Cannot get error from Ok result');
};

// Functional composition utilities (backwards compatible)
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  const mapped = result.map(fn);
  // Preserve success property for backward compatibility
  (mapped as typeof mapped & { success: boolean }).success = result.isOk();
  return mapped;
};

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  const mapped = result.andThen(fn);
  // Success property will be set by the returned result from fn
  return mapped;
};

export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  const mapped = result.mapErr(fn);
  // Preserve success property for backward compatibility
  (mapped as typeof mapped & { success: boolean }).success = result.isOk();
  return mapped;
};

// Safe unwrapping with defaults (backwards compatible)
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  result.unwrapOr(defaultValue);

export const unwrapOrElse = <T, E>(
  result: Result<T, E>,
  fn: (error: E) => T
): T => (result.isOk() ? result.value : fn(result.error));

// Convert from/to promises (enhanced with Neverthrow async)
export const fromPromise = <T, E = Error>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => E
): ResultAsync<T, E> => {
  return ResultAsync.fromPromise(
    promise,
    errorMapper ??
      ((error: unknown) => {
        return (error instanceof Error ? error : new Error(String(error))) as E;
      })
  );
};

export const toPromise = <T, E>(result: Result<T, E>): Promise<T> => {
  if (result.isOk()) {
    return Promise.resolve(result.value);
  }
  return Promise.reject(result.error);
};

// Collect results - convert array of results to result of array
export const collect = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  return NeverthrowResult.combine(results);
};

// Convert all results, collecting errors
export const collectWithErrors = <T, E>(
  results: Result<T, E>[]
): { successes: T[]; errors: E[] } => {
  const successes: T[] = [];
  const errors: E[] = [];

  for (const result of results) {
    if (result.isOk()) {
      successes.push(result.value);
    } else {
      errors.push(result.error);
    }
  }

  return { successes, errors };
};

// Async operations (enhanced with ResultAsync)
export const mapAsync = async <T, U, E = Error>(
  result: Result<T, E>,
  fn: (value: T) => Promise<U>
): Promise<Result<U, E | Error>> => {
  if (result.isOk()) {
    try {
      const data = await fn(result.value);
      return Ok(data);
    } catch (error) {
      return Err(
        error instanceof Error ? error : new Error(String(error))
      ) as Result<U, E | Error>;
    }
  }
  return result as unknown as Result<U, E | Error>;
};

export const flatMapAsync = async <T, U, E = Error>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>
): Promise<Result<U, E | Error>> => {
  if (result.isOk()) {
    try {
      return await fn(result.value);
    } catch (error) {
      return Err(
        error instanceof Error ? error : new Error(String(error))
      ) as Result<U, E | Error>;
    }
  }
  return result as unknown as Result<U, E | Error>;
};

// Advanced Neverthrow utilities
export const match = <T, E, A, B>(
  result: Result<T, E>,
  onOk: (value: T) => A,
  onErr: (error: E) => B
): A | B => result.match(onOk, onErr);

// Chain function for backwards compatibility with legacy tests
interface ChainResult<T, E> {
  unwrap: () => Result<T, E>;
  map: <U>(fn: (value: T) => U) => ChainResult<U, E>;
  flatMap: <U>(fn: (value: T) => Result<U, E>) => ChainResult<U, E>;
  mapError: <F>(fn: (error: E) => F) => ChainResult<T, F>;
}

export const chain = <T, E>(result: Result<T, E>): ChainResult<T, E> => {
  return {
    unwrap: () => result,
    map: <U>(fn: (value: T) => U) => chain(map(result, fn)),
    flatMap: <U>(fn: (value: T) => Result<U, E>) => chain(flatMap(result, fn)),
    mapError: <F>(fn: (error: E) => F) => chain(mapError(result, fn)),
  };
};

// ResultAsync utilities for better async handling
export const combineAsync = <T extends readonly unknown[], E>(
  results: readonly [...{ [K in keyof T]: ResultAsync<T[K], E> }]
): ResultAsync<T, E> => {
  return ResultAsync.combine(results) as unknown as ResultAsync<T, E>;
};

// Export ResultAsync for direct usage
export { ResultAsync };

// Export all Neverthrow utilities for advanced usage
export * from 'neverthrow';
