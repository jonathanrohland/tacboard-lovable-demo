import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { socketService } from "@/services/socketService";
import { Field, MarbleObj } from "@/types/game";
import { saveGameState, getGameState, loadGameState } from "@/utils/gameState";
import GameController from "./GameController";
import BoardBackground from "./game/BoardBackground";
import BoardFields from "./game/BoardFields";
import UndoButton from "./game/UndoButton";
import { BOARD_SIZE, PLAYER_COLORS } from "@/utils/gamePositions";

function initialFields(): Field[] {
  // Circle: 64 fields, empty
  const circle: Field[] = Array.from({ length: 64 }, (_, i) => ({
    type: "circle",
    idx: i,
    marble: undefined,
  }));
  // Targets: 4 per player
  const targets: Field[] = [];
  for (let p = 0; p < 4; p++)
    for (let i = 0; i < 4; i++)
      targets.push({
        type: "target",
        player: p,
        idx: i,
        marble: undefined,
      });
  // Homes: 4 per player, all marbles start at their home
  const homes: Field[] = [];
  for (let p = 0; p < 4; p++)
    for (let i = 0; i < 4; i++)
      homes.push({
        type: "home",
        player: p,
        idx: i,
        marble: { color: PLAYER_COLORS[p], player: p },
      });
  return [...circle, ...targets, ...homes];
}

function cloneFields(fields: Field[]) {
  return fields.map(f => ({ ...f, marble: f.marble ? { ...f.marble } : undefined }));
}

function findFirstHomeSlot(fields: Field[], player: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    // Only check fields of type "home" that belong to the player and are empty
    if (field.type === "home" && field.player === player && !field.marble) {
      return i;
    }
  }
  return null;
}

const TacBoard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('game');
  const [fields, setFields] = useState<Field[]>(initialFields());
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<Field[][]>([]);

  // Initial state loading effect
  useEffect(() => {
    if (!gameId) return; // no game to sync
    
    let mounted = true;
    
    const loadInitialState = async () => {
      try {
        // Try Supabase first
        const supabaseFields = await getGameState(gameId);
        if (supabaseFields && mounted) {
          console.log("Loaded game state from Supabase:", supabaseFields.length, "fields");
          setFields(supabaseFields);
          return;
        }
        
        // Fall back to localStorage
        const localFields = loadGameState(gameId);
        if (localFields && mounted) {
          console.log("Loaded game state from local storage:", localFields.length, "fields");
          setFields(localFields);
        }
      } catch (error) {
        console.error("Error loading initial game state:", error);
      }
    };
    
    loadInitialState();
    return () => {
      mounted = false;
    };
  }, [gameId]);

  // WebSocket handling effect
  useEffect(() => {
    if (!gameId) return;
    
    const handleGameUpdate = (data: { fields: Field[] }) => {
      console.log("Received game update via WebSocket:", data.fields.length, "fields");
      setFields(data.fields);
    };
    
    // Connect to the WebSocket
    socketService.connect(gameId);
    
    // Register handler for game updates
    socketService.on('gameUpdate', handleGameUpdate);
    
    // Clean up on unmount
    return () => {
      socketService.off('gameUpdate', handleGameUpdate);
      socketService.disconnect();
    };
  }, [gameId]);

  function isValidMove(from: Field, to: Field, marble: MarbleObj) {
    // Check if target or home belongs to the right player
    if (to.type === "target" && to.player !== marble.player) return false;
    if (to.type === "home" && to.player !== marble.player) return false;
    // No other validation requested.
    return true;
  }

  const onFieldClick = useCallback((idx: number) => {
    const f = fields[idx];
    if (selected == null) {
      // Pick up if marble
      if (f.marble) setSelected(idx);
      return;
    }
    if (selected === idx) {
      // Deselect
      setSelected(null);
      return;
    }

    const from = fields[selected];
    const to = fields[idx];
    const marble = from.marble;
    if (!marble) {
      setSelected(null);
      return;
    }
    if (!isValidMove(from, to, marble)) {
      setSelected(null);
      return;
    }

    // Save history for undo
    setHistory(prev => [...prev, cloneFields(fields)]);

    let next = cloneFields(fields);
    // If target occupied, send that marble "home" (first empty slot for its player)
    if (to.marble) {
      if (to.type === "target" || to.type === "circle") {
        const homeSlot = findFirstHomeSlot(next, to.marble.player);
        if (homeSlot !== null) {
          next[homeSlot].marble = { ...to.marble };
        }
      }
    }
    // Move marble
    next[idx].marble = marble;
    next[selected].marble = undefined;
    
    // Update fields locally first
    setFields(next);
    setSelected(null);
    
    // Then send update through WebSocket service
    if (gameId) {
      console.log("Sending update to WebSocket (local user action):", next.length, "fields");
      socketService.sendUpdate(next);
    }
  }, [fields, selected, gameId]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = cloneFields(history[history.length - 1]);
    setFields(previousState);
    setHistory(h => h.slice(0, h.length - 1));
    setSelected(null);
    
    // Send the undo state through the WebSocket
    if (gameId) {
      console.log("Sending undo update to WebSocket (local user action)");
      socketService.sendUpdate(previousState);
    }
  }

  const handleFieldsUpdate = useCallback((updatedFields: Field[]) => {
    setFields(updatedFields);
    setSelected(null);
    
    // Send the update through the WebSocket if it's a local action (not from socket)
    if (gameId && !socketService.isRemoteUpdate()) {
      console.log("Sending update from game controller (local user action)");
      socketService.sendUpdate(updatedFields);
    }
  }, [gameId]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        <div className="md:col-span-2 flex flex-col items-center">
          <div className="relative shadow-xl" style={{ width: BOARD_SIZE, height: BOARD_SIZE }}>
            <svg
              width={BOARD_SIZE}
              height={BOARD_SIZE}
              viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
              className="block z-10 pointer-events-auto"
            >
              <BoardBackground />
              <BoardFields
                fields={fields}
                selected={selected}
                onFieldClick={onFieldClick}
              />
            </svg>
            
            <UndoButton onUndo={handleUndo} />
          </div>
          
          <div className="mt-5 text-gray-600 text-md">
            Click a marble to pick it up, then click another field to drop it. If a marble is already on the target field, it is sent home.
          </div>
        </div>
        
        <div className="md:col-span-1">
          <GameController initialFields={initialFields()} onFieldsUpdate={handleFieldsUpdate} />
        </div>
      </div>
    </div>
  );
};

export default TacBoard;
