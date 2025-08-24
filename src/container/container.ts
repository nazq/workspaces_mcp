// Professional Dependency Injection Container
// Type-safe, lightweight, and focused on MCP server needs

export type ServiceFactory<T = unknown> = () => T;
export type ServiceToken = symbol | string;

export interface Container {
  register<T>(token: ServiceToken, factory: ServiceFactory<T>): void;
  registerSingleton<T>(token: ServiceToken, factory: ServiceFactory<T>): void;
  get<T>(token: ServiceToken): T;
  has(token: ServiceToken): boolean;
  clear(): void;
}

export class DIContainer implements Container {
  private services = new Map<ServiceToken, ServiceFactory>();
  private singletons = new Map<ServiceToken, any>();
  private singletonFactories = new Set<ServiceToken>();

  register<T>(token: ServiceToken, factory: ServiceFactory<T>): void {
    this.services.set(token, factory);
  }

  registerSingleton<T>(token: ServiceToken, factory: ServiceFactory<T>): void {
    this.services.set(token, factory);
    this.singletonFactories.add(token);
  }

  get<T>(token: ServiceToken): T {
    // Return cached singleton if exists
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    // Get factory
    const factory = this.services.get(token);
    if (!factory) {
      throw new Error(`Service not registered: ${String(token)}`);
    }

    // Create instance
    const instance = factory() as T;

    // Cache if singleton
    if (this.singletonFactories.has(token)) {
      this.singletons.set(token, instance);
    }

    return instance;
  }

  has(token: ServiceToken): boolean {
    return this.services.has(token);
  }

  clear(): void {
    this.services.clear();
    this.singletons.clear();
    this.singletonFactories.clear();
  }

  // Helper for batch registration
  registerAll(
    registrations: Array<{
      token: ServiceToken;
      factory: ServiceFactory;
      singleton?: boolean;
    }>
  ): void {
    for (const { token, factory, singleton = false } of registrations) {
      if (singleton) {
        this.registerSingleton(token, factory);
      } else {
        this.register(token, factory);
      }
    }
  }

  // Debug utilities
  getRegisteredTokens(): ServiceToken[] {
    return Array.from(this.services.keys());
  }

  getSingletonTokens(): ServiceToken[] {
    return Array.from(this.singletonFactories);
  }
}
