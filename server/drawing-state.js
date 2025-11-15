// server/drawing-state.js
// Simple operation history store. Each op: { id, userId, type: 'stroke'|'erase', points: [...], color, width, undone: bool, timestamp }
class DrawingState {
  constructor() {
    this.history = [];
  }

  append(op) {
    op.undone = false;
    this.history.push(op);
  }

  getHistory() {
    return this.history.slice(); // shallow copy
  }

  toggleOpUndone(opId, undone) {
    const op = this.history.find(o => o.id === opId);
    if (!op) return false;
    op.undone = undone;
    return true;
  }

  clear() {
    this.history = [];
  }
}

module.exports = DrawingState;

