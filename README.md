# Collaborative Canvas (Vanilla JS + Node.js + Socket.io)

## What
Real-time multi-user drawing canvas implemented with:
- Frontend: Vanilla JS + HTML5 Canvas
- Backend: Node.js + Express + Socket.io
- Supports: brush, eraser, colors, stroke width, user cursors, global undo/redo, user list

This repository is a submission for a frontend assignment demonstrating canvas mastery and real-time sync.

## Quick start (dev)
1. `npm install`
2. `npm start`
3. Open `http://localhost:3000` in two or more browser windows to test multi-user drawing.

## Files
See `client/` and `server/` for source. `ARCHITECTURE.md` explains protocol and design.

## How to test multiple users
- Open multiple browsers or private windows and visit the app.
- Each client will prompt for a name and join the default room.
- Draw; you will see other users’ strokes and cursors in real time.

## Known limitations
- Undo/Redo: Server toggles op. Undo removes the operation globally; no per-user undo stack or OT. This is simpler to reason about but may surprise users who expect personal undo.
- Re-rendering: entire history is re-rendered on updates — works for moderate history sizes, may become slow for thousands of ops.
- No persistent storage: state resets when server restarts.
- Basic op matching for optimistic UI; edge cases possible with simultaneous identical strokes.

## Time spent
Estimated ~6–10 hours to design, implement, and document core features.

## Deployment
Deploy to any host that supports Node.js (Heroku, Render, VPS).
Ensure `PORT` env var is present or default 3000 used.

