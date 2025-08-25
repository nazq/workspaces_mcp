// Professional Configuration Management with Zod Validation
// Single source of truth for all application configuration

import * as os from 'node:os';
import * as path from 'node:path';

import { z } from 'zod';

// Configuration Schema with full validation and defaults
const AppConfigSchema = z.object({
  workspaces: z.object({
    rootPath: z
      .string()
      .min(1, 'Workspaces root path cannot be empty')
      .default(path.join(os.homedir(), 'Documents', 'workspaces')),
    maxWorkspaces: z.number().positive().default(100),
    allowedTemplates: z
      .array(z.string())
      .default(['react-typescript', 'python-data', 'node-api']),
    enableTemplateValidation: z.boolean().default(true),
  }),

  server: z.object({
    name: z.string().default('Workspaces MCP'),
    version: z.string().default('2.0.0'),
    transport: z.enum(['stdio', 'http']).default('stdio'),
    httpPort: z.number().min(1).max(65535).optional(),
    httpHost: z.string().default('localhost'),
    cors: z.boolean().default(true),
    shutdownTimeoutMs: z.number().positive().default(5000),
  }),

  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    format: z.enum(['json', 'pretty']).default('pretty'),
    enableColors: z.boolean().default(true),
    enableTimestamp: z.boolean().default(true),
    maxLogSize: z
      .number()
      .positive()
      .default(10 * 1024 * 1024), // 10MB
  }),

  features: z.object({
    enableTemplates: z.boolean().default(true),
    enableVariables: z.boolean().default(true),
    enableSharedInstructions: z.boolean().default(true),
    enableWorkspaceValidation: z.boolean().default(true),
    maxFileSize: z
      .number()
      .positive()
      .default(1024 * 1024), // 1MB
    maxWorkspaceFiles: z.number().positive().default(1000),
  }),

  development: z.object({
    enableDebugMode: z.boolean().default(false),
    enableHotReload: z.boolean().default(false),
    enableVerboseLogging: z.boolean().default(false),
    mockFileSystem: z.boolean().default(false),
  }),

  security: z.object({
    validatePaths: z.boolean().default(true),
    allowSymlinks: z.boolean().default(false),
    maxRequestSize: z
      .number()
      .positive()
      .default(10 * 1024 * 1024), // 10MB
    enableRateLimiting: z.boolean().default(true),
  }),

  performance: z.object({
    enableCaching: z.boolean().default(true),
    cacheMaxAge: z
      .number()
      .positive()
      .default(5 * 60 * 1000), // 5 minutes
    enableCompression: z.boolean().default(true),
    maxConcurrentOperations: z.number().positive().default(10),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

// Environment-aware configuration factory
export const createEnvironmentConfig = (): Partial<AppConfig> => {
  const config: Record<string, any> = {};

  // Only set environment variables and computed defaults - let schema handle the rest
  if (process.env.WORKSPACES_ROOT || process.env.MAX_WORKSPACES) {
    config.workspaces = {
      rootPath:
        process.env.WORKSPACES_ROOT ||
        path.join(os.homedir(), 'Documents', 'workspaces'),
      ...(process.env.MAX_WORKSPACES && {
        maxWorkspaces: Number(process.env.MAX_WORKSPACES) || 100,
      }),
    };
  } else {
    // Always set computed default for workspaces root
    config.workspaces = {
      rootPath: path.join(os.homedir(), 'Documents', 'workspaces'),
    };
  }

  if (
    process.env.MCP_TRANSPORT ||
    process.env.HTTP_PORT ||
    process.env.HTTP_HOST
  ) {
    config.server = {
      ...(process.env.MCP_TRANSPORT && {
        transport: process.env.MCP_TRANSPORT as 'stdio' | 'http',
      }),
      ...(process.env.HTTP_PORT && {
        httpPort: Number(process.env.HTTP_PORT),
      }),
      ...(process.env.HTTP_HOST && {
        httpHost: process.env.HTTP_HOST,
      }),
    };
  }

  if (process.env.WORKSPACES_LOG_LEVEL) {
    config.logging = {
      level: process.env.WORKSPACES_LOG_LEVEL as
        | 'debug'
        | 'info'
        | 'warn'
        | 'error'
        | 'fatal',
    };
  }

  if (process.env.NODE_ENV || process.env.VERBOSE || process.env.MOCK_FS) {
    config.development = {
      ...(process.env.NODE_ENV && {
        enableDebugMode: process.env.NODE_ENV === 'development',
      }),
      ...(process.env.VERBOSE && {
        enableVerboseLogging: process.env.VERBOSE === 'true',
      }),
      ...(process.env.MOCK_FS && {
        mockFileSystem: process.env.MOCK_FS === 'true',
      }),
    };
  }

  return config as Partial<AppConfig>;
};

// Simplified configuration loader - let Zod do the heavy lifting
export const loadConfig = (overrides: Partial<AppConfig> = {}): AppConfig => {
  const environmentConfig = createEnvironmentConfig();

  // Ensure all sections exist so Zod can apply defaults
  const inputConfig = {
    workspaces: {},
    server: {},
    logging: {},
    features: {},
    development: {},
    security: {},
    performance: {},
    // Apply environment config and overrides
    ...environmentConfig,
    ...overrides,
  };

  try {
    // Zod handles all defaults and validation
    return AppConfigSchema.parse(inputConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(`Invalid configuration:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
};

// Backward compatibility - keep the old name
export const createDefaultConfig = createEnvironmentConfig;

// Configuration service interface
export interface ConfigurationService {
  getConfig(): AppConfig;
  get<K extends keyof AppConfig>(key: K): AppConfig[K];
  getWorkspacesPath(): string;
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean;
  isDevelopmentMode(): boolean;
  reload(overrides?: Partial<AppConfig>): void;
}

// Configuration service implementation
export class AppConfigurationService implements ConfigurationService {
  private config: AppConfig;

  constructor(initialConfig?: Partial<AppConfig>) {
    this.config = loadConfig(initialConfig);
  }

  getConfig(): AppConfig {
    return JSON.parse(JSON.stringify(this.config)); // Deep copy to prevent mutation
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getWorkspacesPath(): string {
    return this.config.workspaces.rootPath;
  }

  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return Boolean(this.config.features[feature]);
  }

  isDevelopmentMode(): boolean {
    return Boolean(this.config.development.enableDebugMode);
  }

  reload(overrides: Partial<AppConfig> = {}): void {
    this.config = loadConfig(overrides);
  }
}

// Export singleton instance
let globalConfig: AppConfigurationService | null = null;

export const getGlobalConfig = (): AppConfigurationService => {
  if (!globalConfig) {
    globalConfig = new AppConfigurationService();
  }
  return globalConfig;
};

export const setGlobalConfig = (config: AppConfigurationService): void => {
  globalConfig = config;
};
