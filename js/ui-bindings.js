// --- INITIALIZATION & BINDING ROUTINE ---
function init() {
  canvas = document.getElementById('graph-canvas');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('hover-tooltip');

  loadSettings();
  applySettingsToUI();

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Tool selection handlers
  const tools = {
    'tool-pan': 'pan',
    'tool-point': 'point',
    'tool-segment': 'segment',
    'tool-angle': 'angle',
    'tool-pythagoras': 'pythagoras',
    'tool-polygon': 'polygon',
    'tool-transform': 'transform',
    'tool-circle': 'circle',
    'tool-shade': 'shade',
    'tool-highlight': 'highlight',
    'tool-text': 'text',
    'tool-erase': 'erase'
  };

  Object.keys(tools).forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.onclick = () => {
      Object.keys(tools).forEach(b => {
        const el = document.getElementById(b);
        if (el) el.classList.remove('active');
      });
      btn.classList.add('active');
      state.activeTool = tools[btnId];
      document.getElementById('tool-name-text').innerText = btn.innerText;

      // Reset temporary state
      state.tempLineStart = null;
      state.tempAnglePoints = [];
      state.tempPythagorasStart = null;
      state.tempCircleCenter = null;
      state.tempPolygonPoints = [];
      state.tempShadeStart = null;
    };
  });

  bindFunctionControls();

  // Canvas Event Listeners
  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);
  canvas.addEventListener('dblclick', handlePolygonDoubleClick);

  // Touch events for mobile
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      state.touchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    } else {
      handlePointerDown(e);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (state.touchStartDist > 0) {
        const factor = dist / state.touchStartDist;
        state.scale = Math.min(Math.max(state.scale * factor, 5), 1000);
      }
      state.touchStartDist = dist;
    } else {
      handlePointerMove(e);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    state.touchStartDist = 0;
    handlePointerUp();
  });

  // Wheel Zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = getCanvasPoint(e);
    const worldBefore = screenToWorld(p.px, p.py);
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    state.scale = Math.min(Math.max(state.scale * zoomFactor, 5), 1000);
    const worldAfter = screenToWorld(p.px, p.py);
    state.originX += (worldBefore.x - worldAfter.x);
    state.originY += (worldBefore.y - worldAfter.y);
  }, { passive: false });

  document.getElementById('btn-zoom-in').onclick = () => { state.scale = Math.min(state.scale * 1.25, 1000); };
  document.getElementById('btn-zoom-out').onclick = () => { state.scale = Math.max(state.scale / 1.25, 5); };
  document.getElementById('btn-reset-view').onclick = () => { state.originX = 0; state.originY = 0; state.scale = 50; };

  document.getElementById('btn-undo').onclick = undo;
  document.getElementById('btn-redo').onclick = redo;

  // Settings Modal
  const modalSettings = document.getElementById('modal-settings');
  document.getElementById('btn-settings').onclick = () => modalSettings.classList.remove('hidden');
  document.getElementById('btn-close-settings').onclick = () => modalSettings.classList.add('hidden');

  // Tool Ribbon Horizontal Scrolling Arrows
  const ribbon = document.getElementById('tool-ribbon');
  const btnScrollLeft = document.getElementById('btn-scroll-left');
  const btnScrollRight = document.getElementById('btn-scroll-right');
  if (btnScrollLeft && ribbon) {
    btnScrollLeft.onclick = () => ribbon.scrollBy({ left: -200, behavior: 'smooth' });
  }
  if (btnScrollRight && ribbon) {
    btnScrollRight.onclick = () => ribbon.scrollBy({ left: 200, behavior: 'smooth' });
  }

  // Quiz Mode Badge click to open Settings
  const quizPill = document.getElementById('quiz-mode-pill');
  if (quizPill) {
    quizPill.onclick = () => modalSettings.classList.remove('hidden');
  }

  // Help Modal
  const modalHelp = document.getElementById('modal-help');
  document.getElementById('btn-help').onclick = () => modalHelp.classList.remove('hidden');
  document.getElementById('btn-close-help').onclick = () => modalHelp.classList.add('hidden');
  document.getElementById('btn-close-help-foot').onclick = () => modalHelp.classList.add('hidden');

    bindSettingsControls();

  // Export Image
  document.getElementById('btn-export-png').onclick = () => {
    const link = document.createElement('a');
    link.download = `graph_lab_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Clear All
  document.getElementById('btn-clear-all').onclick = () => {
    if (confirm('Clear all objects and functions?')) {
      state.functions = []; state.points = []; state.lines = [];
      state.angles = []; state.triangles = []; state.circles = [];
      state.polygons = []; state.highlights = []; state.textNotes = [];
      pushHistory(); renderFunctionRows(); renderObjectsList();
    }
  };

  // Objects List & Teacher Guess Buttons
  document.getElementById('objects-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-object')) {
      const type = e.target.dataset.type, id = e.target.dataset.id;
      if (type === 'point') state.points = state.points.filter(p => p.id !== id);
      if (type === 'line') state.lines = state.lines.filter(l => l.id !== id);
      if (type === 'angle') state.angles = state.angles.filter(a => a.id !== id);
      if (type === 'triangle') state.triangles = state.triangles.filter(t => t.id !== id);
      if (type === 'circle') state.circles = state.circles.filter(c => c.id !== id);
      if (type === 'polygon') state.polygons = state.polygons.filter(g => g.id !== id);
      pushHistory(); renderObjectsList();
    } else if (e.target.classList.contains('guess-btn')) {
      const objId = e.target.dataset.id;
      const propName = e.target.dataset.prop;
      const targetValStr = e.target.dataset.val;
      const hintDesc = e.target.dataset.hint;
      const catType = e.target.dataset.type;
      openGuessModal(objId, propName, targetValStr, hintDesc, catType);
    }
  });

  // Sidebar Tabs
  const tabBtns = {
    'tab-btn-functions': 'tab-functions',
    'tab-btn-objects': 'tab-objects',
    'tab-btn-calc': 'tab-calc',
    'tab-btn-notes': 'tab-notes'
  };
  Object.keys(tabBtns).forEach(btnId => {
    document.getElementById(btnId).onclick = () => {
      Object.keys(tabBtns).forEach(b => {
        document.getElementById(b).className = 'flex-1 py-2.5 px-2 text-center border-b-2 border-transparent hover:text-slate-900 dark:hover:text-slate-200';
        document.getElementById(tabBtns[b]).classList.add('hidden');
      });
      document.getElementById(btnId).className = 'flex-1 py-2.5 px-2 text-center border-b-2 border-blue-600 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold';
      document.getElementById(tabBtns[btnId]).classList.remove('hidden');
    };
  });

  document.getElementById('btn-open-calc').onclick = () => {
    document.getElementById('tab-btn-calc').click();
  };

  // Drawer Collapse
  let isDrawerExpanded = true;
  document.getElementById('btn-toggle-drawer').onclick = () => {
    isDrawerExpanded = !isDrawerExpanded;
    const drawer = document.getElementById('sidebar-panel');
    const arrow = document.getElementById('drawer-arrow');
    drawer.style.maxHeight = isDrawerExpanded ? '45vh' : '42px';
    arrow.innerText = isDrawerExpanded ? '▼' : '▲';
  };

  bindCalculatorControls();

  bindWorksheetControls();
  bindNoteControls();

  pushHistory();
  renderFunctionRows();
  renderObjectsList();
  requestAnimationFrame(render);
}
