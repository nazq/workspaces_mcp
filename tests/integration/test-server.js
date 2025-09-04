#!/usr/bin/env node

// Simple test server for integration tests - bypasses complex DI issues
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SERVER_NAME, SERVER_VERSION } from '../../src/config/constants.js';
import { ResourceHandler, ToolHandler } from '../../src/server/handlers/index.js';

const workspacesRoot = process.env.WORKSPACES_ROOT || process.cwd();

console.error(`Starting test server with workspaces root: ${workspacesRoot}`);

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
  return await resourceHandler.listResources();
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return await resourceHandler.readResource(request.params.uri);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return await toolHandler.listTools();
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await toolHandler.callTool(
    request.params.name,
    request.params.arguments
  );
});

const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});