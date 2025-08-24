// Professional MCP Server with 5-Layer Architecture
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SERVER_NAME, SERVER_VERSION } from '../config/constants.js';
import {
  getDefaultWorkspacesRoot,
  getGlobalInstructionsPath,
  getSharedInstructionsPath,
} from '../config/paths.js';
import { createChildLogger } from '../utils/logger.js';

import { ControllerFactory } from './controllers/index.js';
import {
  FileSystemInstructionsRepository,
  FileSystemWorkspaceRepository,
  NodeFileSystemProvider,
} from './data/index.js';
import { ProtocolProcessor } from './protocol/index.js';
import { ResourceService, ToolService } from './services/index.js';
import {
  TransportFactory,
  type InternalTransportProvider,
  type TransportFactoryConfig,
} from './transport/index.js';

const logger = createChildLogger('server:orchestrator');

export interface ServerConfig {
  workspacesRoot?: string;
  transport?: TransportFactoryConfig;
  protocol?: {
    validateRequests?: boolean;
    logRequests?: boolean;
    rateLimiting?: {
      enabled: boolean;
      maxRequestsPerMinute: number;
    };
  };
}

export class WorkspacesMcpServer {
  private server: Server;
  private processor: ProtocolProcessor;
  private isRunning = false;

  constructor(config: ServerConfig = {}) {
    // Initialize configuration
    const workspacesRoot = config.workspacesRoot ?? getDefaultWorkspacesRoot();

    logger.info('Initializing Professional MCP Server');
    logger.info(`Workspaces root: ${workspacesRoot}`);

    // Layer 5: Data Layer
    const fileSystemProvider = new NodeFileSystemProvider();
    const workspaceRepository = new FileSystemWorkspaceRepository(
      fileSystemProvider,
      workspacesRoot
    );
    const instructionsRepository = new FileSystemInstructionsRepository(
      fileSystemProvider,
      getSharedInstructionsPath(workspacesRoot),
      getGlobalInstructionsPath(workspacesRoot)
    );

    // Layer 4: Services Layer
    const resourceService = new ResourceService({
      workspaceRepository,
      instructionsRepository,
    });

    const toolService = new ToolService({
      workspaceRepository,
      instructionsRepository,
    });

    // Layer 3: Controllers Layer (for future protocol processor integration)
    const controllers = ControllerFactory.createAll({
      resourceService,
      toolService,
    });

    // Layer 2: Protocol Layer (for future enhancement)
    this.processor = new ProtocolProcessor(config.protocol);

    // Register all controllers with the protocol processor (for future use)
    const registry = this.processor.getRegistry();
    for (const controller of controllers) {
      registry.register(controller);
    }

    // Layer 1: Transport Layer will be handled in start()

    // MCP SDK Server
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupServerHandlers(resourceService, toolService);
    logger.info('Professional MCP Server initialized successfully');
  }

  private setupServerHandlers(
    resourceService: ResourceService,
    toolService: ToolService
  ): void {
    logger.debug(
      'Setting up MCP server handlers with direct service integration'
    );

    // Direct service integration for now - proper protocol layer integration later

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return await resourceService.listResources();
    });

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        return await resourceService.readResource(request.params.uri);
      }
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return await toolService.listTools();
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return await toolService.callTool(
        request.params.name,
        request.params.arguments
      );
    });

    logger.debug(
      'MCP server handlers configured with direct service integration'
    );
  }

  async start(transportConfig?: TransportFactoryConfig): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    try {
      logger.info('Starting Professional MCP Server');

      // Layer 1: Transport Layer
      const transport = TransportFactory.create(transportConfig);
      await transport.connect();

      // Connect MCP SDK server to transport
      if (transport.name === 'stdio') {
        // Check if transport provides internal transport access
        if ('getInternalTransport' in transport) {
          const stdioTransport = (
            transport as InternalTransportProvider
          ).getInternalTransport();
          if (stdioTransport) {
            await this.server.connect(stdioTransport as Transport);
          } else {
            throw new Error('Failed to get STDIO transport');
          }
        } else {
          throw new Error('STDIO transport does not provide internal access');
        }
      } else {
        logger.warn('HTTP transport not fully implemented yet');
        // HTTP transport would be handled here
      }

      this.isRunning = true;
      logger.info(
        `✅ Professional MCP Server is running (${transport.name} transport)`
      );

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('Stopping Professional MCP Server');

      // The MCP SDK doesn't provide explicit server shutdown
      // This would be where we'd clean up resources

      this.isRunning = false;
      logger.info('✅ Professional MCP Server stopped');
    } catch (error) {
      logger.error('Error during server shutdown:', error);
      throw error;
    }
  }

  get running(): boolean {
    return this.isRunning;
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, initiating graceful shutdown`);
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.fatal('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}

// Factory function for easier creation
export function createWorkspacesMcpServer(
  config: ServerConfig = {}
): WorkspacesMcpServer {
  return new WorkspacesMcpServer(config);
}
