# 🏗️ Architectural Improvements for Workspaces MCP

## 📊 Current Status

- **Coverage Achievement**: 70.71% → **78.71%** (8% jump!)
- **Tests Added**: 63 new test cases across ResourceService and ToolService
- **Quality**: Both services now have 95%+ coverage with comprehensive edge case testing

## 🎯 Proposed Architectural Improvements

Since we're in early beta, now is the perfect time to refactor for better testability, maintainability, and extensibility.

### 1. 🔌 **Proper Dependency Injection Container**

**Current Issues:**

- Services manually inject dependencies in constructors
- Hard to mock filesystem operations for testing
- Tight coupling between layers
- No central place to configure dependencies

**Proposed Solution:**

```typescript
// src/layers/di/container.ts
export interface Container {
  get<T>(token: symbol | string): T;
  register<T>(token: symbol | string, factory: () => T): void;
  registerSingleton<T>(token: symbol | string, factory: () => T): void;
}

// Service tokens for type safety
export const TOKENS = {
  // Repositories
  WorkspaceRepository: Symbol('WorkspaceRepository'),
  InstructionsRepository: Symbol('InstructionsRepository'),

  // Services
  WorkspaceService: Symbol('WorkspaceService'),
  ResourceService: Symbol('ResourceService'),
  ToolService: Symbol('ToolService'),

  // Infrastructure
  FileSystemService: Symbol('FileSystemService'),
  Logger: Symbol('Logger'),
  EventBus: Symbol('EventBus'),
} as const;

// Example usage:
export class DIContainer implements Container {
  private services = new Map<symbol | string, any>();
  private singletons = new Map<symbol | string, any>();

  register<T>(token: symbol | string, factory: () => T): void {
    this.services.set(token, factory);
  }

  registerSingleton<T>(token: symbol | string, factory: () => T): void {
    this.services.set(token, factory);
    this.singletons.set(token, null); // Mark as singleton
  }

  get<T>(token: symbol | string): T {
    if (this.singletons.has(token)) {
      let instance = this.singletons.get(token);
      if (!instance) {
        const factory = this.services.get(token);
        instance = factory();
        this.singletons.set(token, instance);
      }
      return instance;
    }

    const factory = this.services.get(token);
    if (!factory) throw new Error(`Service not registered: ${String(token)}`);
    return factory();
  }
}
```

**Benefits:**

- Easy mocking in tests: `container.register(TOKENS.FileSystemService, () => mockFs)`
- Centralized dependency configuration
- Type-safe service resolution
- Easy to swap implementations (dev vs prod)

### 2. 🎭 **Service Layer Interfaces**

**Current Issues:**

- Services directly import concrete implementations
- No abstraction between layers
- Hard to create alternative implementations

**Proposed Solution:**

```typescript
// src/layers/services/interfaces.ts
export interface WorkspaceService {
  createWorkspace(
    name: string,
    options?: WorkspaceCreateOptions
  ): Promise<Result<WorkspaceMetadata>>;
  listWorkspaces(): Promise<Result<WorkspaceMetadata[]>>;
  getWorkspaceInfo(name: string): Promise<Result<WorkspaceMetadata>>;
  deleteWorkspace(name: string): Promise<Result<void>>;
}

export interface ResourceService {
  listResources(): Promise<Result<ListResourcesResult>>;
  readResource(uri: string): Promise<Result<ReadResourceResult>>;
}

export interface ToolService {
  listTools(): Promise<Result<ListToolsResult>>;
  callTool(name: string, args: unknown): Promise<Result<CallToolResult>>;
}

// Repository interfaces
export interface WorkspaceRepository {
  create(name: string, options?: WorkspaceCreateOptions): Promise<Result<void>>;
  list(): Promise<Result<WorkspaceMetadata[]>>;
  exists(name: string): Promise<boolean>;
  getMetadata(name: string): Promise<Result<WorkspaceMetadata>>;
  delete(name: string): Promise<Result<void>>;
}

export interface InstructionsRepository {
  createShared(
    name: string,
    options: SharedInstructionCreateOptions
  ): Promise<Result<void>>;
  listShared(): Promise<Result<SharedInstruction[]>>;
  getShared(name: string): Promise<Result<SharedInstruction>>;
  updateGlobal(options: GlobalInstructionUpdateOptions): Promise<Result<void>>;
  getGlobal(): Promise<Result<GlobalInstructions>>;
}
```

**Benefits:**

- Clear contracts between layers
- Easy to create mock implementations
- Interface segregation principle
- Enables different storage backends (filesystem, database, cloud)

### 3. ✨ **Result Pattern for Error Handling**

