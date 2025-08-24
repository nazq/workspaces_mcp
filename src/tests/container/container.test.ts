// Comprehensive tests for Dependency Injection Container
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DIContainer } from '../../container/container.js';

describe('DI Container', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  describe('service registration', () => {
    it('should register and resolve services', () => {
      const token = Symbol('TestService');
      const service = { name: 'test' };

      container.register(token, () => service);
      const resolved = container.get(token);

      expect(resolved).toBe(service);
    });

    it('should register and resolve string token services', () => {
      const token = 'TestService';
      const service = { name: 'test' };

      container.register(token, () => service);
      const resolved = container.get(token);

      expect(resolved).toBe(service);
    });

    it('should allow multiple services with different tokens', () => {
      const token1 = Symbol('Service1');
      const token2 = Symbol('Service2');
      const service1 = { name: 'service1' };
      const service2 = { name: 'service2' };

      container.register(token1, () => service1);
      container.register(token2, () => service2);

      expect(container.get(token1)).toBe(service1);
      expect(container.get(token2)).toBe(service2);
    });

    it('should execute factory function for each resolution', () => {
      const token = Symbol('TestService');
      const factory = vi.fn(() => ({ id: Math.random() }));

      container.register(token, factory);

      const instance1 = container.get(token);
      const instance2 = container.get(token);

      expect(factory).toHaveBeenCalledTimes(2);
      expect(instance1).not.toBe(instance2);
    });

    it('should handle complex factory functions', () => {
      interface DatabaseService {
        connectionString: string;
        connect(): void;
      }

      interface ApiService {
        db: DatabaseService;
        endpoint: string;
      }

      const dbToken = Symbol('DatabaseService');
      const apiToken = Symbol('ApiService');

      container.register(dbToken, () => ({
        connectionString: 'test://localhost',
        connect: vi.fn(),
      }));

      container.register(apiToken, () => ({
        db: container.get<DatabaseService>(dbToken),
        endpoint: 'https://api.test.com',
      }));

      const apiService = container.get<ApiService>(apiToken);

      expect(apiService.endpoint).toBe('https://api.test.com');
      expect(apiService.db.connectionString).toBe('test://localhost');
      expect(typeof apiService.db.connect).toBe('function');
    });
  });

  describe('singleton registration', () => {
    it('should register and resolve singletons', () => {
      const token = Symbol('SingletonService');
      const factory = vi.fn(() => ({ id: Math.random() }));

      container.registerSingleton(token, factory);

      const instance1 = container.get(token);
      const instance2 = container.get(token);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
    });

    it('should handle singleton dependencies', () => {
      const dbToken = Symbol('DatabaseService');
      const loggerToken = Symbol('LoggerService');
      const appToken = Symbol('AppService');

      const dbFactory = vi.fn(() => ({ name: 'database' }));
      const loggerFactory = vi.fn(() => ({ name: 'logger' }));
      const appFactory = vi.fn(() => ({
        name: 'app',
        db: container.get(dbToken),
        logger: container.get(loggerToken),
      }));

      container.registerSingleton(dbToken, dbFactory);
      container.registerSingleton(loggerToken, loggerFactory);
      container.registerSingleton(appToken, appFactory);

      const app1 = container.get(appToken);
      const app2 = container.get(appToken);

      expect(app1).toBe(app2);
      expect(app1.db).toBe(app2.db);
      expect(app1.logger).toBe(app2.logger);

      expect(dbFactory).toHaveBeenCalledTimes(1);
      expect(loggerFactory).toHaveBeenCalledTimes(1);
      expect(appFactory).toHaveBeenCalledTimes(1);
    });

    it('should allow mixing regular and singleton services', () => {
      const regularToken = Symbol('RegularService');
      const singletonToken = Symbol('SingletonService');

      const regularFactory = vi.fn(() => ({
        type: 'regular',
        id: Math.random(),
      }));
      const singletonFactory = vi.fn(() => ({
        type: 'singleton',
        id: Math.random(),
      }));

      container.register(regularToken, regularFactory);
      container.registerSingleton(singletonToken, singletonFactory);

      const regular1 = container.get(regularToken);
      const regular2 = container.get(regularToken);
      const singleton1 = container.get(singletonToken);
      const singleton2 = container.get(singletonToken);

      expect(regular1).not.toBe(regular2);
      expect(singleton1).toBe(singleton2);
      expect(regularFactory).toHaveBeenCalledTimes(2);
      expect(singletonFactory).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should throw error for unregistered service', () => {
      const token = Symbol('UnregisteredService');

      expect(() => container.get(token)).toThrow('Service not registered');
      expect(() => container.get(token)).toThrow(token.toString());
    });

    it('should throw error for unregistered string service', () => {
      const token = 'UnregisteredService';

      expect(() => container.get(token)).toThrow('Service not registered');
      expect(() => container.get(token)).toThrow(token);
    });

    it('should handle factory function errors', () => {
      const token = Symbol('FailingService');
      const error = new Error('Factory failed');

      container.register(token, () => {
        throw error;
      });

      expect(() => container.get(token)).toThrow('Factory failed');
    });

    it('should handle singleton factory function errors', () => {
      const token = Symbol('FailingSingleton');
      const error = new Error('Singleton factory failed');

      container.registerSingleton(token, () => {
        throw error;
      });

      expect(() => container.get(token)).toThrow('Singleton factory failed');
    });

    it('should not cache failed singleton creation', () => {
      const token = Symbol('SometimeFailingSingleton');
      let shouldFail = true;

      const factory = vi.fn(() => {
        if (shouldFail) {
          throw new Error('Temporary failure');
        }
        return { id: 'success' };
      });

      container.registerSingleton(token, factory);

      expect(() => container.get(token)).toThrow('Temporary failure');

      shouldFail = false;
      const service = container.get(token);

      expect(service.id).toBe('success');
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe('service overriding', () => {
    it('should allow overriding regular services', () => {
      const token = Symbol('OverrideService');
      const originalService = { version: 'v1' };
      const newService = { version: 'v2' };

      container.register(token, () => originalService);
      expect(container.get(token)).toBe(originalService);

      container.register(token, () => newService);
      expect(container.get(token)).toBe(newService);
    });

    it('should allow overriding singleton services', () => {
      const token = Symbol('OverrideSingleton');
      const originalService = { version: 'v1' };
      const newService = { version: 'v2' };

      container.registerSingleton(token, () => originalService);
      expect(container.get(token)).toBe(originalService);

      container.registerSingleton(token, () => newService);
      const instance1 = container.get(token);
      const instance2 = container.get(token);

      expect(instance1).toBe(newService);
      expect(instance1).toBe(instance2);
    });

    it('should handle switching between regular and singleton', () => {
      const token = Symbol('SwitchingService');
      const regularFactory = vi.fn(() => ({ type: 'regular' }));
      const singletonFactory = vi.fn(() => ({ type: 'singleton' }));

      // Start as regular
      container.register(token, regularFactory);
      const regular1 = container.get(token);
      const regular2 = container.get(token);
      expect(regular1).not.toBe(regular2);
      expect(regularFactory).toHaveBeenCalledTimes(2);

      // Switch to singleton
      container.registerSingleton(token, singletonFactory);
      const singleton1 = container.get(token);
      const singleton2 = container.get(token);
      expect(singleton1).toBe(singleton2);
      expect(singletonFactory).toHaveBeenCalledTimes(1);
    });
  });

  describe('circular dependency detection', () => {
    it('should handle simple circular dependencies gracefully', () => {
      const serviceAToken = Symbol('ServiceA');
      const serviceBToken = Symbol('ServiceB');

      container.register(serviceAToken, () => ({
        name: 'A',
        b: container.get(serviceBToken),
      }));

      container.register(serviceBToken, () => ({
        name: 'B',
        a: container.get(serviceAToken),
      }));

      // This should cause a stack overflow or similar error
      expect(() => container.get(serviceAToken)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined returns from factories', () => {
      const nullToken = Symbol('NullService');
      const undefinedToken = Symbol('UndefinedService');

      container.register(nullToken, () => null);
      container.register(undefinedToken, () => undefined);

      expect(container.get(nullToken)).toBeNull();
      expect(container.get(undefinedToken)).toBeUndefined();
    });

    it('should handle primitive values', () => {
      const numberToken = Symbol('NumberService');
      const stringToken = Symbol('StringService');
      const booleanToken = Symbol('BooleanService');

      container.register(numberToken, () => 42);
      container.register(stringToken, () => 'hello');
      container.register(booleanToken, () => true);

      expect(container.get(numberToken)).toBe(42);
      expect(container.get(stringToken)).toBe('hello');
      expect(container.get(booleanToken)).toBe(true);
    });

    it('should handle async factories with warnings', () => {
      const token = Symbol('AsyncService');

      // Note: The DI container doesn't support async factories natively
      // This would return a Promise, not the resolved value
      container.register(token, async () => ({ async: true }));

      const result = container.get(token);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('real-world scenarios', () => {
    it('should support a typical application setup', () => {
      // Define service interfaces and tokens
      interface Logger {
        log(message: string): void;
      }

      interface Database {
        query(sql: string): unknown[];
      }

      interface UserService {
        getUser(id: string): { id: string; name: string } | null;
      }

      const LoggerToken = Symbol('Logger');
      const DatabaseToken = Symbol('Database');
      const UserServiceToken = Symbol('UserService');

      // Register services
      container.registerSingleton(LoggerToken, () => ({
        log: vi.fn(),
      }));

      container.registerSingleton(DatabaseToken, () => ({
        query: vi.fn(() => [{ id: '1', name: 'Test User' }]),
      }));

      container.register(UserServiceToken, () => ({
        getUser: (id: string) => {
          const db = container.get<Database>(DatabaseToken);
          const logger = container.get<Logger>(LoggerToken);

          logger.log(`Fetching user ${id}`);
          const results = db.query(`SELECT * FROM users WHERE id = ${id}`);

          return results.length > 0
            ? (results[0] as { id: string; name: string })
            : null;
        },
      }));

      // Use the services
      const userService = container.get<UserService>(UserServiceToken);
      const user = userService.getUser('1');

      expect(user).toEqual({ id: '1', name: 'Test User' });

      // Verify logger was called
      const logger = container.get<Logger>(LoggerToken);
      expect(logger.log).toHaveBeenCalledWith('Fetching user 1');
    });
  });
});
