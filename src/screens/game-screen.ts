import { BaseScreen } from './base-screen';
import { Engine } from '../engine';
import { GameMap } from '../game-map';
import { Display } from 'rot-js';
import { generateDungeon } from '../procgen';
import { Actor, Entity, Item } from '../entity';
import {
  spawnChainMail,
  spawnConfusionScroll,
  spawnDagger,
  spawnFireballScroll,
  spawnHealthPotion,
  spawnLeatherArmor,
  spawnLightningScroll,
  spawnGoblin,
  spawnOgre,
  spawnOrc,
  spawnPlayer,
  spawnRat,
  spawnSkeleton,
  spawnSword,
  spawnTroll,
  spawnVampire,
} from '../entity-factories';
import {
  BaseInputHandler,
  GameInputHandler,
  InputState,
} from '../input-handler';
import { Action, BumpAction } from '../actions';
import { BattleScreen } from './battle-screen';
import { ImpossibleException } from '../exceptions';
import { Colors } from '../colors';
import {
  renderFrameWithTitle,
  renderHealthBar,
  renderNamesAtLocation,
} from '../render-functions';
import { ConfusedEnemy, HostileEnemy } from '../components/ai';
import { CharacterClass } from '../classes';
import { Tile } from '../tile-types';

export class GameScreen extends BaseScreen {
  public static readonly MAP_WIDTH = 50;
  public static readonly MAP_HEIGHT = 27;
  public static readonly MIN_ROOM_SIZE = 6;
  public static readonly MAX_ROOM_SIZE = 10;
  public static readonly MAX_ROOMS = 30;
  public static readonly MAX_MONSTERS_PER_ROOM = 2;
  public static readonly MAX_ITEMS_PER_ROOM = 2;

  gameMap!: GameMap;
  inputHandler: BaseInputHandler;

  constructor(
    display: Display,
    player: Actor,
    serializedGameMap: string | null = null,
    public currentFloor: number = 0,
  ) {
    super(display, player);

    if (serializedGameMap) {
      const [map, loadedPlayer, floor] = GameScreen.load(
        serializedGameMap,
        display,
      );
      this.gameMap = map;
      this.player = loadedPlayer;
      this.currentFloor = floor;
    } else {
      this.generateFloor();
      const dagger = spawnDagger(this.gameMap, 0, 0);
      dagger.parent = this.player.inventory;
      this.player.inventory.items.push(dagger);
      this.player.equipment.toggleEquip(dagger, false);
      this.gameMap.removeEntity(dagger);

      const leatherArmor = spawnLeatherArmor(this.gameMap, 0, 0);
      leatherArmor.parent = this.player.inventory;
      this.player.inventory.items.push(leatherArmor);
      this.player.equipment.toggleEquip(leatherArmor, false);
      this.gameMap.removeEntity(leatherArmor);
    }

    this.inputHandler = new GameInputHandler();
    this.gameMap.updateFov(this.player);
  }

  handleEnemyTurns() {
    this.gameMap.actors.forEach((e) => {
      if (e.isAlive) {
        try {
          e.ai?.perform(e, this.gameMap);
        } catch {}
      }
    });
  }

  resumeAfterBattle(opponent: Actor, runEnemyTurns: boolean) {
    if (runEnemyTurns) {
      this.gameMap.actors.forEach((e) => {
        if (e.isAlive && e !== opponent) {
          try {
            e.ai?.perform(e, this.gameMap);
          } catch {}
        }
      });
    }
    this.gameMap.updateFov(this.player);
  }

  generateFloor(): void {
    this.currentFloor += 1;

    this.gameMap = generateDungeon(
      Engine.DUNGEON_WIDTH,
      Engine.DUNGEON_HEIGHT,
      GameScreen.MAX_ROOMS,
      GameScreen.MIN_ROOM_SIZE,
      GameScreen.MAX_ROOM_SIZE,
      this.player,
      this.display,
      this.currentFloor,
    );
  }

