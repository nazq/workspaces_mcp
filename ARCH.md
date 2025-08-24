# Workspaces MCP Architecture

This document describes the technical architecture of the Workspaces MCP server, a Model Context Protocol implementation that provides workspace management and context loading for Claude Desktop.

## Overview

The Workspaces MCP server is built using a **5-layer architecture** pattern that promotes separation of concerns, testability, and maintainability. The system follows Domain-Driven Design (DDD) principles and implements the MCP 1.0 specification.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client (Claude Desktop)              │
└─────────────────────────┬───────────────────────────────────┘
                          │ MCP Protocol (JSON-RPC)
┌─────────────────────────▼───────────────────────────────────┐
│ Layer 1: Transport Layer                                    │
│ ┌─────────────────┐ ┌─────────────────┐                   │
│ │ STDIO Transport │ │  HTTP Transport │                   │
│ └─────────────────┘ └─────────────────┘                   │
└─────────────────────────┬───────────────────────────────────┘
┌─────────────────────────▼───────────────────────────────────┐
│ Layer 2: Protocol Layer                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ProtocolProcessor & Request Validation                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
┌─────────────────────────▼───────────────────────────────────┐
│ Layer 3: Controllers Layer                                  │
│ ┌───────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│ │ Resources     │ │ Tools       │ │ Handler Registry    │ │
│ │ Controllers   │ │ Controllers │ │                     │ │
│ └───────────────┘ └─────────────┘ └─────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
┌─────────────────────────▼───────────────────────────────────┐
│ Layer 4: Services Layer                                     │
│ ┌─────────────────┐ ┌─────────────────────────────────────┐ │
│ │ ResourceService │ │ ToolService                         │ │
│ └─────────────────┘ └─────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
┌─────────────────────────▼───────────────────────────────────┐
│ Layer 5: Data Layer                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│ │ Workspace       │ │ Instructions    │ │ FileSystem    │ │
│ │ Repository      │ │ Repository      │ │ Provider      │ │
│ └─────────────────┘ └─────────────────┘ └───────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              File System & Workspace Storage               │
└─────────────────────────────────────────────────────────────┘
```

## Layer Breakdown

### Layer 1: Transport Layer (`src/layers/transport/`)

**Purpose**: Handles communication protocols and message serialization.

**Components**:

- **TransportFactory**: Auto-detects and creates appropriate transport
- **StdioTransport**: Standard I/O transport for Claude Desktop integration
- **HttpTransport**: HTTP transport for development and debugging
- **Base Transport Interface**: Common transport contract

**Key Features**:

- Environment-based transport detection
- STDIO/HTTP transport abstraction
- Connection management and error handling
- Graceful shutdown support

**Files**:

```
transport/
├── base.ts           # Transport interface and base types
├── factory.ts        # Transport factory with auto-detection
├── stdio/
│   └── transport.ts  # STDIO transport implementation
├── http/
│   └── transport.ts  # HTTP transport implementation
└── index.ts          # Layer exports
```

### Layer 2: Protocol Layer (`src/layers/protocol/`)

**Purpose**: Implements MCP protocol handling, validation, and request processing.

**Components**:

- **ProtocolProcessor**: Central request processor with validation
- **HandlerRegistry**: Manages and routes MCP request handlers
- **Request Validators**: Schema validation for MCP requests
- **Protocol Types**: MCP protocol type definitions

**Key Features**:

- JSON-RPC 2.0 protocol compliance
- Request/response validation
- Rate limiting and security
- Error handling and logging

**Files**:

```
protocol/
├── processor.ts       # Central protocol processor
├── handlers/
│   └── registry.ts    # Handler registration and routing
├── validators.ts      # Request validation logic
├── types.ts          # Protocol type definitions
└── index.ts          # Layer exports
```

### Layer 3: Controllers Layer (`src/layers/controllers/`)

**Purpose**: Orchestrates business logic and coordinates between services.

**Components**:

- **ControllerFactory**: Creates and configures all controllers
- **ResourceControllers**: Handle MCP resource operations (list/read)
- **ToolControllers**: Handle MCP tool operations (list/call)
- **Base Controller**: Common controller functionality

**Key Features**:

- MCP request handling
- Service coordination
- Error transformation
- Response formatting

**Files**:

```
controllers/
├── factory.ts              # Controller factory and DI
├── base.ts                # Base controller functionality
├── resources/
│   ├── list-controller.ts  # List resources handler
│   └── read-controller.ts  # Read resource handler
├── tools/
│   ├── list-controller.ts  # List tools handler
│   └── call-controller.ts  # Call tool handler
└── index.ts               # Layer exports
```

### Layer 4: Services Layer (`src/layers/services/`)

**Purpose**: Implements core business logic and domain operations.

**Components**:

- **ResourceService**: Manages workspace and instruction resources
- **ToolService**: Implements workspace management tools
- **Service Interfaces**: Contracts for service layer

**Key Features**:

- Business rule enforcement
- Domain logic implementation
- Resource management
- Tool execution

**Files**:

```
services/
├── resource-service.ts    # Resource management service
├── tool-service.ts        # Tool execution service
├── interfaces.ts          # Service layer contracts
└── index.ts              # Layer exports
```

### Layer 5: Data Layer (`src/layers/data/`)

**Purpose**: Handles data persistence, storage, and repository patterns.

**Components**:

- **WorkspaceRepository**: Workspace CRUD operations
- **InstructionsRepository**: Instructions and templates management
- **FileSystemProvider**: File system abstraction
- **Data Interfaces**: Repository and provider contracts

**Key Features**:

- Repository pattern implementation
- File system abstraction
- Data validation
- Transaction management

**Files**:

```
data/
├── interfaces.ts              # Repository and provider interfaces
├── repositories/
│   ├── workspace-repository.ts    # Workspace data operations
│   └── instructions-repository.ts # Instructions data operations
├── filesystem/
│   └── node-provider.ts          # Node.js filesystem implementation
└── index.ts                      # Layer exports
```

## Entry Points

### MCP Server (`src/bin/server.ts`)

Production MCP server that starts the full 5-layer architecture:

```typescript
const server = createWorkspacesMcpServer({
  workspacesRoot,
  transport: { type: 'stdio' },
  protocol: { validateRequests: true },
});

