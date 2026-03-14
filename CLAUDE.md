# CLAUDE.md — js-rogue-tutorial

Browser-based roguelike built with TypeScript, rot-js, and Vite. Follows the [python-tcod roguelike tutorial](https://rogueliketutorials.com/) ported to TypeScript.

## Commands

```bash
npm run dev      # Start Vite dev server (hot reload)
npm run build    # tsc + vite build → dist/
npm run preview  # Serve production build locally
```

No test suite exists.

## Architecture

### State machine — `src/screens/`

| File | Role |
|------|------|
| `screens/base-screen.ts` | Abstract base: `render()` and `handleEvents()` |
| `screens/main-menu.ts` | Title screen; save/load via `localStorage` |
| `screens/game-screen.ts` | Active gameplay screen |

The active screen is stored on `window.engine.screen`. `engine.ts` calls `screen.handleEvents()` on each input event and `screen.render()` to redraw.

### Engine — `src/engine.ts`

Central coordinator. Holds the player entity, current `GameMap`, and active screen. Exposes `Engine.MAP_WIDTH` / `Engine.MAP_HEIGHT` constants. Dispatches input to `handleAction()`.

### Entity-Component system

- `src/entity.ts` — `Entity` class with optional component slots
- `src/components/base-component.ts` — `BaseComponent`; all components extend this and hold a `engine` reference
- Component files:

| File | Component |
|------|-----------|
| `components/ai.ts` | Enemy AI (hostile, confused) |
| `components/fighter.ts` | HP, attack, defense; death handling |
| `components/inventory.ts` | Item list; add/drop/consume |
| `components/level.ts` | XP, leveling up, stat increases |
| `components/equipment.ts` | Equipped weapon/armor slots |
| `components/equippable.ts` | Weapon/armor stats |
| `components/consumable.ts` | One-use item effects (heal, lightning, fireball, confusion) |

### Map — `src/game-map.ts`

Holds a 2-D tile array, entity list, and explored/visible bitmaps. Runs FOV via rot-js `PreciseShadowcasting`. Provides `inBounds()`, `getBlockingEntityAtLocation()`, `getActors()`, etc.

### Procedural generation — `src/procgen.ts`

`generateDungeon()` carves rooms and corridors, spawns monsters and items using weighted random tables that scale with dungeon floor depth.

### Input — `src/input-handler.ts`

`BaseInputHandler` subclasses map `KeyboardEvent` → `Action` objects. Active handler stored on the engine; can transition to a new handler (e.g. `InventoryInputHandler`, `LookHandler`). Input states: `Game`, `Dead`, `Log`, `UseInventory`, `DropInventory`, `Target`.

### Actions — `src/actions.ts`

Plain action objects dispatched through `engine.handleAction()`. Key actions: `BumpAction`, `MeleeAction`, `MovementAction`, `PickupAction`, `DropItem`, `EquipAction`, `TakeStairsAction`, `WaitAction`, `ItemAction`.

### Rendering utilities

| File | Role |
|------|------|
| `src/render-functions.ts` | HUD bars, names-at-location, frames |
| `src/colors.ts` | Centralized color constants |
| `src/tile-types.ts` | `floor` and `wall` tile definitions |
| `src/message-log.ts` | Scrollable message log on `window.messageLog` |

## Key conventions

- **Strict TypeScript** — `"strict": true` in `tsconfig.json`
- **Prettier** — trailing commas, 2-space indent, single quotes, semicolons
- **Globals** — `window.engine` and `window.messageLog` are set at startup in `src/main.ts`
- Components reference the engine via `this.engine` (set by `BaseComponent`)
- Colors are always imported from `colors.ts`, never hardcoded inline
- Tile definitions live in `tile-types.ts` to keep `game-map.ts` clean
