// High-Performance MCP Server Logger using Pino
// Logs to WORKSPACE_ROOT/workspace_mcp.log for persistent storage
// STDIO streams remain clean for MCP protocol communication

import * as fs from 'node:fs';
import * as path from 'node:path';

import pino from 'pino';

import { getDefaultWorkspacesRoot } from '../config/paths.js';

// Get log level from environment, default to 'info'
const getLogLevel = (): pino.Level => {
  const level = process.env.WORKSPACES_LOG_LEVEL?.toLowerCase() ?? 'info';
  return ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(level)
    ? (level as pino.Level)
    : 'info';
};

// Get log file path in workspace root
const getLogFilePath = (): string => {
  const workspacesRoot =
    process.env.WORKSPACES_ROOT ?? getDefaultWorkspacesRoot();

  // Ensure workspace root directory exists
  try {
    fs.mkdirSync(workspacesRoot, { recursive: true });
  } catch (error) {
    // If we can't create workspace root, fall back to stderr
    console.warn(
      `Could not create workspace root ${workspacesRoot}, logging to stderr:`,
      error
    );
    return '';
  }

  return path.join(workspacesRoot, 'workspace_mcp.log');
};

// Check if pretty-printed logs are requested
const usePrettyLogs = process.env.WORKSPACES_LOG_PRETTY === 'true';

// Create root Pino logger with file-based logging
const logFilePath = getLogFilePath();
const pinoConfigOptions = {
  name: 'workspaces-mcp',
  level: getLogLevel(),
  transport: usePrettyLogs
    ? {
        target: 'pino-pretty',
        options: {
          destination: logFilePath || 2, // File path or stderr fallback
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname,component,name',
          mkdir: true, // Create directories if needed
          messageFormat: '{if component}[{component}] {end}{msg}',
        },
      }
    : undefined,
  base: { pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
};
const pinoDestination = logFilePath
  ? pino.destination(logFilePath)
  : process.stderr;
const rootLogger = pino(pinoConfigOptions, pinoDestination);

export const pinoConfig = {
  ...pinoConfigOptions,
  destination: {
    type: logFilePath ? 'file' : 'stderr',
    path: logFilePath || 'stderr',
  },
  environment: {
    WORKSPACES_ROOT: process.env.WORKSPACES_ROOT,
    WORKSPACES_LOG_LEVEL: process.env.WORKSPACES_LOG_LEVEL,
    WORKSPACES_LOG_PRETTY: process.env.WORKSPACES_LOG_PRETTY,
    NODE_ENV: process.env.NODE_ENV,
  },
  computed: {
    finalLogLevel: getLogLevel(),
    usePrettyLogs,
    logFilePath,
  },
};

// Export main logger with compatible interface
export const logger = {
  debug: (message: string, ...args: unknown[]) =>
    (rootLogger.debug as (msg: string, ...args: unknown[]) => void)(
      message,
      ...args
    ),
  info: (message: string, ...args: unknown[]) =>
    (rootLogger.info as (msg: string, ...args: unknown[]) => void)(
      message,
      ...args
    ),
  warn: (message: string, ...args: unknown[]) =>
    (rootLogger.warn as (msg: string, ...args: unknown[]) => void)(
      message,
      ...args
    ),
  error: (message: string, ...args: unknown[]) =>
    (rootLogger.error as (msg: string, ...args: unknown[]) => void)(
      message,
      ...args
    ),
  fatal: (message: string, ...args: unknown[]) =>
    (rootLogger.fatal as (msg: string, ...args: unknown[]) => void)(
      message,
      ...args
    ),
};

// Helper function to format component names for better readability
const formatComponentName = (name: string): string => {
  // For pretty logs, format with padding/truncation for alignment
  // For JSON logs, use full component names
  if (usePrettyLogs) {
    // Total bracket length will be 20 chars: [name-padded-to-18] + 2 brackets = 20 total
    const nameLength = 18; // Reserve 2 chars for [ and ]
    if (name.length > nameLength) {
      return `${name.slice(0, nameLength - 1)}…`;
    }
    // Pad the name to exactly nameLength, so [name] will be exactly 20 chars
    return name.padEnd(nameLength);
  } else {
    // For JSON logs, use full component name without truncation or padding
    return name;
  }
};

// Create child logger factory with component name
export const createChildLogger = (name: string) => {
  const formattedName = formatComponentName(name);
  const childLogger = rootLogger.child({ component: formattedName });

  return {
    debug: (message: string, ...args: unknown[]) =>
      (childLogger.debug as (msg: string, ...args: unknown[]) => void)(
        message,
        ...args
      ),
    info: (message: string, ...args: unknown[]) =>
      (childLogger.info as (msg: string, ...args: unknown[]) => void)(
        message,
        ...args
      ),
    warn: (message: string, ...args: unknown[]) =>
      (childLogger.warn as (msg: string, ...args: unknown[]) => void)(
        message,
        ...args
      ),
    error: (message: string, ...args: unknown[]) =>
      (childLogger.error as (msg: string, ...args: unknown[]) => void)(
        message,
        ...args
      ),
    fatal: (message: string, ...args: unknown[]) =>
      (childLogger.fatal as (msg: string, ...args: unknown[]) => void)(
        message,
        ...args
      ),
  };
};

// Export Pino logger for advanced usage
export { rootLogger as pinoLogger };
