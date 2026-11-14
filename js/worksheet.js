function isWorksheetRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteWorksheetNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function assertWorksheetId(value, label) {
  if (typeof value !== 'string' || !/^[\w-]{1,80}$/.test(value)) {
    throw new Error(`${label} has an invalid ID.`);
  }
}

function assertWorksheetPoint(value, label) {
  if (!isWorksheetRecord(value) || !isFiniteWorksheetNumber(value.x) || !isFiniteWorksheetNumber(value.y)) {
    throw new Error(`${label} must contain finite x and y coordinates.`);
  }
}

function validateWorksheetData(data) {
  if (!isWorksheetRecord(data)) {
    throw new Error('The worksheet must be a JSON object.');
  }

  const arrayFields = ['functions', 'points', 'lines', 'angles', 'triangles', 'circles', 'polygons', 'highlights', 'textNotes'];
  const hasWorksheetData = arrayFields.some(field => field in data);
  if (!hasWorksheetData) {
    throw new Error('This JSON does not contain worksheet data.');
  }
  arrayFields.forEach(field => {
    if (field in data && !Array.isArray(data[field])) {
      throw new Error(`"${field}" must be an array.`);
    }
  });

  const normalized = Object.fromEntries(arrayFields.map(field => [field, data[field] || []]));
  normalized.functions = normalized.functions.map((fn, index) => {
    if (!isWorksheetRecord(fn) || typeof fn.expr !== 'string' || fn.expr.length > 500) {
      throw new Error(`Function ${index + 1} needs a valid expression.`);
    }
    assertWorksheetId(fn.id, `Function ${index + 1}`);
    if (fn.color !== undefined && (typeof fn.color !== 'string' || !/^#[\da-f]{6}$/i.test(fn.color))) {
      throw new Error(`Function ${index + 1} has an invalid color.`);
    }
    if (fn.name !== undefined && (typeof fn.name !== 'string' || fn.name.length > 24)) {
      throw new Error(`Function ${index + 1} has an invalid name.`);
    }
    if (fn.minDomain !== undefined && typeof fn.minDomain !== 'string' && typeof fn.minDomain !== 'number') {
      throw new Error(`Function ${index + 1} has an invalid lower domain bound.`);
    }
    if (fn.maxDomain !== undefined && typeof fn.maxDomain !== 'string' && typeof fn.maxDomain !== 'number') {
      throw new Error(`Function ${index + 1} has an invalid upper domain bound.`);
    }
    const minDomain = fn.minDomain === undefined ? '' : fn.minDomain;
    const maxDomain = fn.maxDomain === undefined ? '' : fn.maxDomain;
    if ((minDomain !== '' && (String(minDomain).length > 40 || !Number.isFinite(Number(minDomain))))
      || (maxDomain !== '' && (String(maxDomain).length > 40 || !Number.isFinite(Number(maxDomain))))) {
      throw new Error(`Function ${index + 1} has a nonnumeric domain bound.`);
    }
    if (fn.shadeIntegral !== undefined && !isWorksheetRecord(fn.shadeIntegral)) {
      throw new Error(`Function ${index + 1} has invalid integral settings.`);
    }
    const shadeIntegral = fn.shadeIntegral || {};
    const integralStart = Number(shadeIntegral.a ?? -2);
    const integralEnd = Number(shadeIntegral.b ?? 2);
    if (!Number.isFinite(integralStart) || !Number.isFinite(integralEnd)) {
      throw new Error(`Function ${index + 1} has invalid integral bounds.`);
    }
    return {
      ...fn,
      name: fn.name || `f${index + 1}`,
      color: fn.color || '#2563eb',
      visible: fn.visible !== false,
      minDomain: String(minDomain),
      maxDomain: String(maxDomain),
      shadeIntegral: { active: !!shadeIntegral.active, a: integralStart, b: integralEnd },
      evaluator: null
    };
  });

  normalized.points.forEach((point, index) => {
    assertWorksheetId(point && point.id, `Point ${index + 1}`);
    assertWorksheetPoint(point, `Point ${index + 1}`);
    if (point.label !== undefined && (typeof point.label !== 'string' || !/^[\w '-]{1,24}$/.test(point.label))) {
      throw new Error(`Point ${index + 1} has an invalid label.`);
    }
    if (point.color !== undefined && (typeof point.color !== 'string' || !/^#[\da-f]{6}$/i.test(point.color))) {
      throw new Error(`Point ${index + 1} has an invalid color.`);
    }
  });

  const numericFields = {
    lines: ['x1', 'y1', 'x2', 'y2'],
    angles: ['x1', 'y1', 'vx', 'vy', 'x2', 'y2', 'deg'],
    triangles: ['x1', 'y1', 'x2', 'y2', 'a', 'b', 'c'],
    circles: ['h', 'k', 'r']
  };
  Object.keys(numericFields).forEach(field => {
    normalized[field].forEach((item, index) => {
      assertWorksheetId(item && item.id, `${field} item ${index + 1}`);
      if (!isWorksheetRecord(item) || !numericFields[field].every(key => isFiniteWorksheetNumber(item[key]))) {
        throw new Error(`${field} item ${index + 1} contains invalid coordinates or measurements.`);
      }
      if (field === 'angles'
        && (typeof item.type !== 'string' || !/^[\w °]{1,24}$/.test(item.type)
          || typeof item.vertexLabel !== 'string' || !/^[\w']{1,12}$/.test(item.vertexLabel))) {
        throw new Error(`Angle ${index + 1} has an invalid label or classification.`);
      }
    });
  });

  normalized.polygons.forEach((polygon, index) => {
    assertWorksheetId(polygon && polygon.id, `Polygon ${index + 1}`);
    if (!isWorksheetRecord(polygon) || !Array.isArray(polygon.points) || polygon.points.length < 3
      || !polygon.points.every(point => isWorksheetRecord(point)
        && isFiniteWorksheetNumber(point.x) && isFiniteWorksheetNumber(point.y))
      || !isFiniteWorksheetNumber(polygon.area) || !isFiniteWorksheetNumber(polygon.perimeter)) {
      throw new Error(`Polygon ${index + 1} contains invalid geometry.`);
    }
  });

  normalized.highlights.forEach((highlight, index) => {
    assertWorksheetId(highlight && highlight.id, `Highlight ${index + 1}`);
    if (!isWorksheetRecord(highlight) || !Array.isArray(highlight.points)) {
      throw new Error(`Highlight ${index + 1} contains invalid geometry.`);
    }
    highlight.points.forEach((point, pointIndex) => assertWorksheetPoint(point, `Highlight ${index + 1}, point ${pointIndex + 1}`));
  });

  normalized.textNotes.forEach((note, index) => {
    assertWorksheetId(note && note.id, `Note ${index + 1}`);
    if (!isWorksheetRecord(note) || !isFiniteWorksheetNumber(note.x) || !isFiniteWorksheetNumber(note.y)
      || typeof note.text !== 'string' || note.text.length > 1000) {
      throw new Error(`Note ${index + 1} contains invalid content.`);
    }
  });

  if (data.quizHiddenTypes !== undefined && !isWorksheetRecord(data.quizHiddenTypes)) {
    throw new Error('"quizHiddenTypes" must be an object.');
  }
  if (data.verifiedAnswers !== undefined && !isWorksheetRecord(data.verifiedAnswers)) {
    throw new Error('"verifiedAnswers" must be an object.');
  }

  return {
    ...normalized,
    teacherHideAnswers: !!data.teacherHideAnswers,
    teacherInteractiveCheck: data.teacherInteractiveCheck !== false,
    quizHiddenTypes: data.quizHiddenTypes,
    verifiedAnswers: data.verifiedAnswers
  };
}

function createWorksheetData() {
  return {
    functions: state.functions.map(fn => ({ ...fn, evaluator: null })),
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
  };
}

function setWorksheetStatus(message, isError) {
  const status = document.getElementById('worksheet-status');
  status.innerText = message;
  status.className = `text-xs ${isError ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`;
}

function applyWorksheetText(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error('The selected file is not valid JSON.');
  }
  const worksheet = validateWorksheetData(parsed);
  if (!confirm('Replace the current graph with this worksheet?')) return false;
  const currentSnapshot = JSON.stringify(createWorksheetData());
  if (state.history[state.historyIndex] !== currentSnapshot) pushHistory();
  restoreState(JSON.stringify(worksheet));
  pushHistory();
  return true;
}

function bindWorksheetControls() {
  const modal = document.getElementById('modal-worksheet');
  const codeInput = document.getElementById('worksheet-json-code');
  const fileInput = document.getElementById('worksheet-file-input');

  document.getElementById('btn-worksheet').onclick = () => {
    codeInput.value = JSON.stringify(createWorksheetData(), null, 2);
    setWorksheetStatus('', false);
    modal.classList.remove('hidden');
  };

  document.getElementById('btn-close-worksheet').onclick = () => modal.classList.add('hidden');
  document.getElementById('btn-load-json').onclick = () => {
    try {
      if (applyWorksheetText(codeInput.value)) {
        setWorksheetStatus('Worksheet loaded.', false);
        modal.classList.add('hidden');
      }
    } catch (error) {
      setWorksheetStatus(error.message, true);
    }
  };

  document.getElementById('btn-import-json-file').onclick = () => fileInput.click();
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      codeInput.value = text;
      if (applyWorksheetText(text)) {
        setWorksheetStatus(`Loaded ${file.name}.`, false);
        modal.classList.add('hidden');
      }
    } catch (error) {
      setWorksheetStatus(error.message, true);
    } finally {
      fileInput.value = '';
    }
  });

  document.getElementById('btn-copy-json').onclick = async () => {
    try {
      await navigator.clipboard.writeText(codeInput.value);
      setWorksheetStatus('Worksheet JSON copied.', false);
    } catch (error) {
      codeInput.select();
      const copied = document.execCommand('copy');
      if (copied) setWorksheetStatus('Worksheet JSON copied.', false);
      else setWorksheetStatus('Could not copy JSON. Select and copy the text manually.', true);
    }
  };

  document.getElementById('btn-download-json').onclick = () => {
    const blob = new Blob([codeInput.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `worksheet_${Date.now()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
}
