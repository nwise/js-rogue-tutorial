import * as ROT from 'rot-js';
import type { Tile } from './tile-types';
import { WALL_TILE } from './tile-types';
import { Display } from 'rot-js';
import { Actor, Entity, Item } from './entity';
import type { PixiRenderer } from './pixi-renderer';
import { DEBUG_FOV, DEBUG_WALLS, isSurfaceWall, WALL_MASK_CHARS, wallMask } from './dawnlike-map';

export class GameMap {
  tiles: Tile[][];
  downstairsLocation: [number, number];

  constructor(
    public width: number,
    public height: number,
    public display: Display,
    public entities: Entity[],
  ) {
    this.tiles = new Array(this.height);
    for (let y = 0; y < this.height; y++) {
      const row = new Array(this.width);
      for (let x = 0; x < this.width; x++) {
        row[x] = { ...WALL_TILE };
      }
      this.tiles[y] = row;
    }
    this.downstairsLocation = [0, 0];
  }

  public get gameMap(): GameMap {
    return this;
  }

  public get actors(): Actor[] {
    return this.entities
      .filter((e) => e instanceof Actor)
      .map((e) => e as Actor)
      .filter((a) => a.isAlive);
  }

  public get items(): Item[] {
    return this.entities.filter((e) => e instanceof Item).map((e) => e as Item);
  }

  removeEntity(entity: Entity) {
    const index = this.entities.indexOf(entity);
    if (index >= 0) {
      this.entities.splice(index, 1);
    }
  }

  isInBounds(x: number, y: number) {
    return 0 <= x && x < this.width && 0 <= y && y < this.height;
  }

  getBlockingEntityAtLocation(x: number, y: number): Entity | undefined {
    return this.entities.find(
      (e) => e.blocksMovement && e.x === x && e.y === y,
    );
  }

  getActorAtLocation(x: number, y: number): Actor | undefined {
    return this.actors.find((a) => a.x === x && a.y === y);
  }

  addRoom(x: number, y: number, roomTiles: Tile[][]) {
    for (let curY = y; curY < y + roomTiles.length; curY++) {
      const mapRow = this.tiles[curY];
      const roomRow = roomTiles[curY - y];
      for (let curX = x; curX < x + roomRow.length; curX++) {
        mapRow[curX] = roomRow[curX - x];
      }
    }
  }

  lightPasses(x: number, y: number): boolean {
    if (this.isInBounds(x, y)) {
      return this.tiles[y][x].transparent;
    }
    return false;
  }

  updateFov(player: Entity) {
    if (DEBUG_FOV) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          this.tiles[y][x].visible = true;
          this.tiles[y][x].seen = true;
        }
      }
      return;
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x].visible = false;
      }
    }

    const fov = new ROT.FOV.PreciseShadowcasting(this.lightPasses.bind(this));
    fov.compute(player.x, player.y, 8, (x, y, _r, visibility) => {
      if (visibility === 1) {
        this.tiles[y][x].visible = true;
        this.tiles[y][x].seen = true;
      }
    });
  }

  render(camX: number, camY: number, viewW: number, viewH: number) {
    for (let screenY = 0; screenY < viewH; screenY++) {
      for (let screenX = 0; screenX < viewW; screenX++) {
        const x = screenX + camX;
        const y = screenY + camY;
        const tile = this.tiles[y]?.[x];
        if (!tile) continue;

        let char = ' ';
        let fg = '#fff';
        let bg = '#000';

        if (tile.visible) {
          char = tile.light.char;
          fg = tile.light.fg;
          bg = tile.light.bg;
          if (!tile.walkable) {
            if (!isSurfaceWall(this.tiles, x, y, this.width, this.height)) {
              char = ' ';
            } else {
              char = WALL_MASK_CHARS[wallMask(this.tiles, x, y, this.width, this.height)];
            }
          }
        } else if (tile.seen) {
          char = tile.dark.char;
          fg = tile.dark.fg;
          bg = tile.dark.bg;
          if (!tile.walkable) {
            char = DEBUG_WALLS
              ? WALL_MASK_CHARS[wallMask(this.tiles, x, y, this.width, this.height)]
              : ' ';
          } else {
            char = ' ';
          }
        }

        this.display.draw(screenX, screenY, char, fg, bg);
      }
    }

    const sortedEntities = this.entities
      .slice()
      .sort((a, b) => a.renderOrder - b.renderOrder);

    sortedEntities.forEach((e) => {
      if (this.tiles[e.y]?.[e.x]?.visible) {
        const screenX = e.x - camX;
        const screenY = e.y - camY;
        if (screenX >= 0 && screenX < viewW && screenY >= 0 && screenY < viewH) {
          this.display.draw(screenX, screenY, e.char, e.fg, e.bg);
        }
      }
    });
  }

  renderToPixi(pixiRenderer: PixiRenderer, camX: number, camY: number): void {
    pixiRenderer.renderMap(this, camX, camY);
    pixiRenderer.renderEntities(this, camX, camY);
  }
}
