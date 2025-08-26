/**
 * Tests for BaseController
 */

import { describe, expect, it, vi } from 'vitest';

import { BaseController } from '../../../layers/controllers/base.js';

// Concrete implementation for testing
class TestController extends BaseController<'test/method'> {
  readonly method = 'test/method' as const;

  async handle(request: unknown): Promise<unknown> {
    return { result: 'success', request };
  }

  // Expose protected methods for testing
  public testValidateRequest(
    request: unknown,
    validator: (req: unknown) => boolean
  ): void {
    this.validateRequest(request, validator);
  }

  public testHandleError(error: unknown, context: string): never {
    this.handleError(error, context);
  }
}

describe('BaseController', () => {
  describe('constructor', () => {
    it('should create controller with correct method', () => {
      const controller = new TestController();
      expect(controller.method).toBe('test/method');
    });

    it('should initialize logger with correct name', () => {
      const controller = new TestController();
      // @ts-expect-error - accessing protected member for testing
      expect(controller.logger).toBeDefined();
    });
  });

  describe('handle method', () => {
    it('should be implemented by subclass', async () => {
      const controller = new TestController();
      const request = { test: true };

      const result = await controller.handle(request);

      expect(result).toEqual({ result: 'success', request });
    });
  });

  describe('validateRequest', () => {
    it('should pass validation when validator returns true', () => {
      const controller = new TestController();
      const request = { valid: true };
      const validator = (req: unknown) => true;

      expect(() => {
        controller.testValidateRequest(request, validator);
      }).not.toThrow();
    });

    it('should throw error when validator returns false', () => {
      const controller = new TestController();
      const request = { invalid: true };
      const validator = (req: unknown) => false;

      expect(() => {
        controller.testValidateRequest(request, validator);
      }).toThrow('Invalid request format for test/method');
    });

    it('should call validator with request', () => {
      const controller = new TestController();
      const request = { test: true };
      const validator = vi.fn().mockReturnValue(true);

      controller.testValidateRequest(request, validator);

      expect(validator).toHaveBeenCalledWith(request);
      expect(validator).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleError', () => {
    it('should throw Error instance as-is', () => {
      const controller = new TestController();
      const originalError = new Error('Test error');

      expect(() => {
        controller.testHandleError(originalError, 'test context');
      }).toThrow(originalError);
    });

    it('should convert string error to Error instance', () => {
      const controller = new TestController();

      expect(() => {
        controller.testHandleError('String error', 'test context');
      }).toThrow(Error);

      try {
        controller.testHandleError('String error', 'test context');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('String error');
      }
    });

    it('should convert non-string/non-Error to Error', () => {
      const controller = new TestController();
      const numberError = 123;

      expect(() => {
        controller.testHandleError(numberError, 'test context');
      }).toThrow(Error);

      try {
        controller.testHandleError(numberError, 'test context');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('123');
      }
    });

    it('should log error with context', () => {
      const controller = new TestController();

      // Mock the logger's error method
      const loggerSpy = vi
        .spyOn(controller['logger'], 'error')
        .mockImplementation(() => {});

      try {
        controller.testHandleError(new Error('Test error'), 'test context');
      } catch {
        // Expected to throw
      }

      expect(loggerSpy).toHaveBeenCalledWith('test context: Test error');
      loggerSpy.mockRestore();
    });

    it('should handle null/undefined errors', () => {
      const controller = new TestController();

      expect(() => {
        controller.testHandleError(null, 'test context');
      }).toThrow('null');

      expect(() => {
        controller.testHandleError(undefined, 'test context');
      }).toThrow('undefined');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle object errors', () => {
      const controller = new TestController();
      const objError = { message: 'object error', code: 500 };

      try {
        controller.testHandleError(objError, 'test context');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('[object Object]');
      }
    });

    it('should handle array errors', () => {
      const controller = new TestController();
      const arrayError = ['error', 'array'];

      try {
        controller.testHandleError(arrayError, 'test context');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('error,array');
      }
    });
  });
});
