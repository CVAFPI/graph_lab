// --- APPLICATION STATE ---
const state = {
  originX: 0,
  originY: 0,
  scale: 50,
  isDarkMode: false,
  gridMode: 'standard',
  angleMode: 'radians',
  snapStep: 0.5,
  showMinorGrid: true,
  showAxisNumbers: true,

  // Teacher / Quiz Mode
  teacherHideAnswers: false,
  teacherInteractiveCheck: true,
  quizHiddenTypes: {
    points: true,
    segments: true,
    angles: true,
    triangles: true,
    circles: true,
    polygons: true,
    integrals: true,
    functions: false
  },
  verifiedAnswers: {}, // objId_propKey -> true

  activeTool: 'pan',

  // Data Lists - STARTS BLANK
  functions: [],
  points: [],
  lines: [],
  angles: [],
  triangles: [],
  circles: [],
  polygons: [],
  highlights: [],
  textNotes: [],

  // Interaction State
  tempLineStart: null,
  tempAnglePoints: [],
  tempPythagorasStart: null,
  tempCircleCenter: null,
  tempPolygonPoints: [],
  tempHighlight: null,
  tempShadeStart: null,
  pendingNote: null,
  draggedPoint: null,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  touchStartDist: 0,

  // Active Guess Target
  activeGuess: null,

  // Undo / Redo
  history: [],
  historyIndex: -1
};

// Canvas DOM context
let canvas, ctx, tooltip;

// --- LOCAL STORAGE PERSISTENCE HELPERS ---
const SETTINGS_KEY = 'graphLab_settings_v1';

function saveSettings() {
  try {
    const settingsData = {
      isDarkMode: state.isDarkMode,
      gridMode: state.gridMode,
      angleMode: state.angleMode,
      snapStep: state.snapStep,
      showMinorGrid: state.showMinorGrid,
      showAxisNumbers: state.showAxisNumbers,
      teacherHideAnswers: state.teacherHideAnswers,
      teacherInteractiveCheck: state.teacherInteractiveCheck,
      quizHiddenTypes: state.quizHiddenTypes
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsData));
  } catch (e) {
    console.warn('localStorage save settings failed:', e);
  }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.isDarkMode === 'boolean') state.isDarkMode = parsed.isDarkMode;
      if (typeof parsed.gridMode === 'string') state.gridMode = parsed.gridMode;
      if (parsed.angleMode === 'radians' || parsed.angleMode === 'degrees') state.angleMode = parsed.angleMode;
      if (typeof parsed.snapStep === 'number') state.snapStep = parsed.snapStep;
      if (typeof parsed.showMinorGrid === 'boolean') state.showMinorGrid = parsed.showMinorGrid;
      if (typeof parsed.showAxisNumbers === 'boolean') state.showAxisNumbers = parsed.showAxisNumbers;
      if (typeof parsed.teacherHideAnswers === 'boolean') state.teacherHideAnswers = parsed.teacherHideAnswers;
      if (typeof parsed.teacherInteractiveCheck === 'boolean') state.teacherInteractiveCheck = parsed.teacherInteractiveCheck;
      if (parsed.quizHiddenTypes && typeof parsed.quizHiddenTypes === 'object') {
        state.quizHiddenTypes = { ...state.quizHiddenTypes, ...parsed.quizHiddenTypes };
      }
    }
  } catch (e) {
    console.warn('localStorage load settings failed:', e);
  }
}

function applySettingsToUI() {
  document.documentElement.classList.toggle('dark', state.isDarkMode);

  const setDarkMode = document.getElementById('set-dark-mode');
  if (setDarkMode) setDarkMode.checked = state.isDarkMode;

  const setGridMode = document.getElementById('set-grid-mode');
  if (setGridMode) setGridMode.value = state.gridMode;
  const setAngleMode = document.getElementById('set-angle-mode');
  if (setAngleMode) setAngleMode.value = state.angleMode;
  const calcAngleMode = document.getElementById('calc-angle-mode');
  if (calcAngleMode) calcAngleMode.innerText = state.angleMode === 'degrees' ? 'DEG' : 'RAD';
  const setMinorGrid = document.getElementById('set-minor-grid');
  if (setMinorGrid) setMinorGrid.checked = state.showMinorGrid;
  const setAxisNumbers = document.getElementById('set-axis-numbers');
  if (setAxisNumbers) setAxisNumbers.checked = state.showAxisNumbers;
  const statMode = document.getElementById('stat-mode');
  if (statMode) statMode.innerText = state.gridMode === 'pi' ? 'Trig π Grid' : 'Standard Grid';

  const setSnapStep = document.getElementById('set-snap-step');
  if (setSnapStep) setSnapStep.value = state.snapStep.toString();
  const snapStatusText = document.getElementById('snap-status-text');
  if (snapStatusText) snapStatusText.innerText = state.snapStep > 0 ? `Snap: ${state.snapStep}` : 'Snap: OFF';

  const setTeacherMode = document.getElementById('set-teacher-mode');
  if (setTeacherMode) setTeacherMode.checked = state.teacherHideAnswers;

  const setStudentCheck = document.getElementById('set-student-check');
  if (setStudentCheck) setStudentCheck.checked = state.teacherInteractiveCheck;

  const quizPill = document.getElementById('quiz-mode-pill');
  if (quizPill) quizPill.classList.toggle('hidden', !state.teacherHideAnswers);

  document.querySelectorAll('.quiz-type-toggle').forEach(cb => {
    const type = cb.dataset.quizType;
    if (type in state.quizHiddenTypes) {
      cb.checked = !!state.quizHiddenTypes[type];
    }
  });
}

