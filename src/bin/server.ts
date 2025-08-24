#!/usr/bin/env node
import { SERVER_VERSION } from '../config/constants.js';
import { getDefaultWorkspacesRoot } from '../config/paths.js';
import { createWorkspacesMcpServer } from '../layers/index.js';
import { logger } from '../utils/logger.js';

async function main() {
  const workspacesRoot = getDefaultWorkspacesRoot();

  logger.info(
    `🚀 Starting Professional Workspaces MCP Server v${SERVER_VERSION}`
  );
  logger.info(`📁 Workspaces root: ${workspacesRoot}`);
  logger.info(`🔧 Log level: ${process.env.WORKSPACES_LOG_LEVEL ?? 'info'}`);

  const server = createWorkspacesMcpServer({
    workspacesRoot,
    transport: {
      type: 'stdio', // Explicit STDIO for production
    },
    protocol: {
      validateRequests: true,
      logRequests: process.env.NODE_ENV === 'development',
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
    process.exit(1);
  }
}

main().catch((error) => {
  logger.fatal('❌ Server error:', error);
  process.exit(1);
});
