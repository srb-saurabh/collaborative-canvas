# ARCHITECTURE

## Overview
Clients capture pointer input and emit **operations (ops)** to server using WebSockets (Socket.io). Server stores canonical op history per room and broadcasts ops back to all clients. Clients re-render canvas from canonical history.

## Data flow
1. User draws → client collects sampled points, batches them into an `op`.
2. Client emits `op` to server.
3. Server appends op to room history, assigns an `id`, broadcasts op to room.
4. All clients receive op and update their local history (replace optimistic local op if possible), then re-render.

## WebSocket protocol
- `join` → `{ roomId, name }` — client asks to join a room.
- `init` ← `{ userId, history, users }` — server initial state.
- `op` ↔ `{ id?, userId?, type, points[], color, width, timestamp, undone? }` — stroke/erase op.
- `cursor` → `{ x, y, color }` — pointer position broadcast to others.
- `undo` → `{ opId }` — request to mark an op undone (global).
- `redo` → `{ opId }` — request to mark undone=false.
- `history_update` ← `{ history }` — server sends entire canonical history.

## Undo/Redo strategy
- Server stores ordered `history[]` of ops with `undone` flag.
- Undo: client requests server to toggle `undone=true` for a given opId.
- Redo: `undone=false`.
- Rendering: clients skip ops with `op.undone === true`.
- Reason: operation-based global undo ensures deterministic canvas state and simple server reconciliation.
- Tradeoffs:
  - Pro: Simple, consistent across clients.
  - Con: Does not implement selective or per-user undo semantics nor Operational Transforms (OT) / CRDTs; undoing someone else's op is allowed (policy choice).

## Conflict resolution
- Drawing is additive: simultaneous strokes do not conflict — they are appended in history.
- Erase ops are special ops using `globalCompositeOperation = 'destination-out'` and appended as normal ops. Overlapping strokes are resolved by op order during replay.
- No OT/CRDT — server ordering determines final output. For high concurrency and collaborative editing (text), OT/CRDT needed; for drawing additive model is acceptable.

## Performance decisions
- Client sampling + rAF: reduces frequency of emitted events and smooths strokes.
- Quadratic curve smoothing during render: improves visual quality without complex path simplification.
- Re-render-from-history: simpler and robust; acceptable for small-to-medium history sizes. For large-scale, switch to tiled layers or incremental snapshots.
- Batching: client emits per-stroke (batched points) rather than per-pixel events.

## Scaling & improvements
- Persist history to DB for persistence/load.
- Use snapshots: periodically persist canvas bitmap + truncate old ops.
- Use CRDT or operation transforms for complex collaborative edits.
- Optimize rendering: incremental layering, spatial partitioning, or remote delta patches.
