(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const form = byId('pid-settings');
  const query = new URLSearchParams(location.search);
  const mode = query.get('module') || 'p1';
  const slowSensor = mode === 'p2';
  const motorDesign = mode === 'my';
  const motorLink = ['p1', 'p2', 'p3'].includes(mode) && query.get('motor') === '1';
  const digital = mode === 'p3' || motorDesign;
  const challenge = mode === 'p4';
  const bonus = mode === 'bonus';
  const hasSensor = slowSensor || bonus;
  let hiddenPlant;
  let bonusPeriod = null;
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

  function setupMode(label, title, description, prediction, answer) {
    document.title = title + ' · ENCS4380';
    byId('module-label').textContent = 'Control · Homework 2 · ' + label;
    byId('module-heading').textContent = title;
    byId('module-description').textContent = description;
    byId('prediction-prompt').textContent = prediction;
    byId('prediction-answer').textContent = answer;
    document.querySelector('.pid-presets').hidden = true;
  }

  function showGroup(id) {
    byId(id).hidden = byId(id).disabled = false;
  }

  function lockPlantInputs() {
    for (const id of ['plant', 'setpoint', 'limit', 'duration']) byId(id).disabled = true;
  }

  function newChallenge() {
    const plant = randomPlant();
    hiddenPlant = plant.type === 'first'
      ? { plant: 'first', gain: plant.K, tau: plant.tau }
      : { plant: 'second', mass: 1, damping: 2 * plant.zeta * plant.omega, stiffness: plant.omega ** 2 };
    byId('plant').value = plant.type;
    scheduleUpdate();
  }

  function scoreChallenge(result, setpoint) {
    const peak = result.output.reduce((max, y) => Math.max(max, y), setpoint);
    const overshoot = 100 * (peak / setpoint - 1);
    const lastOutside = result.output.findLastIndex(y => Math.abs(y - setpoint) > 0.02 * setpoint);
    const settling = result.final === null ? null : result.time[lastOutside + 1] ?? null;
    const error = result.error === null ? null : Math.abs(result.error);
    const checks = [
      ['Overshoot', overshoot, 10, '%'],
      ['Settling time', settling, 8, ' s'],
      ['Final error', error, 1, '%']
    ];
    let score = 0;
    byId('challenge-results').replaceChildren(...checks.map(([name, value, limit, unit]) => {
      const passes = value !== null && value <= limit;
      score += Number(passes);
      const item = document.createElement('li');
      item.textContent = name + ': ' + format(value, unit) + ' · ' + (passes ? 'Pass' : 'Fail');
      item.className = passes ? 'pass' : 'fail';
      return item;
    }));
    byId('challenge-score').textContent = score + ' / 3 targets met';
  }

  function peakPeriod(result) {
    const peaks = [];
    result.output.forEach((y, i, values) => {
      if (result.time[i] > 5 && y > values[i - 1] && y >= values[i + 1]) {
        peaks.push(result.time[i]);
      }
    });
    return peaks.length > 1 ? (peaks.at(-1) - peaks[0]) / (peaks.length - 1) : null;
  }

  if (digital) {
    showGroup('digital-parameters');
    byId('arduino-panel').hidden = false;
    byId('feedback-path').textContent = '← sampled feedback ←';
    byId('controller-equation').textContent = 'At each sample, update the integral by Ki·Ts·e[k] and use Kd·(e[k] − e[k−1])/Ts. Hold the command until the next sample.';
    const sample = byId('sampleTime');
    sample.min = sample.step = '0.001';
    setupMode('P3', 'Digital PID', 'Change the sampling interval and watch the held actuator command.',
      'What happens if the controller waits longer between updates?',
      'A long interval lets the plant move farther before the controller reacts. Try 0.05 s and 0.5 s with the default gains.');
    byId('limit').value = 2;
    byId('kp').value = 3;
    byId('ki').value = 3;
    byId('copy-code').addEventListener('click', async () => {
      const code = byId('arduino-code');
      try {
        await navigator.clipboard.writeText(code.value);
        byId('copy-status').textContent = 'Copied.';
      } catch {
        code.focus();
        code.select();
        byId('copy-status').textContent = 'Code selected. Use your device’s copy command.';
      }
    });
  }

  if (challenge) {
    setupMode('P4', 'Tuning challenge', 'Tune an unknown plant using only its step response.',
      'Which gain would you change if the output settles below the target?',
      'Try adding integral action. Then check overshoot and settling before increasing it further.');
    lockPlantInputs();
    byId('plant').previousElementSibling.hidden = byId('plant').hidden = true;
    byId('loop-diagram').parentElement.hidden = true;
    byId('challenge-panel').hidden = false;
    byId('duration').value = 18;
    byId('new-plant').addEventListener('click', newChallenge);
    newChallenge();
  }

  if (motorDesign || motorLink) {
    byId('plant').value = 'first';
    byId('plant').disabled = true;
    byId('limit').value = 1;
    byId('limit').disabled = true;
    document.querySelector('label[for="limit"]').textContent = 'Maximum PWM fraction';
    document.querySelector('.pid-presets').hidden = true;
    for (const gain of gains) byId(gain).step = 'any';
  }

  if (motorDesign) {
    setupMode('Project', 'My system', 'Design a PI speed loop using your own Micromouse motor measurements.',
      'What happens if the motor cannot reach the requested RPM at full PWM?',
      'The PWM reaches 100% and the speed remains below the target. Anti-windup prevents continued integral buildup.');
    showGroup('motor-parameters');
    byId('motor-panel').hidden = false;
    document.querySelector('label[for="gain"]').textContent = 'Gain K (RPM per unit PWM)';
    document.querySelector('label[for="setpoint"]').textContent = 'Target wheel speed (RPM)';
    byId('gain').value = byId('tau').value = byId('setpoint').value = '';
    for (const gain of gains) byId(gain).disabled = true;
    byId('antiWindup').checked = query.get('antiWindup') !== '0';
    byId('motor-source').value = query.get('source') ?? localStorage.getItem('micromouse-test-notes') ?? '';
    for (const id of ['gain', 'tau', 'setpoint', 'damping-target', 'sampleTime']) {
      const saved = query.get(id) ?? localStorage.getItem('micromouse-' + id);
      if (saved !== null) byId(id).value = saved;
      byId(id).addEventListener('input', () => localStorage.setItem('micromouse-' + id, byId(id).value));
    }
    byId('motor-source').addEventListener('input', () =>
      localStorage.setItem('micromouse-test-notes', byId('motor-source').value));
  }

  if (motorLink) {
    for (const id of ['gain', 'tau', 'setpoint', 'kp', 'ki', 'kd', 'sampleTime']) {
      const value = Number(query.get(id));
      if (!query.has(id) || !Number.isFinite(value) || value < 0) continue;
      if (gains.includes(id)) byId(id).max = Math.max(Number(byId(id).max), value);
      byId(id).value = value;
    }
  }

  if (bonus) {
    setupMode('Bonus', 'Ziegler–Nichols tuning', 'Find the proportional gain at the edge of stability.',
      'How do the peaks change below, at and above the ultimate gain?',
      'The peaks shrink below Ku, stay about the same at Ku, and grow above Ku.');
    lockPlantInputs();
    byId('bonus-panel').hidden = false;
    byId('plant').value = 'second';
    byId('mass').value = byId('damping').value = byId('stiffness').value = 1;
    byId('sensorTau').value = 1;
    byId('duration').value = 35;
    byId('limit').value = 100;
    byId('kp').max = 10;
    byId('feedback-path').textContent = '← measured output ← sensor τₛ = 1 s ←';
    byId('controller-equation').textContent = 'The controller uses the delayed sensor measurement. The plant and sensor parameters are fixed for this test.';
    const reset = () => {
      byId('kp').disabled = false;
      byId('kp').value = 2.5;
      for (const id of ['ki', 'kd']) {
        byId(id).value = 0;
        byId(id).disabled = true;
      }
      bonusPeriod = null;
      scheduleUpdate();
    };
    byId('bonus-p').addEventListener('click', reset);
    byId('bonus-pid').addEventListener('click', () => {
      const reference = PID.simulate({ plant: 'second', mass: 1, damping: 1,
        stiffness: 1, sensorTau: 1, kp: 3, ki: 0, kd: 0, duration: 35, limit: 100, setpoint: 1 });
      bonusPeriod = peakPeriod(reference);
      byId('ki').step = byId('kd').step = 'any';
      byId('kp').disabled = true;
      byId('kp').value = 1.8;
      byId('ki').value = 3.6 / bonusPeriod;
      byId('kd').value = 1.8 * bonusPeriod / 8;
      scheduleUpdate();
    });
    reset();
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
      group.hidden = group.disabled = challenge || bonus || kind !== plant;
    }
    for (const gain of gains) byId(`${gain}-value`).value = byId(gain).value;
    if (slowSensor) byId('sensorTau-value').value = byId('sensorTau').value;
    if (digital) byId('sampleTime-value').value = byId('sampleTime').value + ' s';
    byId('plant-equation').textContent = plant === 'first'
      ? 'First order · τ·dy/dt + y = K·u'
      : 'Mass–spring–damper · m·d²y/dt² + b·dy/dt + k·y = u';
    try {
      const invalid = Array.from(form.elements).find(element => element.willValidate && !element.validity.valid);
      if (invalid) throw new Error(`${invalid.labels[0].textContent} — ${invalid.validationMessage}`);
      const settings = Object.fromEntries(Array.from(new FormData(form), ([key, value]) =>
        [key, key === 'plant' ? value : Number(value)]));
      Object.assign(settings, { plant, setpoint: Number(byId('setpoint').value),
        limit: Number(byId('limit').value), duration: Number(byId('duration').value) });
      if (digital) settings.antiWindup = byId('antiWindup').checked;
      if (motorDesign || motorLink) settings.minCommand = 0;
      if (challenge) Object.assign(settings, hiddenPlant);
      if (bonus) Object.assign(settings, { mass: 1, damping: 1, stiffness: 1, sensorTau: 1,
        kp: Number(byId('kp').value), ki: Number(byId('ki').value), kd: Number(byId('kd').value) });
      if (motorDesign) {
        if (!byId('motor-source').value.trim()) throw new Error('Enter the source of the motor measurements.');
        const zeta = Number(byId('damping-target').value);
        const omega = 2 / settings.tau;
        settings.kp = (2 * zeta * omega * settings.tau - 1) / settings.gain;
        settings.ki = omega ** 2 * settings.tau / settings.gain;
        settings.kd = 0;
        for (const gain of gains) {
          byId(gain).max = Math.max(Number(byId(gain).max), settings[gain]);
          byId(gain).value = settings[gain];
          byId(gain + '-value').value = Number(settings[gain].toPrecision(4));
        }
        byId('motor-design').textContent = 'PI design: ζ = ' + zeta +
          ', ωₙ = ' + format(omega, ' rad/s') + ', Kp = ' + settings.kp.toPrecision(4) +
          ', Ki = ' + settings.ki.toPrecision(4) +
          (settings.setpoint >= settings.gain ? '. The target needs full PWM or is above the model’s speed limit.' : '.');
        byId('motor-links').replaceChildren(...['p1', 'p2', 'p3'].map(module => {
          const link = document.createElement('a');
          const params = new URLSearchParams({ motor: '1', module });
          for (const id of ['gain', 'tau', 'setpoint', 'kp', 'ki', 'kd', 'sampleTime']) params.set(id, settings[id]);
          link.href = 'control.html?' + params;
          link.textContent = 'Open in ' + module.toUpperCase();
          return link;
        }));
        const share = byId('share-motor');
        const params = new URLSearchParams({ module: 'my', source: byId('motor-source').value.trim(),
          antiWindup: Number(settings.antiWindup) });
        for (const id of ['gain', 'tau', 'setpoint', 'damping-target', 'sampleTime']) params.set(id, byId(id).value);
        share.href = 'control.html?' + params;
      }
      const result = digital ? DigitalPID.simulate(settings) : PID.simulate(settings);
      if (digital) {
        byId('arduino-code').value = DigitalPID.arduino(settings);
        byId('copy-status').textContent = '';
      }
      if (motorDesign) {
        const passes = result.error !== null && Math.abs(result.error) <= 2;
        const peakPWM = 100 * result.command.reduce((peak, u) => Math.max(peak, u), 0);
        byId('motor-check').textContent = 'Final speed within 2%: ' + (passes ? 'Pass' : 'Fail') +
          '. Peak PWM: ' + format(peakPWM, '%') + '.';
      }
      if (challenge) scoreChallenge(result, settings.setpoint);
      if (bonus) {
        const period = bonusPeriod ?? peakPeriod(result);
        byId('bonus-result').textContent = bonusPeriod
          ? 'From the Ku = 3 run: Pu ≈ ' + format(period, ' s') + '. Kp = 0.6Ku, Ki = 2Kp/Pu and Kd = Kp·Pu/8.'
          : 'Time between peaks in the current run: ' + format(period, ' s') + '.';
      }
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
      const response = [trace(time, output, hasSensor ? 'True output y' : 'Output y', '#196653')];
      if (hasSensor) response.push(trace(time, measured, 'Measured output yₘ', '#9e5321', 'dot'));
      response.push(trace(edges, [settings.setpoint, settings.setpoint], 'Setpoint r', '#546478', 'dash'));
      await Promise.all([
        plot('pid-response', response, 'Output'),
        plot('pid-command', [
          { ...trace(time, command, 'Command u', '#1565a0'),
            line: { color: '#1565a0', width: 2, shape: digital ? 'hv' : 'linear' } },
          trace(edges, [settings.limit, settings.limit], 'Actuator limits', '#a64f29', 'dash'),
          { ...trace(edges, [settings.minCommand ?? -settings.limit, settings.minCommand ?? -settings.limit], 'Actuator limits', '#a64f29', 'dash'), showlegend: false }
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