  update(event: KeyboardEvent): BaseScreen {
    if (event.key === 's') {
      this.saveGame();
      return this;
    }

    const action = this.inputHandler.handleKeyboardInput(event);

    if (action instanceof BumpAction) {
      const tx = this.player.x + action.dx;
      const ty = this.player.y + action.dy;
      const target = this.gameMap.getBlockingEntityAtLocation(tx, ty);
      if (target instanceof Actor && target.isAlive) {
        this.inputHandler = this.inputHandler.nextHandler;
        this.render();
        return new BattleScreen(this.display, this.player, target, this, true);
      }
    }

    if (action instanceof Action) {
      try {
        action.perform(this.player, this.gameMap);
        this.handleEnemyTurns();
        this.gameMap.updateFov(this.player);
      } catch (error) {
        if (error instanceof ImpossibleException) {
          window.messageLog.addMessage(error.message, Colors.Impossible);
        }
      }

      if (window.engine.pendingBattle) {
        const { enemy } = window.engine.pendingBattle;
        window.engine.pendingBattle = null;
        this.inputHandler = this.inputHandler.nextHandler;
        this.render();
        return new BattleScreen(this.display, this.player, enemy, this, false);
      }
    }

    this.inputHandler = this.inputHandler.nextHandler;

    this.render();
    return this;
  }

  render() {
    window.engine.computeCamera(this.gameMap.width, this.gameMap.height);
    const camX = window.engine.cameraX;
    const camY = window.engine.cameraY;

    this.display.clear();
    window.messageLog.render(this.display, 15, 29, 28, 3);

    renderHealthBar(
      this.display,
      this.player.fighter.hp,
      this.player.fighter.maxHp,
      14,
    );

    renderNamesAtLocation(
      15,
      28,
      this.inputHandler.mousePosition,
      this.gameMap,
    );

    this.display.drawText(0, 33, `Dungeon level: ${this.currentFloor}`);

    this.gameMap.render(camX, camY, Engine.MAP_WIDTH, Engine.MAP_HEIGHT);
    this.gameMap.renderToPixi(window.engine.pixiRenderer, camX, camY);

    if (this.inputHandler.inputState === InputState.Log) {
      renderFrameWithTitle(2, 2, 46, 23, 'Message History');
      window.messageLog.renderMessages(
        this.display,
        3,
        3,
        44,
        21,
        window.messageLog.messages.slice(
          0,
          this.inputHandler.logCursorPosition + 1,
        ),
      );
    }
    if (this.inputHandler.inputState === InputState.Target) {
      const [mapX, mapY] = this.inputHandler.mousePosition;
      this.display.drawOver(mapX - camX, mapY - camY, null, '#000', '#fff');
    }
    this.inputHandler.onRender(this.display);
  }

  private saveGame() {
    try {
      localStorage.setItem('roguesave', JSON.stringify(this.toObject()));
    } catch (err) {}
  }

  private static load(
    serializedGameMap: string,
    display: Display,
  ): [GameMap, Actor, number] {
    const parsedMap = JSON.parse(serializedGameMap) as SerializedGameMap;
    const playerEntity = parsedMap.entities.find((e) => e.name === 'Player');
    if (!playerEntity) throw new Error('Save data is missing player entity');

    const map = new GameMap(parsedMap.width, parsedMap.height, display, []);
    map.tiles = parsedMap.tiles;

    const player = GameScreen.deserializePlayer(playerEntity, map);
    GameScreen.deserializeInventory(player, playerEntity, map);
    GameScreen.deserializeMapEntities(map, parsedMap.entities);

    return [map, player, parsedMap.currentFloor];
  }

  private static deserializePlayer(
    raw: SerializedEntity,
    map: GameMap,
  ): Actor {
    const player = spawnPlayer(raw.x, raw.y, map);
    player.fighter.hp = raw.fighter?.hp || player.fighter.hp;
    player.level.currentLevel = raw.level ? raw.level.currentLevel : 0;
    player.level.currentXp = raw.level ? raw.level.currentXp : 0;
    player.level.characterClass = raw.level?.characterClass ?? null;
    window.engine.player = player;
    return player;
  }

  private static deserializeInventory(
    player: Actor,
    rawPlayer: SerializedEntity,
    map: GameMap,
  ): void {
    const playerInventory = rawPlayer.inventory || [];
    for (const entry of playerInventory) {
      let item: Item | null = null;
      switch (entry.itemType) {
        case 'Health Potion':
          item = spawnHealthPotion(map, 0, 0);
          break;
        case 'Lightning Scroll':
          item = spawnLightningScroll(map, 0, 0);
          break;
        case 'Confusion Scroll':
          item = spawnConfusionScroll(map, 0, 0);
          break;
        case 'Fireball Scroll':
          item = spawnFireballScroll(map, 0, 0);
          break;
        case 'Dagger':
          item = spawnDagger(map, 0, 0);
          break;
        case 'Sword':
          item = spawnSword(map, 0, 0);
          break;
        case 'Leather Armor':
          item = spawnLeatherArmor(map, 0, 0);
          break;
        case 'Chain Mail':
          item = spawnChainMail(map, 0, 0);
          break;
      }
      if (item) {
        map.removeEntity(item);
        item.parent = player.inventory;
        player.inventory.items.push(item);
        if (entry.equipped) {
          player.equipment.toggleEquip(item, false);
        }
      }
    }
  }

