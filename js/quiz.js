// --- TEACHER QUIZ MODE GUESS MODAL LOGIC ---
function openGuessModal(objId, propName, targetValStr, hintDesc, catType) {
  state.activeGuess = { objId, propName, targetValStr, hintDesc, catType };
  document.getElementById('guess-obj-title').innerText = hintDesc;
  
  const inputEl = document.getElementById('guess-input-val');
  inputEl.value = '';
  if (catType === 'points') {
    inputEl.placeholder = 'e.g. 3, 4 or (3, 4)';
  } else if (catType === 'functions') {
    inputEl.placeholder = 'e.g. 2x + 1 or x^2 - 4';
  } else {
    inputEl.placeholder = 'e.g. 5, 3.14, 3/4, or sqrt(25)';
  }

  document.getElementById('guess-feedback').classList.add('hidden');
  document.getElementById('modal-guess').classList.remove('hidden');
}

document.getElementById('btn-close-guess').onclick = () => {
  document.getElementById('modal-guess').classList.add('hidden');
};

document.getElementById('btn-submit-guess').onclick = () => {
  if (!state.activeGuess) return;
  const inputStr = document.getElementById('guess-input-val').value.trim();
  const feedback = document.getElementById('guess-feedback');
  const { objId, propName, targetValStr, catType } = state.activeGuess;

  let isCorrect = false;
  let feedbackMsg = '';

  if (catType === 'points') {
    const clean = inputStr.replace(/[()]/g, '').trim();
    const parts = clean.split(/[\s,]+/);
    if (parts.length >= 2) {
      const gx = SafeMathParser.evalSimple(parts[0]);
      const gy = SafeMathParser.evalSimple(parts[1]);
      const [txStr, tyStr] = targetValStr.split(',');
      const tx = parseFloat(txStr);
      const ty = parseFloat(tyStr);

      if (!isNaN(gx) && !isNaN(gy)) {
        if (Math.abs(gx - tx) < 0.1 && Math.abs(gy - ty) < 0.1) {
          isCorrect = true;
          feedbackMsg = `✓ Correct! Point coordinates are (${tx.toFixed(2)}, ${ty.toFixed(2)})`;
        } else {
          feedbackMsg = `Not quite right. Double check point position relative to the origin.`;
        }
      } else {
        feedbackMsg = 'Invalid point format! Enter as x, y (e.g. 3, 4)';
      }
    } else {
      feedbackMsg = 'Please enter both X and Y coordinates (e.g. 3, 4)';
    }
  } else if (catType === 'functions') {
    try {
      const userFn = SafeMathParser.createEvaluator(inputStr);
      const targetFn = SafeMathParser.createEvaluator(targetValStr);

      const testPoints = [-3, -1.5, 0, 1.5, 3];
      let matchCount = 0;
      testPoints.forEach(x => {
        const uY = userFn(x);
        const tY = targetFn(x);
        if (!isNaN(uY) && !isNaN(tY) && Math.abs(uY - tY) < 0.05) matchCount++;
      });

      if (matchCount >= 4) {
        isCorrect = true;
        feedbackMsg = `✓ Excellent! Equation matched: f(x) = ${targetValStr}`;
      } else {
        feedbackMsg = `Equation does not match the curve! Test input values or slope.`;
      }
    } catch (err) {
      feedbackMsg = `Could not evaluate equation expression. Check math syntax!`;
    }
  } else {
    const userVal = SafeMathParser.evalSimple(inputStr);
    const targetVal = parseFloat(targetValStr);

    if (isNaN(userVal)) {
      feedback.className = 'text-xs p-2 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 font-bold';
      feedback.innerText = 'Invalid math formula! Try again.';
      feedback.classList.remove('hidden');
      return;
    }

    const diff = Math.abs(userVal - targetVal);
    const relDiff = targetVal !== 0 ? diff / Math.abs(targetVal) : diff;

    if (diff < 0.08 || relDiff < 0.02) {
      isCorrect = true;
      feedbackMsg = `✓ Excellent! Correct Answer: ${targetVal.toFixed(2)}`;
    } else {
      const isTooHigh = userVal > targetVal;
      feedbackMsg = `Not quite right! Your guess (${userVal.toFixed(2)}) is too ${isTooHigh ? 'high' : 'low'}.`;
    }
  }

  if (isCorrect) {
    const key = `${objId}_${propName}`;
    state.verifiedAnswers[key] = true;
    pushHistory();
    renderObjectsList();
    renderFunctionRows();

    feedback.className = 'text-xs p-2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-bold';
    feedback.innerText = feedbackMsg;
    feedback.classList.remove('hidden');

    setTimeout(() => {
      document.getElementById('modal-guess').classList.add('hidden');
    }, 1200);
  } else {
    feedback.className = 'text-xs p-2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-bold';
    feedback.innerText = feedbackMsg;
    feedback.classList.remove('hidden');
  }
};
