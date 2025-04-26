
import { supabase } from "@/integrations/supabase/client";
import { Field } from "@/types/game";
import { setGameState } from "@/utils/gameState";

type MessageHandler = (data: any) => void;

class SocketService {
  private channel: any = null;
  private gameId: string | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private localOnly = false;

  connect(gameId: string, fallbackToLocal = false): void {
    if (this.channel) {
      this.disconnect();
    }

    this.gameId = gameId;
    this.localOnly = fallbackToLocal;
    
    if (fallbackToLocal) {
      // Use local storage only mode - no realtime connection
      console.log('Using local storage mode only (no live sync)');
      this.trigger('connected', { gameId, localOnly: true });
      return;
    }
    
    try {
      console.log(`Attempting to connect to game ${gameId} using Supabase Realtime`);
      // Set up Supabase realtime channel
      this.channel = supabase
        .channel(`game-${gameId}`)
        .on('broadcast', { event: 'gameUpdate' }, (payload) => {
          try {
            if (payload.payload && payload.payload.fields) {
              this.trigger('gameUpdate', { fields: payload.payload.fields });
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Connected to game ${gameId}`);
            this.reconnectAttempts = 0;
            this.trigger('connected', { gameId });
            
            // Clear any pending reconnect timeouts
            if (this.reconnectTimeout) {
              clearTimeout(this.reconnectTimeout);
              this.reconnectTimeout = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
            console.error(`Channel error for game ${gameId}:`, status);
            this.handleDisconnection(status);
          }
        });
    } catch (error) {
      console.error('Failed to connect to Supabase Realtime:', error);
      this.trigger('error', { 
        gameId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Fall back to local mode
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.trigger('fallback', { gameId, localOnly: true });
        this.localOnly = true;
      }
    }
  }

  private handleDisconnection(reason: string): void {
    console.log(`Disconnected from game ${this.gameId}`, reason);
    this.trigger('disconnected', { 
      gameId: this.gameId, 
      code: 0,
      reason: reason || 'Unknown reason'
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
      this.trigger('fallback', { gameId: this.gameId, localOnly: true });
      this.localOnly = true;
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.gameId = null;
      this.reconnectAttempts = 0;
      this.localOnly = false;
    }
  }

  sendUpdate(fields: Field[]): void {
    if (this.gameId) {
      // First save to database
      if (!this.localOnly) {
        setGameState(this.gameId, fields);
      }
      
      // Then broadcast via realtime
      if (this.channel && !this.localOnly) {
        this.channel.send({
          type: 'broadcast',
          event: 'gameUpdate',
          payload: { fields }
        });
      }
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
    return this.channel !== null || this.localOnly;
  }
}

// Export singleton instance
export const socketService = new SocketService();
