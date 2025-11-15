# ARCHITECTURE

## Overview
Clients capture pointer input and emit operations (ops) to server using WebSockets (Socket.io). Server stores canonical op history per room and broadcasts ops back to all clients. Clients re-render canvas from canonical history.
## Data flow 
┌──────────────────┐
│   User Pointer    │
└─────────┬────────┘
   sample + smooth
            ↓
┌─────────────────────────────────────────┐
│ Client                                  │
│ build op {type, points[], color, width} │
└───────────────┬─────────────────────────┘
           emit over Socket.io
                    ↓
┌─────────────────────────────────────────┐
│ Server                                  │
│ assign id + timestamp                   │
│ append to room.history                  │
└───────────────┬─────────────────────────┘
           broadcast operation
                    ↓
┌─────────────────────────────────────────┐
│ Clients                                 │
│ receive op                              │
│ match/replace optimistic op             │
│ renderFromHistory                       │
└───────────────┬─────────────────────────┘
                ↕
undo / redo / clear
→ server updates history
→ emits history_update
→ clients re-render

## WebSocket protocol (messages)

All messages use JSON objects over Socket.io.

### Client → Server

- join { roomId, name }
Join room; server replies with init.

- op { id?, type: 'stroke'|'erase', points: [{x,y,t},...], color, width }
Submit a completed or batched stroke/erase operation. id optional — server assigns authoritative id.

- cursor { x, y, color }
Low-frequency pointer position broadcast for cursor indicators.

- undo { opId }
Request server to mark op undone.

- redo { opId }
Request server to unmark op undone.

- clear {}
Clear canvas (server wipes history).

### Server → Client

- init { userId, history: [ops], users: [user] }
Initial room state on join.

- op { id, userId, type, points, color, width, timestamp, undone? }
Broadcast when an op is appended.

- cursor { userId, name, x, y, color }
Broadcast pointer positions to other clients.

- history_update { history }
Sent after undo/redo/clear to provide canonical history snapshot.

- users_update { users }
Sent on join/disconnect.

#### Design rationale:

- Use op objects (operation-based) rather than raw bitmaps — smaller payloads and semantics for undo/redo.

- Use history_update when state-changing control actions occur (undo/redo/clear) to force canonical reconciliation.

## Undo / Redo strategy (global)

- Server stores ordered history[] of ops; each op has undone: boolean.

- Undo: client requests undo with an opId. Server sets op.undone = true and emits history_update.

- Redo: server sets op.undone = false and emits history_update.



#### Why this approach:

- Deterministic and simple: a single source of truth (server) ensures all clients stay consistent.

- Avoids complex Operational Transforms or CRDTs — acceptable because drawing is mostly additive and order-determined.

- Tradeoff: global undo affects anyone's operations; per-user undo would require additional ownership semantics or more advanced CRDT/OT logic.

#### Edge cases & notes:

- Undo selection policy: client selects "last non-undone op" by default (global LIFO). Could be changed (per-user, specific opId selection) with minor UI/server changes.

- History size: re-rendering full history is used for correctness; snapshotting recommended for large histories.

### Performance decisions & optimizations

Choices made and why:

1. Batched ops (client-side sampling)

- Collect points while pointer is down, emit one op per stroke (not per pixel).

- Reduces network chatter, lowers CPU on server.

2. requestAnimationFrame for rendering

- Use rAF to throttle UI updates and keep rendering in sync with browser paint cycles.

3. Quadratic curve smoothing

- Use simple quadratic curves between sampled points for visually smooth strokes without heavy path simplification.

4. Optimistic rendering + server reconciliation

- Immediate user feedback locally; server op arrival reconciles authoritative state. Balances latency and consistency.

5. Re-render-from-history

- Simpler, correct approach for small-to-medium sessions.

- For scale: implement periodic bitmap snapshots (PNG) + truncate old ops, or use incremental layered canvases to redraw only changed regions.

6. Eraser as operation

- Use globalCompositeOperation='destination-out' for erase ops so they compose predictably in replay.

### Conflict resolution (how simultaneous drawing is handled)

- Principle: operations are commutative only by temporal order — the server orders ops and that order determines the final composed image.

- Additive model: strokes and erase ops are appended; overlapping strokes resolved by replay order. Erase ops remove pixels already drawn earlier in history according to compositing rules.

- No OT/CRDT applied: for drawing this is acceptable; perfect merging not required. If strict merge semantics or collaborative editing (text/structured data) were required, adopt CRDT/OT.

Consequences:

- Simultaneous strokes do not block each other — both appear based on server ordering.

- Simultaneous identical strokes may lead to optimistic-matching heuristics failing (client may try to match local optimistic op to server op); handled with a simple heuristic (match by first/last point proximity), but can fail in edge cases.

