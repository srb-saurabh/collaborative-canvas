# Collaborative Canvas (Vanilla JS + Node.js + Socket.io)

Live demo: https://collaborative-canvas-hyol.onrender.com  
Repo: https://github.com/srb-saurabh/collaborative-canvas

---

## What this is
A real-time multi-user drawing canvas built with plain HTML5 Canvas and vanilla JavaScript on the frontend and Node.js + Socket.io on the backend. Features: brush, eraser, color picker, stroke width, cursor indicators, online user list, global undo/redo, and clear.

---

## Quick start (works with `npm install && npm start`)
1. Clone:
   
   git clone https://github.com/srb-saurabh/collaborative-canvas.git
   cd collaborative-canvas
3. `npm install`
4. `npm start`
5. Open `http://localhost:3000` in two or more browser windows to test multi-user drawing.

## How to test with multiple users

- Same machine: open the URL in two tabs or one normal + one incognito/private window. Use different names when prompted. Draw in one tab — the other should show strokes and cursors live.

- Different machines (LAN): find the server machine IP (e.g., 192.168.1.x) and open http://<IP>:3000 from other devices. Ensure firewall allows incoming connections to port 3000.

- Deployed demo: open the demo URL in multiple tabs or share the link.

Test checklist:

- Draw with brush in Tab A → Tab B receives strokes live.

- Switch to eraser in Tab A → Tab B shows erase.

- Move cursor in Tab A → Tab B shows cursor label.

- Undo/Redo in any tab → canvas state updates for all clients.

- Clear → canvas clears for all clients.

## Project structure
collaborative-canvas/
├── client/
│   ├── index.html
│   ├── style.css
│   ├── canvas.js          # Canvas drawing logic
│   ├── websocket.js      # WebSocket (Socket.io) client
│   └── main.js           # UI wiring and handlers
├── server/
│   ├── server.js         # Express + Socket.io server
│   ├── rooms.js          # Room + user management
│   └── drawing-state.js  # Operation history (undo/redo)
├── package.json
├── README.md
└── ARCHITECTURE.md


## Known limitations / bugs

- Global undo semantics: undo toggles the last global operation (server-side undone flag). This undoes anyone’s action — acceptable for this assignment but not per-user undo. Documented in ARCHITECTURE.md.

- No persistence: drawing history is kept in-memory. Server restart clears canvas.

- Full-history re-rendering: client re-renders the entire history on updates. Works for small sessions; may degrade with thousands of ops. Snapshotting or incremental layers recommended for scale.

- Optimistic matching edge-cases: client attempts to match optimistic local ops to server ops heuristically; identical simultaneous strokes can lead to mismatches.

- No authentication: user names are ephemeral; there’s no security/auth flow.

- Limited testing on mobile browsers: basic pointer events supported; some devices may require tuning.

## Time spent
Estimated 6–10 hours to design, implementation, testing, and deployment..

## Deployment
Deploy to any host that supports Node.js (Heroku, Render, VPS).
Ensure `PORT` env var is present or default 3000 used.

