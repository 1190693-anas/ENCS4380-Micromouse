(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const form = byId('pid-settings');
  const slowSensor = new URLSearchParams(location.search).get('module') === 'p2';
  const gains = ['kp', 'ki', 'kd'];
  const config = { responsive: true, displaylogo: false, scrollZoom: false };
  const format = (value, unit) => value == null ? '—' : `${Number(value.toFixed(3))}${unit}`;
  let frame;

  function loadPreset(preset) {
    const pi = preset === 'pi';
    const values = { plant: 'first', gain: 1, tau: 1, kp: pi ? 1 : 9, ki: pi ? 1 : 0,
      kd: 0, setpoint: 1, limit: 20, duration: 10 };
    if (slowSensor) Object.assign(values, { kp: 6, ki: 14, limit: 100, duration: 16,
      sensorTau: preset === 'slow' ? 1.2 : 0.02 });
    for (const [key, value] of Object.entries(values)) byId(key).value = value;
  }

  if (slowSensor) {
    document.title = 'Slow sensor in the loop · ENCS4380';
    byId('module-label').textContent = 'Control · Homework 2 · P2';
    byId('module-heading').textContent = 'A slow sensor in the loop';
    byId('module-description').textContent = 'Compare the true output with the delayed measurement that drives the controller.';
    byId('sensor-parameters').hidden = byId('sensor-parameters').disabled = false;
    byId('loop-diagram').setAttribute('aria-label',
      'Setpoint enters the summing junction, then PID, limiter, and plant. The true output passes through a first-order sensor before returning to the negative input.');
    byId('feedback-path').textContent = '← measured yₘ ← Sensor ← true y';
    byId('controller-equation').textContent = 'Sensor: τₛ·dyₘ/dt + yₘ = y. The controller uses e = r − yₘ and derivative action −Kd·dyₘ/dt.';
    byId('prediction-prompt').textContent = 'Keep Kp = 6, Ki = 14 and Kd = 0. What happens to the true and measured outputs as the sensor time constant goes from 0.02 s to 1.2 s?';
    byId('prediction-answer').textContent = 'The fast sensor tracks the plant closely. With a slow sensor, the reported output stays low as the true output rises, so the controller keeps driving. The true output overshoots more and the loop oscillates.';
    byId('overshoot-label').textContent = 'Peak above setpoint';
    const [fast, slow] = document.querySelectorAll('[data-preset]');
    fast.dataset.preset = 'fast';
    fast.textContent = 'Load fast sensor';
    slow.dataset.preset = 'slow';
    slow.textContent = 'Load slow sensor';
    loadPreset('fast');
  }

  function trace(x, y, name, color, dash = 'solid') {
    return { x, y, name, type: 'scatter', mode: 'lines', line: { color, dash, width: 2 } };
  }

  function plot(id, traces, title) {
    return Plotly.react(byId(id), traces, {
      autosize: true, height: 310, margin: { l: 56, r: 18, t: 12, b: 74 },
      legend: { orientation: 'h', y: -0.28 },
      xaxis: { title: { text: 'Time (s)' }, automargin: true },
      yaxis: { title: { text: title }, automargin: true }
    }, config);
  }

  async function update() {
    const plant = byId('plant').value;
    for (const kind of ['first', 'second']) {
      const group = byId(`${kind}-parameters`);
      group.hidden = group.disabled = kind !== plant;
    }
    for (const gain of gains) byId(`${gain}-value`).value = byId(gain).value;
    if (slowSensor) byId('sensorTau-value').value = byId('sensorTau').value;
    byId('plant-equation').textContent = plant === 'first'
      ? 'First order · τ·dy/dt + y = K·u'
      : 'Mass–spring–damper · m·d²y/dt² + b·dy/dt + k·y = u';
    try {
      const invalid = Array.from(form.elements).find(element => element.willValidate && !element.validity.valid);
      if (invalid) throw new Error(`${invalid.labels[0].textContent} — ${invalid.validationMessage}`);
      const settings = Object.fromEntries(Array.from(new FormData(form), ([key, value]) =>
        [key, key === 'plant' ? value : Number(value)]));
      const result = PID.simulate(settings);
      const { time, command, output, measured } = result;
      byId('pid-error').hidden = true;
      byId('pid-results').hidden = false;
      byId('rise').textContent = format(result.rise, ' s');
      const overshoot = slowSensor
        ? output.reduce((peak, value) => Math.max(peak, 100 * (value / settings.setpoint - 1)), 0)
        : result.overshoot;
      byId('overshoot').textContent = format(overshoot, '%');
      byId('settling').textContent = format(result.settling, ' s');
      byId('error').textContent = format(result.error, '%');
      byId('response-status').textContent = result.final === null
        ? 'Steady state was not detected in this window. Try increasing the duration.'
        : `Estimated final output ${format(result.final, '')}. Rise time${slowSensor ? '' : ', overshoot,'} and settling use this value. Error is relative to the setpoint.`;
      byId('actuator-status').textContent = result.saturated
        ? 'The actuator clipped the requested command during this run.'
        : 'The command stayed within the actuator limits.';
      const edges = [0, settings.duration];
      const response = [trace(time, output, slowSensor ? 'True output y' : 'Output y', '#196653')];
      if (slowSensor) response.push(trace(time, measured, 'Measured output yₘ', '#9e5321', 'dot'));
      response.push(trace(edges, [settings.setpoint, settings.setpoint], 'Setpoint r', '#546478', 'dash'));
      await Promise.all([
        plot('pid-response', response, 'Output'),
        plot('pid-command', [
          trace(time, command, 'Command u', '#1565a0'),
          trace(edges, [settings.limit, settings.limit], 'Actuator limits', '#a64f29', 'dash'),
          { ...trace(edges, [-settings.limit, -settings.limit], 'Actuator limits', '#a64f29', 'dash'), showlegend: false }
        ], 'Control signal')
      ]);
    } catch (error) {
      byId('pid-error').textContent = error instanceof ReferenceError && !window.Plotly
        ? 'Plotly could not load. Check your connection and reload this page.'
        : error.message;
      byId('pid-error').hidden = false;
      if (window.Plotly) byId('pid-results').hidden = true;
    }
  }

  function scheduleUpdate() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }

  form.addEventListener('input', scheduleUpdate);
  form.addEventListener('submit', event => event.preventDefault());
  document.querySelectorAll('[data-preset]').forEach(button => {
    button.addEventListener('click', () => {
      loadPreset(button.dataset.preset);
      scheduleUpdate();
    });
  });
  scheduleUpdate();
})();