**Current Issues:**

- Inconsistent error handling (some throw, some return error objects)
- Hard to handle errors gracefully in calling code
- Mix of Error types and string errors

**Proposed Solution:**

```typescript
// src/utils/result.ts
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

export const Ok = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

export const Err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

// Utility functions
export const isOk = <T, E>(
  result: Result<T, E>
): result is { success: true; data: T } => result.success;

export const isErr = <T, E>(
  result: Result<T, E>
): result is { success: false; error: E } => !result.success;

// Chain operations
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
```

**Example Usage:**

```typescript
// Before (inconsistent error handling)
async createWorkspace(name: string): Promise<WorkspaceMetadata> {
  try {
    await this.deps.workspaceRepository.create(name);
    return await this.deps.workspaceRepository.getMetadata(name);
  } catch (error) {
    throw new Error(`Failed to create workspace: ${error.message}`);
  }
}

// After (consistent Result pattern)
async createWorkspace(name: string): Promise<Result<WorkspaceMetadata>> {
  const createResult = await this.deps.workspaceRepository.create(name);
  if (isErr(createResult)) {
    return Err(new Error(`Failed to create workspace: ${createResult.error.message}`));
  }

  return await this.deps.workspaceRepository.getMetadata(name);
}
```

**Benefits:**

- Explicit error handling at compile time
- No more silent failures or uncaught exceptions
- Composable error handling with map/flatMap
- Clear success/failure states

### 4. ⚙️ **Configuration Management**

**Current Issues:**

- Configuration scattered throughout codebase
- Hard-coded paths and magic constants
- No environment-specific configs
- No validation of configuration values

**Proposed Solution:**

```typescript
// src/config/app-config.ts
import { z } from 'zod';

const AppConfigSchema = z.object({
  workspaces: z.object({
    rootPath: z.string().min(1),
    maxWorkspaces: z.number().positive().default(100),
    allowedTemplates: z.array(z.string()).default(['react', 'node', 'python']),
  }),

  server: z.object({
    transport: z.enum(['stdio', 'http']).default('stdio'),
    httpPort: z.number().min(1).max(65535).optional(),
    cors: z.boolean().default(true),
  }),

  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'pretty']).default('pretty'),
  }),

  features: z.object({
    enableTemplates: z.boolean().default(true),
    enableVariables: z.boolean().default(true),
    maxFileSize: z
      .number()
      .positive()
      .default(1024 * 1024), // 1MB
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const loadConfig = (): AppConfig => {
  const config = {
    workspaces: {
      rootPath:
        process.env.WORKSPACES_ROOT ||
        path.join(os.homedir(), 'Documents', 'workspaces'),
      maxWorkspaces: Number(process.env.MAX_WORKSPACES) || 100,
    },
    server: {
      transport: (process.env.MCP_TRANSPORT as 'stdio' | 'http') || 'stdio',
      httpPort: Number(process.env.HTTP_PORT) || undefined,
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
    },
    features: {
      enableTemplates: process.env.ENABLE_TEMPLATES !== 'false',
      enableVariables: process.env.ENABLE_VARIABLES !== 'false',
    },
  };

  return AppConfigSchema.parse(config);
};

// Usage throughout the app
export const CONFIG = loadConfig();
```

**Benefits:**

- Single source of truth for configuration
- Environment variable support with defaults
- Runtime validation with Zod
- Type safety for config access
- Easy testing with config overrides

### 5. 🔧 **Tool Registry Pattern**

**Current Issues:**

- ToolService has a massive switch statement (190+ lines)
- Adding new tools requires modifying existing code (violates Open/Closed Principle)
- No way to dynamically load tools
- Hard to test individual tools in isolation

**Proposed Solution:**

