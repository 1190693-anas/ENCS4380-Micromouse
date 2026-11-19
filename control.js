(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const form = byId('pid-settings');
  const gains = ['kp', 'ki', 'kd'];
  const config = { responsive: true, displaylogo: false, scrollZoom: false };
  const format = (value, unit) => value == null ? '—' : `${Number(value.toFixed(3))}${unit}`;
  let frame;

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
    byId('plant-equation').textContent = plant === 'first'
      ? 'First order · τ·dy/dt + y = K·u'
      : 'Mass–spring–damper · m·d²y/dt² + b·dy/dt + k·y = u';
    try {
      const invalid = Array.from(form.elements).find(element => element.willValidate && !element.validity.valid);
      if (invalid) throw new Error(`${invalid.labels[0].textContent} — ${invalid.validationMessage}`);
      const settings = Object.fromEntries(Array.from(new FormData(form), ([key, value]) =>
        [key, key === 'plant' ? value : Number(value)]));
      const result = PID.simulate(settings);
      const { time, command, output } = result;
      byId('pid-error').hidden = true;
      byId('pid-results').hidden = false;
      byId('rise').textContent = format(result.rise, ' s');
      byId('overshoot').textContent = format(result.overshoot, '%');
      byId('settling').textContent = format(result.settling, ' s');
      byId('error').textContent = format(result.error, '%');
      byId('response-status').textContent = result.final === null
        ? 'Steady state was not detected in this window. Try increasing the duration.'
        : `Estimated final output ${format(result.final, '')}. Rise time, overshoot and settling use this value. Error is relative to the setpoint.`;
      byId('actuator-status').textContent = result.saturated
        ? 'The actuator clipped the requested command during this run.'
        : 'The command stayed within the actuator limits.';
      const edges = [0, settings.duration];
      await Promise.all([
        plot('pid-response', [
          trace(time, output, 'Output y', '#196653'),
          trace(edges, [settings.setpoint, settings.setpoint], 'Setpoint r', '#546478', 'dash')
        ], 'Output'),
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
      const pi = button.dataset.preset === 'pi';
      const values = { plant: 'first', gain: 1, tau: 1, kp: pi ? 1 : 9, ki: pi ? 1 : 0,
        kd: 0, setpoint: 1, limit: 20, duration: 10 };
      for (const [key, value] of Object.entries(values)) byId(key).value = value;
      scheduleUpdate();
    });
  });
  scheduleUpdate();
})();
