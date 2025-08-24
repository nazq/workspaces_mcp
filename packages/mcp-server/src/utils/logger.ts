import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// File logger for MCP servers - keeps STDIO clean for JSON-RPC protocol
const getLogLevel = (): string => {
  return process.env.WORKSPACES_LOG_LEVEL?.toLowerCase() ?? 'info';
};

const shouldLog = (level: string): boolean => {
  const currentLevel = getLogLevel();
  const levels = ['debug', 'info', 'warn', 'error', 'fatal'];
  const currentIndex = levels.indexOf(currentLevel);
  const messageIndex = levels.indexOf(level);
  return messageIndex >= currentIndex;
};

// Get log file path - use workspaces root directory
const getLogFilePath = (): string => {
  const workspacesRoot =
    process.env.WORKSPACES_ROOT ||
    path.join(os.homedir(), 'Documents', 'workspaces');
  return path.join(workspacesRoot, 'workspaces_mcp.log');
};

let logFileHandle: fs.WriteStream | null = null;

const getLogFile = (): fs.WriteStream => {
  if (!logFileHandle) {
    const logPath = getLogFilePath();

    // Ensure the workspaces directory exists
    const workspacesDir = path.dirname(logPath);
    if (!fs.existsSync(workspacesDir)) {
      fs.mkdirSync(workspacesDir, { recursive: true });
    }

    logFileHandle = fs.createWriteStream(logPath, { flags: 'a' });

    // Add header when log starts
    logFileHandle.write(
      `\n=== Workspaces MCP Server Started at ${new Date().toISOString()} ===\n`
    );
  }
  return logFileHandle;
};

const log = (level: string, name: string, ...args: unknown[]) => {
  if (!shouldLog(level)) return;

  try {
    const timestamp = new Date().toISOString();
    const message = args
      .map((arg) =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      )
      .join(' ');

    const logLine = `${timestamp} ${level.toUpperCase()} [${name}] ${message}\n`;
    getLogFile().write(logLine);
  } catch {
    // Silent failure - absolutely cannot let logging break MCP STDIO
  }
};

export const logger = {
  debug: (...args: unknown[]) => log('debug', 'workspaces-mcp', ...args),
  info: (...args: unknown[]) => log('info', 'workspaces-mcp', ...args),
  warn: (...args: unknown[]) => log('warn', 'workspaces-mcp', ...args),
  error: (...args: unknown[]) => log('error', 'workspaces-mcp', ...args),
  fatal: (...args: unknown[]) => log('fatal', 'workspaces-mcp', ...args),
};

export const createChildLogger = (name: string) => {
  return {
    debug: (...args: unknown[]) => log('debug', name, ...args),
    info: (...args: unknown[]) => log('info', name, ...args),
    warn: (...args: unknown[]) => log('warn', name, ...args),
    error: (...args: unknown[]) => log('error', name, ...args),
    fatal: (...args: unknown[]) => log('fatal', name, ...args),
  };
};

// Export log file path for debugging
export const getLogPath = getLogFilePath;