await server.start();
```

**Process Flow**:

1. Initialize all 5 layers with dependency injection
2. Create MCP SDK server with capabilities
3. Setup STDIO transport for Claude Desktop
4. Register request handlers for resources and tools
5. Start server and listen for MCP requests

### CLI Tool (`src/bin/cli.ts`)

Development and testing CLI that bypasses transport/protocol layers:

```typescript
const cliRunner = new CliRunner(
  { workspacesRoot, verbose },
  workspaceRepository,
  toolService
);

await cliRunner.run(args);
```

**Process Flow**:

1. Initialize data and services layers only
2. Create CLI runner with workspace repository and tool service
3. Parse command line arguments
4. Execute commands directly against services

## Legacy Components (Being Phased Out)

The codebase contains legacy components in `src/server/` and `src/services/` that predate the layered architecture. These are maintained for compatibility but new development should use the layered architecture in `src/layers/`.

**Legacy Structure**:

```
src/
├── server/           # Legacy MCP handlers (deprecated)
├── services/         # Legacy service implementations (deprecated)
└── types/           # Legacy type definitions (deprecated)
```

## Configuration & Infrastructure

### Configuration (`src/config/`)

- **constants.ts**: Server name, version, and global constants
- **paths.ts**: Workspace and file path utilities

### Utilities (`src/utils/`)

- **logger.ts**: Structured logging with child loggers
- **errors.ts**: Custom error classes and error handling
- **validation.ts**: Input validation utilities
- **templates.ts**: Workspace and instruction templates

### Build System

- **scripts/**: Build, development, and release automation
- **manifest.json**: DXT package manifest for Claude Desktop
- **tsconfig.json**: TypeScript configuration
- **vitest.config.ts**: Test configuration

## Key Design Patterns

### 1. Dependency Injection

All layers use constructor dependency injection:

```typescript
export class WorkspacesMcpServer {
  constructor(config: ServerConfig = {}) {
    // Layer 5: Data Layer
    const fileSystemProvider = new NodeFileSystemProvider();
    const workspaceRepository = new FileSystemWorkspaceRepository(
      fileSystemProvider,
      workspacesRoot
    );

    // Layer 4: Services Layer
    const toolService = new ToolService({ workspaceRepository });

    // Layer 3: Controllers Layer
    const controllers = ControllerFactory.createAll({ toolService });
  }
}
```

### 2. Repository Pattern

Data access is abstracted through repository interfaces:

```typescript
interface WorkspaceRepository {
  exists(name: string): Promise<boolean>;
  create(name: string, options: WorkspaceCreateOptions): Promise<void>;
  list(): Promise<WorkspaceMetadata[]>;
  // ...
}
```

### 3. Factory Pattern

Complex object creation is handled by factories:

```typescript
export class TransportFactory {
  static create(config: TransportFactoryConfig = {}): McpTransport {
    const transportType = config.type ?? this.detectTransportType();
    // Create appropriate transport based on config/environment
  }
}
```

### 4. Command Pattern

CLI commands implement a common interface:

```typescript
interface CliCommand {
  name: string;
  description: string;
  execute(args: string[]): Promise<void>;
}
```

## Testing Strategy

### Unit Tests (`src/tests/`)

- **Layer Isolation**: Each layer tested independently with mocks
- **Repository Testing**: Mock filesystem provider for data layer tests
- **Service Testing**: Mock repositories for service layer tests
- **Controller Testing**: Mock services for controller tests

### Integration Tests (`tests/integration/`)

- **MCP Protocol**: Full protocol testing with real MCP SDK
- **CLI Integration**: End-to-end CLI command testing
- **File System**: Real filesystem operations in temporary directories

### Test Structure

```
src/tests/
├── layers/                    # Layer-specific tests
│   ├── data/repositories/     # Repository tests with mocks
│   ├── services/             # Service tests with mocks
│   ├── transport/            # Transport tests
│   └── protocol/             # Protocol tests
├── utils/                    # Utility tests
└── config/                   # Configuration tests

