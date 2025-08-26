// STDIO Transport with Stream Separation
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createChildLogger } from '../../../utils/logger.js';
import { BaseTransport, InternalTransportProvider } from '../base.js';

export class StdioTransport
  extends BaseTransport
  implements InternalTransportProvider
{
  readonly name = 'stdio';
  private transport?: StdioServerTransport;
  private logger = createChildLogger('transport:stdio');

  async connect(): Promise<void> {
    if (this._isConnected) {
      throw new Error('STDIO transport is already connected');
    }

    try {
      this.transport = new StdioServerTransport();
      this._isConnected = true;
      this.logger.info('STDIO transport connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect STDIO transport:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this._isConnected || !this.transport) {
      return;
    }

    try {
      // StdioServerTransport doesn't have explicit disconnect
      this.transport = undefined;
      this.handleClose();
      this.logger.info('STDIO transport disconnected');
    } catch (error) {
      this.logger.error('Error during STDIO transport disconnect:', error);
      throw error;
    }
  }

  async send(_message: unknown): Promise<void> {
    if (!this._isConnected || !this.transport) {
      throw new Error('STDIO transport not connected');
    }

    try {
      // For STDIO, we let the MCP SDK handle the message sending
      // This is a wrapper for consistency with the transport interface
      this.logger.debug('Message sent via STDIO transport');
    } catch (error) {
      this.logger.error('Failed to send message via STDIO:', error);
      throw error;
    }
  }

  getInternalTransport(): StdioServerTransport | undefined {
    return this.transport;
  }

  // CRITICAL: Ensure STDIO stream separation
  static validateStdioEnvironment(): void {
    // Verify that stdout is available for JSON-RPC and stderr for logging
    if (!process.stdout.writable) {
      throw new Error(
        'stdout is not writable - required for MCP STDIO protocol'
      );
    }

    if (!process.stderr.writable) {
      throw new Error('stderr is not writable - required for logging');
    }
  }
}
