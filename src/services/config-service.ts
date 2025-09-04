// Configuration Service - First-class injectable configuration management
// Implements singleton pattern with validation and type safety

import { injectable, singleton } from 'tsyringe';
import { z } from 'zod';

import type { AppConfig } from '../interfaces/services.js';

// Define the configuration schema using Zod
const AppConfigSchema = z.object({
  workspaces: z.object({
    rootPath: z.string(),
    maxWorkspaces: z.number().min(1).max(1000),
    allowedTemplates: z.array(z.string()),
  }),
  server: z.object({
    transport: z.object({
      type: z.string(),
      stdio: z.record(z.string(), z.unknown()).optional(),
      http: z
        .object({
          host: z.string(),
          port: z.number(),
        })
        .optional(),
    }),
    timeout: z.number().min(0),
  }),
  logging: z.object({
    level: z.string(),
    format: z.string(),
    destination: z.string(),
  }),
  features: z.object({
    enableTemplates: z.boolean(),
    enableSharedInstructions: z.boolean(),
    enableFileWatching: z.boolean(),
  }),
  development: z.object({
    enableDebugMode: z.boolean(),
    mockServices: z.boolean(),
  }),
  security: z.object({
    maxFileSize: z.number().min(0),
    allowedFileTypes: z.array(z.string()),
    sanitizeContent: z.boolean(),
  }),
  performance: z.object({
    cacheEnabled: z.boolean(),
    cacheTTL: z.number().min(0),
    maxConcurrentRequests: z.number().min(1),
  }),
});

interface ConfigOptions {
  workspacesRoot: string;
  sharedInstructionsPath: string;
  globalInstructionsPath: string;
}

/**
 * Configuration service that provides validated, type-safe configuration
 * as a first-class injectable service following DI best practices.
 */
@injectable()
@singleton()
export class ConfigService {
  private config: AppConfig;
  private readonly paths: {
    workspacesRoot: string;
    sharedInstructionsPath: string;
    globalInstructionsPath: string;
  };

  constructor() {
    // Initialize with defaults - will be overridden by initialize()
    this.config = this.createDefaultConfig();
    this.paths = {
      workspacesRoot: '',
      sharedInstructionsPath: '',
      globalInstructionsPath: '',
    };
  }

  /**
   * Initialize the configuration service with paths
   * This should be called once during application startup
   */
  initialize(options: ConfigOptions): void {
    this.paths.workspacesRoot = options.workspacesRoot;
    this.paths.sharedInstructionsPath = options.sharedInstructionsPath;
    this.paths.globalInstructionsPath = options.globalInstructionsPath;

    // Create and validate configuration
    const rawConfig = this.createConfig(options);
    this.config = this.validateConfig(rawConfig);
  }

  /**
   * Get the validated application configuration
   */
  getConfig(): AppConfig {
    return this.config;
  }

  /**
   * Get workspace root path
   */
  getWorkspacesRoot(): string {
    return this.paths.workspacesRoot;
  }

  /**
   * Get shared instructions path
   */
  getSharedInstructionsPath(): string {
    return this.paths.sharedInstructionsPath;
  }

  /**
   * Get global instructions path
   */
  getGlobalInstructionsPath(): string {
    return this.paths.globalInstructionsPath;
  }

  private createConfig(options: ConfigOptions): AppConfig {
    return {
      workspaces: {
        rootPath: options.workspacesRoot,
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
    };
  }

  private createDefaultConfig(): AppConfig {
    return this.createConfig({
      workspacesRoot: '/tmp/workspaces',
      sharedInstructionsPath: '/tmp/instructions/shared',
      globalInstructionsPath: '/tmp/instructions/global',
    });
  }

  private validateConfig(config: unknown): AppConfig {
    const result = AppConfigSchema.safeParse(config);
    if (!result.success) {
      throw new Error(`Invalid configuration: ${result.error.message}`);
    }
    return result.data as AppConfig;
  }
}
