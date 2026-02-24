# Architectural Patterns

## Three-Process Architecture

Electron enforces strict process isolation. Every feature touches all three layers:

1. **Main process** (Node.js) — owns DB, filesystem, native dialogs
2. **Preload script** — secure bridge; the ONLY file that touches both `ipcRenderer` and `contextBridge`
3. **Renderer process** (React/Chromium) — pure UI; accesses Node capabilities exclusively through `window.api`

Data always flows: Renderer → `window.api` → `ipcRenderer.invoke()` → `ipcMain.handle()` → DB → response back.

## IPC Handler Registration Pattern

Every entity gets a `register{Entity}Ipc()` function in `src/main/ipc/{entity}.ipc.ts`. The main process calls these at startup (`src/main/index.ts:18-19`).

Channel naming convention: `{entity}:{action}` — e.g., `boards:create`, `frames:updateCanvas`.

Each handler follows the same shape:
- Get the DB singleton via `getDb()` (`src/main/database.ts:8`)
- Use prepared statements with parameterized values (no raw string interpolation)
- Return typed data; the preload bridge passes it through unchanged

Multi-step mutations are wrapped in `db.transaction()`:
- `boards:create` — inserts board + first frame atomically (`src/main/ipc/board.ipc.ts:17-24`)
- `boards:duplicate` — copies board + all frames (`src/main/ipc/board.ipc.ts:62-89`)
- `frames:delete` — removes frame + reorders siblings (`src/main/ipc/frame.ipc.ts:76-82`)

## Preload API Mirroring

The preload script (`src/preload/index.ts`) mirrors IPC channels as a nested object:

```
window.api.boards.create(title)  →  ipcRenderer.invoke('boards:create', title)
window.api.frames.list(boardId)  →  ipcRenderer.invoke('frames:list', boardId)
```

The `JamboardAPI` type is exported from preload and declared on `window` in `src/renderer/src/env.d.ts:4-6`. Always add new IPC channels to both files.

## Zustand Store Split

Two stores with distinct responsibilities — neither imports the other:

| Store | Scope | File |
|-------|-------|------|
| `useToolStore` | Drawing state (active tool, color, brush size, shape type) | `src/renderer/src/stores/toolStore.ts` |
| `useBoardStore` | Data state (boards list, current board, frames, active frame) | `src/renderer/src/stores/boardStore.ts` |

Stores use simple setter actions (no async logic). All IPC calls live in page components, not stores.

## Canvas Tool Implementation

Tools follow two distinct patterns in `WhiteboardCanvas.tsx`:

**Pattern A — Fabric.js built-in drawing mode** (pen, highlighter):
Set `canvas.isDrawingMode = true` and configure `canvas.freeDrawingBrush`. Fabric handles mouse events internally. See `src/renderer/src/components/canvas/WhiteboardCanvas.tsx:81-94`.

**Pattern B — Custom mouse event handlers** (eraser, shapes, text, sticky):
Attach `mouse:down`/`mouse:move`/`mouse:up` listeners via standalone `setup{Tool}Events()` functions defined outside the component. See `src/renderer/src/components/canvas/WhiteboardCanvas.tsx:145-266`.

When `activeTool` changes, a `useEffect` resets the canvas mode and sets up the new tool (`src/renderer/src/components/canvas/WhiteboardCanvas.tsx:68-116`).

## Canvas Persistence & Auto-Save

1. Fabric.js canvas serializes to JSON via `canvas.toJSON()`
2. `onCanvasChange` callback passes JSON string to `BoardPage`
3. `BoardPage` debounces saves (1000ms timeout) before calling `frames:updateCanvas` IPC
4. `frames:updateCanvas` also updates the parent board's `updated_at` timestamp (`src/main/ipc/frame.ipc.ts:39-44`)
5. Before frame switches or navigation, an immediate flush save occurs (`src/renderer/src/pages/BoardPage.tsx:41-47`)

The `isLoadingRef` flag prevents saves during `loadFromJSON()` to avoid writing back data that's still loading (`src/renderer/src/components/canvas/WhiteboardCanvas.tsx:46-53`).

## Undo/Redo via JSON State Snapshots

Two ref-based stacks (`undoStackRef`, `redoStackRef`) hold serialized canvas JSON strings. Max 50 states to cap memory. The undo system uses full snapshots rather than command objects — simpler but larger memory footprint. See `src/renderer/src/components/canvas/WhiteboardCanvas.tsx:21-22` and keyboard handler at lines `118-143`.

## Timestamp Propagation

Child mutations propagate timestamps upward:
- `frames:updateCanvas` → updates `frames.updated_at` AND `boards.updated_at`
- `frames:updateMeta` → updates `frames.updated_at` only

This keeps the dashboard's "last edited" sort order accurate without extra queries.

## State-Based Routing

`App.tsx` uses a single `useState<string | null>` for routing — no router library:
- `null` → render `DashboardPage`
- `string` (board ID) → render `BoardPage`

Navigation via callback props: `onOpenBoard(id)` and `onBack()`. See `src/renderer/src/App.tsx:5-16`.

## Ref Usage Conventions

Refs are used for values that should NOT trigger re-renders:
- `canvasRef` — DOM element for Fabric.js
- `fabricRef` — Fabric.js canvas instance
- `saveTimeoutRef` — debounce timer ID
- `canvasJsonRef` — latest serialized state (for flush saves)
- `undoStackRef` / `redoStackRef` — undo history
- `isLoadingRef` — prevents save-during-load loops

All follow the `{name}Ref` naming convention.
