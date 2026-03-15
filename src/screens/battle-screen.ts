import { Display } from 'rot-js';
import { BaseScreen } from './base-screen';
import { Actor, Item } from '../entity';
import {
  spawnHealthPotion,
  spawnLightningScroll,
  spawnConfusionScroll,
  spawnFireballScroll,
} from '../entity-factories';
import { GameScreen } from './game-screen';
import { BaseInputHandler, GameInputHandler } from '../input-handler';
import { Colors } from '../colors';
import { renderFrameWithTitle } from '../render-functions';
import { EquipAction, ItemAction } from '../actions';

type BattleState = 'menu' | 'inventory';

const FRAME_X = 4;
const FRAME_Y = 3;
const FRAME_WIDTH = 42;
const FRAME_HEIGHT = 22;
const BAR_WIDTH = 14;


export class BattleScreen extends BaseScreen {
  inputHandler: BaseInputHandler;
  private state: BattleState = 'menu';

  constructor(
    display: Display,
    player: Actor,
    private enemy: Actor,
    private gameScreen: GameScreen,
    playerGoesFirst: boolean,
  ) {
    super(display, player);
    this.inputHandler = new GameInputHandler();
    if (!playerGoesFirst) {
      this.performEnemyAttack();
    }
  }

  private performEnemyAttack(): boolean {
    const damage = Math.max(0, this.enemy.fighter.power - this.player.fighter.defense);
    if (damage > 0) {
      window.messageLog.addMessage(
        `${this.enemy.name.toUpperCase()} attacks Player for ${damage} hit points.`,
        Colors.EnemyAttack,
      );
      this.player.fighter.hp -= damage;
      if (this.enemy.name === 'Vampire') {
        const drain = Math.ceil(damage / 2);
        this.enemy.fighter.hp = Math.min(
          this.enemy.fighter.maxHp,
          this.enemy.fighter.hp + drain,
        );
        window.messageLog.addMessage(
          `The Vampire drains ${drain} HP from you!`,
          Colors.EnemyAttack,
        );
      }
    } else {
      window.messageLog.addMessage(
        `${this.enemy.name.toUpperCase()} attacks Player but does no damage.`,
        Colors.EnemyAttack,
      );
    }
    return !this.player.isAlive;
  }

  private performPlayerAttack(): boolean {
    const damage = Math.max(0, this.player.fighter.power - this.enemy.fighter.defense);
    if (damage > 0) {
      window.messageLog.addMessage(
        `Player attacks ${this.enemy.name} for ${damage} hit points.`,
        Colors.PlayerAttack,
      );
      this.enemy.fighter.hp -= damage;
    } else {
      window.messageLog.addMessage(
        `Player attacks ${this.enemy.name} but does no damage.`,
        Colors.PlayerAttack,
      );
    }
    return !this.enemy.isAlive;
  }

  private performSteal(): boolean {
    if (this.player.inventory.items.length >= this.player.inventory.capacity) {
      window.messageLog.addMessage('Your inventory is full!', Colors.Impossible);
      return false;
    }
    if (Math.random() < 0.4) {
      const spawners = [
        spawnHealthPotion,
        spawnLightningScroll,
        spawnConfusionScroll,
        spawnFireballScroll,
      ];
      const spawn = spawners[Math.floor(Math.random() * spawners.length)];
      const item = spawn(this.gameScreen.gameMap, 0, 0);
      this.gameScreen.gameMap.removeEntity(item);
      item.parent = this.player.inventory;
      this.player.inventory.items.push(item);
      window.messageLog.addMessage(`You stole a ${item.name}!`, Colors.PlayerAttack);
    } else {
      window.messageLog.addMessage('Steal failed!', Colors.Impossible);
    }
    return true;
  }

  private resolveAndReturn(runEnemyTurns: boolean): BaseScreen {
    window.engine.pixiRenderer.clearBattleSprites();
    this.gameScreen.resumeAfterBattle(this.enemy, runEnemyTurns);
    return this.gameScreen;
  }

