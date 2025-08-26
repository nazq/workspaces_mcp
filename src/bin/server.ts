#!/usr/bin/env node
import 'reflect-metadata';
import { SERVER_VERSION } from '../config/constants.js';
import { getDefaultWorkspacesRoot } from '../config/paths.js';
import { createWorkspacesMcpServer } from '../layers/index.js';
import { logger, pinoConfig, pinoLogger } from '../utils/logger.js';

async function main() {
  // Log the complete Pino configuration as first log entry
  pinoLogger.info(pinoConfig, 'Pino logger configuration');

  const workspacesRoot = getDefaultWorkspacesRoot();

  logger.info(`🚀 Starting Workspaces MCP Server v${SERVER_VERSION}`);
  logger.info(`📁 Workspaces root: ${workspacesRoot}`);
  logger.info(`🔧 Log level: ${process.env.WORKSPACES_LOG_LEVEL ?? 'info'}`);
  logger.info(`📜 Logs: ${workspacesRoot}/workspace_mcp.log`);

  const server = createWorkspacesMcpServer({
    workspacesRoot,
    transport: {
      // Let the factory auto-detect the transport type
    },
    protocol: {
      validateRequests: true,
      logRequests: process.env.WORKSPACES_LOG_REQUESTS === 'true',
      rateLimiting: {
        enabled: false, // Disable for now
        maxRequestsPerMinute: 60,
      },
    },
  });

  try {
    await server.start();
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    if (error instanceof Error) {
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    process.exit(1);
  }
}

main().catch((error) => {
  logger.fatal('❌ Server error:', error);
  process.exit(1);
});
