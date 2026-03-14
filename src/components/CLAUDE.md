# src/components/

Entity components. Each component is a class that extends `BaseComponent` and is attached to an `Entity` via a named slot (e.g. `entity.fighter`, `entity.ai`).

## Conventions

- Extend `BaseComponent`. Call `super()` in your constructor.
- `parent` is typed to the specific entity subtype the component expects (e.g. `Actor`, `Item`). Set it to `null` in the constructor; the engine sets it when attaching.
- Access the map via `this.gameMap` (inherited getter: `this.parent?.gameMap`).
- Access the engine and message log via `window.engine` / `window.messageLog`.
- Throw `ImpossibleException` (from `../exceptions`) for player-facing errors that should appear in the message log without crashing.

## Files

| File | What it does |
|------|--------------|
| `base-component.ts` | Abstract base. Provides `parent` slot and `gameMap` getter. |
| `fighter.ts` | HP, base defense/power, equipment bonuses, `die()`, `heal()`, `takeDamage()`. Setting `hp` to 0 auto-calls `die()`. |
| `ai.ts` | Enemy behaviour. `HostileEnemy` pathfinds to player; `ConfusedEnemy` wraps another AI and wanders for N turns before restoring it. |
| `inventory.ts` | Ordered item list. Tracks `capacity`; items are `Item` entities whose `parent` points back to this `Inventory`. |
| `consumable.ts` | Abstract `Consumable` + concrete subclasses: `HealingConsumable`, `LightningConsumable`, `ConfusionConsumable`, `FireballDamageConsumable`. `activate()` is called by `ItemAction.perform()`. Targeted consumables push a new `inputHandler` onto `window.engine.screen` instead of acting immediately. |
| `equippable.ts` | Weapon/armor stats (power bonus, defense bonus) and `EquipmentType`. |
| `equipment.ts` | Manages equipped weapon and armor slots. Calculates `powerBonus` / `defenseBonus` totals. `toggleEquip()` equips or unequips. |
| `level.ts` | XP tracking, level-up thresholds, and stat-increase methods (`increaseMaxHp`, `increasePower`, `increaseDefense`). |

## Adding a new consumable

1. Add a class in `consumable.ts` extending `Consumable`.
2. Implement `activate(action, entity, gameMap)`. Throw `ImpossibleException` for invalid targets.
3. Override `getAction()` if the item needs targeting (push a handler to `window.engine.screen.inputHandler`).
4. Add a `spawn*` factory in `../entity.ts` and register it in the save/load switch in `../screens/game-screen.ts`.
