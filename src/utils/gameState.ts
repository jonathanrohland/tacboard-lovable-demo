
import { Field } from "@/types/game";

// Store game state in localStorage (temporary fallback)
export const saveGameState = (gameId: string, fields: Field[]) => {
  localStorage.setItem(`tac-game-${gameId}`, JSON.stringify(fields));
};

// Retrieve game state from localStorage
export const loadGameState = (gameId: string): Field[] | null => {
  const savedState = localStorage.getItem(`tac-game-${gameId}`);
  if (!savedState) return null;
  
  try {
    return JSON.parse(savedState);
  } catch (error) {
    console.error("Error parsing saved game state:", error);
    return null;
  }
};

// Generate a random game ID
export const generateGameId = (): string => {
  return Math.random().toString(36).substring(2, 10);
};
