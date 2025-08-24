// Comprehensive tests for the Result pattern - Bulletproof error handling
import { describe, expect, it } from 'vitest';

import {
  chain,
  collect,
  collectWithErrors,
  Err,
  flatMap,
  flatMapAsync,
  fromPromise,
  isErr,
  isOk,
  map,
  mapAsync,
  mapError,
  Ok,
  toPromise,
  unwrapOr,
  unwrapOrElse,
  type Result,
} from '../../utils/result.js';

describe('Result Pattern', () => {
  describe('constructors', () => {
    it('should create Ok result', () => {
      const result = Ok('success');
      expect(isOk(result)).toBe(true);
      expect(isErr(result)).toBe(false);
      expect(result.success).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe('success');
      }
    });

    it('should create Err result', () => {
      const error = new Error('failure');
      const result = Err(error);
      expect(isOk(result)).toBe(false);
      expect(isErr(result)).toBe(true);
      expect(result.success).toBe(false);
      if (isErr(result)) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('type guards', () => {
    it('should correctly identify Ok results', () => {
      const okResult = Ok(42);
      const errResult = Err(new Error('test'));

      expect(isOk(okResult)).toBe(true);
      expect(isOk(errResult)).toBe(false);
    });

    it('should correctly identify Err results', () => {
      const okResult = Ok(42);
      const errResult = Err(new Error('test'));

      expect(isErr(okResult)).toBe(false);
      expect(isErr(errResult)).toBe(true);
    });

    it('should provide type narrowing', () => {
      const result: Result<number, Error> = Ok(42);

      if (isOk(result)) {
        // TypeScript should know result.data is number
        expect(typeof result.data).toBe('number');
        expect(result.data).toBe(42);
      }

      const errorResult: Result<number, Error> = Err(new Error('test'));

      if (isErr(errorResult)) {
        // TypeScript should know result.error is Error
        expect(errorResult.error).toBeInstanceOf(Error);
        expect(errorResult.error.message).toBe('test');
      }
    });
  });

  describe('map function', () => {
    it('should transform Ok value', () => {
      const result = Ok(5);
      const mapped = map(result, (x) => x * 2);

      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(10);
      }
    });

    it('should not transform Err value', () => {
      const error = new Error('test');
      const result = Err(error);
      const mapped = map(result, (x: number) => x * 2);

      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBe(error);
      }
    });

    it('should handle complex transformations', () => {
      const result = Ok({ name: 'test', value: 42 });
      const mapped = map(result, (obj) => ({
        ...obj,
        value: obj.value * 2,
        processed: true,
      }));

      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toEqual({
          name: 'test',
          value: 84,
          processed: true,
        });
      }
    });
  });

  describe('flatMap function', () => {
    it('should chain Ok results', () => {
      const result = Ok(5);
      const chained = flatMap(result, (x) => Ok(x * 2));

      expect(isOk(chained)).toBe(true);
      if (isOk(chained)) {
        expect(chained.data).toBe(10);
      }
    });

    it('should handle chained Err results', () => {
      const result = Ok(5);
      const error = new Error('chained error');
      const chained = flatMap(result, () => Err(error));

      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.error).toBe(error);
      }
    });

    it('should not execute on Err results', () => {
      const error = new Error('original error');
      const result = Err(error);
      let executed = false;

      const chained = flatMap(result, () => {
        executed = true;
        return Ok(42);
      });

      expect(executed).toBe(false);
      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.error).toBe(error);
      }
    });
  });

  describe('mapError function', () => {
    it('should transform Err value', () => {
      const originalError = new Error('original');
      const result = Err(originalError);
      const mapped = mapError(
        result,
        (error) => new Error(`Wrapped: ${error.message}`)
      );

      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error.message).toBe('Wrapped: original');
      }
    });

    it('should not transform Ok value', () => {
      const result = Ok(42);
      const mapped = mapError(result, () => new Error('should not see this'));

      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(42);
      }
    });
  });

  describe('chain function', () => {
    it('should provide chainable interface', () => {
      const result = Ok(42);
      const chained = chain(result);

      expect(chained).toHaveProperty('unwrap');
      expect(chained.unwrap()).toBe(result);
    });
  });

  describe('unwrapOr function', () => {
    it('should return value for Ok result', () => {
      const result = Ok(42);
      const value = unwrapOr(result, 0);
      expect(value).toBe(42);
    });

    it('should return default for Err result', () => {
      const result = Err(new Error('test'));
      const value = unwrapOr(result, 0);
      expect(value).toBe(0);
    });
  });

  describe('unwrapOrElse function', () => {
    it('should return value for Ok result', () => {
      const result = Ok(42);
      const value = unwrapOrElse(result, () => 0);
      expect(value).toBe(42);
    });

    it('should execute function for Err result', () => {
      const error = new Error('test error');
      const result = Err(error);
      const value = unwrapOrElse(result, (err) => `Error: ${err.message}`);
      expect(value).toBe('Error: test error');
    });
  });

  describe('Promise integration', () => {
    describe('fromPromise function', () => {
      it('should convert resolved promise to Ok', async () => {
        const promise = Promise.resolve(42);
        const result = await fromPromise(promise);

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.data).toBe(42);
        }
      });

      it('should convert rejected promise to Err', async () => {
        const error = new Error('test error');
        const promise = Promise.reject(error);
        const result = await fromPromise(promise);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error).toBe(error);
        }
      });

      it('should handle non-Error rejections', async () => {
        const promise = Promise.reject('string error');
        const result = await fromPromise(promise);

        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toBe('string error');
        }
      });
    });

    describe('toPromise function', () => {
      it('should convert Ok to resolved promise', async () => {
        const result = Ok(42);
        const promise = toPromise(result);

        await expect(promise).resolves.toBe(42);
      });

      it('should convert Err to rejected promise', async () => {
        const error = new Error('test error');
        const result = Err(error);
        const promise = toPromise(result);

        await expect(promise).rejects.toBe(error);
      });
    });
  });

  describe('collect function', () => {
    it('should collect all Ok results', () => {
      const results = [Ok(1), Ok(2), Ok(3)];
      const collected = collect(results);

      expect(isOk(collected)).toBe(true);
      if (isOk(collected)) {
        expect(collected.data).toEqual([1, 2, 3]);
      }
    });

    it('should return first Err result', () => {
      const error = new Error('test error');
      const results = [Ok(1), Err(error), Ok(3)];
      const collected = collect(results);

      expect(isErr(collected)).toBe(true);
      if (isErr(collected)) {
        expect(collected.error).toBe(error);
      }
    });

    it('should handle empty array', () => {
      const results: Result<number, Error>[] = [];
      const collected = collect(results);

      expect(isOk(collected)).toBe(true);
      if (isOk(collected)) {
        expect(collected.data).toEqual([]);
      }
    });
  });

  describe('collectWithErrors function', () => {
    it('should separate successes and errors', () => {
      const error1 = new Error('error 1');
      const error2 = new Error('error 2');
      const results = [Ok(1), Err(error1), Ok(3), Err(error2), Ok(5)];

      const { successes, errors } = collectWithErrors(results);

      expect(successes).toEqual([1, 3, 5]);
      expect(errors).toEqual([error1, error2]);
    });

    it('should handle all successes', () => {
      const results = [Ok(1), Ok(2), Ok(3)];
      const { successes, errors } = collectWithErrors(results);

      expect(successes).toEqual([1, 2, 3]);
      expect(errors).toEqual([]);
    });

    it('should handle all errors', () => {
      const error1 = new Error('error 1');
      const error2 = new Error('error 2');
      const results = [Err(error1), Err(error2)];

      const { successes, errors } = collectWithErrors(results);

      expect(successes).toEqual([]);
      expect(errors).toEqual([error1, error2]);
    });
  });

  describe('async utilities', () => {
    describe('mapAsync function', () => {
      it('should transform Ok value asynchronously', async () => {
        const result = Ok(5);
        const mapped = await mapAsync(result, async (x) => x * 2);

        expect(isOk(mapped)).toBe(true);
        if (isOk(mapped)) {
          expect(mapped.data).toBe(10);
        }
      });

      it('should not transform Err value', async () => {
        const error = new Error('test');
        const result = Err(error);
        const mapped = await mapAsync(result, async (x: number) => x * 2);

        expect(isErr(mapped)).toBe(true);
        if (isErr(mapped)) {
          expect(mapped.error).toBe(error);
        }
      });

      it('should handle async function errors', async () => {
        const result = Ok(5);
        const mapped = await mapAsync(result, async () => {
          throw new Error('async error');
        });

        expect(isErr(mapped)).toBe(true);
        if (isErr(mapped)) {
          expect(mapped.error.message).toBe('async error');
        }
      });
    });

    describe('flatMapAsync function', () => {
      it('should chain Ok results asynchronously', async () => {
        const result = Ok(5);
        const chained = await flatMapAsync(result, async (x) => Ok(x * 2));

        expect(isOk(chained)).toBe(true);
        if (isOk(chained)) {
          expect(chained.data).toBe(10);
        }
      });

      it('should handle async function errors', async () => {
        const result = Ok(5);
        const chained = await flatMapAsync(result, async () => {
          throw new Error('async error');
        });

        expect(isErr(chained)).toBe(true);
        if (isErr(chained)) {
          expect(chained.error.message).toBe('async error');
        }
      });

      it('should not execute on Err results', async () => {
        const error = new Error('original error');
        const result = Err(error);
        let executed = false;

        const chained = await flatMapAsync(result, async () => {
          executed = true;
          return Ok(42);
        });

        expect(executed).toBe(false);
        expect(isErr(chained)).toBe(true);
        if (isErr(chained)) {
          expect(chained.error).toBe(error);
        }
      });
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle null and undefined values', () => {
      const nullResult = Ok(null);
      const undefinedResult = Ok(undefined);

      expect(isOk(nullResult)).toBe(true);
      expect(isOk(undefinedResult)).toBe(true);

      if (isOk(nullResult)) {
        expect(nullResult.data).toBeNull();
      }

      if (isOk(undefinedResult)) {
        expect(undefinedResult.data).toBeUndefined();
      }
    });

    it('should handle complex nested transformations', () => {
      const result = Ok({
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      });

      const transformed = map(result, (data) =>
        data.users
          .filter((user) => user.age >= 30)
          .map((user) => ({ ...user, category: 'senior' }))
      );

      expect(isOk(transformed)).toBe(true);
      if (isOk(transformed)) {
        expect(transformed.data).toEqual([
          { name: 'Alice', age: 30, category: 'senior' },
        ]);
      }
    });

    it('should maintain error types through transformations', () => {
      class CustomError extends Error {
        constructor(
          public code: number,
          message: string
        ) {
          super(message);
        }
      }

      const customError = new CustomError(404, 'Not found');
      const result = Err(customError);

      const mapped = map(result, (x: any) => x * 2);
      const flatMapped = flatMap(mapped, () => Ok('success'));

      expect(isErr(flatMapped)).toBe(true);
      if (isErr(flatMapped)) {
        expect(flatMapped.error).toBeInstanceOf(CustomError);
        expect((flatMapped.error as CustomError).code).toBe(404);
      }
    });
  });
});