  update(event: KeyboardEvent): BaseScreen {
    if (this.state === 'menu') {
      if (event.key === 'a') {
        const enemyDied = this.performPlayerAttack();
        if (enemyDied) return this.resolveAndReturn(true);

        const playerDied = this.performEnemyAttack();
        if (playerDied) return this.resolveAndReturn(true);

        this.render();
        return this;
      }

      if (event.key === 'i') {
        this.state = 'inventory';
        this.render();
        return this;
      }

      if (event.key === 's' && this.player.level.characterClass === 'thief') {
        const acted = this.performSteal();
        if (acted) {
          const playerDied = this.performEnemyAttack();
          if (playerDied) return this.resolveAndReturn(true);
        }
        this.render();
        return this;
      }

      if (event.key === 'f') {
        if (Math.random() < 0.5) {
          window.messageLog.addMessage('You fled!');
          return this.resolveAndReturn(true);
        } else {
          window.messageLog.addMessage("You couldn't escape!", Colors.Impossible);
          const playerDied = this.performEnemyAttack();
          if (playerDied) return this.resolveAndReturn(true);
          this.render();
          return this;
        }
      }
    }

    if (this.state === 'inventory') {
      if (event.key === 'Escape') {
        this.state = 'menu';
        this.render();
        return this;
      }
      return this.handleInventoryKeypress(event);
    }

    this.render();
    return this;
  }

  private handleInventoryKeypress(event: KeyboardEvent): BaseScreen {
    const charCode = event.key.charCodeAt(0);
    if (event.key.length !== 1 || charCode < 97 || charCode > 122) {
      this.render();
      return this;
    }

    const index = charCode - 97;
    const item: Item | undefined = this.player.inventory.items[index];
    if (!item) {
      this.render();
      return this;
    }

    if (item.equippable) {
      new EquipAction(item).perform(this.player, this.gameScreen.gameMap);
      const playerDied = this.performEnemyAttack();
      this.state = 'menu';
      if (playerDied) return this.resolveAndReturn(true);
      this.render();
      return this;
    }

    if (item.consumable) {
      const action = item.consumable.getAction();
      if (action === null) {
        window.messageLog.addMessage("Can't use that in battle.", Colors.Impossible);
        this.render();
        return this;
      }
      try {
        (action as ItemAction).perform(this.player, this.gameScreen.gameMap);
      } catch {
        this.render();
        return this;
      }
      const playerDied = this.performEnemyAttack();
      this.state = 'menu';
      if (playerDied) return this.resolveAndReturn(true);
      this.render();
      return this;
    }

    this.render();
    return this;
  }

  render() {
    this.gameScreen.render();

    const innerX = FRAME_X + 2;
    const innerWidth = FRAME_WIDTH - 4;
    const halfWidth = Math.floor(innerWidth / 2);

    this.renderBattleFrame();
    this.renderCombatantArt(innerX, halfWidth);

    const nameRowY = FRAME_Y + 2 + 5 + 1;
    this.renderCombatantLabels(innerX, halfWidth, nameRowY);

    const hpStartY = nameRowY + 2;
    this.renderHpBars(innerX, hpStartY);

    const sepY = hpStartY + 3;
    window.engine.display.drawText(innerX, sepY, '─'.repeat(innerWidth));

    this.renderActionMenu(innerX, sepY + 1, innerWidth);
  }

  private renderBattleFrame(): void {
    window.engine.pixiRenderer.clearGameSprites();
    for (let y = FRAME_Y; y < FRAME_Y + FRAME_HEIGHT; y++) {
      for (let x = FRAME_X; x < FRAME_X + FRAME_WIDTH; x++) {
        this.display.draw(x, y, ' ', '#000', '#000');
      }
    }
    renderFrameWithTitle(FRAME_X, FRAME_Y, FRAME_WIDTH, FRAME_HEIGHT, 'Battle');
  }

  private renderCombatantArt(innerX: number, halfWidth: number): void {
    const playerClass = this.player.level.characterClass;
    const artRows = 5;
    const enemyCenterCol = innerX + Math.floor(halfWidth / 2);
    const playerCenterCol = innerX + halfWidth + Math.floor(halfWidth / 2);
    const artTopRow = FRAME_Y + 2;

    window.engine.pixiRenderer.renderBattleSprites(
      this.enemy,
      playerClass,
      enemyCenterCol,
      playerCenterCol,
      artTopRow,
    );

    const vsY = FRAME_Y + 2 + Math.floor(artRows / 2);
    window.engine.display.drawText(innerX + halfWidth - 1, vsY, 'vs');
  }

