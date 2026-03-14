# js-rogue-tutorial

A browser-based roguelike written in TypeScript using [rot-js](https://ondras.github.io/rot.js/hp/) and [Vite](https://vitejs.dev/). Follows the [roguelike tutorial](https://rogueliketutorials.com/) ported from Python/tcod to TypeScript/WebGL.

## Setup

```bash
npm install
npm run dev
```

Then open the URL printed by Vite (default: `http://localhost:5173`).

## Controls

| Key(s) | Action |
|--------|--------|
| Arrow keys, Numpad 1-9, vi keys (`hjklyubn`) | Move / attack |
| `5` or `.` | Wait a turn |
| `g` | Pick up item |
| `i` | Open inventory (use item) |
| `d` | Drop item |
| `>` | Descend stairs |
| `c` | Character screen |
| `v` | Scroll message log |
| `/` | Look mode (mouse or movement keys) |

In inventory/look/targeting mode, press any other key to cancel back to normal play.

## Architecture

The game uses a screen-based state machine backed by an entity-component system:

- **Screens** (`src/screens/`) — `MainMenuScreen` handles save/load; `GameScreen` runs the game loop
- **Engine** (`src/engine.ts`) — holds the player, current map, and active screen; routes input to actions
- **Entities & components** (`src/entity.ts`, `src/components/`) — entities carry optional `fighter`, `ai`, `inventory`, `equipment`, `level`, `consumable`, and `equippable` components
- **Map** (`src/game-map.ts`) — tile grid with FOV (`PreciseShadowcasting`) and entity list
- **Procgen** (`src/procgen.ts`) — room/corridor carving and monster/item placement scaled by floor depth
- **Input** (`src/input-handler.ts`) — keyboard events mapped to `Action` objects; handler transitions manage modal states (inventory, targeting, log)
- **Actions** (`src/actions.ts`) — plain objects executed by the engine each turn

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```
