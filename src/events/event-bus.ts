// Professional Event Bus - Async, Type-Safe, Performant
// Enables decoupled architecture with reliable event handling

import type { EventBus, EventHandler } from '../interfaces/services.js';
import { createChildLogger } from '../utils/logger.js';

export class AsyncEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>();
  private logger = createChildLogger('event-bus');
  private maxListeners = 100; // Prevent memory leaks

  async emit<T>(event: string, data: T): Promise<void> {
    const eventHandlers = this.handlers.get(event) || [];

    if (eventHandlers.length === 0) {
      this.logger.debug(`No handlers registered for event: ${event}`);
      return;
    }

    this.logger.debug(
      `Emitting event: ${event} to ${eventHandlers.length} handlers`
    );

    // Execute all handlers concurrently with error isolation
    const promises = eventHandlers.map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        this.logger.error(`Event handler failed for event "${event}":`, error);
        // Continue with other handlers - don't let one failure break everything
      }
    });

    await Promise.allSettled(promises);
  }

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }

    const handlers = this.handlers.get(event)!;

    // Prevent memory leaks
    if (handlers.length >= this.maxListeners) {
      this.logger.warn(
        `Maximum listeners (${this.maxListeners}) exceeded for event: ${event}`
      );
    }

    handlers.push(handler);
    this.logger.debug(
      `Handler registered for event: ${event} (${handlers.length} total)`
    );

    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.logger.debug(
          `Handler unregistered for event: ${event} (${handlers.length} remaining)`
        );
      }
    };
  }

  once<T>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler: EventHandler<T> = async (data: T) => {
      try {
        await handler(data);
      } finally {
        // Always remove, even if handler throws
        this.off(event, wrappedHandler);
      }
    };

    this.on(event, wrappedHandler);
  }

  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      // Remove all handlers for event
      this.handlers.delete(event);
      this.logger.debug(`All handlers removed for event: ${event}`);
      return;
    }

    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.logger.debug(
        `Handler removed for event: ${event} (${handlers.length} remaining)`
      );

      // Clean up empty handler arrays
      if (handlers.length === 0) {
        this.handlers.delete(event);
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
      this.logger.debug(`All listeners removed for event: ${event}`);
    } else {
      const eventCount = this.handlers.size;
      this.handlers.clear();
      this.logger.debug(`All listeners removed for ${eventCount} events`);
    }
  }

  // Utility methods for debugging and monitoring
  getListenerCount(event?: string): number {
    if (event) {
      return this.handlers.get(event)?.length || 0;
    }
    return Array.from(this.handlers.values()).reduce(
      (sum, handlers) => sum + handlers.length,
      0
    );
  }

  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }

  // Batch operations for performance
  async emitBatch(events: Array<{ event: string; data: any }>): Promise<void> {
    const promises = events.map(({ event, data }) => this.emit(event, data));
    await Promise.allSettled(promises);
  }
}
