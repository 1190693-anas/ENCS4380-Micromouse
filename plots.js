/* Plotly rendering only. Load Plotly and physics.js before this file.
 * Functions return Plotly promises; app.js can await them and catch errors.
 * The host supplies responsePlot/errorPlot containers with usable width.
 */
(function (global) {
  'use strict';
  var config = { responsive: true, displaylogo: false, scrollZoom: false };
  function ready(id) {
    if (!global.SensorMath) throw new Error('Load physics.js before rendering.');
    if (!global.Plotly || typeof global.Plotly.react !== 'function') throw new Error('Load Plotly.js before rendering.');
    var element = global.document.getElementById(id);
    if (!element) throw new Error('Missing graph container #' + id + '.');
    return element;
  }
  function fmt(value) { return Number(value.toPrecision(5)).toString(); }
  function line(x, y, name, color, dash) {
    return { x: x, y: y, name: name, type: 'scatter', mode: 'lines',
      line: { color: color, width: 2, dash: dash || 'solid' },
      hovertemplate: 't=%{x:.5g} s<br>value=%{y:.5g}<extra>%{fullData.name}</extra>' };
  }
  function layout(title) {
    return { title: { text: title, font: { size: 16 } }, autosize: true,
      height: 520, margin: { l: 65, r: 60, t: 110, b: 135 },
      xaxis: { title: { text: 'Time t (s)' }, automargin: true },
      yaxis: { title: { text: 'Sensor output (output units)' }, automargin: true },
      legend: { orientation: 'h', x: 0, y: -0.25 }, hovermode: 'closest' };
  }
  function note(text) {
    return { xref: 'paper', yref: 'paper', x: 0, y: 1.18,
      xanchor: 'left', showarrow: false, align: 'left', text: text, font: { size: 11 } };
  }
  function checkData(data) {
    var keys = ['time', 'input', 'output', 'idealOutput', 'errorFraction'];
    if (!data || !Array.isArray(data.time) || data.time.length < 2) throw new TypeError('Use SensorMath.generateData to supply response data.');
    keys.forEach(function (key) {
      if (!Array.isArray(data[key]) || data[key].length !== data.time.length ||
          !data[key].every(function (v) { return typeof v === 'number' && Number.isFinite(v); })) {
        throw new TypeError('Invalid data array: ' + key);
      }
    });
    if (data.time[0] !== 0 || !data.time.every(function (t, i) { return i === 0 || t > data.time[i - 1]; })) {
      throw new RangeError('Time must start at zero and increase strictly.');
    }
  }

  // Pass the same K, tau and mode used to generate data.
  function drawResponse(data, mode, K, tau) {
    var element = ready('responsePlot');
    global.SensorMath.step(0, K, tau, 1); // Validate model parameters.
    if (mode !== 'step' && mode !== 'ramp') throw new RangeError('mode must be "step" or "ramp".');
    checkData(data);
    var traces = [
      line(data.time, data.output, 'Actual output y(t)', '#1565c0'),
      line(data.time, data.idealOutput, mode === 'step' ? 'Final / ideal output KA' : 'Ideal output Kx(t)', '#388e3c', 'dash'),
      line(data.time, data.input, 'Raw input x(t) — right axis', '#777777', 'dot')
    ];
    // Raw input uses its own units; it is never mislabeled as ideal output.
    traces[2].yaxis = 'y2';
    var figure = layout(mode === 'step' ? 'First-order step response' : 'First-order ramp response');
    figure.yaxis2 = { title: { text: 'Raw input (input units)' }, overlaying: 'y', side: 'right', showgrid: false, automargin: true };
    if (mode === 'step') {
      var A = data.input[0];
      traces.push({ x: [tau, 3 * tau],
        y: [global.SensorMath.step(tau, K, tau, A), global.SensorMath.step(3 * tau, K, tau, A)],
        type: 'scatter', mode: 'markers', name: 'τ and 3τ checkpoints',
        marker: { size: 10, color: '#d84315' },
        text: ['t = τ: 63.212% of KA', 't = 3τ: 95.021% of KA'],
        hovertemplate: '%{text}<br>t=%{x:.5g} s<br>y=%{y:.5g}<extra></extra>' });
      figure.annotations = [note('τ = ' + fmt(tau) + ' s: 63.212% of KA<br>3τ = ' + fmt(3 * tau) + ' s: 95.021% of KA')];
    } else {
      var last = data.time.length - 1;
      var end = data.time[last];
      var rate = data.input[last] / end;
      var slope = K * rate;
      var steadyError = slope * tau;
      if (!Number.isFinite(steadyError)) throw new RangeError('Ramp error overflow.');
      var lag = tau * -Math.expm1(-end / tau);
      // Horizontal segment joins actual output to the equal-valued ideal output.
      if (slope !== 0) {
        traces.push(line([end - lag, end], [data.output[last], data.output[last]], 'Time lag → τ', '#8e24aa', 'dash'));
        traces.push(line([end, end], [data.output[last], data.idealOutput[last]], 'Output error → Krτ', '#d84315', 'dash'));
      }
      figure.annotations = [note('Steady error Krτ = ' + fmt(steadyError) + ' output units<br>' +
        (slope === 0 ? 'Zero output slope: time lag is undefined.' : 'Lag at final sample = ' + fmt(lag) + ' s → τ = ' + fmt(tau) + ' s'))];
    }
    return global.Plotly.react(element, traces, figure, config);
  }

  // Plot positive E on a logarithmic axis, and ln(E) on a linear subplot.
  // Plotly's log axis is base 10; its transformed slope is -1/(tau*ln(10)).
  // The lower subplot explicitly demonstrates the requested NATURAL-log slope.
  function drawError(tau) {
    var element = ready('errorPlot');
    var data = global.SensorMath.generateData(1, tau, 'step', 1, 1);
    var logarithm = data.time.map(function (t) { return -t / tau; });
    var traces = [line(data.time, data.errorFraction, 'Normalized step error E(t)', '#1565c0'),
      line(data.time, logarithm, 'ln(E) = −t/τ', '#8e24aa')];
    traces[1].xaxis = 'x2'; traces[1].yaxis = 'y2';
    var figure = layout('Step error and natural logarithm');
    figure.height = 650;
    figure.yaxis = { title: { text: 'E(t), log scale' }, type: 'log', domain: [0.60, 1], automargin: true };
    figure.xaxis.anchor = 'y';
    figure.xaxis2 = { title: { text: 'Time t (s)' }, anchor: 'y2', matches: 'x', automargin: true };
    figure.yaxis2 = { title: { text: 'ln(E)' }, type: 'linear', domain: [0, 0.38], automargin: true };
    figure.annotations = [note('E(t) = exp(−t/τ)<br>Natural-log slope = −1/τ = ' + fmt(-1 / tau) + ' s⁻¹')];
    return global.Plotly.react(element, traces, figure, config);
  }
  global.SensorPlots = Object.freeze({ drawResponse: drawResponse, drawError: drawError });
})(window);
