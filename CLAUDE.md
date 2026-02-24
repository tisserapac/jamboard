# Jamboard

Google Jamboard clone — a single-user whiteboard desktop app built with Electron. Supports freehand drawing, shapes, text, sticky notes, multiple frames per board, undo/redo, and auto-save to local SQLite.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 33 via electron-vite 5 |
| UI | React 18 + TypeScript 5.7 |
| Canvas | Fabric.js 6 |
| State | Zustand 5 |
| Styling | Tailwind CSS 3 |
| Database | SQLite via better-sqlite3 |
| PDF export | pdf-lib (planned) |

## Project Structure

```
src/
├── main/               # Electron main process (Node.js)
│   ├── index.ts        # Window creation, app lifecycle, IPC registration
│   ├── database.ts     # SQLite singleton, schema migrations
│   └── ipc/            # IPC handlers (one file per entity)
│       ├── board.ipc.ts
│       └── frame.ipc.ts
├── preload/            # Secure IPC bridge
│   └── index.ts        # contextBridge exposing window.api
└── renderer/           # React app (Chromium)
    └── src/
        ├── App.tsx             # State-based routing (Dashboard ↔ Board)
        ├── env.d.ts            # window.api type declaration
        ├── pages/              # Top-level views
        │   ├── DashboardPage.tsx   # Board grid, create/rename/delete
        │   └── BoardPage.tsx       # Editor: toolbar + canvas + frame sidebar
        ├── components/
        │   ├── canvas/
        │   │   └── WhiteboardCanvas.tsx  # Fabric.js integration, all tools
        │   └── toolbar/
        │       ├── Toolbar.tsx           # Tool buttons
        │       ├── ColorPicker.tsx
        │       └── BrushSizeSlider.tsx
        ├── stores/             # Zustand state
        │   ├── toolStore.ts    # Active tool, color, brush size
        │   └── boardStore.ts   # Boards list, current board, frames
        └── styles/
            └── globals.css     # Tailwind imports
```

**Config files:** `electron.vite.config.ts`, `tsconfig.json` (root references `tsconfig.node.json` + `tsconfig.web.json`), `tailwind.config.js`, `postcss.config.js`

## Commands

```bash
npm run dev       # Dev mode with hot reload
npm run build     # Production build to out/
npm run start     # Preview production build
```

Native dependencies (better-sqlite3) rebuild automatically via `postinstall`.

## Key Conventions

- **IPC channels**: `{entity}:{action}` — e.g., `boards:create`, `frames:updateCanvas`
- **IPC registration**: `register{Entity}Ipc()` functions in `src/main/ipc/`, called at startup in `src/main/index.ts:18-19`
- **Preload bridge**: Every IPC channel must be mirrored in `src/preload/index.ts` AND typed in `src/renderer/src/env.d.ts`
- **Database access**: Always through `getDb()` singleton (`src/main/database.ts:8`); prepared statements with parameterized values
- **Canvas persistence**: `canvas.toJSON()` → debounced IPC save (1s) → SQLite `frames.canvas_json` column
- **No router library**: `App.tsx` uses `useState` — `null` = dashboard, `string` = board editor
- **Refs for non-rendering state**: `{name}Ref` convention — canvas instance, timers, undo stacks

## Database

SQLite at `{userData}/data/jamboard.db`. Schema in `src/main/database.ts:25-53`.

Three tables: `boards`, `frames` (with `canvas_json` TEXT for Fabric.js serialization), `assets` (placeholder for image uploads). Foreign keys with CASCADE delete. WAL mode enabled.

## Adding a New Feature

Typical flow for a new data-backed feature:

1. **Schema** — add/alter table in `src/main/database.ts` `runMigrations()`
2. **IPC handlers** — add `ipcMain.handle()` in `src/main/ipc/`
3. **Preload** — expose in `src/preload/index.ts` API object
4. **Types** — update `src/renderer/src/env.d.ts` window.api declaration
5. **UI** — call `window.api.*` from React components

For a new canvas tool:

1. Add tool type to `ToolType` union in `src/renderer/src/stores/toolStore.ts:3`
2. Add tool entry in `Toolbar.tsx` tools array (`src/renderer/src/components/toolbar/Toolbar.tsx:6-13`)
3. Add `case` in the tool-switching `useEffect` in `WhiteboardCanvas.tsx:70-115`
4. If custom mouse events needed, create a `setup{Tool}Events()` function

## Additional Documentation

Check these files for deeper context on specific topics:

- `.claude/docs/architectural_patterns.md` — IPC handler pattern, canvas tool patterns (Pattern A vs B), auto-save flow, undo/redo design, Zustand store split, timestamp propagation, ref conventions
