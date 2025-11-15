// client/canvas.js
// Handles input, local rendering, and re-rendering global history.
(function () {
  const canvas = document.getElementById('canvas');
  const cursorsDiv = document.getElementById('cursors');
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.floor(rect.width);
    height = Math.floor(rect.height);
    // preserve resolution for crisp lines
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    renderFromHistory(latestHistory);
  }
  window.addEventListener('resize', () => { resize(); });

  // input state
  let drawing = false;
  let currentTool = 'brush';
  let color = '#000';
  let size = 4;
  let sampling = [];
  let lastEmit = 0;
  const emitInterval = 16; // ms, throttle

  // history from server
  let latestHistory = [];

  function setTool(t) { currentTool = t; }
  function setColor(c) { color = c; }
  function setSize(s) { size = s; }

  // smoothing: simple distance check, sample points
  function addPoint(x, y) {
    sampling.push({ x, y, t: Date.now() });
  }

  function flushStroke(final = false) {
    if (!sampling.length) return;
    const op = {
      type: currentTool === 'eraser' ? 'erase' : 'stroke',
      points: sampling.slice(),
      color: color,
      width: size,
      id: undefined // server will add id if missing
    };
    // local optimistic render: append to local history and render
    latestHistory.push(op);
    renderFromHistory(latestHistory);
    // emit to server
    window.ws.sendOp(op);
    sampling = [];
  }

  // low-level drawing of one op
  function drawOp(ctx, op) {
    if (op.undone) return;
    if (!op.points || op.points.length === 0) return;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = op.width;
    if (op.type === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = op.color || '#000';
    }
    ctx.beginPath();
    const p0 = op.points[0];
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < op.points.length; i++) {
      const p = op.points[i];
      const prev = op.points[i - 1];
      // simple quadratic smoothing
      const cx = (prev.x + p.x) / 2;
      const cy = (prev.y + p.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cx, cy);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  // re-render entire canvas from history (server canonical). cheap but simpler to keep consistency.
  function renderFromHistory(history) {
    // clear
    ctx.clearRect(0, 0, width, height);
    for (const op of history) {
      drawOp(ctx, op);
    }
  }

  // pointer events (support mouse & touch)
  function getPosFromEvent(e) {
    if (e.touches && e.touches[0]) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      return { x: (t.clientX - rect.left), y: (t.clientY - rect.top) };
    } else {
      const rect = canvas.getBoundingClientRect();
      return { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
    }
  }

  // listeners
  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    sampling = [];
    const p = getPosFromEvent(e);
    addPoint(p.x, p.y);
    // capture for move outside
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = getPosFromEvent(e);
    // send cursor every move
    window.ws.sendCursor({ x: p.x, y: p.y, color });
    if (!drawing) return;
    const now = Date.now();
    // sample at most every few ms
    if (now - lastEmit >= emitInterval) {
      addPoint(p.x, p.y);
      lastEmit = now;
      // batch via rAF
      requestAnimationFrame(() => {
        // optimistic partial draw: draw small segment locally by creating temp op
        const tempOp = {
          type: currentTool === 'eraser' ? 'erase' : 'stroke',
          points: sampling.slice(),
          color,
          width: size
        };
        renderFromHistory(latestHistory.concat(tempOp)); // render history + temp
      });
    } else {
      addPoint(p.x, p.y);
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    drawing = false;
    flushStroke(true);
  });

  // Public functions to apply server events
  function applyServerOp(op) {
    // If server sent back an op (with id), try to find local op without id and replace id to keep undo mapping simple.
    // Strategy: if last local op has same points & timestamp proximity, patch id. Otherwise append canonical op.
    let matched = false;
    if (op.id) {
      for (let i = latestHistory.length - 1; i >= 0; i--) {
        const local = latestHistory[i];
        if (!local.id && local.points && op.points && local.points.length === op.points.length) {
          // naive match: same first and last points
          const a = local.points[0], b = op.points[0];
          const al = local.points[local.points.length - 1], bl = op.points[op.points.length - 1];
          if (Math.hypot(a.x - b.x, a.y - b.y) < 4 && Math.hypot(al.x - bl.x, al.y - bl.y) < 4) {
            latestHistory[i] = op; // replace with server op (includes id)
            matched = true;
            break;
          }
        }
      }
    }
    if (!matched) {
      latestHistory.push(op);
    }
    renderFromHistory(latestHistory);
  }

  function setHistoryFromServer(history) {
    latestHistory = history.slice();
    renderFromHistory(latestHistory);
  }

  // expose API
  window.CanvasApp = {
    resize,
    setTool,
    setColor,
    setSize,
    applyServerOp,
    setHistoryFromServer,
    renderFromHistory,

    getHistory: () => latestHistory.slice()
  };

  // initial resize
  setTimeout(resize, 50);
})();
