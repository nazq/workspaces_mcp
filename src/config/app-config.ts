// Professional Configuration Management with Zod Validation
// Single source of truth for all application configuration

import * as os from 'node:os';
import * as path from 'node:path';

import { z } from 'zod';

// Configuration Schema with full validation
const AppConfigSchema = z.object({
  workspaces: z.object({
    rootPath: z.string().min(1, 'Workspaces root path cannot be empty'),
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

// Default configuration factory
export const createDefaultConfig = (): Partial<AppConfig> => ({
  workspaces: {
    rootPath:
      process.env.WORKSPACES_ROOT ||
      path.join(os.homedir(), 'Documents', 'workspaces'),
    maxWorkspaces: Number(process.env.MAX_WORKSPACES) || 100,
    allowedTemplates: ['react-typescript', 'python-data', 'node-api'],
    enableTemplateValidation: true,
  },
  server: {
    name: 'Workspaces MCP',
    version: '2.0.0',
    transport: (process.env.MCP_TRANSPORT as 'stdio' | 'http') || 'stdio',
    httpPort: process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : undefined,
    httpHost: process.env.HTTP_HOST || 'localhost',
    cors: true,
    shutdownTimeoutMs: 5000,
  },
  logging: {
    level:
      (process.env.WORKSPACES_LOG_LEVEL as
        | 'debug'
        | 'info'
        | 'warn'
        | 'error'
        | 'fatal') || 'info',
    format: 'pretty' as const,
    enableColors: true,
    enableTimestamp: true,
    maxLogSize: 10 * 1024 * 1024,
  },
  development: {
    enableDebugMode: process.env.NODE_ENV === 'development',
    enableHotReload: false,
    enableVerboseLogging: process.env.VERBOSE === 'true',
    mockFileSystem: process.env.MOCK_FS === 'true',
  },
});

// Configuration loader with validation
export const loadConfig = (overrides: Partial<AppConfig> = {}): AppConfig => {
  const defaultConfig = createDefaultConfig();
  const mergedConfig = {
    ...defaultConfig,
    ...overrides,
  };

  try {
    return AppConfigSchema.parse(mergedConfig);
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
    return { ...this.config }; // Return a copy to prevent mutation
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
