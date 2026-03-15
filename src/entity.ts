import { BaseAI } from './components/ai';
import { Fighter } from './components/fighter';
import { Inventory } from './components/inventory';
import { GameMap } from './game-map';
import { Consumable } from './components/consumable';
import { BaseComponent } from './components/base-component';
import { Level } from './components/level';
import { Equippable } from './components/equippable';
import { Equipment } from './components/equipment';

export enum RenderOrder {
  Corpse,
  Item,
  Actor,
}

export class Entity {
  constructor(
    public x: number,
    public y: number,
    public char: string,
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public blocksMovement: boolean = false,
    public renderOrder: RenderOrder = RenderOrder.Corpse,
    public parent: GameMap | BaseComponent | null = null,
  ) {
    if (this.parent && this.parent instanceof GameMap) {
      this.parent.entities.push(this);
    }
  }

  public get gameMap(): GameMap | undefined {
    return this.parent?.gameMap;
  }

  move(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }

  place(x: number, y: number, gameMap: GameMap | undefined) {
    this.x = x;
    this.y = y;
    if (gameMap) {
      if (this.parent) {
        if (this.parent === gameMap) {
          gameMap.removeEntity(this);
        }
      }
      this.parent = gameMap;
      gameMap.entities.push(this);
    }
  }

  distance(x: number, y: number) {
    return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2);
  }
}

export class Actor extends Entity {
  constructor(
    public x: number,
    public y: number,
    public char: string,
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public ai: BaseAI | null,
    public equipment: Equipment,
    public fighter: Fighter,
    public inventory: Inventory,
    public level: Level,
    public parent: GameMap | null = null,
  ) {
    super(x, y, char, fg, bg, name, true, RenderOrder.Actor, parent);
    this.fighter.parent = this;
    this.equipment.parent = this;
    this.inventory.parent = this;
  }

  public get isAlive(): boolean {
    return !!this.ai || window.engine.player === this;
  }
}

export class Item extends Entity {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public char: string = '?',
    public fg: string = '#fff',
    public bg: string = '#000',
    public name: string = '<Unnamed>',
    public consumable: Consumable | null = null,
    public equippable: Equippable | null = null,
    public parent: GameMap | BaseComponent | null = null,
  ) {
    super(x, y, char, fg, bg, name, false, RenderOrder.Item, parent);
    if (this.consumable) {
      this.consumable.parent = this;
    }

    if (this.equippable) this.equippable.parent = this;
  }
}


