// --- RENDER SIDEBAR LISTS ---
function renderFunctionRows() {
  const container = document.getElementById('function-list');
  if (!container) return;
  container.innerHTML = '';

  if (state.functions.length === 0) {
    container.innerHTML = `<div class="p-3 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded text-slate-400 text-xs">No functions added yet. Click <strong>+ Add f(x)</strong> above to plot equations!</div>`;
    return;
  }

  state.functions.forEach((fn) => {
    const card = document.createElement('div');
    card.className = 'border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 p-2 flex flex-col gap-2 text-xs shadow-sm';

    const integralVal = fn.shadeIntegral && fn.shadeIntegral.active 
      ? calculateDefiniteIntegral(fn, parseFloat(fn.shadeIntegral.a), parseFloat(fn.shadeIntegral.b))
      : 0;

    const fnExprKey = `${fn.id}_expr`;
    const isFnHidden = isCategoryHidden('functions') && !state.verifiedAnswers[fnExprKey];
    const safeName = escapeHtml(fn.name || 'f');

    card.innerHTML = `
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1.5 flex-1">
          <input type="checkbox" ${fn.visible ? 'checked' : ''} data-id="${fn.id}" class="fn-vis-toggle accent-blue-600">
          <input type="color" value="${fn.color}" data-id="${fn.id}" class="fn-color-picker w-5 h-5 border-none cursor-pointer bg-transparent rounded">
          <input type="text" aria-label="Function name" maxlength="24" value="${safeName}" data-id="${fn.id}" class="fn-name-input w-12 font-mono font-bold text-slate-700 dark:text-slate-300 bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none">
          <span class="font-mono font-bold text-slate-700 dark:text-slate-300">(x) =</span>
          ${isFnHidden ? `
            <div class="flex-1 flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 px-2 py-1 rounded">
              <span class="font-mono text-amber-700 dark:text-amber-300 font-bold">?</span>
              ${state.teacherInteractiveCheck ? `<button class="guess-btn text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold px-1.5 py-0.5 rounded" data-id="${fn.id}" data-prop="expr" data-val="${escapeHtml(fn.expr)}" data-hint="Equation f(x)" data-type="functions">? Guess Equation</button>` : ''}
            </div>
          ` : `
            <input type="text" value="${escapeHtml(fn.expr)}" data-id="${fn.id}" class="fn-expr-input flex-1 font-mono px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white">
          `}
        </div>
        <button class="fn-duplicate-btn text-blue-600 dark:text-blue-400 font-bold px-1" data-id="${fn.id}" title="Duplicate function" aria-label="Duplicate ${safeName}">⧉</button>
        <button class="fn-delete-btn text-slate-400 hover:text-rose-600 font-bold px-1.5 text-base" data-id="${fn.id}">&times;</button>
      </div>

      <div class="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-1">
          <span>Domain:</span>
          <input type="text" placeholder="-∞" value="${escapeHtml(fn.minDomain || '')}" data-id="${fn.id}" class="fn-domain-min w-10 text-center py-0.5 border rounded dark:bg-slate-800 dark:border-slate-700">
          <span>to</span>
          <input type="text" placeholder="∞" value="${escapeHtml(fn.maxDomain || '')}" data-id="${fn.id}" class="fn-domain-max w-10 text-center py-0.5 border rounded dark:bg-slate-800 dark:border-slate-700">
        </div>
        <button class="fn-table-btn text-blue-600 dark:text-blue-400 hover:underline font-bold" data-id="${fn.id}">📊 Table</button>
      </div>

      <div class="flex flex-col gap-1 pt-1 border-t border-slate-100 dark:border-slate-800 font-mono text-[11px]">
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" ${fn.shadeIntegral && fn.shadeIntegral.active ? 'checked' : ''} data-id="${fn.id}" class="fn-integral-toggle accent-blue-600">
            <span>Shade Integral ∫[a,b]</span>
          </label>
          ${fn.shadeIntegral && fn.shadeIntegral.active ? `<span class="font-bold text-blue-600 dark:text-blue-400">Area: ${formatValue(integralVal, fn.id, 'area', 'Area under curve', 'integrals')}</span>` : ''}
        </div>
        ${fn.shadeIntegral && fn.shadeIntegral.active ? `
          <div class="flex items-center gap-2 pl-4">
            <span>a:</span>
            <input type="number" step="0.5" value="${fn.shadeIntegral.a}" data-id="${fn.id}" class="fn-integral-a w-12 py-0.5 border rounded dark:bg-slate-800 dark:border-slate-700">
            <span>b:</span>
            <input type="number" step="0.5" value="${fn.shadeIntegral.b}" data-id="${fn.id}" class="fn-integral-b w-12 py-0.5 border rounded dark:bg-slate-800 dark:border-slate-700">
          </div>
        ` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

function renderObjectsList() {
  const container = document.getElementById('objects-list');
  if (!container) return;
  container.innerHTML = '';

  let count = 0;

  // Render Points
  state.points.forEach(p => {
    count++;
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900';
    
    const ptCoordStr = `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;
    const ptKey = `${p.id}_coords`;
    const isPtHidden = isCategoryHidden('points') && !state.verifiedAnswers[ptKey];

    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full" style="background:${p.color}"></span>
        <strong class="text-slate-900 dark:text-slate-100">${p.label}</strong>
        <span class="text-slate-600 dark:text-slate-400">
          ${isPtHidden ? (state.teacherInteractiveCheck ? `<button class="guess-btn inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.5 rounded text-xs font-bold font-mono hover:bg-amber-200" data-id="${p.id}" data-prop="coords" data-val="${p.x},${p.y}" data-hint="Point ${p.label} (x, y)" data-type="points">? Check Coords</button>` : '(?, ?)') : (isCategoryHidden('points') ? ptCoordStr + ' ✓' : ptCoordStr)}
        </span>
      </div>
      <button class="delete-object text-slate-400 hover:text-rose-600 font-bold px-1 text-sm" data-type="point" data-id="${p.id}">&times;</button>
    `;
    container.appendChild(item);
  });

  // Render Line Segments
  state.lines.forEach(l => {
    count++;
    const dx = l.x2 - l.x1;
    const dy = l.y2 - l.y1;
    const len = Math.hypot(dx, dy);
    const slope = dx !== 0 ? (dy / dx) : 'Undefined';
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900';
    item.innerHTML = `
      <div class="flex flex-col">
        <strong class="text-slate-900 dark:text-slate-100">Segment (${l.x1.toFixed(1)},${l.y1.toFixed(1)}) → (${l.x2.toFixed(1)},${l.y2.toFixed(1)})</strong>
        <span class="text-[10px] text-slate-500">Distance: ${formatValue(len, l.id, 'dist', 'Segment distance', 'segments')} | Slope m: ${typeof slope === 'number' ? formatValue(slope, l.id, 'slope', 'Segment slope', 'segments') : 'Vertical'}</span>
      </div>
      <button class="delete-object text-slate-400 hover:text-rose-600 font-bold px-1 text-sm" data-type="line" data-id="${l.id}">&times;</button>
    `;
    container.appendChild(item);
  });

  // Render Angles
  state.angles.forEach(a => {
    count++;
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900';
    item.innerHTML = `
      <div class="flex flex-col">
        <strong class="text-blue-600 dark:text-blue-400">Angle ∠${a.vertexLabel} = ${formatValue(a.deg, a.id, 'deg', 'Angle degrees', 'angles')}°</strong>
        <span class="text-[10px] text-slate-500">Classification: <strong>${a.type}</strong></span>
      </div>
      <button class="delete-object text-slate-400 hover:text-rose-600 font-bold px-1 text-sm" data-type="angle" data-id="${a.id}">&times;</button>
    `;
    container.appendChild(item);
  });

  // Render Right Triangles (Pythagoras)
  state.triangles.forEach(t => {
    count++;
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900';
    item.innerHTML = `
      <div class="flex flex-col">
        <strong class="text-emerald-600 dark:text-emerald-400">Right Triangle (a² + b² = c²)</strong>
        <span class="text-[10px] text-slate-500">a = ${formatValue(t.a, t.id, 'a', 'Leg a', 'triangles')}, b = ${formatValue(t.b, t.id, 'b', 'Leg b', 'triangles')} → c = ${formatValue(t.c, t.id, 'c', 'Hypotenuse c', 'triangles')}</span>
      </div>
      <button class="delete-object text-slate-400 hover:text-rose-600 font-bold px-1 text-sm" data-type="triangle" data-id="${t.id}">&times;</button>
    `;
    container.appendChild(item);
  });

  // Render Polygons
  state.polygons.forEach(g => {
    count++;
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900';
    item.innerHTML = `
      <div class="flex flex-col">
        <strong class="text-amber-600 dark:text-amber-400">Polygon (${g.points.length} Vertices)</strong>
        <span class="text-[10px] text-slate-500">Area: ${formatValue(g.area, g.id, 'area', 'Polygon area', 'polygons')} | Perim: ${formatValue(g.perimeter, g.id, 'perim', 'Polygon perimeter', 'polygons')}</span>
      </div>
      <button class="delete-object text-slate-400 hover:text-rose-600 font-bold px-1 text-sm" data-type="polygon" data-id="${g.id}">&times;</button>
    `;
    container.appendChild(item);
  });

  // Render Circles
  state.circles.forEach(c => {
    count++;
    const area = Math.PI * c.r * c.r;
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900';
    item.innerHTML = `
      <div class="flex flex-col">
        <strong class="text-purple-600 dark:text-purple-400">Circle Center (${c.h.toFixed(1)}, ${c.k.toFixed(1)})</strong>
        <span class="text-[10px] text-slate-500">r = ${formatValue(c.r, c.id, 'r', 'Radius r', 'circles')} | Area = ${formatValue(area, c.id, 'area', 'Circle area', 'circles')}</span>
      </div>
      <button class="delete-object text-slate-400 hover:text-rose-600 font-bold px-1 text-sm" data-type="circle" data-id="${c.id}">&times;</button>
    `;
    container.appendChild(item);
  });

  if (count === 0) {
    container.innerHTML = `<div class="p-3 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded text-slate-400 text-xs">No geometry shapes or markers placed yet.</div>`;
  }
}

