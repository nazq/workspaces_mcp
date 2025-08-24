import { Logger } from 'tslog';

const getLogLevel = (): number => {
  const envLevel = process.env.WORKSPACES_LOG_LEVEL?.toLowerCase();
  switch (envLevel) {
    case 'debug':
      return 0;
    case 'info':
      return 3;
    case 'warn':
      return 4;
    case 'error':
      return 5;
    case 'fatal':
      return 6;
    default:
      return 3; // Default to info level
  }
};

export const logger = new Logger({
  name: 'workspaces-mcp',
  minLevel: getLogLevel(),
  type: 'pretty',
  hideLogPositionForProduction: process.env.NODE_ENV === 'production',
});

export const createChildLogger = (name: string) => {
  return logger.getSubLogger({ name });
};
