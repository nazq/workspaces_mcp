// HTTP Transport for Development and Testing
import { createChildLogger } from '../../../utils/logger.js';
import { BaseTransport } from '../base.js';

export interface HttpTransportConfig {
  port: number;
  host?: string;
  cors?: boolean;
}

export class HttpTransport extends BaseTransport {
  readonly name = 'http';
  private config: Required<HttpTransportConfig>;
  private logger = createChildLogger('transport:http');

  constructor(config: HttpTransportConfig) {
    super();
    this.config = {
      host: 'localhost',
      cors: true,
      ...config,
    };
  }

  async connect(): Promise<void> {
    if (this._isConnected) {
      throw new Error('HTTP transport is already connected');
    }

    try {
      // HTTP transport setup would go here
      // For now, we'll simulate connection
      this._isConnected = true;
      this.logger.info(
        `HTTP transport connected on ${this.config.host}:${this.config.port}`
      );
    } catch (error) {
      this.logger.error('Failed to connect HTTP transport:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this._isConnected) {
      return;
    }

    try {
      // HTTP transport cleanup would go here
      this.handleClose();
      this.logger.info('HTTP transport disconnected');
    } catch (error) {
      this.logger.error('Error during HTTP transport disconnect:', error);
      throw error;
    }
  }

  async send(_message: unknown): Promise<void> {
    if (!this._isConnected) {
      throw new Error('HTTP transport not connected');
    }

    try {
      // HTTP message sending logic would go here
      this.logger.debug('Message sent via HTTP transport');
    } catch (error) {
      this.logger.error('Failed to send message via HTTP:', error);
      throw error;
    }
  }

  getConfig(): Required<HttpTransportConfig> {
    return { ...this.config };
  }
}
