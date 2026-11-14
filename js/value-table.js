// --- TABLE OF VALUES MODAL ---
let activeTableFn = null;
function openTableModal(fn) {
  activeTableFn = fn;
  document.getElementById('table-error').classList.add('hidden');
  document.getElementById('modal-table').classList.remove('hidden');
  generateTableOfValues();
}

function getTableParameters() {
  const start = parseFloat(document.getElementById('table-start').value);
  const step = parseFloat(document.getElementById('table-step').value);
  const error = document.getElementById('table-error');
  if (!Number.isFinite(start) || !Number.isFinite(step) || step === 0) {
    error.innerText = 'Enter a finite start and a non-zero step.';
    error.classList.remove('hidden');
    return null;
  }
  error.classList.add('hidden');
  return { start, step };
}

function generateTableOfValues() {
  if (!activeTableFn || !activeTableFn.evaluator) return;
  const parameters = getTableParameters();
  if (!parameters) return;
  const { start, step } = parameters;
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  for (let i = 0; i < 11; i++) {
    const x = start + i * step;
    const y = activeTableFn.evaluator(x);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-2 border-b font-bold">${x.toFixed(2)}</td>
      <td class="p-2 border-b text-blue-600 dark:text-blue-400 font-bold">${isNaN(y) ? 'Undefined' : y.toFixed(3)}</td>
    `;
    tbody.appendChild(tr);
  }
}

document.getElementById('btn-close-table').onclick = () => document.getElementById('modal-table').classList.add('hidden');
document.getElementById('btn-gen-table').onclick = generateTableOfValues;
document.getElementById('btn-plot-table-points').onclick = () => {
  if (!activeTableFn || !activeTableFn.evaluator) return;
  const parameters = getTableParameters();
  if (!parameters) return;
  const { start, step } = parameters;

  for (let i = 0; i < 7; i++) {
    const x = start + i * step;
    const y = activeTableFn.evaluator(x);
    if (Number.isFinite(y)) {
      const letter = String.fromCharCode(65 + (state.points.length % 26));
      state.points.push({ id: 'p_' + Date.now() + '_' + i, x, y, label: letter, color: activeTableFn.color });
    }
  }
  pushHistory(); renderObjectsList();
  document.getElementById('modal-table').classList.add('hidden');
};