```typescript
// src/layers/tools/registry.ts
import { z } from 'zod';

export interface ToolHandler<TArgs = any, TResult = CallToolResult> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: z.ZodSchema<TArgs>;

  execute(args: TArgs, context: ToolContext): Promise<Result<TResult>>;
}

export interface ToolContext {
  workspaceRepository: WorkspaceRepository;
  instructionsRepository: InstructionsRepository;
  config: AppConfig;
  logger: Logger;
}

export class ToolRegistry {
  private handlers = new Map<string, ToolHandler>();

  register(handler: ToolHandler): void {
    this.handlers.set(handler.name, handler);
  }

  listTools(): Tool[] {
    return Array.from(this.handlers.values()).map((handler) => ({
      name: handler.name,
      description: handler.description,
      inputSchema: zodToJsonSchema(handler.inputSchema),
    }));
  }

  async execute(
    name: string,
    args: unknown,
    context: ToolContext
  ): Promise<Result<CallToolResult>> {
    const handler = this.handlers.get(name);
    if (!handler) {
      return Err(new Error(`Unknown tool: ${name}`));
    }

    // Validate arguments
    const parseResult = handler.inputSchema.safeParse(args);
    if (!parseResult.success) {
      return Err(new Error(`Invalid arguments: ${parseResult.error.message}`));
    }

    try {
      return await handler.execute(parseResult.data, context);
    } catch (error) {
      return Err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

**Individual Tool Handlers:**

```typescript
// src/layers/tools/handlers/create-workspace-tool.ts
export class CreateWorkspaceTool implements ToolHandler {
  readonly name = 'create_workspace';
  readonly description =
    'Create a new workspace with optional description and template';
  readonly inputSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    template: z.string().optional(),
  });

  async execute(
    args: z.infer<typeof this.inputSchema>,
    context: ToolContext
  ): Promise<Result<CallToolResult>> {
    const result = await context.workspaceRepository.create(args.name, {
      description: args.description,
      template: args.template,
    });

    if (isErr(result)) {
      return result;
    }

    const message = `Workspace '${args.name}' created successfully`;
    context.logger.info(message);

    return Ok({
      content: [{ type: 'text', text: message }],
    });
  }
}

// src/layers/tools/handlers/list-workspaces-tool.ts
export class ListWorkspacesTool implements ToolHandler {
  readonly name = 'list_workspaces';
  readonly description = 'List all available workspaces';
  readonly inputSchema = z.object({});

  async execute(
    args: {},
    context: ToolContext
  ): Promise<Result<CallToolResult>> {
    const result = await context.workspaceRepository.list();

    if (isErr(result)) {
      return result;
    }

    const workspaces = result.data;

    if (workspaces.length === 0) {
      return Ok({
        content: [{ type: 'text', text: 'No workspaces found' }],
      });
    }

    const workspaceList = workspaces
      .map((ws) => `- ${ws.name}${ws.description ? `: ${ws.description}` : ''}`)
      .join('\n');

    return Ok({
      content: [
        {
          type: 'text',
          text: `Available workspaces (${workspaces.length}):\n${workspaceList}`,
        },
      ],
    });
  }
}
```

**Benefits:**

- Each tool is a separate, testable class
- Easy to add new tools without modifying existing code
- Automatic argument validation with Zod
- Consistent error handling across all tools
- Tools can be loaded dynamically or from plugins

### 6. 📡 **Event System for Extensibility**

**Current Issues:**

- No way to hook into workspace/instruction lifecycle events
- Difficult to add cross-cutting concerns (logging, metrics, notifications)
- Services are not decoupled

**Proposed Solution:**

```typescript
// src/events/event-bus.ts
export interface EventBus {
  emit<T = any>(event: string, data: T): Promise<void>;
  on<T = any>(event: string, handler: EventHandler<T>): () => void; // Returns unsubscribe function
  once<T = any>(event: string, handler: EventHandler<T>): void;
}

export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export class AsyncEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>();

  async emit<T>(event: string, data: T): Promise<void> {
    const eventHandlers = this.handlers.get(event) || [];
    await Promise.all(eventHandlers.map((handler) => handler(data)));
  }

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  once<T>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler = (data: T) => {
      handler(data);
      const handlers = this.handlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(wrappedHandler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };

    this.on(event, wrappedHandler);
  }
}
```

**Event Types:**

```typescript
// src/events/events.ts
export const EVENTS = {
  // Workspace events
  WORKSPACE_CREATED: 'workspace.created',
  WORKSPACE_UPDATED: 'workspace.updated',
  WORKSPACE_DELETED: 'workspace.deleted',

  // Instruction events
  INSTRUCTION_CREATED: 'instruction.created',
  INSTRUCTION_UPDATED: 'instruction.updated',
  INSTRUCTION_DELETED: 'instruction.deleted',

  // Server events
  SERVER_STARTED: 'server.started',
  SERVER_STOPPED: 'server.stopped',

  // Tool events
  TOOL_EXECUTED: 'tool.executed',
  TOOL_FAILED: 'tool.failed',
} as const;

export interface WorkspaceCreatedEvent {
  name: string;
  path: string;
  description?: string;
  template?: string;
}

export interface InstructionUpdatedEvent {
  name: string;
  type: 'shared' | 'global';
  content: string;
}

