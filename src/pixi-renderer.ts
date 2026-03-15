import * as PIXI from 'pixi.js';
import { GameMap } from './game-map';
import { Actor } from './entity';
import {
  TILE_SPRITES,
  ENTITY_SPRITES,
  PLAYER_CLASS_SPRITES,
  PLACEHOLDER_SPRITE,
  SpriteRef,
  isSurfaceWall,
  wallMask,
  wallSpriteForMask,
  DEBUG_WALLS,
} from './dawnlike-map';

const SHEET_NAMES = [
  'Floor',
  'Wall',
  'Decor0',
  'Player0',
  'Humanoid0',
  'Rodent0',
  'Undead0',
  'Misc0',
  'Potion',
  'Scroll',
  'LongWep',
  'Armor',
];

const TILE_SIZE = 16;
const ASSETS_BASE = '/assets/dawnlike/';

// Must match Engine.MAP_HEIGHT / GameScreen.MAP_HEIGHT
const MAP_ROWS = 27;

export class PixiRenderer {
  app: PIXI.Application;
  private textures: Map<string, PIXI.Texture> = new Map();
  private mapLayer: PIXI.Container;
  private entityLayer: PIXI.Container;
  private battleLayer: PIXI.Container;
  private ready = false;

  constructor(private gridWidth: number) {
    this.app = new PIXI.Application();
    this.mapLayer = new PIXI.Container();
    this.entityLayer = new PIXI.Container();
    this.battleLayer = new PIXI.Container();
  }

  async init(rotCanvas: HTMLCanvasElement): Promise<void> {
    const cellPx = rotCanvas.width / this.gridWidth;
    const w = rotCanvas.width;
    const h = MAP_ROWS * cellPx;

    await this.app.init({
      width: w,
      height: h,
      // Transparent background so rot-js shows through for unseen areas
      // and as a fallback when textures are missing.
      backgroundAlpha: 0,
      antialias: false,
      resolution: 1,
    });

    this.app.stage.addChild(this.mapLayer);
    this.app.stage.addChild(this.entityLayer);
    this.app.stage.addChild(this.battleLayer);

    await this.loadTextures();
    this.ready = true;
  }

  private async loadTextures(): Promise<void> {
    PIXI.TextureSource.defaultOptions.scaleMode = 'nearest';
    for (const name of SHEET_NAMES) {
      try {
        const base = await PIXI.Assets.load<PIXI.Texture>(
          `${ASSETS_BASE}${name}.png`,
        );
        this.textures.set(`${name}:base`, base);
      } catch {
        console.warn(`[PixiRenderer] failed to load: ${name}.png`);
      }
    }
  }

  private getTexture(ref: SpriteRef): PIXI.Texture | null {
    const base = this.textures.get(`${ref.sheet}:base`);
    if (!base) return null;
    const key = `${ref.sheet}:${ref.x}:${ref.y}`;
    if (!this.textures.has(key)) {
      const frame = new PIXI.Rectangle(ref.x, ref.y, TILE_SIZE, TILE_SIZE);
      const tex = new PIXI.Texture({ source: base.source, frame });
      this.textures.set(key, tex);
    }
    return this.textures.get(key)!;
  }

  private cellPx(): number {
    return this.app.canvas.width / this.gridWidth;
  }

  private makeSprite(ref: SpriteRef): PIXI.Sprite | null {
    const tex = this.getTexture(ref) ?? this.getTexture(PLACEHOLDER_SPRITE);
    if (!tex) return null;
    const sprite = new PIXI.Sprite(tex);
    const px = this.cellPx();
    sprite.width = px;
    sprite.height = px;
    return sprite;
  }

