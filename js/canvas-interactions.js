// --- MOUSE & TOUCH EVENT HANDLERS FOR CANVAS ---
function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  return { px, py };
}

function distanceToSegment(point, start, end) {
  const dx = end.px - start.px;
  const dy = end.py - start.py;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point.px - start.px) * dx + (point.py - start.py) * dy) / lengthSquared));
  return Math.hypot(point.px - (start.px + t * dx), point.py - (start.py + t * dy));
}

function isPointInsidePolygon(point, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const current = vertices[i];
    const previous = vertices[j];
    const crosses = (current.y > point.y) !== (previous.y > point.y)
      && point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function openNoteEditor(point) {
  state.pendingNote = point;
  document.getElementById('note-input').value = '';
  document.getElementById('note-status').classList.add('hidden');
  document.getElementById('modal-note').classList.remove('hidden');
  document.getElementById('note-input').focus();
}

function bindNoteControls() {
  const modal = document.getElementById('modal-note');
  const input = document.getElementById('note-input');
  const status = document.getElementById('note-status');
  const close = () => {
    state.pendingNote = null;
    modal.classList.add('hidden');
  };

  document.getElementById('btn-close-note').onclick = close;
  document.getElementById('btn-cancel-note').onclick = close;
  document.getElementById('btn-save-note').onclick = () => {
    const text = input.value.trim();
    if (!text) {
      status.innerText = 'Enter some note text before saving.';
      status.classList.remove('hidden');
      input.focus();
      return;
    }
    if (!state.pendingNote) return;
    state.textNotes.push({
      id: 'n_' + Date.now(),
      x: state.pendingNote.x,
      y: state.pendingNote.y,
      text
    });
    pushHistory();
    close();
  };
}

function eraseObjectAt(world, screen) {
  const hitRadius = 12;
  let nearest = null;
  let nearestDistance = hitRadius;
  const consider = (collection, item, distance) => {
    if (distance <= nearestDistance) {
      nearest = { collection, id: item.id };
      nearestDistance = distance;
    }
  };
  const screenPoint = { px: screen.px, py: screen.py };

  state.functions.forEach(fn => {
    if (!fn.visible || !fn.evaluator
      || (fn.minDomain && world.x < parseFloat(fn.minDomain))
      || (fn.maxDomain && world.x > parseFloat(fn.maxDomain))) return;
    const y = fn.evaluator(world.x);
    if (Number.isFinite(y)) {
      consider('functions', fn, Math.abs(screen.py - worldToScreen(world.x, y).py));
    }
  });

  state.polygons.forEach(item => {
    const vertices = item.points;
    let distance = isPointInsidePolygon(world, vertices) ? 0 : Infinity;
    for (let i = 0; i < vertices.length; i++) {
      const start = worldToScreen(vertices[i].x, vertices[i].y);
      const end = worldToScreen(vertices[(i + 1) % vertices.length].x, vertices[(i + 1) % vertices.length].y);
      distance = Math.min(distance, distanceToSegment(screenPoint, start, end));
    }
    consider('polygons', item, distance);
  });

  state.circles.forEach(item => {
    const center = worldToScreen(item.h, item.k);
    const radialDistance = Math.hypot(screen.px - center.px, screen.py - center.py);
    consider('circles', item, Math.min(Math.abs(radialDistance - item.r * state.scale), radialDistance));
  });

  state.triangles.forEach(item => {
    const vertices = [
      { x: item.x1, y: item.y1 },
      { x: item.x2, y: item.y1 },
      { x: item.x2, y: item.y2 }
    ];
    let distance = isPointInsidePolygon(world, vertices) ? 0 : Infinity;
    for (let i = 0; i < vertices.length; i++) {
      distance = Math.min(distance, distanceToSegment(
        screenPoint,
        worldToScreen(vertices[i].x, vertices[i].y),
        worldToScreen(vertices[(i + 1) % vertices.length].x, vertices[(i + 1) % vertices.length].y)
      ));
    }
    consider('triangles', item, distance);
  });

  state.lines.forEach(item => {
    consider('lines', item, distanceToSegment(
      screenPoint,
      worldToScreen(item.x1, item.y1),
      worldToScreen(item.x2, item.y2)
    ));
  });

  state.angles.forEach(item => {
    const vertex = worldToScreen(item.vx, item.vy);
    const first = worldToScreen(item.x1, item.y1);
    const second = worldToScreen(item.x2, item.y2);
    consider('angles', item, Math.min(
      distanceToSegment(screenPoint, vertex, first),
      distanceToSegment(screenPoint, vertex, second)
    ));
  });

  state.highlights.forEach(item => {
    let distance = Infinity;
    for (let i = 1; i < item.points.length; i++) {
      distance = Math.min(distance, distanceToSegment(
        screenPoint,
        worldToScreen(item.points[i - 1].x, item.points[i - 1].y),
        worldToScreen(item.points[i].x, item.points[i].y)
      ));
    }
    consider('highlights', item, distance);
  });

  state.points.forEach(item => {
    const point = worldToScreen(item.x, item.y);
    consider('points', item, Math.hypot(screen.px - point.px, screen.py - point.py));
  });

  state.textNotes.forEach(item => {
    ctx.font = 'bold 12px ui-monospace, monospace';
    const point = worldToScreen(item.x, item.y);
    const inBounds = screen.px >= point.px && screen.px <= point.px + ctx.measureText(item.text).width
      && screen.py >= point.py - 12 && screen.py <= point.py + 2;
    if (inBounds) consider('textNotes', item, 0);
  });

  if (!nearest) return false;
  state[nearest.collection] = state[nearest.collection].filter(item => item.id !== nearest.id);
  if (nearest.collection === 'functions') {
    compileAllFunctions();
    renderFunctionRows();
  }
  pushHistory();
  renderObjectsList();
  return true;
}

function handlePointerDown(e) {
  const p = getCanvasPoint(e);
  const world = screenToWorld(p.px, p.py);
  const snapped = { x: snapToGrid(world.x), y: snapToGrid(world.y) };

  if (state.activeTool === 'pan') {
    state.isPanning = true;
    state.panStartX = p.px;
    state.panStartY = p.py;

    // Check point dragging
    const hitPt = state.points.find(pt => {
      const s = worldToScreen(pt.x, pt.y);
      return Math.hypot(p.px - s.px, p.py - s.py) < 10;
    });
    if (hitPt) {
      state.draggedPoint = hitPt;
      state.isPanning = false;
    }
  } else if (state.activeTool === 'point') {
    const letter = String.fromCharCode(65 + (state.points.length % 26));
    state.points.push({ id: 'p_' + Date.now(), x: snapped.x, y: snapped.y, label: letter, color: '#dc2626' });
    pushHistory(); renderObjectsList();
  } else if (state.activeTool === 'segment') {
    if (!state.tempLineStart) {
      state.tempLineStart = snapped;
    } else {
      state.lines.push({ id: 'l_' + Date.now(), x1: state.tempLineStart.x, y1: state.tempLineStart.y, x2: snapped.x, y2: snapped.y });
      state.tempLineStart = null;
      pushHistory(); renderObjectsList();
    }
  } else if (state.activeTool === 'angle') {
    state.tempAnglePoints.push(snapped);
    if (state.tempAnglePoints.length === 3) {
      const [pA, pV, pC] = state.tempAnglePoints;
      const rad1 = Math.atan2(pA.y - pV.y, pA.x - pV.x);
      const rad2 = Math.atan2(pC.y - pV.y, pC.x - pV.x);
      let diffRad = Math.abs(rad1 - rad2);
      if (diffRad > Math.PI) diffRad = 2 * Math.PI - diffRad;
      const deg = (diffRad * 180) / Math.PI;

      let angleType = 'Acute';
      if (Math.abs(deg - 90) < 0.5) angleType = 'Right 90°';
      else if (deg > 90 && deg < 180) angleType = 'Obtuse';
      else if (Math.abs(deg - 180) < 0.5) angleType = 'Straight 180°';

      state.angles.push({ id: 'a_' + Date.now(), x1: pA.x, y1: pA.y, vx: pV.x, vy: pV.y, x2: pC.x, y2: pC.y, deg, type: angleType, vertexLabel: 'B' });
      state.tempAnglePoints = [];
      pushHistory(); renderObjectsList();
    }
  } else if (state.activeTool === 'pythagoras') {
    if (!state.tempPythagorasStart) {
      state.tempPythagorasStart = snapped;
    } else {
      const x1 = state.tempPythagorasStart.x, y1 = state.tempPythagorasStart.y;
      const x2 = snapped.x, y2 = snapped.y;
      const legA = Math.abs(x2 - x1);
      const legB = Math.abs(y2 - y1);
      const hypC = Math.hypot(legA, legB);

      state.triangles.push({ id: 't_' + Date.now(), x1, y1, x2, y2, a: legA, b: legB, c: hypC });
      state.tempPythagorasStart = null;
      pushHistory(); renderObjectsList();
    }
  } else if (state.activeTool === 'circle') {
    if (!state.tempCircleCenter) {
      state.tempCircleCenter = snapped;
    } else {
      const r = Math.hypot(snapped.x - state.tempCircleCenter.x, snapped.y - state.tempCircleCenter.y);
      if (r > 0) {
        state.circles.push({ id: 'c_' + Date.now(), h: state.tempCircleCenter.x, k: state.tempCircleCenter.y, r });
        pushHistory(); renderObjectsList();
      }
      state.tempCircleCenter = null;
    }
  } else if (state.activeTool === 'shade') {
    if (!state.tempShadeStart) {
      let closestFunction = null;
      let closestDistance = 14;
      state.functions.forEach(fn => {
        if (!fn.visible || !fn.evaluator
          || (fn.minDomain && world.x < parseFloat(fn.minDomain))
          || (fn.maxDomain && world.x > parseFloat(fn.maxDomain))) return;
        const y = fn.evaluator(world.x);
        if (!Number.isFinite(y)) return;
        const distance = Math.abs(p.py - worldToScreen(world.x, y).py);
        if (distance < closestDistance) {
          closestFunction = fn;
          closestDistance = distance;
        }
      });
      if (!closestFunction) {
        document.getElementById('analysis-box').innerText = 'Click directly on a visible function curve to choose the area to shade.';
        return;
      }
      state.tempShadeStart = { functionId: closestFunction.id, x: snapped.x };
      document.getElementById('analysis-box').innerText = `Selected ${closestFunction.name}. Click another x-coordinate to set the shading interval.`;
    } else {
      const fn = state.functions.find(item => item.id === state.tempShadeStart.functionId);
      if (!fn) {
        state.tempShadeStart = null;
        return;
      }
      const a = Math.min(state.tempShadeStart.x, snapped.x);
      const b = Math.max(state.tempShadeStart.x, snapped.x);
      if (a === b) {
        document.getElementById('analysis-box').innerText = 'Choose a different x-coordinate to set the shading interval.';
        return;
      }
      if ((fn.minDomain && a < parseFloat(fn.minDomain)) || (fn.maxDomain && b > parseFloat(fn.maxDomain))) {
        document.getElementById('analysis-box').innerText = 'Choose interval bounds inside the function domain.';
        return;
      }
      fn.shadeIntegral = { ...(fn.shadeIntegral || {}), active: true, a, b };
      state.tempShadeStart = null;
      pushHistory();
      renderFunctionRows();
      document.getElementById('analysis-box').innerText = `Shading ${fn.name} from x = ${a} to x = ${b}.`;
    }
  } else if (state.activeTool === 'polygon') {
    state.tempPolygonPoints.push(snapped);
  } else if (state.activeTool === 'transform') {
    const hitPt = state.points.find(pt => Math.hypot(snapped.x - pt.x, snapped.y - pt.y) < 0.6);
    if (hitPt) {
      const letter = hitPt.label + "'";
      state.points.push({ id: 'p_' + Date.now(), x: -hitPt.x, y: hitPt.y, label: letter, color: '#2563eb' });
      pushHistory(); renderObjectsList();
    }
  } else if (state.activeTool === 'highlight') {
    state.tempHighlight = [snapped];
  } else if (state.activeTool === 'text') {
    openNoteEditor(snapped);
  } else if (state.activeTool === 'erase') {
    eraseObjectAt(world, p);
  }
}

function handlePointerMove(e) {
  const p = getCanvasPoint(e);
  const world = screenToWorld(p.px, p.py);

  document.getElementById('stat-coord').innerText = `X: ${world.x.toFixed(3)} | Y: ${world.y.toFixed(3)}`;

  if (state.draggedPoint) {
    state.draggedPoint.x = snapToGrid(world.x);
    state.draggedPoint.y = snapToGrid(world.y);
    renderObjectsList();
  } else if (state.isPanning) {
    const dx = p.px - state.panStartX;
    const dy = p.py - state.panStartY;
    state.originX -= dx / state.scale;
    state.originY += dy / state.scale;
    state.panStartX = p.px;
    state.panStartY = p.py;
  } else if (state.activeTool === 'highlight' && state.tempHighlight) {
    state.tempHighlight.push(world);
  } else if (state.activeTool === 'pan') {
    inspectHoverCoordinates(world, p.px, p.py);
  }
}

function handlePointerUp() {
  if (state.draggedPoint) {
    pushHistory();
    state.draggedPoint = null;
  }
  state.isPanning = false;

  if (state.activeTool === 'highlight' && state.tempHighlight) {
    if (state.tempHighlight.length > 1) {
      state.highlights.push({ id: 'h_' + Date.now(), points: [...state.tempHighlight], color: 'rgba(253, 224, 71, 0.45)' });
      pushHistory();
    }
    state.tempHighlight = null;
  }
}

function handlePolygonDoubleClick() {
  if (state.activeTool === 'polygon' && state.tempPolygonPoints.length >= 3) {
    const points = state.tempPolygonPoints;
    while (points.length > 1) {
      const last = points[points.length - 1];
      const previous = points[points.length - 2];
      if (last.x !== previous.x || last.y !== previous.y) break;
      points.pop();
    }
    if (points.length < 3) return;

    let area = 0, perim = 0;
    const pts = points;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
      perim += Math.hypot(pts[j].x - pts[i].x, pts[j].y - pts[i].y);
    }
    area = Math.abs(area) / 2;

    state.polygons.push({ id: 'g_' + Date.now(), points: [...pts], area, perimeter: perim });
    state.tempPolygonPoints = [];
    pushHistory(); renderObjectsList();
  }
}

