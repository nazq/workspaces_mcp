// Controller Factory with Dependency Injection
import { createChildLogger } from '../../utils/logger.js';
import type { McpHandler } from '../protocol/index.js';

import { ListResourcesController } from './resources/list-controller.js';
import { ReadResourceController } from './resources/read-controller.js';
import { CallToolController } from './tools/call-controller.js';
import { ListToolsController } from './tools/list-controller.js';

// Service interfaces (will be implemented in services layer)
interface ResourceService {
  listResources(): Promise<any>;
  readResource(uri: string): Promise<any>;
}

interface ToolService {
  listTools(): Promise<any>;
  callTool(name: string, arguments_: unknown): Promise<any>;
}

export interface ControllerDependencies {
  resourceService: ResourceService;
  toolService: ToolService;
}

export class ControllerFactory {
  private static logger = createChildLogger('controller:factory');

  static createAll(dependencies: ControllerDependencies): McpHandler<any>[] {
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
  ): McpHandler<any>[] {
    this.logger.debug('Creating resource controllers');

    return [
      new ListResourcesController(resourceService),
      new ReadResourceController(resourceService),
    ];
  }

  static createToolControllers(toolService: ToolService): McpHandler<any>[] {
    this.logger.debug('Creating tool controllers');

    return [
      new ListToolsController(toolService),
      new CallToolController(toolService),
    ];
  }
}