  private static deserializeMapEntities(
    map: GameMap,
    rawEntities: SerializedEntity[],
  ): void {
    const actorSpawners: Record<
      string,
      (m: GameMap, x: number, y: number) => Actor
    > = {
      Rat: spawnRat,
      Goblin: spawnGoblin,
      Orc: spawnOrc,
      Troll: spawnTroll,
      Skeleton: spawnSkeleton,
      Ogre: spawnOgre,
      Vampire: spawnVampire,
    };
    const itemSpawners: Record<
      string,
      (m: GameMap, x: number, y: number) => Item
    > = {
      'Health Potion': spawnHealthPotion,
      'Lightning Scroll': spawnLightningScroll,
      'Confusion Scroll': spawnConfusionScroll,
      'Fireball Scroll': spawnFireballScroll,
      Dagger: spawnDagger,
      Sword: spawnSword,
      'Leather Armor': spawnLeatherArmor,
      'Chain Mail': spawnChainMail,
    };

    for (const e of rawEntities) {
      if (e.name === 'Player') continue;
      const actorSpawn = actorSpawners[e.name];
      if (actorSpawn) {
        const actor = actorSpawn(map, e.x, e.y);
        GameScreen.deserializeActor(actor, e);
        continue;
      }
      itemSpawners[e.name]?.(map, e.x, e.y);
    }
  }

  private static deserializeActor(actor: Actor, raw: SerializedEntity): void {
    actor.fighter.hp = raw.fighter?.hp || actor.fighter.hp;
    if (raw.aiType === 'confused') {
      actor.ai = new ConfusedEnemy(actor.ai, raw.confusedTurnsRemaining);
    }
  }

  private toObject(): SerializedGameMap {
    return {
      currentFloor: this.currentFloor,
      width: this.gameMap.width,
      height: this.gameMap.height,
      tiles: this.gameMap.tiles,
      entities: this.gameMap.entities.map((e) => this.serializeEntity(e)),
    };
  }

  private serializeEntity(e: Entity): SerializedEntity {
    let fighter = null;
    let level = null;
    let aiType = null;
    let inventory = null;
    let confusedTurnsRemaining = 0;

    if (e instanceof Actor) {
      const { maxHp, _hp: hp, defense, power } = e.fighter;
      const {
        currentXp,
        currentLevel,
        levelUpBase,
        levelUpFactor,
        xpGiven,
        characterClass,
      } = e.level;
      fighter = { maxHp, hp, defense, power };
      level = { currentXp, currentLevel, levelUpBase, levelUpFactor, xpGiven, characterClass };
      if (e.ai) {
        aiType = e.ai instanceof HostileEnemy ? 'hostile' : 'confused';
        confusedTurnsRemaining =
          aiType === 'confused' ? (e.ai as ConfusedEnemy).turnsRemaining : 0;
      }
      if (e.inventory) {
        inventory = e.inventory.items.map((item) => ({
          itemType: item.name,
          equipped: e.equipment.itemIsEquipped(item),
        }));
      }
    }

    return {
      x: e.x,
      y: e.y,
      char: e.char,
      fg: e.fg,
      bg: e.bg,
      name: e.name,
      fighter,
      level,
      aiType,
      confusedTurnsRemaining,
      inventory,
    };
  }
}

type SerializedGameMap = {
  currentFloor: number;
  width: number;
  height: number;
  tiles: Tile[][];
  entities: SerializedEntity[];
};

type SerializedEntity = {
  x: number;
  y: number;
  char: string;
  fg: string;
  bg: string;
  name: string;
  fighter: SerializedFighter | null;
  level: SerializedLevel | null;
  aiType: string | null;
  confusedTurnsRemaining: number;
  inventory: SerializedItem[] | null;
};

type SerializedLevel = {
  levelUpBase: number;
  xpGiven: number;
  currentLevel: number;
  currentXp: number;
  levelUpFactor: number;
  characterClass?: CharacterClass | null;
};

type SerializedFighter = {
  maxHp: number;
  hp: number;
  defense: number;
  power: number;
};

type SerializedItem = {
  itemType: string;
  equipped: boolean;
};
