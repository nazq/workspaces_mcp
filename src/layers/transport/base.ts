// Base Transport Interface for MCP Protocol Support
export interface McpTransport {
  readonly name: string;
  readonly isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: unknown): Promise<void>;
  onMessage(handler: (message: unknown) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
}

// Interface for transports that can provide internal MCP SDK transport
export interface InternalTransportProvider {
  getInternalTransport(): unknown;
}

export abstract class BaseTransport implements McpTransport {
  abstract readonly name: string;
  protected _isConnected = false;
  protected messageHandlers: Array<(message: unknown) => void> = [];
  protected errorHandlers: Array<(error: Error) => void> = [];
  protected closeHandlers: Array<() => void> = [];

  get isConnected(): boolean {
    return this._isConnected;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(message: unknown): Promise<void>;

  onMessage(handler: (message: unknown) => void): void {
    this.messageHandlers.push(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  protected handleMessage(message: unknown): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        this.handleError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }

  protected handleError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });
  }

  protected handleClose(): void {
    this._isConnected = false;
    this.closeHandlers.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        console.error('Error in close handler:', error);
      }
    });
  }
}
