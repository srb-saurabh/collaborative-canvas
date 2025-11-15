// client/main.js
document.addEventListener('DOMContentLoaded', () => {
  const name = prompt('Enter your name (optional)') || ('User' + Math.floor(Math.random() * 1000));
  window.ws.joinRoom(name, 'default');

  // UI bindings
  const colorInput = document.getElementById('color');
  const sizeInput = document.getElementById('size');
  const brushBtn = document.getElementById('brush');
  const eraserBtn = document.getElementById('eraser');
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  const clearBtn = document.getElementById('clear');
  const usersSpan = document.getElementById('users');

  colorInput.addEventListener('input', (e) => {
    window.CanvasApp.setColor(e.target.value);
  });
  sizeInput.addEventListener('input', (e) => {
    window.CanvasApp.setSize(parseInt(e.target.value, 10));
  });
  brushBtn.addEventListener('click', () => { window.CanvasApp.setTool('brush'); });
  eraserBtn.addEventListener('click', () => { window.CanvasApp.setTool('eraser'); });

 // reliable global undo: mark last non-undone op as undone
undoBtn.addEventListener('click', () => {
  const history = window.CanvasApp && window.CanvasApp.getHistory ? window.CanvasApp.getHistory() : [];
  // find last op that is not undone
  const last = [...history].reverse().find(o => !o.undone);
  if (last && last.id) {
    console.log('requesting undo for', last.id);
    window.ws.sendUndo(last.id);
  } else {
    console.log('no op available to undo');
  }
});

// reliable global redo: mark earliest undone op as active again
redoBtn.addEventListener('click', () => {
  const history = window.CanvasApp && window.CanvasApp.getHistory ? window.CanvasApp.getHistory() : [];
  // find first op that is undone (redo oldest undone first)
  const opToRedo = history.find(o => o.undone);
  if (opToRedo && opToRedo.id) {
    console.log('requesting redo for', opToRedo.id);
    window.ws.sendRedo(opToRedo.id);
  } else {
    console.log('no op available to redo');
  }
});


  clearBtn.addEventListener('click', () => {
    if (confirm('Clear canvas for everyone?')) {
      window.ws.sendClear();
    }
  });

  // socket events
  const s = window.ws.socket;
  s.on('init', (payload) => {
    // payload: { userId, history, users }
    window.userId = payload.userId;
    window.CanvasApp.setColor(document.getElementById('color').value);
    window.CanvasApp.setSize(parseInt(document.getElementById('size').value,10));
    window.CanvasApp.setHistoryFromServer(payload.history || []);
    renderUserList(payload.users);
  });

  s.on('op', (op) => {
    // apply op (server canonical)
    window.CanvasApp.applyServerOp(op);
  });

  s.on('history_update', (history) => {
    window.CanvasApp.setHistoryFromServer(history);
  });

  s.on('users_update', (users) => {
    renderUserList(users);
  });

  s.on('cursor', (payload) => {
    showRemoteCursor(payload);
  });

  function renderUserList(users) {
    const usersSpan = document.getElementById('users');
    usersSpan.innerText = users.map(u => u.name).join(', ');
  }

  // remote cursor rendering
  const cursorsRoot = document.getElementById('cursors');
  const cursorMap = new Map();
  function showRemoteCursor({ userId, name, x, y, color }) {
    let el = cursorMap.get(userId);
    if (!el) {
      el = document.createElement('div');
      el.className = 'cursor';
      el.innerText = name;
      cursorsRoot.appendChild(el);
      cursorMap.set(userId, el);
    }
    el.style.left = (x) + 'px';
    el.style.top = (y) + 'px';
    el.style.background = color || 'rgba(0,0,0,0.6)';
    // remove after a short timeout if no updates
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => {
      el.remove();
      cursorMap.delete(userId);
    }, 2500);
  }
});