tests/integration/            # Integration tests
├── mcp-protocol.test.ts      # Full MCP protocol tests
└── cli-install.test.ts       # CLI integration tests
```

## Performance Characteristics

### Resource Loading

- **Target**: < 100ms response time for resource requests
- **Caching**: File content caching for frequently accessed resources
- **Lazy Loading**: Workspace metadata loaded on demand

### Memory Usage

- **Streaming**: Large files streamed rather than loaded into memory
- **Resource Cleanup**: Proper disposal of file watchers and connections
- **Connection Pooling**: Efficient transport connection management

## Security Measures

### Input Validation

- **Path Traversal Protection**: All file paths validated and sanitized
- **Schema Validation**: All MCP requests validated against schemas
- **Parameter Sanitization**: User inputs sanitized before processing

### File System Security

- **Workspace Isolation**: Operations restricted to workspace directories
- **Permission Checking**: File access permissions validated
- **Audit Logging**: Security-relevant operations logged

## Deployment Architecture

### Claude Desktop Integration

```
Claude Desktop → STDIO → MCP Server → File System
```

### Development Mode

```
Developer → HTTP/CLI → MCP Server → File System
```

### Package Distribution

- **NPM Package**: Main package with MCP server
- **DXT Extension**: Claude Desktop extension via `dxt pack`
- **Platform Binaries**: Cross-platform executable distribution

## Future Architecture Considerations

### Planned Enhancements

1. **Full Protocol Layer Integration**: Currently bypassed for direct MCP SDK integration
2. **WebSocket Transport**: Real-time updates for workspace changes
3. **Plugin System**: Extensible tool and resource providers
4. **Caching Layer**: Redis/memory caching for improved performance
5. **Event System**: Pub/sub for workspace change notifications

### Scalability Considerations

- **Horizontal Scaling**: Multiple server instances with shared storage
- **Database Backend**: Optional database storage for large deployments
- **Microservices**: Service extraction for specialized deployments
