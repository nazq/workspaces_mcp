// Controller Factory with Dependency Injection
import type {
  CallToolResult,
  ListResourcesResult,
  ListToolsResult,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';

import { createChildLogger } from '../../utils/logger.js';
import type { AnyMcpHandler } from '../protocol/index.js';

import { ListResourcesController } from './resources/list-controller.js';
import { ReadResourceController } from './resources/read-controller.js';
import { CallToolController } from './tools/call-controller.js';
import { ListToolsController } from './tools/list-controller.js';

// Service interfaces (will be implemented in services layer)
interface ResourceService {
  listResources(): Promise<ListResourcesResult>;
  readResource(uri: string): Promise<ReadResourceResult>;
}

interface ToolService {
  listTools(): Promise<ListToolsResult>;
  callTool(name: string, arguments_: unknown): Promise<CallToolResult>;
}

export interface ControllerDependencies {
  resourceService: ResourceService;
  toolService: ToolService;
}

export class ControllerFactory {
  private static logger = createChildLogger('controller:factory');

  static createAll(dependencies: ControllerDependencies): AnyMcpHandler[] {
    this.logger.info('Creating all controllers with dependency injection');

    const controllers = [
      new ListResourcesController(dependencies.resourceService),
      new ReadResourceController(dependencies.resourceService),
      new ListToolsController(dependencies.toolService),
      new CallToolController(dependencies.toolService),
    ];

    this.logger.info(`Created ${controllers.length} controllers`);
    return controllers;
  }

  static createResourceControllers(
    resourceService: ResourceService
  ): AnyMcpHandler[] {
    this.logger.debug('Creating resource controllers');

    return [
      new ListResourcesController(resourceService),
      new ReadResourceController(resourceService),
    ];
  }

  static createToolControllers(toolService: ToolService): AnyMcpHandler[] {
    this.logger.debug('Creating tool controllers');

    return [
      new ListToolsController(toolService),
      new CallToolController(toolService),
    ];
  }
}
