// --- CANVAS RENDER ENGINE ---
function drawGrid() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  ctx.fillStyle = state.isDarkMode ? '#090d16' : '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Grid Step calculation
  let rawStep = 1;
  if (state.scale < 15) rawStep = 10;
  else if (state.scale < 30) rawStep = 5;
  else if (state.scale > 300) rawStep = 0.25;
  else if (state.scale > 150) rawStep = 0.5;

  const stepPx = rawStep * state.scale;
  const origin = worldToScreen(0, 0);

  if (state.showMinorGrid) {
    ctx.strokeStyle = state.isDarkMode ? '#1e293b' : '#e2e8f0';
    ctx.lineWidth = 0.75;
    ctx.beginPath();

    const startX = origin.px % stepPx;
    for (let x = startX; x < width; x += stepPx) {
      ctx.moveTo(Math.floor(x) + 0.5, 0);
      ctx.lineTo(Math.floor(x) + 0.5, height);
    }
    const startY = origin.py % stepPx;
    for (let y = startY; y < height; y += stepPx) {
      ctx.moveTo(0, Math.floor(y) + 0.5);
      ctx.lineTo(width, Math.floor(y) + 0.5);
    }
    ctx.stroke();
  }

  // Axes lines (X & Y)
  ctx.strokeStyle = state.isDarkMode ? '#64748b' : '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // X Axis
  ctx.moveTo(0, Math.floor(origin.py) + 0.5);
  ctx.lineTo(width, Math.floor(origin.py) + 0.5);
  // Y Axis
  ctx.moveTo(Math.floor(origin.px) + 0.5, 0);
  ctx.lineTo(Math.floor(origin.px) + 0.5, height);
  ctx.stroke();

  if (state.showAxisNumbers) {
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = state.isDarkMode ? '#94a3b8' : '#64748b';

    const minWorld = screenToWorld(0, height);
    const maxWorld = screenToWorld(width, 0);

    const firstX = Math.ceil(minWorld.x / rawStep) * rawStep;
    for (let x = firstX; x <= maxWorld.x; x += rawStep) {
      if (Math.abs(x) < 0.0001) continue;
      const { px } = worldToScreen(x, 0);
      let label = x.toString();
      if (state.gridMode === 'pi') {
        const mult = x / Math.PI;
        if (Math.abs(mult - 1) < 0.01) label = 'π';
        else if (Math.abs(mult + 1) < 0.01) label = '-π';
        else if (Math.abs(mult - 0.5) < 0.01) label = 'π/2';
        else if (Math.abs(mult + 0.5) < 0.01) label = '-π/2';
        else label = mult.toFixed(1) + 'π';
      }
      ctx.fillText(label, px - 6, Math.min(Math.max(origin.py + 12, 12), height - 6));
    }

    const firstY = Math.ceil(minWorld.y / rawStep) * rawStep;
    for (let y = firstY; y <= maxWorld.y; y += rawStep) {
      if (Math.abs(y) < 0.0001) continue;
      const { py } = worldToScreen(0, y);
      ctx.fillText(y.toString(), Math.min(Math.max(origin.px + 4, 4), width - 20), py + 3);
    }

    ctx.fillText('0', origin.px - 10, origin.py + 12);
  }
  document.getElementById('stat-grid').innerText = `Step: ${rawStep}`;
  document.getElementById('stat-scale').innerText = `Zoom: ${Math.round(state.scale / 50 * 100)}%`;
}

