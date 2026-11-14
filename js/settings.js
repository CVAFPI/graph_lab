function bindSettingsControls() {
  // Teacher Quiz Mode Toggle
    document.getElementById('set-teacher-mode').onchange = (e) => {
      state.teacherHideAnswers = e.target.checked;
      document.getElementById('quiz-mode-pill').classList.toggle('hidden', !state.teacherHideAnswers);
      saveSettings();
      renderObjectsList();
      renderFunctionRows();
    };

    document.getElementById('set-student-check').onchange = (e) => {
      state.teacherInteractiveCheck = e.target.checked;
      saveSettings();
      renderObjectsList();
      renderFunctionRows();
    };

    // Individual Per-Category Quiz Toggles
    document.querySelectorAll('.quiz-type-toggle').forEach(cb => {
      cb.onchange = (e) => {
        const type = e.target.dataset.quizType;
        state.quizHiddenTypes[type] = e.target.checked;
        saveSettings();
        renderObjectsList();
        renderFunctionRows();
      };
    });

    document.getElementById('btn-quiz-select-all').onclick = () => {
      Object.keys(state.quizHiddenTypes).forEach(k => state.quizHiddenTypes[k] = true);
      document.querySelectorAll('.quiz-type-toggle').forEach(cb => cb.checked = true);
      saveSettings();
      renderObjectsList(); renderFunctionRows();
    };

    document.getElementById('btn-quiz-select-none').onclick = () => {
      Object.keys(state.quizHiddenTypes).forEach(k => state.quizHiddenTypes[k] = false);
      document.querySelectorAll('.quiz-type-toggle').forEach(cb => cb.checked = false);
      saveSettings();
      renderObjectsList(); renderFunctionRows();
    };

    document.getElementById('set-dark-mode').onchange = (e) => {
      state.isDarkMode = e.target.checked;
      document.documentElement.classList.toggle('dark', state.isDarkMode);
      saveSettings();
    };
    document.getElementById('set-grid-mode').onchange = (e) => {
      state.gridMode = e.target.value;
      document.getElementById('stat-mode').innerText = state.gridMode === 'pi' ? 'Trig π Grid' : 'Standard Grid';
      saveSettings();
    };
    document.getElementById('set-angle-mode').onchange = (e) => {
      state.angleMode = e.target.value;
      const calcAngleMode = document.getElementById('calc-angle-mode');
      if (calcAngleMode) calcAngleMode.innerText = state.angleMode === 'degrees' ? 'DEG' : 'RAD';
      saveSettings();
      renderFunctionRows();
    };
    document.getElementById('set-minor-grid').onchange = (e) => {
      state.showMinorGrid = e.target.checked;
      saveSettings();
    };
    document.getElementById('set-axis-numbers').onchange = (e) => {
      state.showAxisNumbers = e.target.checked;
      saveSettings();
    };
    document.getElementById('set-snap-step').onchange = (e) => {
      state.snapStep = parseFloat(e.target.value);
      document.getElementById('snap-status-text').innerText = state.snapStep > 0 ? `Snap: ${state.snapStep}` : 'Snap: OFF';
      saveSettings();
    };
    document.getElementById('btn-snap-toggle').onclick = () => {
      state.snapStep = state.snapStep > 0 ? 0 : 0.5;
      document.getElementById('set-snap-step').value = state.snapStep.toString();
      document.getElementById('snap-status-text').innerText = state.snapStep > 0 ? `Snap: ${state.snapStep}` : 'Snap: OFF';
      saveSettings();
    };

    document.getElementById('btn-reset-settings').onclick = () => {
      if (confirm('Reset all user and teacher settings to default?')) {
        try {
          localStorage.removeItem(SETTINGS_KEY);
        } catch (err) {
          console.warn('Could not clear saved settings:', err);
        }
        state.isDarkMode = false;
        state.gridMode = 'standard';
        state.angleMode = 'radians';
        state.snapStep = 0.5;
        state.showMinorGrid = true;
        state.showAxisNumbers = true;
        state.teacherHideAnswers = false;
        state.teacherInteractiveCheck = true;
        state.quizHiddenTypes = {
          points: true,
          segments: true,
          angles: true,
          triangles: true,
          circles: true,
          polygons: true,
          integrals: true,
          functions: false
        };
        applySettingsToUI();
        renderObjectsList();
        renderFunctionRows();
      }
    };
}
