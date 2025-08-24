#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { SERVER_VERSION } from '../config/constants.js';
import { getDefaultWorkspacesRoot } from '../config/paths.js';
import { createWorkspacesServer } from '../server/index.js';
import { logger } from '../utils/logger.js';

async function main() {
  const workspacesRoot = getDefaultWorkspacesRoot();

  logger.info(`🚀 Starting Workspaces MCP Server v${SERVER_VERSION}`);
  logger.info(`📁 Workspaces root: ${workspacesRoot}`);
  logger.info(`🔧 Log level: ${process.env.WORKSPACES_LOG_LEVEL ?? 'info'}`);

  const server = createWorkspacesServer(workspacesRoot);
  const transport = new StdioServerTransport();

  try {
    await server.connect(transport);
    logger.info('✅ Workspaces MCP Server is running');
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.fatal('❌ Server error:', error);
  process.exit(1);
});
