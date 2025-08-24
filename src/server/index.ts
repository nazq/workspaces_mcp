#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SERVER_NAME, SERVER_VERSION } from '../config/constants.js';
import { getDefaultWorkspacesRoot } from '../config/paths.js';
import { createChildLogger, logger } from '../utils/logger.js';

import { ResourceHandler, ToolHandler } from './handlers/index.js';

export const createWorkspacesServer = (workspacesRoot?: string) => {
  const serverLogger = createChildLogger('server');

  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const resourceHandler = new ResourceHandler(workspacesRoot);
  const toolHandler = new ToolHandler(workspacesRoot);

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    serverLogger.debug('Listing resources');
    try {
      const result = await resourceHandler.listResources();
      serverLogger.debug(`Found ${result.resources.length} resources`);
      return result;
    } catch (error) {
      serverLogger.error('Failed to list resources:', error);
      throw error;
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    serverLogger.debug(`Reading resource: ${request.params.uri}`);
    try {
      const result = await resourceHandler.readResource(request.params.uri);
      serverLogger.debug(`Successfully read resource: ${request.params.uri}`);
      return result;
    } catch (error) {
      serverLogger.error(
        `Failed to read resource ${request.params.uri}:`,
        error
      );
      throw error;
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    serverLogger.debug('Listing tools');
    try {
      const result = await toolHandler.listTools();
      serverLogger.debug(`Found ${result.tools.length} tools`);
      return result;
    } catch (error) {
      serverLogger.error('Failed to list tools:', error);
      throw error;
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    serverLogger.info(`Executing tool: ${request.params.name}`);
    try {
      const result = await toolHandler.callTool(
        request.params.name,
        request.params.arguments
      );
      serverLogger.info(`Successfully executed tool: ${request.params.name}`);
      return result;
    } catch (error) {
      serverLogger.error(
        `Failed to execute tool ${request.params.name}:`,
        error
      );
      throw error;
    }
  });

  return server;
};

const main = async () => {
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
};

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.fatal('❌ Server error:', error);
    process.exit(1);
  });
}
