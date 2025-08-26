// TSyringe Dependency Injection Container Configuration
// Dependency injection using TSyringe

import 'reflect-metadata';
import { container } from 'tsyringe';

// Import all dependencies at the top to avoid dynamic import issues
import { AsyncEventBus } from '../events/event-bus.js';
import type { AppConfig, EventBus, Logger } from '../interfaces/services.js';
import { NodeFileSystemProvider } from '../layers/data/filesystem/node-provider.js';
import { FileSystemInstructionsRepository } from '../layers/data/repositories/instructions-repository.js';
import { FileSystemWorkspaceRepository } from '../layers/data/repositories/workspace-repository.js';
import { InstructionsService } from '../layers/services/instructions-service.js';
import { ResourceService } from '../layers/services/resource-service.js';
import { ToolService } from '../layers/services/tool-service.js';
import { WorkspaceService } from '../layers/services/workspace-service.js';
import { ToolRegistry } from '../tools/registry.js';
import { createChildLogger } from '../utils/logger.js';

// Tokens for interface-based injection
export const TOKENS = {
  // Core Infrastructure
  FileSystemProvider: Symbol('FileSystemProvider'),
  Logger: Symbol('Logger'),
  EventBus: Symbol('EventBus'),

  // Repositories
  WorkspaceRepository: Symbol('WorkspaceRepository'),
  InstructionsRepository: Symbol('InstructionsRepository'),

  // Services
  WorkspaceService: Symbol('WorkspaceService'),
  InstructionsService: Symbol('InstructionsService'),
  ResourceService: Symbol('ResourceService'),
  ToolService: Symbol('ToolService'),

  // Tools
  ToolRegistry: Symbol('ToolRegistry'),

  // Configuration
  AppConfig: Symbol('AppConfig'),
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

  // Infrastructure (Singletons) - Use useFactory to avoid TypeInfo issues
  container.register(TOKENS.FileSystemProvider, {
    useFactory: () => new NodeFileSystemProvider(),
  });

  // Register AsyncEventBus with useFactory to avoid TypeInfo issues
  container.register(TOKENS.EventBus, {
    useFactory: () => new AsyncEventBus(),
  });

  // Logger factory
  container.register(TOKENS.Logger, {
    useFactory: () => createChildLogger('mcp-server'),
  });

  // Configuration
  container.register(TOKENS.AppConfig, {
    useValue: {
      workspaces: {
        rootPath: config.workspacesRoot,
        maxWorkspaces: 100,
        allowedTemplates: ['basic', 'react-typescript', 'python'],
      },
      server: {
        transport: { type: 'stdio', stdio: {} },
        timeout: 30000,
      },
      logging: {
        level: 'info',
        format: 'text',
        destination: 'stdout',
      },
      features: {
        enableTemplates: true,
        enableSharedInstructions: true,
        enableFileWatching: false,
      },
      development: {
        enableDebugMode: false,
        mockServices: false,
      },
      security: {
        maxFileSize: 1024 * 1024,
        allowedFileTypes: ['txt', 'md', 'json'],
        sanitizeContent: true,
      },
      performance: {
        cacheEnabled: false,
        cacheTTL: 300,
        maxConcurrentRequests: 10,
      },
    },
  });

  // Repositories (Singletons)
  container.register(TOKENS.WorkspaceRepository, {
    useFactory: (c) =>
      new FileSystemWorkspaceRepository(
        c.resolve(TOKENS.FileSystemProvider),
        config.workspacesRoot
      ),
  });

  container.register(TOKENS.InstructionsRepository, {
    useFactory: (c) =>
      new FileSystemInstructionsRepository(
        c.resolve(TOKENS.FileSystemProvider),
        config.sharedInstructionsPath,
        config.globalInstructionsPath
      ),
  });

  // Services (Singletons)
  container.register(TOKENS.WorkspaceService, {
    useFactory: (c) =>
      new WorkspaceService(
        c.resolve(TOKENS.WorkspaceRepository),
        c.resolve(TOKENS.Logger)
      ),
  });

  container.register(TOKENS.InstructionsService, {
    useFactory: (c) =>
      new InstructionsService(
        c.resolve(TOKENS.InstructionsRepository),
        c.resolve(TOKENS.Logger)
      ),
  });

  container.register(TOKENS.ResourceService, {
    useFactory: (c) =>
      new ResourceService(
        c.resolve(TOKENS.WorkspaceRepository),
        c.resolve(TOKENS.InstructionsRepository),
        c.resolve(TOKENS.EventBus),
        c.resolve(TOKENS.Logger)
      ),
  });

  // Tool Infrastructure - Use useFactory to avoid TypeInfo issues
  container.register(TOKENS.ToolRegistry, {
    useFactory: () => new ToolRegistry(),
  });

  container.register(TOKENS.ToolService, {
    useFactory: (c) =>
      new ToolService(c.resolve(TOKENS.ToolRegistry), c.resolve(TOKENS.Logger)),
  });
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
