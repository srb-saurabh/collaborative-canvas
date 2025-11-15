// server/rooms.js
const DrawingState = require('./drawing-state');

class Rooms {
  constructor() {
    this._rooms = new Map();
  }

  ensureRoom(roomId) {
    if (!this._rooms.has(roomId)) {
      this._rooms.set(roomId, {
        drawing: new DrawingState(),
        users: new Map()
      });
    }
  }

  addUser(roomId, userId, name) {
    this.ensureRoom(roomId);
    this._rooms.get(roomId).users.set(userId, { id: userId, name });
  }

  removeUser(roomId, userId) {
    if (!this._rooms.has(roomId)) return;
    this._rooms.get(roomId).users.delete(userId);
  }

  getUsers(roomId) {
    if (!this._rooms.has(roomId)) return [];
    return Array.from(this._rooms.get(roomId).users.values());
  }

  appendOp(roomId, op) {
    this.ensureRoom(roomId);
    this._rooms.get(roomId).drawing.append(op);
  }

  getHistory(roomId) {
    this.ensureRoom(roomId);
    return this._rooms.get(roomId).drawing.getHistory();
  }

  toggleOpUndone(roomId, opId, undone) {
    this.ensureRoom(roomId);
    return this._rooms.get(roomId).drawing.toggleOpUndone(opId, undone);
  }

  clear(roomId) {
    this.ensureRoom(roomId);
    this._rooms.get(roomId).drawing.clear();
  }
}

module.exports = Rooms;

