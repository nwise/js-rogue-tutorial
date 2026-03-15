import { Display } from 'rot-js';
import { BaseScreen } from './base-screen';
import { Actor } from '../entity';
import { BaseInputHandler, GameInputHandler } from '../input-handler';
import { GameScreen } from './game-screen';
import { MainMenu } from './main-menu';
import { CharacterClass, CLASS_DEFINITIONS } from '../classes';
import { renderFrameWithTitle } from '../render-functions';

export class ClassSelectScreen extends BaseScreen {
  inputHandler: BaseInputHandler;

  constructor(display: Display, player: Actor) {
    super(display, player);
    this.inputHandler = new GameInputHandler();
  }

  private selectClass(cls: CharacterClass): BaseScreen {
    const def = CLASS_DEFINITIONS[cls];
    this.player.fighter.maxHp = def.startingHp;
    this.player.fighter.hp = def.startingHp;
    this.player.fighter.basePower = def.startingPower;
    this.player.fighter.baseDefense = def.startingDefense;
    this.player.level.characterClass = cls;
    return new GameScreen(this.display, this.player);
  }

  update(event: KeyboardEvent): BaseScreen {
    if (event.key === 'w') return this.selectClass('warrior');
    if (event.key === 'z') return this.selectClass('wizard');
    if (event.key === 't') return this.selectClass('thief');
    if (event.key === 'Escape') return new MainMenu(this.display, this.player);

    this.render();
    return this;
  }

  render() {
    this.display.clear();

    const frameX = 2;
    const frameY = 3;
    const frameWidth = 46;
    const frameHeight = 14;

    renderFrameWithTitle(frameX, frameY, frameWidth, frameHeight, 'Choose Your Class');

    let row = frameY + 2;
    for (const cls of ['warrior', 'wizard', 'thief'] as CharacterClass[]) {
      const def = CLASS_DEFINITIONS[cls];
      this.display.drawText(
        frameX + 2,
        row,
        `%c{${def.color}}[${def.key.toUpperCase()}] ${def.name}%c{}`,
      );
      row++;
      this.display.drawText(
        frameX + 4,
        row,
        `HP: ${def.startingHp}  Power: ${def.startingPower}  Defense: ${def.startingDefense}`,
      );
      row++;
      row += 2;
    }

    this.display.drawText(frameX + 2, frameY + frameHeight - 2, '[Esc] Back');
  }
}
