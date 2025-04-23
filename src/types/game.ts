
export type MarbleObj = {
  color: string;
  player: number; // 0–3
};

export type Field =
  | { type: "circle"; idx: number; marble?: MarbleObj }
  | { type: "target"; player: number; idx: number; marble?: MarbleObj }
  | { type: "home"; player: number; idx: number; marble?: MarbleObj };

export type GameState = {
  fields: Field[];
  currentPlayer: number;
  gameId: string;
};
