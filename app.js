(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const form = byId('parameters');
  const fields = { K: byId('gain'), tau: byId('tau'), A: byId('amplitude'), rate: byId('rate') };
  let revision = 0;
  let running = false;
  let pending = false;
  let timer;
  function readValues() {
    const values = {};
    for (const [name, field] of Object.entries(fields)) {
      const value = Number(field.value);
      const valid = field.value.trim() !== '' && Number.isFinite(value) && (name !== 'tau' || value > 0);
      field.setAttribute('aria-invalid', String(!valid));
      if (!valid) throw new Error(name === 'tau' ? 'Time constant τ must be a finite number greater than zero.' : name + ' must contain a finite number.');
      values[name] = value;
    }
    return values;
  }
  function displayValidation(validation) {
    const root = byId('validationResults');
    root.replaceChildren();
    const wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    const table = document.createElement('table');
    const header = table.createTHead().insertRow();
    ['Checkpoint', 'Expected', 'Calculated', 'Result'].forEach(label => {
      const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = label; header.append(cell);
    });
    const body = table.createTBody();
    validation.checks.forEach(check => {
      const row = body.insertRow();
      [check.multiple + 'τ (' + Number(check.time.toPrecision(5)) + ' s)', check.expected.toFixed(3), check.calculated.toFixed(6), check.pass ? 'Pass' : 'Fail'].forEach((value, index) => {
        const cell = row.insertCell(); cell.textContent = value;
        if (index === 3) cell.className = check.pass ? 'pass' : 'fail';
      });
    });
    wrap.append(table); root.append(wrap);
    const note = document.createElement('p'); note.className = 'validation-note';
    note.textContent = 'Absolute tolerance: ' + validation.tolerance + '. ' + validation.method;
    root.append(note);
    byId('validationBadge').textContent = validation.pass ? 'ALL CHECKS PASS' : 'CHECKS FAILED';
    byId('validationBadge').className = 'tag ' + (validation.pass ? 'pass' : 'fail');
  }
  async function update() {
    if (running) { pending = true; return; }
    running = true;
    const current = revision;
    byId('errorMessage').hidden = true;
    byId('status').textContent = 'Updating plots…';
    byId('validationBadge').textContent = 'PENDING';
    byId('validationResults').replaceChildren();
    try {
      const { K, tau, A, rate } = readValues();
      const mode = byId('mode').value;
      if (!window.SensorMath || !window.SensorPlots || !window.Plotly) throw new Error('A required script could not load. Check your internet connection and reload the page.');
      const data = SensorMath.generateData(K, tau, mode, A, rate);
      await SensorPlots.drawResponse(data, mode, K, tau);
      await SensorPlots.drawError(tau);
      if (current !== revision) return;
      displayValidation(SensorMath.validate(K, tau, A));
      byId('responseHeading').textContent = mode === 'step' ? 'Step response' : 'Ramp response';
      byId('status').textContent = 'Up to date · ' + (mode === 'step' ? 'Step' : 'Ramp') + ' input · 601 samples from 0 to ' + Number((6 * tau).toPrecision(5)) + ' s';
    } catch (error) {
      if (current !== revision) return;
      byId('errorMessage').textContent = error.message || String(error);
      byId('errorMessage').hidden = false;
      byId('validationBadge').textContent = 'UNAVAILABLE';
      byId('status').textContent = 'Update failed. Any visible plots show the last rendered parameters.';
    } finally {
      running = false;
      if (pending || current !== revision) { pending = false; clearTimeout(timer); void update(); }
    }
  }
  function requestUpdate(immediate) {
    revision++;
    const ramp = byId('mode').value === 'ramp';
    byId('amplitudeControl').hidden = ramp;
    byId('rateControl').hidden = !ramp;
    byId('status').textContent = 'Parameters changed · updating…';
    clearTimeout(timer);
    if (immediate) void update(); else timer = setTimeout(update, 150);
  }
  form.addEventListener('input', () => requestUpdate(false));
  form.addEventListener('change', () => requestUpdate(true));
  form.addEventListener('submit', event => { event.preventDefault(); requestUpdate(true); });
  void update();
})();
