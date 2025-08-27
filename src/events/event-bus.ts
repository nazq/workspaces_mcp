// High-Performance Event Bus using EventEmitter3
// Battle-tested, memory-efficient, and performant event handling

import { EventEmitter } from 'eventemitter3';

import type { EventBus, EventHandler, Logger } from '../interfaces/services.js';
import { createChildLogger } from '../utils/logger.js';

import type { EventMap } from './events.js';

export class AsyncEventBus implements EventBus {
  private emitter: EventEmitter;
  private logger: Logger;
  // Map to track wrapped handlers for proper removal
  private handlerMap = new WeakMap<
    EventHandler<EventMap[keyof EventMap]>,
    EventHandler<EventMap[keyof EventMap]>
  >();

  constructor(logger?: Logger) {
    this.emitter = new EventEmitter();
    this.logger = logger ?? createChildLogger('event-bus');

    // EventEmitter3 doesn't have setMaxListeners method - it handles this automatically
    // this.emitter.setMaxListeners(100);

    // Enable error handling
    this.emitter.on('error', (error, event) => {
      this.logger.error(`Event error for "${event}":`, error);
    });
  }

  async emit<T>(event: string, data: T): Promise<void> {
    const listenerCount = this.emitter.listenerCount(event);

    if (listenerCount === 0) {
      this.logger.debug(`No handlers registered for event: ${event}`);
      return;
    }

    this.logger.debug(`Emitting event: ${event} to ${listenerCount} handlers`);

    try {
      // Use EventEmitter3's native emit to preserve once() behavior
      this.emitter.emit(event, data);

      // Since our wrapped handlers are async, we need to wait for them
      // But EventEmitter3 handles once() removal automatically
    } catch (error) {
      this.logger.error(`Failed to emit event "${event}":`, error);
    }
  }

  on<T>(event: string, handler: EventHandler<T>): () => void {
    // Wrap handler to ensure async compatibility
    const wrappedHandler = async (data: T) => {
      try {
        await handler(data);
      } catch (error) {
        this.logger.error(`Event handler failed for event "${event}":`, error);
      }
    };

    // Store mapping for proper removal
    this.handlerMap.set(
      handler as EventHandler<EventMap[keyof EventMap]>,
      wrappedHandler as EventHandler<EventMap[keyof EventMap]>
    );

    this.emitter.on(event, wrappedHandler);

    const listenerCount = this.emitter.listenerCount(event);
    this.logger.debug(
      `Handler registered for event: ${event} (${listenerCount} total)`
    );

    // Return unsubscribe function
    return () => {
      this.emitter.off(event, wrappedHandler);
      this.handlerMap.delete(handler as EventHandler<EventMap[keyof EventMap]>);
      const remainingCount = this.emitter.listenerCount(event);
      this.logger.debug(
        `Handler unregistered for event: ${event} (${remainingCount} remaining)`
      );
    };
  }

  once<T>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler = async (data: T) => {
      try {
        await handler(data);
      } catch (error) {
        this.logger.error(
          `One-time event handler failed for event "${event}":`,
          error
        );
      } finally {
        // Clean up mapping after one-time execution
        this.handlerMap.delete(
          handler as EventHandler<EventMap[keyof EventMap]>
        );
      }
    };

    // Store mapping for proper removal
    this.handlerMap.set(
      handler as EventHandler<EventMap[keyof EventMap]>,
      wrappedHandler as EventHandler<EventMap[keyof EventMap]>
    );

    this.emitter.once(event, wrappedHandler);
  }

  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      // Remove all handlers for event
      this.emitter.removeAllListeners(event);
      this.logger.debug(`All handlers removed for event: ${event}`);
      return;
    }

    // Find the wrapped handler if it exists
    const wrappedHandler = this.handlerMap.get(
      handler as EventHandler<EventMap[keyof EventMap]>
    );
    if (wrappedHandler) {
      this.emitter.off(event, wrappedHandler);
      this.handlerMap.delete(handler as EventHandler<EventMap[keyof EventMap]>);
    } else {
      // Fallback to original handler (shouldn't happen with proper usage)
      this.emitter.off(event, handler);
    }

    const remainingCount = this.emitter.listenerCount(event);
    this.logger.debug(
      `Handler removed for event: ${event} (${remainingCount} remaining)`
    );
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.emitter.removeAllListeners(event);
      this.logger.debug(`All listeners removed for event: ${event}`);
    } else {
      const eventNames = this.emitter.eventNames();
      this.emitter.removeAllListeners();
      this.logger.debug(
        `All listeners removed for ${eventNames.length} events`
      );
    }
  }

  // Utility methods for debugging and monitoring
  getListenerCount(event?: string): number {
    if (event) {
      return this.emitter.listenerCount(event);
    }
    return this.emitter
      .eventNames()
      .reduce(
        (sum, eventName) => sum + this.emitter.listenerCount(eventName),
        0
      );
  }

  getRegisteredEvents(): string[] {
    return this.emitter.eventNames().map(String);
  }

  setMaxListeners(_max: number): void {
    // EventEmitter3 doesn't have setMaxListeners - it handles memory efficiently by design
    console.warn(
      'setMaxListeners not available in EventEmitter3 - memory management is handled automatically'
    );
  }

  // Batch operations for performance
  async emitBatch(
    events: Array<{ event: string; data: unknown }>
  ): Promise<void> {
    const promises = events.map(({ event, data }) => this.emit(event, data));
    await Promise.allSettled(promises);
  }

  // Statistics and monitoring
  getEventStats(): {
    totalEvents: number;
    totalHandlers: number;
    events: Record<string, number>;
  } {
    const eventNames = this.emitter.eventNames();
    const events: Record<string, number> = {};
    let totalHandlers = 0;

    for (const eventName of eventNames) {
      const count = this.emitter.listenerCount(eventName);
      events[String(eventName)] = count;
      totalHandlers += count;
    }

    return {
      totalEvents: eventNames.length,
      totalHandlers,
      events,
    };
  }

  // Expose EventEmitter3 instance for advanced usage
  getRawEmitter(): EventEmitter {
    return this.emitter;
  }
}
