// TSyringe Dependency Injection Container Configuration
// Modern decorator-based dependency injection with clean architecture

import 'reflect-metadata';
import { container } from 'tsyringe';

// Import all dependencies
import { AsyncEventBus } from '../events/event-bus.js';
import type { AppConfig, EventBus, Logger } from '../interfaces/services.js';
import { NodeFileSystemProvider } from '../layers/data/filesystem/node-provider.js';
import { FileSystemInstructionsRepository } from '../layers/data/repositories/instructions-repository.js';
import { FileSystemWorkspaceRepository } from '../layers/data/repositories/workspace-repository.js';
import { InstructionsService } from '../layers/services/instructions-service.js';
import { ResourceService } from '../layers/services/resource-service.js';
import { ToolService } from '../layers/services/tool-service.js';
import { WorkspaceService } from '../layers/services/workspace-service.js';
import { ConfigService } from '../services/config-service.js';
import { ToolRegistry } from '../tools/registry.js';
import { createChildLogger } from '../utils/logger.js';

import { TOKENS } from './tokens.js';

// Re-export tokens for compatibility
export { TOKENS } from './tokens.js';

// Legacy TOKENS export for backward compatibility (will be removed)
export const TOKENS_LEGACY = {
  ...TOKENS,
} as const;

/**
 * Configure the TSyringe dependency injection container
 *
 * This function registers all dependencies with their appropriate lifetimes:
 * - Singletons: Infrastructure services, repositories
 * - Transients: Request-scoped services, tool handlers
 */
export function configureContainer(config: {
  workspacesRoot: string;
  sharedInstructionsPath: string;
  globalInstructionsPath: string;
}): void {
  // Clear existing registrations
  container.clearInstances();

  // Register configuration service and initialize it
  const configService = new ConfigService();
  configService.initialize(config);
  container.registerInstance(TOKENS.ConfigService, configService);
  container.registerInstance(TOKENS.AppConfig, configService.getConfig());

  // Register path tokens for repositories
  container.registerInstance('WorkspacesRoot', config.workspacesRoot);
  container.registerInstance(
    'SharedInstructionsPath',
    config.sharedInstructionsPath
  );
  container.registerInstance(
    'GlobalInstructionsPath',
    config.globalInstructionsPath
  );

  // Infrastructure (Singletons) - Using class registration with decorators
  // Logger needs special handling as it's a factory function
  container.register(TOKENS.Logger, {
    useFactory: () => createChildLogger('mcp-server'),
  });

  // Register services with decorator-based injection
  container.registerSingleton(TOKENS.FileSystemService, NodeFileSystemProvider);
  container.registerSingleton(TOKENS.EventBus, AsyncEventBus);

  // Repositories (Singletons) - Using class registration
  container.registerSingleton(
    TOKENS.WorkspaceRepository,
    FileSystemWorkspaceRepository
  );
  container.registerSingleton(
    TOKENS.InstructionsRepository,
    FileSystemInstructionsRepository
  );

  // Services (Singletons) - Using class registration
  container.registerSingleton(TOKENS.WorkspaceService, WorkspaceService);
  container.registerSingleton(TOKENS.InstructionsService, InstructionsService);
  container.registerSingleton(TOKENS.ResourceService, ResourceService);

  // Tool Infrastructure - Using class registration
  container.registerSingleton(TOKENS.ToolRegistry, ToolRegistry);
  container.registerSingleton(TOKENS.ToolService, ToolService);
}

/**
 * Get the configured TSyringe container instance
 */
export function getContainer() {
  return container;
}

/**
 * Reset the container (useful for testing)
 */
export function resetContainer(): void {
  container.clearInstances();
}

/**
 * Create a ToolContext with proper dependency injection
 */
export function createToolContext() {
  return {
    workspaceRepository: container.resolve<WorkspaceService>(
      TOKENS.WorkspaceService
    ),
    instructionsRepository: container.resolve<InstructionsService>(
      TOKENS.InstructionsService
    ),
    config: container.resolve<AppConfig>(TOKENS.AppConfig),
    logger: container.resolve<Logger>(TOKENS.Logger),
    eventBus: container.resolve<EventBus>(TOKENS.EventBus),
  };
}
