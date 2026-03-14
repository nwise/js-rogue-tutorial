import { BaseComponent } from './base-component';
import { Actor } from '../entity';
import { CharacterClass, CLASS_DEFINITIONS } from '../classes';
import { Colors } from '../colors';

export class Level extends BaseComponent {
  constructor(
    public levelUpBase: number = 0,
    public xpGiven: number = 0,
    public currentLevel: number = 1,
    public currentXp: number = 0,
    public levelUpFactor: number = 150,
    public characterClass: CharacterClass | null = null,
  ) {
    super();
  }

  public get experienceToNextLevel(): number {
    return this.levelUpBase + this.currentLevel * this.levelUpFactor;
  }

  public get requiresLevelUp(): boolean {
    return this.currentXp > this.experienceToNextLevel;
  }

  addXp(xp: number) {
    if (xp === 0 || this.levelUpBase === 0) return;

    this.currentXp += xp;

    window.messageLog.addMessage(`You gain ${xp} experience points.`);

    if (this.requiresLevelUp) {
      this.applyLevelUp();
    }
  }

  private increaseLevel() {
    this.currentXp -= this.experienceToNextLevel;
    this.currentLevel++;
  }

  applyLevelUp() {
    if (!this.characterClass) return;
    const actor = this.parent as Actor;
    const nextLevel = this.currentLevel + 1;
    const gains = CLASS_DEFINITIONS[this.characterClass].gains(nextLevel);
    actor.fighter.maxHp += gains.hp;
    actor.fighter.hp += gains.hp;
    actor.fighter.basePower += gains.power;
    actor.fighter.baseDefense += gains.defense;
    window.messageLog.addMessage(
      `You reached level ${nextLevel}! HP +${gains.hp}, Power +${gains.power}, Defense +${gains.defense}.`,
      Colors.LevelUp,
    );
    this.increaseLevel();
  }
}
