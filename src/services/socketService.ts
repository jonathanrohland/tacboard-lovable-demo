
type MessageHandler = (data: any) => void;

class SocketService {
  private socket: WebSocket | null = null;
  private gameId: string | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect(gameId: string, fallbackToLocal = false): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.disconnect();
    }

    this.gameId = gameId;
    
    let wsUrl: string;
    
    if (fallbackToLocal) {
      // Use local storage only mode - no WebSocket connection
      console.log('Using local storage mode only (no live sync)');
      this.trigger('connected', { gameId, localOnly: true });
      return;
    } else {
      // Try to connect to WebSocket server
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProtocol}//livesync.lovable.app/tac-game/${gameId}`;
    }
    
    try {
      console.log(`Attempting to connect to ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log(`Connected to game ${gameId}`);
        this.reconnectAttempts = 0;
        this.trigger('connected', { gameId });
        
        // Clear any pending reconnect timeouts
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };
      
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message && message.type) {
            this.trigger(message.type, message.data);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
      
      this.socket.onclose = (event) => {
        console.log(`Disconnected from game ${gameId}`, event.code, event.reason);
        this.trigger('disconnected', { 
          gameId, 
          code: event.code,
          reason: event.reason || 'Unknown reason'
        });
        
        // Auto reconnect logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Reconnect attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}`);
          
          this.reconnectTimeout = setTimeout(() => {
            if (this.gameId) {
              this.connect(this.gameId, this.reconnectAttempts >= this.maxReconnectAttempts);
            }
          }, 1000 * this.reconnectAttempts);
        } else {
          console.log('Max reconnect attempts reached, falling back to local storage only');
          this.trigger('fallback', { gameId, localOnly: true });
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't need to do anything here as onclose will be called automatically after an error
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.trigger('error', { 
        gameId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Fall back to local mode
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.trigger('fallback', { gameId, localOnly: true });
      }
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      // Only try to close if the connection is not already closing or closed
      if (this.socket.readyState !== WebSocket.CLOSING && this.socket.readyState !== WebSocket.CLOSED) {
        this.socket.close();
      }
      this.socket = null;
      this.gameId = null;
      this.reconnectAttempts = 0;
    }
  }

  sendUpdate(fields: any): void {
    if (this.socket?.readyState === WebSocket.OPEN && this.gameId) {
      this.socket.send(JSON.stringify({
        type: 'gameUpdate',
        gameId: this.gameId,
        data: { fields }
      }));
    }
  }

  on(event: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)?.push(handler);
  }

  off(event: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(event)) return;
    
    const handlers = this.messageHandlers.get(event) || [];
    this.messageHandlers.set(
      event,
      handlers.filter(h => h !== handler)
    );
  }

  private trigger(event: string, data: any): void {
    const handlers = this.messageHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const socketService = new SocketService();
