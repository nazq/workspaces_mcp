// Comprehensive tests for Event Bus - Professional event-driven architecture
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AsyncEventBus } from '../../events/event-bus.js';
import type { Logger } from '../../interfaces/services.js';

// Mock logger for testing
const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
});

describe('AsyncEventBus', () => {
  let eventBus: AsyncEventBus;
  let logger: Logger;

  beforeEach(() => {
    logger = createMockLogger();
    eventBus = new AsyncEventBus(logger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('event emission', () => {
    it('should emit events to registered handlers', async () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);

      await eventBus.emit('test-event', { message: 'hello' });

      expect(handler).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should emit events to multiple handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      eventBus.on('test-event', handler3);

      await eventBus.emit('test-event', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
      expect(handler3).toHaveBeenCalledWith('data');
    });

    it('should handle different event types', async () => {
      const stringHandler = vi.fn();
      const objectHandler = vi.fn();
      const numberHandler = vi.fn();

      eventBus.on('string-event', stringHandler);
      eventBus.on('object-event', objectHandler);
      eventBus.on('number-event', numberHandler);

      await eventBus.emit('string-event', 'hello');
      await eventBus.emit('object-event', { key: 'value' });
      await eventBus.emit('number-event', 42);

      expect(stringHandler).toHaveBeenCalledWith('hello');
      expect(objectHandler).toHaveBeenCalledWith({ key: 'value' });
      expect(numberHandler).toHaveBeenCalledWith(42);
    });

    it('should emit to no handlers without error', async () => {
      await expect(
        eventBus.emit('non-existent-event', 'data')
      ).resolves.toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith(
        'No handlers registered for event: non-existent-event'
      );
    });

    it('should handle async handlers', async () => {
      const asyncHandler = vi.fn(async (data: string) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return `processed: ${data}`;
      });

      eventBus.on('async-event', asyncHandler);

      await eventBus.emit('async-event', 'test');

      expect(asyncHandler).toHaveBeenCalledWith('test');
    });
  });

  describe('event handler registration', () => {
    it('should register event handlers with on()', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('test-event', handler);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function that removes handler', async () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('test-event', handler);

      await eventBus.emit('test-event', 'before-unsubscribe');
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      await eventBus.emit('test-event', 'after-unsubscribe');
      expect(handler).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should register one-time handlers with once()', async () => {
      const handler = vi.fn();
      eventBus.once('test-event', handler);

      await eventBus.emit('test-event', 'first');
      await eventBus.emit('test-event', 'second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    it('should handle multiple once handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.once('test-event', handler1);
      eventBus.once('test-event', handler2);

      await eventBus.emit('test-event', 'data');
      await eventBus.emit('test-event', 'data2');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('event handler removal', () => {
    it('should remove specific handler with off()', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);

      await eventBus.emit('test-event', 'before-removal');
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      eventBus.off('test-event', handler1);

      await eventBus.emit('test-event', 'after-removal');
      expect(handler1).toHaveBeenCalledTimes(1); // Should not be called again
      expect(handler2).toHaveBeenCalledTimes(2); // Should still be called
    });

    it('should remove all handlers for event when no handler specified', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);

      await eventBus.emit('test-event', 'before-removal');
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      eventBus.off('test-event');

      await eventBus.emit('test-event', 'after-removal');
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle removing non-existent handlers gracefully', () => {
      const handler = vi.fn();

      expect(() => eventBus.off('non-existent-event', handler)).not.toThrow();
      expect(() => eventBus.off('test-event', handler)).not.toThrow();
    });

    it('should remove all listeners with removeAllListeners()', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('event1', handler1);
      eventBus.on('event2', handler2);

      await eventBus.emit('event1', 'data1');
      await eventBus.emit('event2', 'data2');

      expect(handler1).toHaveBeenCalledWith('data1');
      expect(handler2).toHaveBeenCalledWith('data2');

      eventBus.removeAllListeners();

      await eventBus.emit('event1', 'data1-after');
      await eventBus.emit('event2', 'data2-after');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should remove listeners for specific event with removeAllListeners(event)', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('event1', handler1);
      eventBus.on('event2', handler2);

      eventBus.removeAllListeners('event1');

      await eventBus.emit('event1', 'data1');
      await eventBus.emit('event2', 'data2');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith('data2');
    });
  });

  describe('error handling', () => {
    it('should isolate handler errors and continue execution', async () => {
      const workingHandler = vi.fn();
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const anotherWorkingHandler = vi.fn();

      eventBus.on('test-event', workingHandler);
      eventBus.on('test-event', errorHandler);
      eventBus.on('test-event', anotherWorkingHandler);

      await eventBus.emit('test-event', 'data');

      expect(workingHandler).toHaveBeenCalledWith('data');
      expect(errorHandler).toHaveBeenCalledWith('data');
      expect(anotherWorkingHandler).toHaveBeenCalledWith('data');

      expect(logger.error).toHaveBeenCalledWith(
        'Event handler failed for event "test-event":',
        expect.any(Error)
      );
    });

    it('should handle async handler errors', async () => {
      const workingHandler = vi.fn();
      const asyncErrorHandler = vi.fn(async () => {
        throw new Error('Async handler error');
      });

      eventBus.on('test-event', workingHandler);
      eventBus.on('test-event', asyncErrorHandler);

      await eventBus.emit('test-event', 'data');

      expect(workingHandler).toHaveBeenCalledWith('data');
      expect(asyncErrorHandler).toHaveBeenCalledWith('data');

      expect(logger.error).toHaveBeenCalledWith(
        'Event handler failed for event "test-event":',
        expect.any(Error)
      );
    });

    it('should continue emitting to other events after handler errors', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Error handler');
      });
      const successHandler = vi.fn();

      eventBus.on('error-event', errorHandler);
      eventBus.on('success-event', successHandler);

      await eventBus.emit('error-event', 'data');
      await eventBus.emit('success-event', 'data');

      expect(errorHandler).toHaveBeenCalledWith('data');
      expect(successHandler).toHaveBeenCalledWith('data');
    });
  });

  describe('memory leak prevention', () => {
    it('should warn when exceeding maximum listeners', () => {
      // Set a low max for testing
      eventBus.setMaxListeners(2);

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn(); // This should trigger warning

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      eventBus.on('test-event', handler3);

      expect(logger.warn).toHaveBeenCalledWith(
        'Maximum listeners (2) exceeded for event: test-event'
      );
    });

    it('should allow setting different max listeners', () => {
      eventBus.setMaxListeners(5);

      // Add 5 handlers - should not warn
      for (let i = 0; i < 5; i++) {
        eventBus.on('test-event', vi.fn());
      }

      expect(logger.warn).not.toHaveBeenCalled();

      // Add 6th handler - should warn
      eventBus.on('test-event', vi.fn());

      expect(logger.warn).toHaveBeenCalledWith(
        'Maximum listeners (5) exceeded for event: test-event'
      );
    });
  });

  describe('batch operations', () => {
    it('should emit multiple events in batch', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('event1', handler1);
      eventBus.on('event2', handler2);

      await eventBus.emitBatch([
        { event: 'event1', data: 'data1' },
        { event: 'event2', data: 'data2' },
        { event: 'event1', data: 'data1-again' },
      ]);

      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler1).toHaveBeenNthCalledWith(1, 'data1');
      expect(handler1).toHaveBeenNthCalledWith(2, 'data1-again');
      expect(handler2).toHaveBeenCalledWith('data2');
    });

    it('should handle errors in batch operations gracefully', async () => {
      const workingHandler = vi.fn();
      const errorHandler = vi.fn(() => {
        throw new Error('Batch error');
      });

      eventBus.on('working-event', workingHandler);
      eventBus.on('error-event', errorHandler);

      await eventBus.emitBatch([
        { event: 'working-event', data: 'data1' },
        { event: 'error-event', data: 'data2' },
        { event: 'working-event', data: 'data3' },
      ]);

      expect(workingHandler).toHaveBeenCalledTimes(2);
      expect(errorHandler).toHaveBeenCalledWith('data2');
      expect(logger.error).toHaveBeenCalledWith(
        'Event handler failed for event "error-event":',
        expect.any(Error)
      );
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide event statistics', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.on('event1', handler1);
      eventBus.on('event1', handler2);
      eventBus.on('event2', handler3);

      const stats = eventBus.getEventStats();

      expect(stats.totalEvents).toBe(2);
      expect(stats.totalHandlers).toBe(3);
      expect(stats.events).toEqual({
        event1: 2,
        event2: 1,
      });
    });

    it('should update statistics after handler removal', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('event1', handler1);
      const unsubscribe = eventBus.on('event1', handler2);

      let stats = eventBus.getEventStats();
      expect(stats.totalHandlers).toBe(2);
      expect(stats.events['event1']).toBe(2);

      unsubscribe();

      stats = eventBus.getEventStats();
      expect(stats.totalHandlers).toBe(1);
      expect(stats.events['event1']).toBe(1);
    });

    it('should handle statistics for events with no handlers', () => {
      const stats = eventBus.getEventStats();

      expect(stats.totalEvents).toBe(0);
      expect(stats.totalHandlers).toBe(0);
      expect(stats.events).toEqual({});
    });
  });

  describe('edge cases and performance', () => {
    it('should handle rapid event emissions', async () => {
      const handler = vi.fn();
      eventBus.on('rapid-event', handler);

      const emissions = [];
      for (let i = 0; i < 100; i++) {
        emissions.push(eventBus.emit('rapid-event', i));
      }

      await Promise.all(emissions);

      expect(handler).toHaveBeenCalledTimes(100);
    });

    it('should handle complex event data', async () => {
      const handler = vi.fn();
      eventBus.on('complex-event', handler);

      const complexData = {
        user: { id: 1, name: 'Test', permissions: ['read', 'write'] },
        metadata: { timestamp: new Date(), version: '1.0.0' },
        nested: { deeply: { nested: { value: 'found' } } },
        array: [1, 2, 3, { nested: true }],
        fn: () => 'function in data',
      };

      await eventBus.emit('complex-event', complexData);

      expect(handler).toHaveBeenCalledWith(complexData);
    });

    it('should handle null and undefined event data', async () => {
      const handler = vi.fn();
      eventBus.on('null-event', handler);

      await eventBus.emit('null-event', null);
      await eventBus.emit('null-event', undefined);

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, null);
      expect(handler).toHaveBeenNthCalledWith(2, undefined);
    });

    it('should maintain handler execution order', async () => {
      const executionOrder: number[] = [];

      const handler1 = vi.fn(() => executionOrder.push(1));
      const handler2 = vi.fn(() => executionOrder.push(2));
      const handler3 = vi.fn(() => executionOrder.push(3));

      eventBus.on('order-test', handler1);
      eventBus.on('order-test', handler2);
      eventBus.on('order-test', handler3);

      await eventBus.emit('order-test', 'data');

      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });
});
