
type MessageHandler = (data: any) => void;

class SocketService {
  private socket: WebSocket | null = null;
  private gameId: string | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(gameId: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.disconnect();
    }

    this.gameId = gameId;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//livesync.lovable.app/tac-game/${gameId}`;
    
    try {
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log(`Connected to game ${gameId}`);
        this.reconnectAttempts = 0;
        this.trigger('connected', { gameId });
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
        console.log(`Disconnected from game ${gameId}`, event.code);
        this.trigger('disconnected', { gameId, code: event.code });
        
        // Auto reconnect logic
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            if (this.gameId) {
              this.connect(this.gameId);
            }
          }, 1000 * this.reconnectAttempts);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.gameId = null;
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
}

// Export singleton instance
export const socketService = new SocketService();
