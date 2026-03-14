# src/screens/

Screen-based state machine for the game. `window.engine.screen` holds the active screen. Each screen owns an `inputHandler` and is responsible for its own rendering.

## Lifecycle

```
KeyboardEvent
  → engine.update(event)
    → screen.update(event)          // returns the next screen (often `this`)
      → inputHandler.handleKeyboardInput(event)  // returns Action | null
      → action.perform(player, gameMap)
      → handleEnemyTurns()
      → gameMap.updateFov(player)
      → inputHandler = inputHandler.nextHandler  // handler transitions
      → screen.render()
```

## Files

| File | Role |
|------|------|
| `base-screen.ts` | Abstract base. Requires `inputHandler`, `update(event)`, and `render()`. Holds `display` (rot-js `Display`) and `player` (`Actor`). |
| `main-menu.ts` | Title/menu screen. Reads `localStorage['roguesave']` to offer "Continue" option. Transitions to `GameScreen` on new game or continue. |
| `game-screen.ts` | Active gameplay. Owns `GameMap`, runs the turn loop, delegates rendering to `render-functions.ts`. Handles `s` key for save directly (not via action system). |

## Key details — `GameScreen`

- **Map size constants** are static readonly fields on `GameScreen` (e.g. `GameScreen.MAP_WIDTH = 80`).
- **Save** (`s` key): serializes `GameMap` + entities to JSON via `toObject()`, writes to `localStorage`.
- **Load**: `GameScreen.load()` reconstructs the map from the JSON. Item/entity types are matched by name string — if you add a new entity type, add it to both the `toObject()` serializer and the `load()` switch.
- **Starting equipment**: new games give the player a Dagger and Leather Armor via `toggleEquip()` before the first render.
- **Enemy turns**: all living actors call `ai?.perform()` each turn; errors are silently swallowed.

## Adding a new screen

1. Extend `BaseScreen`.
2. Implement `inputHandler`, `update()`, and `render()`.
3. Return the new screen instance from the appropriate `update()` call in the current screen.
