
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { socketService } from '@/services/socketService';
import { generateGameId, loadGameState, saveGameState } from '@/utils/gameState';
import { Field, GameState } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, CopyIcon, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface GameControllerProps {
  initialFields: Field[];
  onFieldsUpdate: (fields: Field[]) => void;
}

const GameController: React.FC<GameControllerProps> = ({ initialFields, onFieldsUpdate }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [gameId, setGameId] = useState<string>(() => {
    return searchParams.get('game') || '';
  });
  const [isConnected, setIsConnected] = useState(false);
  const [joinInput, setJoinInput] = useState('');

  // On first load, check if we have a game ID in the URL
  useEffect(() => {
    if (gameId) {
      joinExistingGame(gameId);
    }
  }, []);

  // Socket connection handling
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      toast.success('Connected to game');
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
      toast.error('Disconnected from game');
    };
    
    const handleGameUpdate = (data: any) => {
      if (data.fields) {
        onFieldsUpdate(data.fields);
      }
    };
    
    socketService.on('connected', handleConnect);
    socketService.on('disconnected', handleDisconnect);
    socketService.on('gameUpdate', handleGameUpdate);
    
    return () => {
      socketService.off('connected', handleConnect);
      socketService.off('disconnected', handleDisconnect);
      socketService.off('gameUpdate', handleGameUpdate);
      socketService.disconnect();
    };
  }, [onFieldsUpdate]);

  // Create a new game
  const createNewGame = () => {
    const newGameId = generateGameId();
    setGameId(newGameId);
    navigate(`/?game=${newGameId}`, { replace: true });
    joinExistingGame(newGameId);
    saveGameState(newGameId, initialFields);
    toast.success(`New game created: ${newGameId}`);
  };

  // Join an existing game
  const joinExistingGame = (id: string) => {
    if (!id) return;
    
    socketService.disconnect();
    socketService.connect(id);
    setGameId(id);
    navigate(`/?game=${id}`, { replace: true });
    
    // Attempt to load from local storage first
    const savedState = loadGameState(id);
    if (savedState) {
      onFieldsUpdate(savedState);
    }
  };

  // Copy the game URL to clipboard
  const copyGameUrl = () => {
    const url = `${window.location.origin}/?game=${gameId}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Game URL copied to clipboard'))
      .catch(() => toast.error('Failed to copy URL'));
  };

  // Submit handler for joining a game
  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinInput.trim()) {
      joinExistingGame(joinInput.trim());
      setJoinInput('');
    }
  };

  return (
    <div className="space-y-4 bg-white/80 p-4 rounded-lg shadow-md">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Game Controls</h3>
          {isConnected ? (
            <span className="inline-flex items-center text-sm text-green-600">
              <span className="w-2 h-2 bg-green-600 rounded-full mr-1"></span>
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center text-sm text-red-600">
              <span className="w-2 h-2 bg-red-600 rounded-full mr-1"></span>
              Disconnected
            </span>
          )}
        </div>
        
        {gameId ? (
          <div className="border border-gray-200 rounded p-2 bg-gray-50 flex items-center justify-between">
            <span className="text-gray-700 font-medium">Game ID: {gameId}</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyGameUrl}
                className="h-8"
              >
                <CopyIcon size={16} className="mr-1" />
                Copy Link
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={createNewGame} className="w-full">Create New Game</Button>
        )}
      </div>
      
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Join Existing Game</h4>
        <form onSubmit={handleJoinSubmit} className="flex gap-2">
          <Input
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            placeholder="Enter Game ID"
            className="flex-1"
          />
          <Button type="submit">Join</Button>
        </form>
      </div>
      
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={createNewGame}>
          <RefreshCw size={16} className="mr-1" /> New Game
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={copyGameUrl}
          disabled={!gameId}
        >
          <Share2 size={16} className="mr-1" /> Share Game
        </Button>
      </div>
    </div>
  );
};

export default GameController;
