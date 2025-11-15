// server/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Rooms = require('./rooms');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Rooms(); // manages room state and drawing history

// serve client
app.use(express.static(path.join(__dirname, '..', 'client')));

io.on('connection', socket => {
  // client will emit 'join' with {roomId, name}
  socket.on('join', ({ roomId = 'default', name = 'Anonymous' } = {}) => {
    socket.join(roomId);
    socket.data.userId = uuidv4();
    socket.data.name = name;
    socket.data.roomId = roomId;

    rooms.ensureRoom(roomId);
    rooms.addUser(roomId, socket.data.userId, name);

    // send initial state & user list
    socket.emit('init', {
      userId: socket.data.userId,
      history: rooms.getHistory(roomId),
      users: rooms.getUsers(roomId)
    });

    // broadcast user-joined
    io.to(roomId).emit('users_update', rooms.getUsers(roomId));
  });

  // drawing operation: stroke/erase op model
  socket.on('op', (op) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    op.id = op.id || uuidv4();
    op.userId = socket.data.userId;
    op.timestamp = Date.now();
    rooms.appendOp(roomId, op);
    // broadcast op to others (including sender to ensure ordering)
    io.to(roomId).emit('op', op);
  });

  // cursor positions
  socket.on('cursor', (cursor) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const payload = {
      userId: socket.data.userId,
      name: socket.data.name,
      x: cursor.x,
      y: cursor.y,
      color: cursor.color
    };
    socket.to(roomId).emit('cursor', payload);
  });

  // Undo: toggle op. Server enforces undo by opId
  socket.on('undo', ({ opId }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const success = rooms.toggleOpUndone(roomId, opId, true);
    if (success) io.to(roomId).emit('history_update', rooms.getHistory(roomId));
  });

  // Redo
  socket.on('redo', ({ opId }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const success = rooms.toggleOpUndone(roomId, opId, false);
    if (success) io.to(roomId).emit('history_update', rooms.getHistory(roomId));
  });

  // clear room (optional)
  socket.on('clear', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    rooms.clear(roomId);
    io.to(roomId).emit('history_update', rooms.getHistory(roomId));
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const userId = socket.data.userId;
    if (roomId && userId) {
      rooms.removeUser(roomId, userId);
      io.to(roomId).emit('users_update', rooms.getUsers(roomId));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
