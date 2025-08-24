// Result Pattern - Bulletproof Error Handling for Professional MCP Server
// Inspired by Rust's Result<T,E> - explicit, composable, and type-safe

export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Core constructors
export const Ok = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

export const Err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

// Type guards
export const isOk = <T, E>(
  result: Result<T, E>
): result is { success: true; data: T } => result.success;

export const isErr = <T, E>(
  result: Result<T, E>
): result is { success: false; error: E } => !result.success;

// Functional composition utilities
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  if (isOk(result)) {
    return Ok(fn(result.data));
  }
  return result;
};

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (isOk(result)) {
    return fn(result.data);
  }
  return result;
};

export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  if (isErr(result)) {
    return Err(fn(result.error));
  }
  return result;
};

// Utility for chaining operations - simplified
export const chain = <T, E>(result: Result<T, E>) => ({
  unwrap: () => result,
});

// Safe unwrapping with defaults
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  return isOk(result) ? result.data : defaultValue;
};

export const unwrapOrElse = <T, E>(
  result: Result<T, E>,
  fn: (error: E) => T
): T => {
  return isOk(result) ? result.data : fn(result.error);
};

// Convert from/to promises
export const fromPromise = async <T>(
  promise: Promise<T>
): Promise<Result<T, Error>> => {
  try {
    const data = await promise;
    return Ok(data);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const toPromise = <T, E>(result: Result<T, E>): Promise<T> => {
  if (isOk(result)) {
    return Promise.resolve(result.data);
  }
  return Promise.reject(result.error);
};

// Collect results - convert array of results to result of array
export const collect = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const successes: T[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    successes.push(result.data);
  }

  return Ok(successes);
};

// Convert all results, collecting errors
export const collectWithErrors = <T, E>(
  results: Result<T, E>[]
): { successes: T[]; errors: E[] } => {
  const successes: T[] = [];
  const errors: E[] = [];

  for (const result of results) {
    if (isOk(result)) {
      successes.push(result.data);
    } else {
      errors.push(result.error);
    }
  }

  return { successes, errors };
};

// Async operations on arrays of results
export const mapAsync = async <T, U, E = Error>(
  result: Result<T, E>,
  fn: (value: T) => Promise<U>
): Promise<Result<U, E | Error>> => {
  if (isOk(result)) {
    try {
      const data = await fn(result.data);
      return Ok(data);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
  return result;
};

export const flatMapAsync = async <T, U, E = Error>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>
): Promise<Result<U, E | Error>> => {
  if (isOk(result)) {
    try {
      return await fn(result.data);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
  return result;
};
