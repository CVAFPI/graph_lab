function addFunction(expression, sourceFunction) {
  const index = state.functions.length;
  const defaultName = index < 20 ? String.fromCharCode(102 + index) : `f${index + 1}`;
  const colors = ['#2563eb', '#dc2626', '#16a34a', '#9333ea'];
  const fn = sourceFunction
    ? {
        ...sourceFunction,
        id: `fn_${Date.now()}_${index}`,
        name: `${sourceFunction.name} copy`,
        evaluator: null
      }
    : {
        id: `fn_${Date.now()}_${index}`,
        name: defaultName,
        expr: expression,
        color: colors[index % colors.length],
        visible: true,
        minDomain: '',
        maxDomain: '',
        shadeIntegral: { active: false, a: -2, b: 2 },
        evaluator: null
      };

  state.functions.push(fn);
  compileAllFunctions();
  pushHistory();
  renderFunctionRows();
}

function bindFunctionControls() {
  document.querySelectorAll('.math-key-btn').forEach(button => {
    button.onclick = () => {
      const input = document.querySelector('.fn-expr-input');
      if (!input) return;
      input.value += button.dataset.sym;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    };
  });

  document.querySelectorAll('.function-preset').forEach(button => {
    button.onclick = () => addFunction(button.dataset.expression);
  });

  document.getElementById('btn-add-function').onclick = () => addFunction('x');
  const functionList = document.getElementById('function-list');

  functionList.addEventListener('input', event => {
    const target = event.target;
    const fn = state.functions.find(item => item.id === target.dataset.id);
    if (!fn) return;

    if (target.classList.contains('fn-expr-input')) {
      fn.expr = target.value;
      compileAllFunctions();
    } else if (target.classList.contains('fn-name-input')) {
      fn.name = target.value;
    } else if (target.classList.contains('fn-color-picker')) {
      fn.color = target.value;
    } else if (target.classList.contains('fn-domain-min')) {
      fn.minDomain = target.value;
    } else if (target.classList.contains('fn-domain-max')) {
      fn.maxDomain = target.value;
    } else if (target.classList.contains('fn-integral-a')) {
      fn.shadeIntegral.a = target.value;
    } else if (target.classList.contains('fn-integral-b')) {
      fn.shadeIntegral.b = target.value;
    }
  });

  functionList.addEventListener('change', event => {
    const target = event.target;
    const fn = state.functions.find(item => item.id === target.dataset.id);
    if (!fn) return;

    if (target.classList.contains('fn-vis-toggle')) {
      fn.visible = target.checked;
    } else if (target.classList.contains('fn-integral-toggle')) {
      fn.shadeIntegral.active = target.checked;
    } else if (
      target.classList.contains('fn-expr-input')
      || target.classList.contains('fn-name-input')
      || target.classList.contains('fn-color-picker')
      || target.classList.contains('fn-domain-min')
      || target.classList.contains('fn-domain-max')
      || target.classList.contains('fn-integral-a')
      || target.classList.contains('fn-integral-b')
    ) {
      renderFunctionRows();
    } else {
      return;
    }

    pushHistory();
    if (target.classList.contains('fn-vis-toggle') || target.classList.contains('fn-integral-toggle')) {
      renderFunctionRows();
    }
  });

  functionList.addEventListener('click', event => {
    const target = event.target;
    if (target.classList.contains('fn-delete-btn')) {
      state.functions = state.functions.filter(fn => fn.id !== target.dataset.id);
      compileAllFunctions();
      pushHistory();
      renderFunctionRows();
    } else if (target.classList.contains('fn-duplicate-btn')) {
      const fn = state.functions.find(item => item.id === target.dataset.id);
      if (fn) addFunction(fn.expr, fn);
    } else if (target.classList.contains('fn-table-btn')) {
      const fn = state.functions.find(item => item.id === target.dataset.id);
      if (fn) openTableModal(fn);
    }
  });
}
