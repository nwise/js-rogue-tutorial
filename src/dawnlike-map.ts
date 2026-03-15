export type SpriteRef = { sheet: string; x: number; y: number };

/** Size of each tile in the DawnLike sprite sheets, in pixels. */
export const TILE_SIZE = 16;

/** Convert 1-based grid column/row to pixel coordinates for a SpriteRef. */
function g(sheet: string, col: number, row: number): SpriteRef {
  return { sheet, x: (col - 1) * TILE_SIZE, y: (row - 1) * TILE_SIZE };
}

/**
 * Compute a 4-bit neighbor bitmask for a wall tile.
 * A bit is set only when the neighbor is a "surface wall" — a wall tile that
 * is itself adjacent to at least one floor tile. This prevents the solid
 * dungeon-exterior mass from being counted as connections, which would turn
 * straight wall edges into T-junctions.
 *   N = 1, E = 2, S = 4, W = 8
 */
/**
 * Returns true if (x, y) is a non-walkable tile that is adjacent (cardinal or
 * diagonal) to at least one floor tile. Outer dungeon mass that is only
 * adjacent to other walls returns false.
 */
export function isSurfaceWall(
  tiles: { walkable: boolean }[][],
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  const inBounds = (cx: number, cy: number) =>
    cx >= 0 && cy >= 0 && cx < width && cy < height;
  if (!inBounds(x, y) || tiles[y][x].walkable) return false;
  if (
    (inBounds(x, y - 1) && tiles[y - 1][x].walkable) ||
    (inBounds(x, y + 1) && tiles[y + 1][x].walkable) ||
    (inBounds(x - 1, y) && tiles[y][x - 1].walkable) ||
    (inBounds(x + 1, y) && tiles[y][x + 1].walkable)
  ) return true;
  return (
    (inBounds(x - 1, y - 1) && tiles[y - 1][x - 1].walkable) ||
    (inBounds(x + 1, y - 1) && tiles[y - 1][x + 1].walkable) ||
    (inBounds(x - 1, y + 1) && tiles[y + 1][x - 1].walkable) ||
    (inBounds(x + 1, y + 1) && tiles[y + 1][x + 1].walkable)
  );
}

export function wallMask(
  tiles: { walkable: boolean }[][],
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const _isSurfaceWall = (cx: number, cy: number) =>
    isSurfaceWall(tiles, cx, cy, width, height);
  let mask = 0;
  if (_isSurfaceWall(x, y + 1)) mask |= 1; // N (tile-art north = screen down)
  if (_isSurfaceWall(x + 1, y)) mask |= 2; // E
  if (_isSurfaceWall(x, y - 1)) mask |= 4; // S (tile-art south = screen up)
  if (_isSurfaceWall(x - 1, y)) mask |= 8; // W
  return mask;
}

/**
 * Sprite for each 4-bit neighbor mask (0–15).
 * N=1, E=2, S=4, W=8 — set bit = wall neighbor in that direction.
 *
 * Update the grid coordinates here once you've identified the matching
 * tiles for your wall style in Floor.png.
 */
const WALL_MASK_SPRITES: SpriteRef[] = [
  g('Wall', 3, 1), //  0 ·  isolated        -- TODO: find correct sprite
  g('Wall', 1, 5), //  1 ╷  N               -- TODO: find correct sprite
  g('Wall', 2, 4), //  2 ╶  E               -- TODO: find correct sprite
  g('Wall', 1, 4), //  3 ┌  N+E             -- CORRECT
  g('Wall', 2, 5), //  4 ╵  S               -- TODO: find correct sprite
  g('Wall', 1, 5), //  5 │  N+S             -- TODO: find correct sprite (showing horizontal bars)
  g('Wall', 1, 6), //  6 └  S+E             -- CORRECT
  g('Wall', 1, 4), //  7 ├  N+S+E           -- TODO: wrong (reusing ┌ corner)
  g('Wall', 2, 4), //  8 ╴  W               -- TODO: find correct sprite
  g('Wall', 3, 4), //  9 ┐  N+W             -- CORRECT
  g('Wall', 2, 4), // 10 ─  E+W             -- CORRECT
  g('Wall', 2, 4), // 11 ┬  N+E+W           -- TODO: wrong (reusing ─)
  g('Wall', 3, 6), // 12 ┘  S+W             -- CORRECT
  g('Wall', 3, 4), // 13 ┤  N+S+W           -- TODO: wrong (reusing ┐ corner)
  g('Wall', 2, 4), // 14 ┴  S+E+W           -- TODO: wrong (reusing ─)
  g('Wall', 2, 4), // 15 ┼  N+S+E+W         -- TODO: find correct sprite
];

