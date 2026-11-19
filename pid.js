/* Continuous PID with derivative on measurement and an actuator clamp. */
(function (global) {
  'use strict';

  function simulate({ plant, gain, tau, mass, damping, stiffness, kp, ki, kd, setpoint, limit, duration }) {
    const firstOrder = plant === 'first';
    const model = firstOrder ? [gain, tau] : [mass, damping, stiffness];
    if (![...model, setpoint, limit, duration].every(value => Number.isFinite(value) && value > 0) ||
        ![kp, ki, kd].every(value => Number.isFinite(value) && value >= 0) ||
        !['first', 'second'].includes(plant)) {
      throw new RangeError('Use positive plant values, setpoint, limit and duration, and nonnegative PID gains.');
    }

    const rate = firstOrder
      ? (1 + gain * kp) / tau + Math.sqrt(gain * ki / tau)
      : (damping + kd) / mass + Math.sqrt((stiffness + kp) / mass) + Math.cbrt(ki / mass);
    const steps = Math.max(2000, Math.ceil(duration * rate * 10));
    if (steps > 200000) throw new RangeError('Shorten the simulation duration or reduce the gains to resolve the fast dynamics.');
    const dt = duration / steps;
    const time = [], output = [], command = [];
    let state = [0, 0, 0], saturated = false;

    function evaluate([y, velocity, integral]) {
      const error = setpoint - y;
      const base = kp * error + ki * integral;
      // For the first-order plant, solve u = base - Kd * (K*u - y)/tau.
      const requested = firstOrder ? (tau * base + kd * y) / (tau + kd * gain) : base - kd * velocity;
      const u = Math.max(-limit, Math.min(limit, requested));
      const slope = firstOrder ? (gain * u - y) / tau : velocity;
      const acceleration = firstOrder ? 0 : (u - damping * velocity - stiffness * y) / mass;
      return { u, clipped: Math.abs(requested) > limit, dx: [slope, acceleration, ki > 0 ? error : 0] };
    }

    const advance = (slope, step) => state.map((value, index) => value + step * slope[index]);
    for (let i = 0; i <= steps; i++) {
      const y = state[0];
      const sample = evaluate(state);
      if (!Number.isFinite(y) || !Number.isFinite(sample.u) || Math.abs(y) > 1e8 * setpoint) {
        throw new RangeError('The response diverged. Reduce the gains or shorten the simulation duration.');
      }
      time.push(i * dt);
      output.push(y);
      command.push(sample.u);
      saturated ||= sample.clipped;
      if (i === steps) break;
      const a = sample.dx;
      const b = evaluate(advance(a, dt / 2)).dx;
      const c = evaluate(advance(b, dt / 2)).dx;
      const d = evaluate(advance(c, dt)).dx;
      state = state.map((value, j) => value + dt * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
    }
    return { time, output, command, saturated, ...metrics(time, output, command, setpoint) };
  }

  function crossing(time, output, level) {
    const index = output.findIndex(value => value >= level);
    if (index < 1) return null;
    const fraction = (level - output[index - 1]) / (output[index] - output[index - 1]);
    return time[index - 1] + fraction * (time[index] - time[index - 1]);
  }

  function metrics(time, output, command, setpoint) {
    const last = output.length - 1;
    const final = output[last];
    const tail = Math.floor(last * 0.9);
    const excursion = Math.max(0, ...output.slice(tail).map(value => Math.abs(value - final)));
    const finalCommand = command[last];
    const commandTolerance = 0.001 * Math.max(1, Math.abs(finalCommand));
    const settled = excursion <= 0.001 * setpoint &&
      command.slice(tail).every(value => Math.abs(value - finalCommand) <= commandTolerance);
    const riseStart = final > 0 ? crossing(time, output, 0.1 * final) : null;
    const riseEnd = final > 0 ? crossing(time, output, 0.9 * final) : null;
    let peak = 0, lastOutside = -1;
    for (let i = 0; i <= last; i++) {
      peak = Math.max(peak, output[i]);
      if (Math.abs(output[i] - final) > 0.02 * final) lastOutside = i;
    }
    return {
      final: settled ? final : null,
      rise: settled && riseStart !== null && riseEnd !== null ? riseEnd - riseStart : null,
      overshoot: settled && final > 0 ? 100 * (peak - final) / final : null,
      settling: settled && final > 0 ? time[lastOutside + 1] : null,
      error: settled ? 100 * (setpoint - final) / setpoint : null
    };
  }

  global.PID = { simulate, crossing };
})(typeof window === 'undefined' ? globalThis : window);
