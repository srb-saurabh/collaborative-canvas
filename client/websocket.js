// client/websocket.js
const socket = io();

function joinRoom(name = 'Guest', roomId = 'default') {
  socket.emit('join', { roomId, name });
}

function sendOp(op) {
  socket.emit('op', op);
}

function sendCursor(cursor) {
  socket.emit('cursor', cursor);
}

function sendUndo(opId) {
  socket.emit('undo', { opId });
}

function sendRedo(opId) {
  socket.emit('redo', { opId });
}

function sendClear() {
  socket.emit('clear');
}

window.ws = {
  socket, joinRoom, sendOp, sendCursor, sendUndo, sendRedo, sendClear
};
