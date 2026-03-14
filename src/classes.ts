export type CharacterClass = 'warrior' | 'wizard' | 'thief';

export interface ClassDefinition {
  name: string;
  key: string;
  description: string;
  color: string;
  startingHp: number;
  startingPower: number;
  startingDefense: number;
  gains(level: number): { hp: number; power: number; defense: number };
}

export const CLASS_DEFINITIONS: Record<CharacterClass, ClassDefinition> = {
  warrior: {
    name: 'Warrior',
    key: 'w',
    description: 'Tough fighter with high HP and solid defense.',
    color: '#ff9040',
    startingHp: 35,
    startingPower: 2,
    startingDefense: 3,
    gains(level: number) {
      return {
        hp: 8 + Math.floor(level / 2),
        power: level % 3 === 0 ? 2 : 1,
        defense: level % 4 === 0 ? 1 : 0,
      };
    },
  },
  wizard: {
    name: 'Wizard',
    key: 'z',
    description: 'Powerful mage with high attack but low HP.',
    color: '#a040ff',
    startingHp: 26,
    startingPower: 4,
    startingDefense: 1,
    gains(level: number) {
      return {
        hp: level % 3 === 0 ? 4 : 2,
        power: Math.floor(level / 3) + 1,
        defense: level % 6 === 0 ? 1 : 0,
      };
    },
  },
  thief: {
    name: 'Thief',
    key: 't',
    description: 'Cunning rogue with burst power and agility.',
    color: '#40ff80',
    startingHp: 25,
    startingPower: 3,
    startingDefense: 2,
    gains(level: number) {
      return {
        hp: level % 2 === 0 ? 5 : 3,
        power: level % 4 === 0 ? 2 : 1,
        defense: level % 3 === 0 ? 1 : 0,
      };
    },
  },
};