  private renderCombatantLabels(
    innerX: number,
    halfWidth: number,
    nameRowY: number,
  ): void {
    const playerClass = this.player.level.characterClass;
    const enemyLabel = this.enemy.name;
    const classLabel = playerClass
      ? playerClass.charAt(0).toUpperCase() + playerClass.slice(1)
      : 'Adventurer';

    const eLabelX = innerX + Math.floor((halfWidth - enemyLabel.length) / 2);
    const pLabelX =
      innerX + halfWidth + Math.floor((halfWidth - classLabel.length) / 2);
    window.engine.display.drawText(eLabelX, nameRowY, enemyLabel);
    window.engine.display.drawText(pLabelX, nameRowY, classLabel);
  }

  private renderHpBars(innerX: number, hpStartY: number): void {
    this.drawCombatantRow(
      innerX,
      hpStartY,
      this.enemy.name,
      this.enemy.fighter.hp,
      this.enemy.fighter.maxHp,
    );
    this.drawCombatantRow(
      innerX,
      hpStartY + 1,
      'Player',
      this.player.fighter.hp,
      this.player.fighter.maxHp,
    );
  }

  private renderActionMenu(
    innerX: number,
    contentY: number,
    innerWidth: number,
  ): void {
    if (this.state === 'menu') {
      const isThief = this.player.level.characterClass === 'thief';
      if (isThief) {
        const col = Math.floor(innerWidth / 2);
        window.engine.display.drawText(innerX, contentY, '[A] Attack');
        window.engine.display.drawText(innerX + col, contentY, '[I] Use Item');
        window.engine.display.drawText(innerX, contentY + 1, '[S] Steal');
        window.engine.display.drawText(innerX + col, contentY + 1, '[F] Flee');
      } else {
        const col = Math.floor(innerWidth / 3);
        window.engine.display.drawText(innerX, contentY, '[A] Attack');
        window.engine.display.drawText(innerX + col, contentY, '[I] Use Item');
        window.engine.display.drawText(innerX + col * 2, contentY, '[F] Flee');
      }
    } else {
      window.engine.display.drawText(innerX, contentY, 'Items:');
      const items = this.player.inventory.items;
      if (items.length === 0) {
        window.engine.display.drawText(innerX, contentY + 1, '(empty)');
        window.engine.display.drawText(innerX, contentY + 2, '(Esc) Back');
      } else {
        const maxVisible = 5;
        items.slice(0, maxVisible).forEach((item, i) => {
          const letter = String.fromCharCode(97 + i);
          const equippedMark = this.player.equipment.itemIsEquipped(item)
            ? ' (E)'
            : '';
          window.engine.display.drawText(
            innerX,
            contentY + 1 + i,
            `(${letter}) ${item.name}${equippedMark}`,
          );
        });
        if (items.length > maxVisible) {
          window.engine.display.drawText(
            innerX,
            contentY + 1 + maxVisible,
            `  ... ${items.length - maxVisible} more`,
          );
        }
        const backY = contentY + 2 + Math.min(items.length, maxVisible);
        window.engine.display.drawText(innerX, backY, '(Esc) Back');
      }
    }
  }

  private drawCombatantRow(x: number, y: number, name: string, hp: number, maxHp: number) {
    const nameField = name.padEnd(10).slice(0, 10);
    window.engine.display.drawText(x, y, nameField);

    const barX = x + 11;
    const filledWidth = Math.round((hp / maxHp) * BAR_WIDTH);
    for (let i = 0; i < BAR_WIDTH; i++) {
      const color = i < filledWidth ? Colors.BarFilled : Colors.BarEmpty;
      window.engine.display.draw(barX + i, y, ' ', color, color);
    }

    window.engine.display.drawText(barX + BAR_WIDTH + 1, y, `${hp}/${maxHp}`);
  }
}
