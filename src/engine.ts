import * as ROT from 'rot-js';

import { BaseInputHandler, GameInputHandler } from './input-handler';
import { Actor } from './entity';
import { spawnPlayer } from './entity-factories';
import { BaseScreen } from './screens/base-screen';
// import { GameScreen } from './screens/game-screen';
import { MainMenu } from './screens/main-menu';
import { PixiRenderer } from './pixi-renderer';

export class Engine {
  public static readonly WIDTH = 50;
  public static readonly HEIGHT = 35;
  public static readonly MAP_WIDTH = 50;   // viewport width in tiles
  public static readonly MAP_HEIGHT = 27;  // viewport height in tiles
  public static readonly DUNGEON_WIDTH = 120;
  public static readonly DUNGEON_HEIGHT = 80;

  display: ROT.Display;
  pixiRenderer: PixiRenderer;
  inputHandler: BaseInputHandler;
  screen: BaseScreen;
  player: Actor;
  pendingBattle: { enemy: Actor } | null = null;
  cameraX = 0;
  cameraY = 0;

  constructor() {
    this.display = this.initRotDisplay();
    this.player = spawnPlayer(
      Math.floor(Engine.MAP_WIDTH / 2),
      Math.floor(Engine.MAP_HEIGHT / 2),
    );

    const rotCanvas = this.display.getContainer()! as HTMLCanvasElement;
    this.mountRotCanvas(rotCanvas);

    this.pixiRenderer = new PixiRenderer(Engine.WIDTH);
    this.inputHandler = new GameInputHandler();
    this.registerInputListeners();

    // this.screen = new GameScreen(this.display, this.player);
    this.screen = new MainMenu(this.display, this.player);

    this.initPixi(rotCanvas);
  }

  private initRotDisplay(): ROT.Display {
    return new ROT.Display({
      width: Engine.WIDTH,
      height: Engine.HEIGHT,
      forceSquareRatio: true,
      fontFamily: "'Courier New', monospace",
      fontSize: 29,
    });
  }

  private mountRotCanvas(canvas: HTMLCanvasElement): void {
    const appEl = document.getElementById('app')!;
    appEl.style.position = 'relative';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '0';
    canvas.style.imageRendering = 'pixelated';
    appEl.appendChild(canvas);
    appEl.style.width = canvas.width + 'px';
    appEl.style.height = canvas.height + 'px';
  }

  private registerInputListeners(): void {
    window.addEventListener('keydown', (event) => {
      this.update(event);
    });

    window.addEventListener('mousemove', (event) => {
      this.screen.inputHandler.handleMouseMovement(
        this.display.eventToPosition(event),
      );
      this.screen.render();
    });
  }

  private async initPixi(rotCanvas: HTMLCanvasElement): Promise<void> {
    // Wait a tick so rot-js can size its canvas
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    await this.pixiRenderer.init(rotCanvas);

    const pixiCanvas = this.pixiRenderer.canvas;
    // PixiJS canvas covers only the map area (rows 0–42); HUD rows stay rot-js only.
    pixiCanvas.style.position = 'absolute';
    pixiCanvas.style.top = '0';
    pixiCanvas.style.left = '0';
    pixiCanvas.style.zIndex = '1';
    pixiCanvas.style.pointerEvents = 'none';
    pixiCanvas.style.imageRendering = 'pixelated';
    document.getElementById('app')!.appendChild(pixiCanvas);
  }

  computeCamera(mapWidth: number, mapHeight: number): void {
    const viewW = Engine.MAP_WIDTH;
    const viewH = Engine.MAP_HEIGHT;
    this.cameraX = Math.max(0, Math.min(this.player.x - Math.floor(viewW / 2), mapWidth - viewW));
    this.cameraY = Math.max(0, Math.min(this.player.y - Math.floor(viewH / 2), mapHeight - viewH));
  }

  update(event: KeyboardEvent) {
    const screen = this.screen.update(event);
    if (!Object.is(screen, this.screen)) {
      this.screen = screen;
      this.screen.render();
    }
  }
}
