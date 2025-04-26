
// Board and field sizes
export const BOARD_SIZE = 800;
export const FIELD_SIZE = 36;
export const CENTER = BOARD_SIZE / 2;
export const CIRCLE_RADIUS = 320;

// Main colors per player (red, blue, green, yellow)
export const PLAYER_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#eab308", // yellow
];

// Home/target areas per player
export const HOME_POSITIONS = [
  { x: 48, y: 48 }, // TL
  { x: BOARD_SIZE - 112, y: 48 }, // TR
  { x: BOARD_SIZE - 112, y: BOARD_SIZE - 112 }, // BR
  { x: 48, y: BOARD_SIZE - 112 }, // BL
];

// Target areas positions
export const TARGET_STARTS = [
  { x: CENTER, y: 120, dx: 0, dy: 36 }, // top down
  { x: BOARD_SIZE - 120, y: CENTER, dx: -36, dy: 0 }, // right left
  { x: CENTER, y: BOARD_SIZE - 120, dx: 0, dy: -36 }, // bottom up
  { x: 120, y: CENTER, dx: 36, dy: 0 }, // left right
];

export function getCirclePosition(idx: number, total = 64, center = CENTER, radius = CIRCLE_RADIUS) {
  const angle = (2 * Math.PI * idx) / total - Math.PI / 2;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}