// Helper to check if a specific math category is hidden in Quiz Mode
function isCategoryHidden(type) {
  return state.teacherHideAnswers && !!state.quizHiddenTypes[type];
}

// --- UNDO / REDO ENGINE ---
function pushHistory() {
  state.history = state.history.slice(0, state.historyIndex + 1);
  const snapshot = JSON.stringify({
    functions: state.functions.map(f => ({ ...f, evaluator: null })),
    points: state.points,
    lines: state.lines,
    angles: state.angles,
    triangles: state.triangles,
    circles: state.circles,
    polygons: state.polygons,
    highlights: state.highlights,
    textNotes: state.textNotes,
    teacherHideAnswers: state.teacherHideAnswers,
    teacherInteractiveCheck: state.teacherInteractiveCheck,
    quizHiddenTypes: state.quizHiddenTypes,
    verifiedAnswers: state.verifiedAnswers
  });
  state.history.push(snapshot);
  state.historyIndex = state.history.length - 1;
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  if (btnUndo) btnUndo.disabled = state.historyIndex <= 0;
  if (btnRedo) btnRedo.disabled = state.historyIndex >= state.history.length - 1;
}

function undo() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    restoreState(state.history[state.historyIndex]);
  }
}

function redo() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    restoreState(state.history[state.historyIndex]);
  }
}

function restoreState(jsonStr) {
  const data = JSON.parse(jsonStr);
  state.points = data.points || [];
  state.lines = data.lines || [];
  state.angles = data.angles || [];
  state.triangles = data.triangles || [];
  state.circles = data.circles || [];
  state.polygons = data.polygons || [];
  state.highlights = data.highlights || [];
  state.textNotes = data.textNotes || [];
  state.teacherHideAnswers = !!data.teacherHideAnswers;
  state.teacherInteractiveCheck = data.teacherInteractiveCheck !== false;
  if (data.quizHiddenTypes) {
    state.quizHiddenTypes = { ...state.quizHiddenTypes, ...data.quizHiddenTypes };
  }
  state.verifiedAnswers = data.verifiedAnswers || {};
  state.functions = (data.functions || []).map(f => ({
    ...f,
    evaluator: SafeMathParser.createEvaluator(f.expr)
  }));

  applySettingsToUI();
  saveSettings();

  renderFunctionRows();
  renderObjectsList();
  updateUndoRedoButtons();
}

// --- COORDINATE TRANSFORMATIONS ---
function worldToScreen(x, y) {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const px = width / 2 + (x - state.originX) * state.scale;
  const py = height / 2 - (y - state.originY) * state.scale;
  return { px, py };
}

function screenToWorld(px, py) {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const x = state.originX + (px - width / 2) / state.scale;
  const y = state.originY - (py - height / 2) / state.scale;
  return { x, y };
}

function snapToGrid(val) {
  if (state.snapStep <= 0) return val;
  return Math.round(val / state.snapStep) * state.snapStep;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

// --- TEACHER QUIZ MODE VALUE FORMATTER ---
function formatValue(val, objId, propName, hintDesc, categoryType) {
  const key = `${objId}_${propName}`;
  if (isCategoryHidden(categoryType) && !state.verifiedAnswers[key]) {
    if (!state.teacherInteractiveCheck) {
      return `<span class="text-amber-600 dark:text-amber-400 font-bold">?</span>`;
    }
    return `<button class="guess-btn inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.5 rounded text-xs font-bold font-mono hover:bg-amber-200" data-id="${objId}" data-prop="${propName}" data-val="${val}" data-hint="${hintDesc}" data-type="${categoryType}">? Check</button>`;
  } else if (isCategoryHidden(categoryType) && state.verifiedAnswers[key]) {
    return `<span class="text-emerald-600 dark:text-emerald-400 font-bold">${typeof val === 'number' ? val.toFixed(2) : val} ✓</span>`;
  }
  return typeof val === 'number' ? val.toFixed(2) : val;
}

function compileAllFunctions() {
  state.functions.forEach(fn => {
    fn.evaluator = SafeMathParser.createEvaluator(fn.expr);
  });
}

function calculateDefiniteIntegral(fn, a, b) {
  if (!fn || !fn.evaluator || isNaN(a) || isNaN(b) || a >= b) return 0;
  const n = 100;
  const h = (b - a) / n;
  let sum = fn.evaluator(a) + fn.evaluator(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * (fn.evaluator(x) || 0);
  }
  return (h / 3) * sum;
}

