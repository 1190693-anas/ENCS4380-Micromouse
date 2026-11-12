/* First-order sensor mathematics. Load before plots.js; no build tools needed.
 * tau*y' + y = K*x; G(s) = K/(tau*s + 1), with y(0) = 0.
 * Time and tau use seconds. K converts input units into output units.
 * All arguments must be finite numbers (convert HTML input strings with Number).
 * Invalid arguments throw descriptive errors for app.js to catch and display.
 */
(function (global) {
  'use strict';

  function finite(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(name + ' must be a finite number.');
    }
    return value;
  }

  function timeParameters(t, tau) {
    finite(t, 't');
    finite(tau, 'tau');
    if (t < 0 || tau <= 0) throw new RangeError('Require t >= 0 and tau > 0.');
  }

  function result(value) {
    if (!Number.isFinite(value)) throw new RangeError('Calculation overflow: use smaller parameter values.');
    return value;
  }

  // expm1 avoids subtracting nearly equal numbers when t/tau is small.
  function step(t, K, tau, A) {
    timeParameters(t, tau);
    finite(K, 'K'); finite(A, 'A');
    return result(result(K * A) * -Math.expm1(-t / tau));
  }

  // For x(t)=rate*t: y=K*rate*[t-tau*(1-exp(-t/tau))].
  function ramp(t, K, tau, rate) {
    timeParameters(t, tau);
    finite(K, 'K'); finite(rate, 'rate');
    var u = t / tau;
    // Series for 1-(1-exp(-u))/u prevents cancellation near t=0.
    var factor = u < 1e-4
      ? u * (0.5 + u * (-1 / 6 + u * (1 / 24 - u / 120)))
      : 1 + Math.expm1(-u) / u;
    return result(result(K * rate) * (t * factor));
  }

  // Normalized remaining STEP error, independent of K and A.
  // At very large t/tau, floating-point underflow correctly returns zero.
  function errorFraction(t, tau) {
    timeParameters(t, tau);
    return Math.exp(-t / tau);
  }

  // 601 samples over 0..6*tau include tau and 3*tau exactly.
  // In ramp mode errorFraction is still the reference STEP error, not ramp error.
  function generateData(K, tau, mode, A, rate) {
    timeParameters(0, tau); finite(K, 'K');
    A = A === undefined ? 1 : A;
    rate = rate === undefined ? 1 : rate;
    finite(A, 'A'); finite(rate, 'rate');
    if (mode !== 'step' && mode !== 'ramp') throw new RangeError('mode must be "step" or "ramp".');
    result(6 * tau);
    if (tau / 100 === 0) throw new RangeError('tau is too small to sample reliably.');
    var data = { time: [], input: [], output: [], idealOutput: [], errorFraction: [] };
    for (var i = 0; i <= 600; i++) {
      var t = (i / 100) * tau;
      var x = mode === 'step' ? A : result(rate * t);
      data.time.push(t);
      data.input.push(x);
      data.output.push(mode === 'step' ? step(t, K, tau, A) : ramp(t, K, tau, rate));
      data.idealOutput.push(result(K * x));
      data.errorFraction.push(errorFraction(t, tau));
    }
    return data;
  }

  // Absolute tolerance 0.001 accommodates the rounded homework targets.
  // Normalizing analytically avoids division by zero when K*A is zero.
  function validate(K, tau, A) {
    timeParameters(0, tau); finite(K, 'K'); finite(A, 'A');
    var finalOutput = result(K * A);
    var tolerance = 0.001;
    var checks = [1, 3].map(function (multiple, index) {
      var t = result(multiple * tau);
      var y = step(t, K, tau, A);
      var calculated = finalOutput !== 0 ? y / finalOutput : -Math.expm1(-multiple);
      var expected = index === 0 ? 0.632 : 0.950;
      return {
        time: t, multiple: multiple, expected: expected,
        exactExpected: -Math.expm1(-multiple), calculated: calculated,
        output: y, ratioDefined: finalOutput !== 0,
        absoluteError: Math.abs(calculated - expected),
        pass: Math.abs(calculated - expected) <= tolerance
      };
    });
    return {
      finalOutput: finalOutput, tolerance: tolerance, checks: checks,
      method: finalOutput === 0 ? 'Analytical normalized response; y/(K*A) is undefined.' : 'Calculated y/(K*A).',
      pass: checks.every(function (check) { return check.pass; })
    };
  }

  global.SensorMath = Object.freeze({
    step: step, ramp: ramp, errorFraction: errorFraction,
    generateData: generateData, validate: validate
  });
})(window);
