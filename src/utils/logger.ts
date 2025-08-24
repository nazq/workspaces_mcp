// Professional MCP Server Logger - CRITICAL: STDIO Stream Separation
// stdout: ONLY JSON-RPC messages
// stderr: ALL logging, debug, and non-protocol output

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

const formatLogMessage = (
  level: string,
  name: string,
  ...args: unknown[]
): string => {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
    .join(' ');
  return `${timestamp} [${level.toUpperCase()}] [${name}] ${message}`;
};

const log = (level: string, name: string, ...args: unknown[]) => {
  if (!shouldLog(level)) return;

  try {
    const logMessage = formatLogMessage(level, name, ...args);
    // CRITICAL: All logging MUST go to stderr for STDIO transport compatibility
    process.stderr.write(`${logMessage}\n`);
  } catch {
    // Silent failure - absolutely cannot break MCP STDIO protocol
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
