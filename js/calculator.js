function bindCalculatorControls() {
  const input = document.getElementById('calc-display-input');
  const preview = document.getElementById('calc-history-preview');
  const historyList = document.getElementById('calc-history-list');
  const memoryStatus = document.getElementById('calc-memory-status');
  const calculations = [];
  let memory = 0;
  let lastAnswer = 0;
  let justEvaluated = false;

  function renderHistory() {
    historyList.innerHTML = '';
    calculations.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-left text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate';
      button.textContent = `${item.expression} = ${item.result}`;
      button.title = 'Use this result again';
      button.onclick = () => {
        input.value = item.result;
        justEvaluated = true;
        input.focus();
      };
      historyList.appendChild(button);
    });
  }

  function renderMemoryStatus() {
    memoryStatus.innerText = memory === 0 ? 'Memory: empty' : `Memory: ${memory}`;
  }

  function insertToken(token) {
    const value = input.value;
    const start = input.selectionStart === null ? value.length : input.selectionStart;
    const end = input.selectionEnd === null ? value.length : input.selectionEnd;
    const startsOperand = /^[\d.a-z(]/i.test(token);
    if (startsOperand && (justEvaluated || (value === '0' && start === end))) {
      input.value = token;
    } else {
      input.value = value.slice(0, start) + token + value.slice(end);
    }
    const caret = startsOperand && (justEvaluated || (value === '0' && start === end))
      ? token.length
      : start + token.length;
    justEvaluated = false;
    input.setSelectionRange(caret, caret);
    input.focus();
    preview.classList.remove('text-rose-400');
  }

  function getCurrentValue() {
    return SafeMathParser.evaluateExpression(input.value.trim(), { ans: lastAnswer, m: memory });
  }

  function showError(message) {
    preview.innerText = message;
    preview.classList.add('text-rose-400');
  }

  function evaluate() {
    const expression = input.value.trim();
    let result;
    try {
      result = SafeMathParser.evaluateExpression(expression, { ans: lastAnswer, m: memory });
    } catch (error) {
      showError(error.message);
      return;
    }
    if (!Number.isFinite(result)) {
      showError('Result is undefined or outside the supported range.');
      return;
    }

    const resultText = Number(result.toPrecision(12)).toString();
    preview.innerText = `${expression} = ${resultText}`;
    preview.classList.remove('text-rose-400');
    input.value = resultText;
    justEvaluated = true;
    lastAnswer = result;
    calculations.unshift({ expression, result: resultText });
    calculations.length = Math.min(calculations.length, 8);
    renderHistory();
  }

  document.querySelectorAll('.calc-btn').forEach(button => {
    button.onclick = () => {
      const token = button.dataset.val;
      const action = button.dataset.act;

      if (token) {
        insertToken(token);
      } else if (action === 'clear') {
        input.value = '0';
        justEvaluated = false;
        input.focus();
        preview.classList.remove('text-rose-400');
      } else if (action === 'back') {
        const value = input.value;
        const start = input.selectionStart === null ? value.length : input.selectionStart;
        const end = input.selectionEnd === null ? value.length : input.selectionEnd;
        const deleteStart = start === end ? Math.max(0, start - 1) : start;
        input.value = value.slice(0, deleteStart) + value.slice(end) || '0';
        input.setSelectionRange(deleteStart, deleteStart);
        justEvaluated = false;
        input.focus();
      } else if (action === 'eval') {
        evaluate();
      } else if (action === 'ans') {
        insertToken('ans');
      } else if (action === 'sign') {
        const expression = input.value.trim();
        input.value = expression.startsWith('-(') && expression.endsWith(')')
          ? expression.slice(2, -1)
          : `-(${expression || '0'})`;
        justEvaluated = false;
        input.setSelectionRange(input.value.length, input.value.length);
        input.focus();
      } else if (action === 'mc') {
        memory = 0;
        renderMemoryStatus();
      } else if (action === 'mr') {
        insertToken(Number(memory.toPrecision(12)).toString());
      } else if (action === 'm-plus' || action === 'm-minus') {
        let value;
        try {
          value = getCurrentValue();
        } catch (error) {
          showError(error.message);
          return;
        }
        if (!Number.isFinite(value)) {
          showError('Enter a valid finite value before using memory.');
          return;
        }
        const nextMemory = memory + (action === 'm-plus' ? value : -value);
        if (!Number.isFinite(nextMemory)) {
          showError('Memory value is outside the supported range.');
          return;
        }
        memory = nextMemory;
        renderMemoryStatus();
        preview.classList.remove('text-rose-400');
      }
    };
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      evaluate();
    } else if (event.key === 'Escape') {
      input.value = '0';
      justEvaluated = false;
      preview.classList.remove('text-rose-400');
    }
  });

  input.addEventListener('input', () => {
    justEvaluated = false;
    preview.classList.remove('text-rose-400');
  });

  function readFiniteValues(ids) {
    const values = ids.map(id => parseFloat(document.getElementById(id).value));
    return values.every(Number.isFinite) ? values : null;
  }

  function setSolverResult(id, message, isError) {
    const result = document.getElementById(id);
    result.innerText = message;
    result.classList.toggle('text-rose-600', !!isError);
    result.classList.toggle('dark:text-rose-400', !!isError);
  }

  function formatSolverNumber(value) {
    return Number(value.toPrecision(10)).toString();
  }

  document.getElementById('btn-solve-linear').onclick = () => {
    const values = readFiniteValues(['linear-a', 'linear-b', 'linear-c']);
    if (!values) {
      setSolverResult('linear-res', 'Enter finite values for a, b, and c.', true);
      return;
    }
    const [a, b, c] = values;
    if (a === 0) {
      setSolverResult('linear-res', b === c ? 'All real numbers are solutions.' : 'No solution.', b !== c);
      return;
    }
    const x = (c - b) / a;
    setSolverResult(
      'linear-res',
      Number.isFinite(x) ? `x = ${formatSolverNumber(x)}` : 'The solution is outside the supported range.',
      !Number.isFinite(x)
    );
  };

  document.getElementById('btn-solve-system').onclick = () => {
    const values = readFiniteValues(['system-a1', 'system-b1', 'system-c1', 'system-a2', 'system-b2', 'system-c2']);
    if (!values) {
      setSolverResult('system-res', 'Enter finite values for both equations.', true);
      return;
    }
    const [a1, b1, c1, a2, b2, c2] = values;
    const determinant = a1 * b2 - a2 * b1;
    if (!Number.isFinite(determinant)) {
      setSolverResult('system-res', 'These coefficients are too large to solve reliably.', true);
      return;
    }

    const determinantTolerance = Number.EPSILON * Math.max(Number.MIN_VALUE, Math.abs(a1 * b2), Math.abs(a2 * b1)) * 8;
    if (Math.abs(determinant) <= determinantTolerance) {
      const firstCheck = a1 * c2 - a2 * c1;
      const secondCheck = b1 * c2 - b2 * c1;
      const consistencyTolerance = Number.EPSILON * Math.max(
        Number.MIN_VALUE,
        Math.abs(a1 * c2),
        Math.abs(a2 * c1),
        Math.abs(b1 * c2),
        Math.abs(b2 * c1)
      ) * 8;
      const consistent = Math.abs(firstCheck) <= consistencyTolerance
        && Math.abs(secondCheck) <= consistencyTolerance;
      setSolverResult(
        'system-res',
        consistent ? 'Infinitely many solutions; the equations are dependent.' : 'No solution; the equations are inconsistent.',
        !consistent
      );
      return;
    }

    const x = (c1 * b2 - b1 * c2) / determinant;
    const y = (a1 * c2 - c1 * a2) / determinant;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      setSolverResult('system-res', 'The solution is outside the supported range.', true);
      return;
    }
    setSolverResult('system-res', `x = ${formatSolverNumber(x)}, y = ${formatSolverNumber(y)}`, false);
  };

  document.getElementById('btn-solve-percent').onclick = () => {
    const values = readFiniteValues(['percent-rate', 'percent-amount']);
    if (!values) {
      setSolverResult('percent-res', 'Enter a finite rate and amount.', true);
      return;
    }
    const [rate, amount] = values;
    const result = rate * amount / 100;
    setSolverResult(
      'percent-res',
      Number.isFinite(result) ? `${formatSolverNumber(rate)}% of ${formatSolverNumber(amount)} = ${formatSolverNumber(result)}` : 'The result is outside the supported range.',
      !Number.isFinite(result)
    );
  };

  document.getElementById('btn-solve-pythagorean').onclick = () => {
    const values = readFiniteValues(['pythagorean-a', 'pythagorean-b']);
    if (!values || values.some(value => value <= 0)) {
      setSolverResult('pythagorean-res', 'Enter two finite leg lengths greater than zero.', true);
      return;
    }
    const hypotenuse = Math.hypot(values[0], values[1]);
    setSolverResult(
      'pythagorean-res',
      Number.isFinite(hypotenuse) ? `c = ${formatSolverNumber(hypotenuse)}` : 'The result is outside the supported range.',
      !Number.isFinite(hypotenuse)
    );
  };

  document.getElementById('btn-clear-calc-history').onclick = () => {
    calculations.length = 0;
    renderHistory();
  };

  document.getElementById('btn-solve-quad').onclick = () => {
    const a = parseFloat(document.getElementById('quad-a').value);
    const b = parseFloat(document.getElementById('quad-b').value);
    const c = parseFloat(document.getElementById('quad-c').value);
    const resultBox = document.getElementById('quad-res');

    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || a === 0) {
      resultBox.innerText = 'Enter finite values and ensure a ≠ 0.';
      return;
    }

    let discriminant = b * b - 4 * a * c;
    if (!Number.isFinite(discriminant)) {
      resultBox.innerText = 'These coefficients are too large to solve reliably.';
      return;
    }
    const tolerance = Number.EPSILON * Math.max(1, b * b, Math.abs(4 * a * c)) * 4;
    if (Math.abs(discriminant) <= tolerance) discriminant = 0;

    if (discriminant < 0) {
      const real = -b / (2 * a);
      const imaginary = Math.sqrt(-discriminant) / Math.abs(2 * a);
      resultBox.innerText = `x = ${real.toFixed(3)} ± ${imaginary.toFixed(3)}i`;
    } else if (discriminant === 0) {
      resultBox.innerText = `One Real Root: x = ${(-b / (2 * a)).toFixed(3)}`;
    } else {
      const root = Math.sqrt(discriminant);
      const q = -0.5 * (b + Math.sign(b || 1) * root);
      const x1 = q / a;
      const x2 = c / q;
      resultBox.innerText = `x₁ = ${x1.toFixed(3)}, x₂ = ${x2.toFixed(3)}`;
    }
  };

  renderMemoryStatus();
}