  renderMap(gameMap: GameMap, camX: number, camY: number): void {
    if (!this.ready) return;
    this.mapLayer.removeChildren();

    const px = this.cellPx();
    const viewW = this.gridWidth;
    const viewH = MAP_ROWS;

    for (let screenY = 0; screenY < viewH; screenY++) {
      for (let screenX = 0; screenX < viewW; screenX++) {
        const x = screenX + camX;
        const y = screenY + camY;
        const tile = gameMap.tiles[y]?.[x];
        if (!tile) continue;

        let ref: SpriteRef;
        let alpha = 1;

        if (tile.visible) {
          const [dsX, dsY] = gameMap.downstairsLocation;
          if (x === dsX && y === dsY) {
            ref = TILE_SPRITES['stairs'];
          } else if (tile.walkable) {
            ref = TILE_SPRITES['floor'];
          } else {
            if (DEBUG_WALLS) continue;
            if (!isSurfaceWall(gameMap.tiles, x, y, gameMap.width, gameMap.height)) continue;
            ref = wallSpriteForMask(wallMask(gameMap.tiles, x, y, gameMap.width, gameMap.height));
          }
        } else if (tile.seen) {
          const [dsX, dsY] = gameMap.downstairsLocation;
          if (x === dsX && y === dsY) {
            ref = TILE_SPRITES['stairs'];
          } else if (tile.walkable) {
            ref = TILE_SPRITES['floor'];
          } else {
            if (DEBUG_WALLS) continue;
            if (!isSurfaceWall(gameMap.tiles, x, y, gameMap.width, gameMap.height)) continue;
            ref = wallSpriteForMask(wallMask(gameMap.tiles, x, y, gameMap.width, gameMap.height));
          }
          alpha = 0.4;
        } else {
          continue;
        }

        const sprite = this.makeSprite(ref);
        if (sprite) {
          sprite.x = screenX * px;
          sprite.y = screenY * px;
          sprite.alpha = alpha;
          this.mapLayer.addChild(sprite);
        }
      }
    }
  }

  renderEntities(gameMap: GameMap, camX: number, camY: number): void {
    if (!this.ready) return;
    this.entityLayer.removeChildren();

    const px = this.cellPx();
    const viewW = this.gridWidth;
    const viewH = MAP_ROWS;

    const sorted = gameMap.entities
      .slice()
      .sort((a, b) => a.renderOrder - b.renderOrder);

    for (const entity of sorted) {
      if (!gameMap.tiles[entity.y]?.[entity.x]?.visible) continue;

      const screenX = entity.x - camX;
      const screenY = entity.y - camY;
      if (screenX < 0 || screenX >= viewW || screenY < 0 || screenY >= viewH) continue;

      let ref: SpriteRef;
      if (entity.char === '@') {
        const playerClass = window.engine.player.level.characterClass;
        ref = (playerClass && PLAYER_CLASS_SPRITES[playerClass]) ?? ENTITY_SPRITES['@'] ?? PLACEHOLDER_SPRITE;
      } else {
        ref = ENTITY_SPRITES[entity.char] ?? PLACEHOLDER_SPRITE;
      }
      const sprite = this.makeSprite(ref);
      if (sprite) {
        sprite.x = screenX * px;
        sprite.y = screenY * px;
        this.entityLayer.addChild(sprite);
      }
    }
  }

  renderBattleSprites(
    enemy: Actor,
    _playerClass: string | null,
    enemyCenterCol: number,
    playerCenterCol: number,
    artTopRow: number,
  ): void {
    if (!this.ready) return;
    this.battleLayer.removeChildren();

    const px = this.cellPx();
    const spriteHeightCells = 5;
    const spritePx = spriteHeightCells * px;

    const enemyRef = ENTITY_SPRITES[enemy.char] ?? PLACEHOLDER_SPRITE;
    const enemyTex = this.getTexture(enemyRef);
    if (enemyTex) {
      const es = new PIXI.Sprite(enemyTex);
      es.width = spritePx;
      es.height = spritePx;
      es.x = enemyCenterCol * px - spritePx / 2;
      es.y = artTopRow * px;
      this.battleLayer.addChild(es);
    }

    const playerRef = (_playerClass !== null && PLAYER_CLASS_SPRITES[_playerClass]) || ENTITY_SPRITES['@'] || PLACEHOLDER_SPRITE;
    const playerTex = this.getTexture(playerRef);
    if (playerTex) {
      const ps = new PIXI.Sprite(playerTex);
      ps.width = spritePx;
      ps.height = spritePx;
      ps.x = playerCenterCol * px - spritePx / 2;
      ps.y = artTopRow * px;
      this.battleLayer.addChild(ps);
    }
  }

  clearBattleSprites(): void {
    this.battleLayer.removeChildren();
  }

  clearGameSprites(): void {
    this.mapLayer.removeChildren();
    this.entityLayer.removeChildren();
  }

  resize(rotCanvas: HTMLCanvasElement): void {
    if (!this.ready) return;
    const cellPx = rotCanvas.width / this.gridWidth;
    this.app.renderer.resize(rotCanvas.width, MAP_ROWS * cellPx);
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas as HTMLCanvasElement;
  }

  get isReady(): boolean {
    return this.ready;
  }
}