export function wallSpriteForMask(mask: number): SpriteRef {
  return WALL_MASK_SPRITES[mask & 0xf];
}

/**
 * Debug characters for each 4-bit wall mask.
 * Lets you verify bitmask detection in the rot-js text layer before
 * committing to sprite coordinates.
 * N=1(down), E=2(right), S=4(up), W=8(left)
 */
export const WALL_MASK_CHARS: string[] = [
  '·', //  0: isolated -- ?
  '╷', //  1: N -- ?
  '╶', //  2: E -- ?
  '┌', //  3: N+E -- correct
  '╵', //  4: S -- ?
  '│', //  5: N+S -- ?
  '└', //  6: S+E -- correct
  '├', //  7: N+S+E -- ?
  '╴', //  8: W -- ?
  '┐', //  9: N+W - correct
  '─', // 10: E+W -- ?
  '┬', // 11: N+E+W -- ?
  '┘', // 12: S+W -- correct
  '┤', // 13: N+S+W -- ?
  '┴', // 14: S+E+W -- ?
  '┼', // 15: N+S+E+W -- ?
];

/** Set to true to render wall bitmask debug chars instead of sprites. */
export const DEBUG_WALLS = false;

/** Set to true to reveal the entire map (disables fog of war). */
export const DEBUG_FOV = false;

// Floor/Wall use palette PNGs. Character/item sheets use RGBA PNGs.

export const TILE_SPRITES: Record<string, SpriteRef> = {
  // Floor.png row 6 col 0 — grey stone dungeon floor
  floor: g('Floor', 2, 8),
  // Wall.png row 3 col 0 — blue-grey stone wall
  wall: g('Floor', 5, 6),
  // Decor0.png row 9 col 0 — stairs/ladder decor
  stairs: g('Decor0', 2, 9),
  // Floor.png row 0 col 0 — near-black void tile
  unseen: g('Floor', 0, 0),
};

/** Player sprite keyed by CharacterClass (null = default). */
export const PLAYER_CLASS_SPRITES: Record<string, SpriteRef> = {
  warrior: g('Player0', 2, 4),
  wizard:  g('Player0', 7, 4),
  thief:   g('Player0', 3, 9),
};

export const ENTITY_SPRITES: Record<string, SpriteRef> = {
  // Player (default / no class selected)
  '@': g('Player0', 2, 8),

  // Enemies
  r: g('Rodent0', 2, 3),    // Rat
  g: g('Humanoid0', 1, 5),  // Goblin
  o: g('Humanoid0', 1, 2),  // Orc
  T: g('Humanoid0', 1, 8),      // Troll
  s: g('Undead0', 1, 3),    // Skeleton
  O: g('Player0', 1, 13),      // Ogre
  V: g('Undead0', 1, 0),    // Vampire

  // Items
  '!': g('Potion', 2, 0),   // Health potion
  '?': g('Scroll', 1, 0),   // Scroll
  '/': g('LongWep', 0, 5),  // Weapon
  '[': g('Armor', 2, 0),    // Armor
};

/** Placeholder used when a char has no mapping. */
export const PLACEHOLDER_SPRITE: SpriteRef = g('Potion', 0, 0);
