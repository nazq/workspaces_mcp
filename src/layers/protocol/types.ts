// MCP Protocol Types and Interfaces
import type {
  CallToolRequest,
  ListResourcesRequest,
  ListToolsRequest,
  ReadResourceRequest,
} from '@modelcontextprotocol/sdk/types.js';

// Request type mapping for type safety
export interface McpRequestMap {
  'resources/list': ListResourcesRequest;
  'resources/read': ReadResourceRequest;
  'tools/list': ListToolsRequest;
  'tools/call': CallToolRequest;
}

export type McpMethod = keyof McpRequestMap;

export interface McpRequest<T extends McpMethod = McpMethod> {
  jsonrpc: '2.0';
  id: string | number;
  method: T;
  params: McpRequestMap[T]['params'];
}

export interface McpResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: McpError;
}

export interface McpError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Error Codes (following JSON-RPC standard)
export enum McpErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Custom MCP error codes
  RESOURCE_NOT_FOUND = -32001,
  TOOL_NOT_FOUND = -32002,
  PERMISSION_DENIED = -32003,
  RATE_LIMITED = -32004,
  VALIDATION_ERROR = -32005,
}

export interface McpHandler<T extends McpMethod> {
  method: T;
  handle(request: McpRequestMap[T]): Promise<unknown>;
}

export interface ProtocolConfig {
  validateRequests?: boolean;
  logRequests?: boolean;
  rateLimiting?: {
    enabled: boolean;
    maxRequestsPerMinute: number;
  };
}
