// Transport Factory with Environment-Based Selection
import { createChildLogger } from '../../utils/logger.js';

import type { McpTransport } from './base.js';
import { HttpTransport, type HttpTransportConfig } from './http/transport.js';
import { StdioTransport } from './stdio/transport.js';

export type TransportType = 'stdio' | 'http';

export interface TransportFactoryConfig {
  type?: TransportType;
  http?: HttpTransportConfig;
}

export class TransportFactory {
  private static logger = createChildLogger('transport:factory');

  static create(config: TransportFactoryConfig = {}): McpTransport {
    const transportType = config.type ?? this.detectTransportType();

    switch (transportType) {
      case 'stdio': {
        this.logger.info('Creating STDIO transport');
        StdioTransport.validateStdioEnvironment();
        return new StdioTransport();
      }

      case 'http': {
        this.logger.info('Creating HTTP transport');
        const httpConfig = config.http ?? { port: 3000 };
        return new HttpTransport(httpConfig);
      }

      default: {
        throw new Error(`Unsupported transport type: ${transportType}`);
      }
    }
  }

  private static detectTransportType(): TransportType {
    // Environment-based transport detection
    const explicitType =
      process.env.MCP_TRANSPORT?.toLowerCase() as TransportType;
    if (explicitType && ['stdio', 'http'].includes(explicitType)) {
      this.logger.info(`Using explicit transport type: ${explicitType}`);
      return explicitType;
    }

    // Auto-detection logic
    if (this.isStdioEnvironment()) {
      this.logger.info('Auto-detected STDIO environment');
      return 'stdio';
    }

    if (this.isDevelopmentEnvironment()) {
      this.logger.info('Auto-detected development environment, using HTTP');
      return 'http';
    }

    // Default to STDIO for production MCP servers
    this.logger.info('Defaulting to STDIO transport');
    return 'stdio';
  }

  private static isStdioEnvironment(): boolean {
    // Check if we're being run in a STDIO context (e.g., by Claude Desktop)
    return (
      process.stdin.isTTY === false &&
      process.stdout.isTTY === false &&
      !process.env.NODE_ENV?.includes('development')
    );
  }

  private static isDevelopmentEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV?.includes('dev') ||
      process.argv.includes('--dev') ||
      process.argv.includes('--http')
    );
  }
}