export interface ToolExecutedEvent {
  toolName: string;
  args: unknown;
  duration: number;
  success: boolean;
}
```

**Usage in Services:**

```typescript
// In WorkspaceRepository
async create(name: string, options: WorkspaceCreateOptions): Promise<Result<void>> {
  // ... creation logic ...

  await this.eventBus.emit(EVENTS.WORKSPACE_CREATED, {
    name,
    path: workspacePath,
    description: options.description,
    template: options.template,
  });

  return Ok(undefined);
}

// Event handlers for cross-cutting concerns
eventBus.on(EVENTS.WORKSPACE_CREATED, async (event: WorkspaceCreatedEvent) => {
  logger.info(`Workspace created: ${event.name} at ${event.path}`);
});

eventBus.on(EVENTS.TOOL_EXECUTED, async (event: ToolExecutedEvent) => {
  if (event.success) {
    metrics.increment('tools.success', { tool: event.toolName });
  } else {
    metrics.increment('tools.error', { tool: event.toolName });
  }
});
```

**Benefits:**

- Decoupled architecture - services don't need to know about logging, metrics, etc.
- Easy to add new features without modifying existing code
- Perfect for plugins and extensions
- Async event handling for non-blocking operations

### 7. 🧪 **Improved Testing Architecture**

**Current Testing Issues:**

- Lots of manual mocking setup in each test
- Inconsistent test patterns
- Hard to create integration tests

**Proposed Solution:**

```typescript
// src/tests/helpers/test-container.ts
export class TestContainer extends DIContainer {
  constructor() {
    super();
    this.setupTestServices();
  }

  private setupTestServices(): void {
    // Mock implementations
    this.registerSingleton(
      TOKENS.FileSystemService,
      () => new MockFileSystemService()
    );
    this.registerSingleton(TOKENS.EventBus, () => new MockEventBus());
    this.registerSingleton(TOKENS.Logger, () => new MockLogger());

    // Real implementations with mocked dependencies
    this.registerSingleton(
      TOKENS.WorkspaceRepository,
      () =>
        new FileSystemWorkspaceRepository(
          this.get(TOKENS.FileSystemService),
          this.get(TOKENS.EventBus)
        )
    );
  }

  // Helper to get mock instances
  getMock<T>(token: symbol): MockInstance<T> {
    return this.get<MockInstance<T>>(token);
  }
}

// Usage in tests
describe('WorkspaceService', () => {
  let container: TestContainer;
  let workspaceService: WorkspaceService;

  beforeEach(() => {
    container = new TestContainer();
    workspaceService = container.get(TOKENS.WorkspaceService);
  });

  it('should create workspace successfully', async () => {
    const mockFs = container.getMock(TOKENS.FileSystemService);
    mockFs.directoryExists.mockResolvedValue(false);

    const result = await workspaceService.createWorkspace('test');

    expect(isOk(result)).toBe(true);
    expect(mockFs.ensureDirectory).toHaveBeenCalledWith('/path/to/test');
  });
});
```

## 🚀 **Implementation Plan**

### Phase 1: Foundation (1-2 weeks)

1. **Result Pattern**: Implement Result<T,E> type and utilities
2. **DI Container**: Basic dependency injection container
3. **Configuration**: Centralized config management with Zod validation

### Phase 2: Service Layer (1 week)

1. **Service Interfaces**: Extract interfaces for all services
2. **Repository Interfaces**: Extract repository interfaces
3. **Update Implementations**: Make all services use Result pattern

### Phase 3: Tool System (1 week)

1. **Tool Registry**: Implement tool registry pattern
2. **Individual Tool Handlers**: Break up ToolService into separate tool classes
3. **Dynamic Tool Loading**: Support for loading tools dynamically

### Phase 4: Events & Testing (1 week)

1. **Event Bus**: Implement async event system
2. **Event Integration**: Add events to all services
3. **Test Improvements**: Create TestContainer and improve test patterns

## 🎯 **Expected Benefits**

1. **Testability**: 90%+ coverage will be much easier to achieve and maintain
2. **Maintainability**: Clear separation of concerns and single responsibility
3. **Extensibility**: Easy to add new tools, repositories, or features
4. **Reliability**: Explicit error handling prevents silent failures
5. **Developer Experience**: Better IDE support, type safety, and debugging

## 📋 **Migration Strategy**

Since this is early beta, we can do this incrementally:

1. **Start with new code**: Use new patterns for any new features
2. **Gradual migration**: Refactor one service at a time
3. **Maintain tests**: Keep existing tests passing during migration
4. **Update incrementally**: No need to do everything at once

---

**This refactoring would transform the codebase from a good MCP server into a production-ready, enterprise-grade system that's easy to test, maintain, and extend.**

Ready to make this beta the best MCP server architecture out there! 🚀