function drawFunctions() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const minWorld = screenToWorld(0, 0);
  const maxWorld = screenToWorld(width, 0);

  state.functions.forEach(fn => {
    if (!fn.visible || !fn.evaluator) return;

    // Shade integral if enabled
    if (fn.shadeIntegral && fn.shadeIntegral.active) {
      const a = parseFloat(fn.shadeIntegral.a);
      const b = parseFloat(fn.shadeIntegral.b);
      if (!isNaN(a) && !isNaN(b) && a < b) {
        ctx.fillStyle = (fn.color || '#2563eb') + '33';
        ctx.beginPath();
        const startPt = worldToScreen(a, 0);
        ctx.moveTo(startPt.px, startPt.py);

        const step = (b - a) / 200;
        for (let x = a; x <= b; x += step) {
          const y = fn.evaluator(x);
          if (!isNaN(y)) {
            const pt = worldToScreen(x, y);
            ctx.lineTo(pt.px, pt.py);
          }
        }
        const endPt = worldToScreen(b, 0);
        ctx.lineTo(endPt.px, endPt.py);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw Function Curve
    ctx.strokeStyle = fn.color || '#2563eb';
    ctx.lineWidth = 2.25;
    ctx.beginPath();

    let drawing = false;
    const pxStep = 2; // sample resolution
    for (let px = 0; px <= width; px += pxStep) {
      const world = screenToWorld(px, 0);
      
      if (fn.minDomain && world.x < parseFloat(fn.minDomain)) continue;
      if (fn.maxDomain && world.x > parseFloat(fn.maxDomain)) continue;

      const y = fn.evaluator(world.x);
      if (isNaN(y) || !isFinite(y)) {
        drawing = false;
        continue;
      }

      const pt = worldToScreen(world.x, y);
      if (!drawing) {
        ctx.moveTo(pt.px, pt.py);
        drawing = true;
      } else {
        ctx.lineTo(pt.px, pt.py);
      }
    }
    ctx.stroke();
  });
}

function drawPoints() {
  state.points.forEach(p => {
    const { px, py } = worldToScreen(p.x, p.y);
    const origin = worldToScreen(0, 0);

    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = state.isDarkMode ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 1;

    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, origin.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(origin.px, py); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = p.color || '#dc2626';
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = state.isDarkMode ? '#f8fafc' : '#0f172a';

    const ptKey = `${p.id}_coords`;
    const isPtHidden = isCategoryHidden('points') && !state.verifiedAnswers[ptKey];
    const coordLabel = isPtHidden ? `${p.label} (?, ?)` : `${p.label} (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;
    ctx.fillText(coordLabel, px + 8, py - 8);
  });
}

function drawLines() {
  state.lines.forEach(l => {
    const p1 = worldToScreen(l.x1, l.y1);
    const p2 = worldToScreen(l.x2, l.y2);

    ctx.strokeStyle = l.color || (state.isDarkMode ? '#f8fafc' : '#0f172a');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.px, p1.py);
    ctx.lineTo(p2.px, p2.py);
    ctx.stroke();

    ctx.fillStyle = l.color || (state.isDarkMode ? '#f8fafc' : '#0f172a');
    ctx.beginPath();
    ctx.arc(p1.px, p1.py, 3.5, 0, Math.PI * 2);
    ctx.arc(p2.px, p2.py, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const midX = (l.x1 + l.x2) / 2;
    const midY = (l.y1 + l.y2) / 2;
    const midPx = worldToScreen(midX, midY);
    const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1);

    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    ctx.fillStyle = state.isDarkMode ? '#cbd5e1' : '#334155';
    const isHidden = isCategoryHidden('segments') && !state.verifiedAnswers[`${l.id}_dist`];
    const labelText = isHidden ? 'd = ?' : `d = ${len.toFixed(2)}`;
    ctx.fillText(labelText, midPx.px + 6, midPx.py - 6);
  });
}

function drawCircles() {
  state.circles.forEach(c => {
    const centerPx = worldToScreen(c.h, c.k);
    const radiusPx = c.r * state.scale;

    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerPx.px, centerPx.py, radiusPx, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#9333ea';
    ctx.beginPath();
    ctx.arc(centerPx.px, centerPx.py, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(centerPx.px, centerPx.py);
    ctx.lineTo(centerPx.px + radiusPx, centerPx.py);
    ctx.stroke();
    ctx.restore();

    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = '#9333ea';
    const isHidden = isCategoryHidden('circles') && !state.verifiedAnswers[`${c.id}_r`];
    const labelText = isHidden ? 'r = ?' : `r = ${c.r.toFixed(2)}`;
    ctx.fillText(labelText, centerPx.px + radiusPx / 2 - 10, centerPx.py - 5);
  });
}

function drawPolygons() {
  state.polygons.forEach(g => {
    if (g.points.length < 3) return;

    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.beginPath();
    const first = worldToScreen(g.points[0].x, g.points[0].y);
    ctx.moveTo(first.px, first.py);
    for (let i = 1; i < g.points.length; i++) {
      const pt = worldToScreen(g.points[i].x, g.points[i].y);
      ctx.lineTo(pt.px, pt.py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    let cx = 0, cy = 0;
    g.points.forEach(p => { cx += p.x; cy += p.y; });
    cx /= g.points.length;
    cy /= g.points.length;
    const cPx = worldToScreen(cx, cy);

    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.fillStyle = '#d97706';
    const isHidden = isCategoryHidden('polygons') && !state.verifiedAnswers[`${g.id}_area`];
    const labelText = isHidden ? 'Area = ?' : `Area = ${g.area.toFixed(2)}`;
    ctx.fillText(labelText, cPx.px - 15, cPx.py);
  });
}

function drawTriangles() {
  state.triangles.forEach(t => {
    const p1 = worldToScreen(t.x1, t.y1);
    const p2 = worldToScreen(t.x2, t.y2);
    const corner = worldToScreen(t.x2, t.y1);

    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.moveTo(p1.px, p1.py);
    ctx.lineTo(corner.px, corner.py);
    ctx.lineTo(p2.px, p2.py);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    const boxSize = 10;
    const dx = Math.sign(p1.px - corner.px) * boxSize;
    const dy = Math.sign(p2.py - corner.py) * boxSize;

    ctx.beginPath();
    ctx.moveTo(corner.px + dx, corner.py);
    ctx.lineTo(corner.px + dx, corner.py + dy);
    ctx.lineTo(corner.px, corner.py + dy);
    ctx.stroke();

    ctx.font = 'bold 11px ui-monospace, monospace';
    ctx.fillStyle = '#059669';
    
    const isTriHidden = isCategoryHidden('triangles');
    const legAText = (isTriHidden && !state.verifiedAnswers[`${t.id}_a`]) ? 'a=?' : `a=${t.a.toFixed(2)}`;
    const legBText = (isTriHidden && !state.verifiedAnswers[`${t.id}_b`]) ? 'b=?' : `b=${t.b.toFixed(2)}`;
    const hypCText = (isTriHidden && !state.verifiedAnswers[`${t.id}_c`]) ? 'c=?' : `c=${t.c.toFixed(2)}`;

    ctx.fillText(legAText, (p1.px + corner.px) / 2, corner.py + (dy > 0 ? 14 : -6));
    ctx.fillText(legBText, corner.px + (dx > 0 ? 6 : -35), (p2.py + corner.py) / 2);
    ctx.fillText(hypCText, (p1.px + p2.px) / 2 - 10, (p1.py + p2.py) / 2 - 6);
  });
}

function drawAngles() {
  state.angles.forEach(a => {
    const pA = worldToScreen(a.x1, a.y1);
    const pV = worldToScreen(a.vx, a.vy);
    const pC = worldToScreen(a.x2, a.y2);

    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pV.px, pV.py); ctx.lineTo(pA.px, pA.py);
    ctx.moveTo(pV.px, pV.py); ctx.lineTo(pC.px, pC.py);
    ctx.stroke();

    const angleA = Math.atan2(pA.py - pV.py, pA.px - pV.px);
    const angleC = Math.atan2(pC.py - pV.py, pC.px - pV.px);

    const arcRadius = 24;
    ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
    ctx.strokeStyle = '#2563eb';

    if (Math.abs(a.deg - 90) < 0.5) {
      const sz = 12;
      const v1x = Math.cos(angleA) * sz;
      const v1y = Math.sin(angleA) * sz;
      const v2x = Math.cos(angleC) * sz;
      const v2y = Math.sin(angleC) * sz;

      ctx.beginPath();
      ctx.moveTo(pV.px + v1x, pV.py + v1y);
      ctx.lineTo(pV.px + v1x + v2x, pV.py + v1y + v2y);
      ctx.lineTo(pV.px + v2x, pV.py + v2y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(pV.px, pV.py, arcRadius, angleA, angleC, false);
      ctx.stroke();
    }

    ctx.font = 'bold 11px ui-monospace, monospace';
    ctx.fillStyle = state.isDarkMode ? '#60a5fa' : '#1d4ed8';
    const isHidden = isCategoryHidden('angles') && !state.verifiedAnswers[`${a.id}_deg`];
    const labelText = isHidden ? `∠${a.vertexLabel} = ?°` : `∠${a.vertexLabel}=${a.deg.toFixed(1)}°`;
    ctx.fillText(labelText, pV.px + 12, pV.py - 12);
  });
}

function drawHighlights() {
  state.highlights.forEach(h => {
    if (!h.points || h.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = h.color || 'rgba(253, 224, 71, 0.45)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const first = worldToScreen(h.points[0].x, h.points[0].y);
    ctx.moveTo(first.px, first.py);
    for (let i = 1; i < h.points.length; i++) {
      const pt = worldToScreen(h.points[i].x, h.points[i].y);
      ctx.lineTo(pt.px, pt.py);
    }
    ctx.stroke();
    ctx.restore();
  });

  if (state.tempHighlight && state.tempHighlight.length > 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const first = worldToScreen(state.tempHighlight[0].x, state.tempHighlight[0].y);
    ctx.moveTo(first.px, first.py);
    for (let i = 1; i < state.tempHighlight.length; i++) {
      const pt = worldToScreen(state.tempHighlight[i].x, state.tempHighlight[i].y);
      ctx.lineTo(pt.px, pt.py);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawNotes() {
  state.textNotes.forEach(n => {
    const pt = worldToScreen(n.x, n.y);
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.fillStyle = state.isDarkMode ? '#fef08a' : '#854d0e';
    ctx.fillText(n.text, pt.px, pt.py);
  });
}

function render() {
  if (!ctx || !canvas) return;
  drawGrid();
  drawHighlights();
  drawFunctions();
  drawPolygons();
  drawCircles();
  drawTriangles();
  drawLines();
  drawAngles();
  drawPoints();
  drawNotes();
  requestAnimationFrame(render);
}

