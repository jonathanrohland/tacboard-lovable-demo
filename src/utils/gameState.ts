
import { supabase } from "@/integrations/supabase/client";
import { Field } from "@/types/game";

// Store game state in localStorage (fallback/duplicate for offline play)
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

// SUPABASE integration

export const getGameState = async (gameId: string): Promise<Field[] | null> => {
  const { data, error } = await supabase
    .from("games")
    .select("fields")
    .eq("id", gameId)
    .maybeSingle();
  if (error) {
    console.error("Supabase: error fetching game state", error);
    return null;
  }
  if (!data) return null;
  return data.fields as Field[];
};

export const setGameState = async (gameId: string, fields: Field[]): Promise<boolean> => {
  const { error } = await supabase
    .from("games")
    .upsert([
      {
        id: gameId,
        fields,
        updated_at: new Date().toISOString(),
      },
    ]);
  if (error) {
    console.error("Supabase: error saving game state", error);
    return false;
  }
  return true;
};
