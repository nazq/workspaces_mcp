// Comprehensive AppConfig tests targeting error paths and edge cases
// Focusing on schema validation, environment parsing, and service management

import * as os from 'node:os';
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AppConfigurationService,
  createDefaultConfig,
  getGlobalConfig,
  loadConfig,
  setGlobalConfig,
} from '../../config/app-config.js';

describe('AppConfig System', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Preserve original environment
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Schema Validation Error Paths', () => {
    it('should reject empty workspaces root path', () => {
      expect(() => {
        loadConfig({
          workspaces: {
            rootPath: '',
            maxWorkspaces: 100,
            allowedTemplates: ['react'],
            enableTemplateValidation: true,
          },
        });
      }).toThrow('Workspaces root path cannot be empty');
    });

    it('should reject negative maxWorkspaces', () => {
      expect(() => {
        loadConfig({
          workspaces: {
            rootPath: '/valid/path',
            maxWorkspaces: -1,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should reject zero maxWorkspaces', () => {
      expect(() => {
        loadConfig({
          workspaces: {
            rootPath: '/valid/path',
            maxWorkspaces: 0,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should reject invalid server transport', () => {
      expect(() => {
        loadConfig({
          server: {
            transport: 'invalid' as any,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should reject invalid HTTP port ranges', () => {
      // Port too low
      expect(() => {
        loadConfig({
          server: {
            httpPort: 0,
          },
        });
      }).toThrow('Invalid configuration');

      // Port too high
      expect(() => {
        loadConfig({
          server: {
            httpPort: 65536,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should reject invalid log levels', () => {
      expect(() => {
        loadConfig({
          logging: {
            level: 'invalid' as any,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should reject invalid log formats', () => {
      expect(() => {
        loadConfig({
          logging: {
            format: 'invalid' as any,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should reject negative file size limits', () => {
      expect(() => {
        loadConfig({
          features: {
            maxFileSize: -1,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should reject zero file size limits', () => {
      expect(() => {
        loadConfig({
          features: {
            maxFileSize: 0,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should reject negative cache max age', () => {
      expect(() => {
        loadConfig({
          performance: {
            cacheMaxAge: -1000,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should reject zero concurrent operations limit', () => {
      expect(() => {
        loadConfig({
          performance: {
            maxConcurrentOperations: 0,
          },
        });
      }).toThrow('Invalid configuration');
    });
  });

  describe('Environment Variable Parsing Behaviors', () => {
    it('should handle invalid MAX_WORKSPACES environment variable', () => {
      process.env.MAX_WORKSPACES = 'not-a-number';

      const config = createDefaultConfig();

      // Number('not-a-number') returns NaN, || picks up the default
      expect(config.workspaces?.maxWorkspaces).toBe(100);
    });

    it('should handle invalid HTTP_PORT environment variable', () => {
      process.env.HTTP_PORT = 'invalid-port';

      const config = createDefaultConfig();

      // Ternary checks if env var exists, then Number('invalid-port') returns NaN
      expect(config.server?.httpPort).toBeNaN();
    });

    it('should handle valid HTTP_PORT environment variable', () => {
      process.env.HTTP_PORT = '8080';

      const config = createDefaultConfig();

      expect(config.server?.httpPort).toBe(8080);
    });

    it('should handle missing HTTP_PORT environment variable', () => {
      delete process.env.HTTP_PORT;

      const config = createDefaultConfig();

      expect(config.server?.httpPort).toBeUndefined();
    });

    it('should handle invalid MCP_TRANSPORT environment variable assignment', () => {
      process.env.MCP_TRANSPORT = 'invalid-transport';

      const config = createDefaultConfig();

      // Environment variable is used directly (no validation in createDefaultConfig)
      expect(config.server?.transport).toBe('invalid-transport');

      // But validation should fail when passed to loadConfig
      expect(() => {
        loadConfig(config);
      }).toThrow('Invalid configuration');
    });

    it('should handle invalid WORKSPACES_LOG_LEVEL environment variable assignment', () => {
      process.env.WORKSPACES_LOG_LEVEL = 'invalid-level';

      const config = createDefaultConfig();

      // Environment variable is used directly (no validation in createDefaultConfig)
      expect(config.logging?.level).toBe('invalid-level');

      // But validation should fail when passed to loadConfig
      expect(() => {
        loadConfig(config);
      }).toThrow('Invalid configuration');
    });

    it('should handle boolean environment variable parsing edge cases', () => {
      // Test various boolean-like values that should be falsy
      process.env.VERBOSE = 'yes';
      process.env.MOCK_FS = '1';

      const config = createDefaultConfig();

      // Should only recognize 'true' as truthy
      expect(config.development?.enableVerboseLogging).toBe(false);
      expect(config.development?.mockFileSystem).toBe(false);
    });
  });

  describe('Configuration Loading and Merging', () => {
    it('should merge partial configuration with defaults successfully', () => {
      const result = loadConfig({
        workspaces: {
          rootPath: '/custom/path',
          maxWorkspaces: 50,
        },
        server: {
          name: 'Custom Server',
        },
      });

      // Should merge overrides with schema defaults
      expect(result.workspaces.rootPath).toBe('/custom/path');
      expect(result.workspaces.maxWorkspaces).toBe(50);
      expect(result.workspaces.allowedTemplates).toEqual([
        'react-typescript',
        'python-data',
        'node-api',
      ]); // Schema default
      expect(result.server.name).toBe('Custom Server');
      expect(result.server.transport).toBe('stdio'); // Schema default
      expect(result.logging.level).toBe('info'); // Schema default
    });

    it('should handle no configuration provided (use all defaults)', () => {
      const result = loadConfig();

      // Should use createDefaultConfig() merged with schema defaults
      expect(result.workspaces.rootPath).toContain('workspaces');
      expect(result.workspaces.maxWorkspaces).toBe(100);
      expect(result.server.name).toBe('Workspaces MCP');
      expect(result.logging.level).toBe('info');
      expect(result.features.enableTemplates).toBe(true); // Schema default
      expect(result.security.validatePaths).toBe(true); // Schema default
      expect(result.performance.enableCaching).toBe(true); // Schema default
    });

    it('should provide detailed error messages for validation failures', () => {
      expect(() => {
        loadConfig({
          workspaces: {
            rootPath: '',
            maxWorkspaces: -5,
          },
          server: {
            httpPort: 70000,
            transport: 'invalid' as any,
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should handle complete valid configuration', () => {
      const validConfig = {
        workspaces: {
          rootPath: '/test/path',
          maxWorkspaces: 10,
          allowedTemplates: ['react', 'vue'],
          enableTemplateValidation: false,
        },
        server: {
          name: 'Test Server',
          version: '1.0.0',
          transport: 'http' as const,
          httpPort: 3000,
          httpHost: 'localhost',
          cors: false,
          shutdownTimeoutMs: 1000,
        },
        logging: {
          level: 'debug' as const,
          format: 'json' as const,
          enableColors: false,
          enableTimestamp: false,
          maxLogSize: 5000000,
        },
        features: {
          enableTemplates: false,
          enableVariables: false,
          enableSharedInstructions: false,
          enableWorkspaceValidation: false,
          maxFileSize: 2048,
          maxWorkspaceFiles: 500,
        },
        development: {
          enableDebugMode: true,
          enableHotReload: true,
          enableVerboseLogging: true,
          mockFileSystem: true,
        },
        security: {
          validatePaths: false,
          allowSymlinks: true,
          maxRequestSize: 5000000,
          enableRateLimiting: false,
        },
        performance: {
          enableCaching: false,
          cacheMaxAge: 60000,
          enableCompression: false,
          maxConcurrentOperations: 5,
        },
      };

      expect(() => loadConfig(validConfig)).not.toThrow();
      const result = loadConfig(validConfig);
      expect(result.server.transport).toBe('http');
      expect(result.logging.level).toBe('debug');
    });

    it('should handle configuration with NaN values and validation', () => {
      // Test what happens when createDefaultConfig() has NaN values
      process.env.HTTP_PORT = 'invalid-port';
      const defaultsWithNaN = createDefaultConfig();

      expect(() => {
        loadConfig(defaultsWithNaN);
      }).toThrow('Invalid configuration');
    });
  });

  describe('AppConfigurationService Error Paths', () => {
    it('should handle constructor with invalid initial config', () => {
      expect(() => {
        new AppConfigurationService({
          workspaces: {
            rootPath: '',
          },
        });
      }).toThrow('Invalid configuration');
    });

    it('should handle constructor with no parameters (uses defaults)', () => {
      expect(() => {
        new AppConfigurationService();
      }).not.toThrow();

      const service = new AppConfigurationService();
      expect(service.get('server').name).toBe('Workspaces MCP');
    });

    it('should handle reload with invalid config gracefully', () => {
      const service = new AppConfigurationService();
      const originalConfig = service.getConfig();

      expect(() => {
        service.reload({
          workspaces: {
            rootPath: '',
          },
        });
      }).toThrow('Invalid configuration');

      // Should preserve original config after failed reload
      expect(service.getConfig()).toEqual(originalConfig);
    });

    it('should return immutable config copies', () => {
      const service = new AppConfigurationService();
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      // Should be different objects (deep copies)
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);

      // Mutating returned config should not affect service
      (config1 as any).workspaces.rootPath = '/hacked/path';
      expect(service.getConfig().workspaces.rootPath).not.toBe('/hacked/path');
    });

    it('should handle get() method with type safety', () => {
      const service = new AppConfigurationService();

      const workspaces = service.get('workspaces');
      const server = service.get('server');
      const logging = service.get('logging');

      expect(workspaces).toHaveProperty('rootPath');
      expect(server).toHaveProperty('name');
      expect(logging).toHaveProperty('level');

      // TypeScript should enforce valid keys
      expect(typeof workspaces.maxWorkspaces).toBe('number');
      expect(typeof server.name).toBe('string');
      expect(['debug', 'info', 'warn', 'error', 'fatal']).toContain(
        logging.level
      );
    });

    it('should handle getWorkspacesPath method', () => {
      const service = new AppConfigurationService({
        workspaces: {
          rootPath: '/custom/workspaces/path',
        },
      });

      expect(service.getWorkspacesPath()).toBe('/custom/workspaces/path');
    });

    it('should handle isFeatureEnabled with all features', () => {
      const service = new AppConfigurationService();

      // Test each feature flag
      const features = [
        'enableTemplates',
        'enableVariables',
        'enableSharedInstructions',
        'enableWorkspaceValidation',
      ] as const;

      for (const feature of features) {
        const result = service.isFeatureEnabled(feature);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should handle isDevelopmentMode correctly', () => {
      // Test with development mode disabled
      const prodService = new AppConfigurationService({
        development: {
          enableDebugMode: false,
        },
      });
      expect(prodService.isDevelopmentMode()).toBe(false);

      // Test with development mode enabled
      const devService = new AppConfigurationService({
        development: {
          enableDebugMode: true,
        },
      });
      expect(devService.isDevelopmentMode()).toBe(true);
    });
  });

  describe('Global Configuration Management', () => {
    it('should create global config singleton correctly', () => {
      const config1 = getGlobalConfig();
      const config2 = getGlobalConfig();

      // Should return same instance
      expect(config1).toBe(config2);
    });

    it('should allow setting custom global config', () => {
      const customService = new AppConfigurationService({
        server: {
          name: 'Custom Server',
        },
      });

      setGlobalConfig(customService);
      const retrievedConfig = getGlobalConfig();

      expect(retrievedConfig).toBe(customService);
      expect(retrievedConfig.get('server').name).toBe('Custom Server');
    });

    it('should handle global config reset', () => {
      // Set custom config
      setGlobalConfig(
        new AppConfigurationService({
          server: { name: 'Custom' },
        })
      );

      // Reset by setting null and getting new instance
      setGlobalConfig(null as any);
      const newConfig = getGlobalConfig();

      // Should be a new instance with default values
      expect(newConfig.get('server').name).toBe('Workspaces MCP');
    });
  });

  describe('Default Configuration Factory', () => {
    it('should create config with system defaults', () => {
      // Clear environment variables to test pure defaults
      delete process.env.WORKSPACES_ROOT;
      delete process.env.MAX_WORKSPACES;
      delete process.env.MCP_TRANSPORT;
      delete process.env.HTTP_PORT;
      delete process.env.HTTP_HOST;
      delete process.env.WORKSPACES_LOG_LEVEL;
      delete process.env.WORKSPACES_DEBUG;
      delete process.env.VERBOSE;
      delete process.env.MOCK_FS;

      const config = loadConfig(); // Use loadConfig to get full config with schema defaults

      // Should use system-computed and schema defaults
      expect(config.workspaces.rootPath).toBe(
        path.join(os.homedir(), 'Documents', 'workspaces')
      );
      expect(config.workspaces.maxWorkspaces).toBe(100);
      expect(config.server.name).toBe('Workspaces MCP');
      expect(config.server.version).toBe('2.0.0');
      expect(config.server.transport).toBe('stdio');
      expect(config.logging.level).toBe('info');
    });

    it('should respect all environment variables', () => {
      process.env.WORKSPACES_ROOT = '/env/workspaces';
      process.env.MAX_WORKSPACES = '50';
      process.env.MCP_TRANSPORT = 'http';
      process.env.HTTP_PORT = '3000';
      process.env.HTTP_HOST = 'example.com';
      process.env.WORKSPACES_LOG_LEVEL = 'debug';
      process.env.WORKSPACES_DEBUG = 'true';
      process.env.VERBOSE = 'true';
      process.env.MOCK_FS = 'true';

      const config = createDefaultConfig();

      expect(config.workspaces?.rootPath).toBe('/env/workspaces');
      expect(config.workspaces?.maxWorkspaces).toBe(50);
      expect(config.server?.transport).toBe('http');
      expect(config.server?.httpPort).toBe(3000);
      expect(config.server?.httpHost).toBe('example.com');
      expect(config.logging?.level).toBe('debug');
      expect(config.development?.enableDebugMode).toBe(true);
      expect(config.development?.enableVerboseLogging).toBe(true);
      expect(config.development?.mockFileSystem).toBe(true);
    });

    it('should handle environment variable edge cases', () => {
      // Test empty string environment variables
      process.env.WORKSPACES_ROOT = '';
      process.env.HTTP_HOST = '';

      const config = loadConfig(); // Use loadConfig to get full config with schema defaults

      // Empty strings should be falsy and trigger defaults
      expect(config.workspaces.rootPath).toBe(
        path.join(os.homedir(), 'Documents', 'workspaces')
      );
      expect(config.server.httpHost).toBe('localhost');
    });

    it('should handle partial default config merging with schema', () => {
      // createDefaultConfig() only includes some sections
      const partial = createDefaultConfig();
      const full = loadConfig(partial);

      // Should have all required sections after merging
      expect(full.workspaces).toBeDefined();
      expect(full.server).toBeDefined();
      expect(full.logging).toBeDefined();
      expect(full.development).toBeDefined();
      expect(full.features).toBeDefined(); // From schema defaults
      expect(full.security).toBeDefined(); // From schema defaults
      expect(full.performance).toBeDefined(); // From schema defaults
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle maximum values correctly', () => {
      const maxConfig = {
        workspaces: {
          rootPath: '/path',
          maxWorkspaces: Number.MAX_SAFE_INTEGER,
        },
        server: {
          httpPort: 65535, // Max valid port
        },
        features: {
          maxFileSize: Number.MAX_SAFE_INTEGER,
          maxWorkspaceFiles: Number.MAX_SAFE_INTEGER,
        },
        performance: {
          cacheMaxAge: Number.MAX_SAFE_INTEGER,
          maxConcurrentOperations: Number.MAX_SAFE_INTEGER,
        },
      };

      expect(() => loadConfig(maxConfig)).not.toThrow();
      const result = loadConfig(maxConfig);
      expect(result.server.httpPort).toBe(65535);
    });

    it('should handle minimum valid values', () => {
      const minConfig = {
        workspaces: {
          rootPath: '/p', // Very short but valid path
          maxWorkspaces: 1,
        },
        server: {
          httpPort: 1, // Minimum valid port
        },
        features: {
          maxFileSize: 1,
          maxWorkspaceFiles: 1,
        },
        performance: {
          cacheMaxAge: 1,
          maxConcurrentOperations: 1,
        },
      };

      expect(() => loadConfig(minConfig)).not.toThrow();
      const result = loadConfig(minConfig);
      expect(result.workspaces.maxWorkspaces).toBe(1);
      expect(result.server.httpPort).toBe(1);
    });

    it('should handle empty arrays in configuration', () => {
      const configWithEmptyArrays = {
        workspaces: {
          rootPath: '/path',
          allowedTemplates: [], // Empty array should be valid
        },
      };

      expect(() => loadConfig(configWithEmptyArrays)).not.toThrow();
      const result = loadConfig(configWithEmptyArrays);
      expect(result.workspaces.allowedTemplates).toEqual([]);
    });

    it('should preserve array ordering in configuration', () => {
      const templates = ['react', 'vue', 'angular', 'svelte'];
      const config = loadConfig({
        workspaces: {
          rootPath: '/path',
          allowedTemplates: templates,
        },
      });

      expect(config.workspaces.allowedTemplates).toEqual(templates);
      expect(config.workspaces.allowedTemplates[0]).toBe('react');
      expect(config.workspaces.allowedTemplates[3]).toBe('svelte');
    });

    it('should handle numeric environment variable overflow gracefully', () => {
      process.env.MAX_WORKSPACES = '999999999999999999999999';

      const config = createDefaultConfig();

      // JavaScript Number() handles large numbers by converting to largest safe value or Infinity
      expect(typeof config.workspaces?.maxWorkspaces).toBe('number');
      expect(config.workspaces?.maxWorkspaces).toBeGreaterThan(0);
    });

    it('should detect NaN in configuration validation', () => {
      // Manually create config with NaN to test validation
      const configWithNaN = {
        server: {
          httpPort: NaN,
        },
      };

      expect(() => loadConfig(configWithNaN)).toThrow('Invalid configuration');
    });

    it('should handle undefined values vs schema defaults', () => {
      const configWithUndefined = {
        workspaces: {
          rootPath: '/test',
          // maxWorkspaces is undefined, should get schema default
        },
        server: {
          // httpPort is undefined, should remain undefined (optional field)
        },
      };

      const result = loadConfig(configWithUndefined);
      expect(result.workspaces.maxWorkspaces).toBe(100); // Schema default
      expect(result.server.httpPort).toBeUndefined(); // Optional field
    });
  });
});
