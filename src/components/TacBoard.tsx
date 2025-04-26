import React, { useState, useEffect, useCallback } from "react";
import BoardField from "./BoardField";
import { Undo } from "lucide-react";
import { socketService } from "@/services/socketService";
import { Field, MarbleObj } from "@/types/game";
import { saveGameState, getGameState, setGameState, loadGameState } from "@/utils/gameState";
import { useSearchParams } from "react-router-dom";
import GameController from "./GameController";

// Main colors per player (red, blue, green, yellow)
const PLAYER_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
];

// Home/target areas per player
const HOME_POSITIONS = [
  { x: 48, y: 48 }, // TL
  { x: 552, y: 48 }, // TR
  { x: 552, y: 552 }, // BR
  { x: 48, y: 552 }, // BL
];

// Target areas: placed at right/left/up/down of center (center 300,300, offset to fit)
const TARGET_STARTS = [
  { x: 300, y: 98, dx: 0, dy: 32 }, // top down
  { x: 502, y: 300, dx: -32, dy: 0 }, // right left
  { x: 300, y: 502, dx: 0, dy: -32 }, // bottom up
  { x: 98, y: 300, dx: 32, dy: 0 }, // left right
];

// Board and field sizes
const BOARD_SIZE = 800;
const FIELD_SIZE = 36;
const CENTER = BOARD_SIZE / 2;
const CIRCLE_RADIUS = 320;

// Update target and home positions to match reduced field size
const HOME_POSITIONS2 = [
  { x: 24, y: 24 }, // TL - moved closer to top-left corner
  { x: BOARD_SIZE - 84, y: 24 }, // TR - moved closer to top-right corner
  { x: BOARD_SIZE - 84, y: BOARD_SIZE - 84 }, // BR - moved closer to bottom-right corner
  { x: 24, y: BOARD_SIZE - 84 }, // BL - moved closer to bottom-left corner
];

// Target starts positions
const TARGET_STARTS2 = [
  { x: CENTER, y: 120, dx: 0, dy: 36 }, // top down
  { x: BOARD_SIZE - 120, y: CENTER, dx: -36, dy: 0 }, // right left
  { x: CENTER, y: BOARD_SIZE - 120, dx: 0, dy: -36 }, // bottom up
  { x: 120, y: CENTER, dx: 36, dy: 0 }, // left right
];

function getCirclePos2(idx: number, total = 64, center = CENTER, radius = CIRCLE_RADIUS) {
  const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

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

  // Fetch initial state from Supabase (or fallback to local storage)
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

  // Set up WebSocket handling for game updates
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

  // Helper for finding field's location on board
  function fieldPos(field: Field) {
    if (field.type === "circle") {
      return getCirclePos2(field.idx);
    }
    if (field.type === "target") {
      const start = TARGET_STARTS2[field.player];
      const { dx, dy } = start;
      return {
        x: start.x + dx * field.idx,
        y: start.y + dy * field.idx,
      };
    }
    if (field.type === "home") {
      // Reduce spacing between marbles from 48px to 36px
      const base = HOME_POSITIONS2[field.player];
      return {
        x: base.x + 36 * (field.idx % 2),
        y: base.y + 36 * Math.floor(field.idx / 2),
      };
    }
    return { x: 0, y: 0 };
  }

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

  function handleUndo() {
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

  // Handle fields update from the game controller
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
            {/* Wood BG */}
            <img
              src="/lovable-uploads/6bdc1463-fdb3-45f1-96f1-af0281030cd6.png"
              alt="Tac Board"
              className="absolute left-0 top-0 w-full h-full object-cover rounded-xl z-0"
              draggable={false}
              style={{ opacity: 0.22, pointerEvents: "none" }}
            />
            {/* SVG Overlay */}
            <svg
              width={BOARD_SIZE}
              height={BOARD_SIZE}
              viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
              className="block z-10 pointer-events-auto"
            >
              {/* Main circle */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={CIRCLE_RADIUS}
                fill="#f8f8f6"
                stroke="#b19765"
                strokeWidth={5}
              />
              
              {/* Render fields with updated sizes and positions */}
              {fields
                .filter(f => f.type === "circle")
                .map((field, i) => {
                  const { x, y } = fieldPos(field);
                  return (
                    <BoardField
                      key={"c-" + i}
                      x={x}
                      y={y}
                      marble={field.marble ?? undefined}
                      isSelected={selected === i}
                      onClick={() => onFieldClick(i)}
                      size={FIELD_SIZE}
                      highlight={selected !== null}
                    />
                  );
                })}
              
              {/* Target areas */}
              {fields
                .filter(f => f.type === "target")
                .map((field, i) => {
                  const idx = fields.indexOf(field);
                  const { x, y } = fieldPos(field);
                  return (
                    <BoardField
                      key={"t-" + i}
                      x={x}
                      y={y}
                      marble={field.marble ?? undefined}
                      isSelected={selected === idx}
                      isTarget
                      bgColor="#e3eeff"
                      onClick={() => onFieldClick(idx)}
                      size={FIELD_SIZE}
                      highlight={selected !== null}
                    />
                  );
                })}
              {/* Home/corner areas */}
              {fields
                .filter(f => f.type === "home")
                .map((field, i) => {
                  const idx = fields.indexOf(field);
                  const { x, y } = fieldPos(field);
                  return (
                    <BoardField
                      key={"h-" + i}
                      x={x}
                      y={y}
                      marble={field.marble ?? undefined}
                      isSelected={selected === idx}
                      isHome
                      bgColor="#fafafb"
                      onClick={() => onFieldClick(idx)}
                      size={FIELD_SIZE}
                      highlight={selected !== null}
                    />
                  );
                })}
            </svg>
            
            {/* Undo button - moved up */}
            <button
              className="absolute bottom-16 right-6 z-20 bg-white/90 rounded-full p-3 shadow-md hover:bg-blue-50 transition-all hover-scale"
              onClick={handleUndo}
              title="Undo"
            >
              <Undo size={28} className="text-blue-600" />
            </button>
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
