const assert = require('node:assert/strict');
require('./pid.js');

const reference = { plant: 'first', gain: 1, tau: 1, kp: 9, ki: 0, kd: 0,
  setpoint: 1, limit: 20, duration: 10 };

function near(actual, expected, tolerance) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} near ${expected}`);
}

const p = PID.simulate(reference);
near(p.final, 0.9, 1e-8);
near(p.error, 10, 1e-6);
near(PID.crossing(p.time, p.output, p.final * (1 - Math.exp(-1))), 0.1, 1e-6);
near(p.rise, 0.1 * Math.log(9), 0.001);
near(p.settling, 0.1 * Math.log(50), 0.005);
assert.equal(p.saturated, false);

// The critically damped PI denominator is (s + 1)^2. The setpoint zero
// cancels one pole, giving the exact reference response 1 - exp(-t).
const pi = PID.simulate({ ...reference, kp: 1, ki: 1 });
for (let i = 0; i < pi.time.length; i += 100) {
  near(pi.output[i], 1 - Math.exp(-pi.time[i]), 1e-8);
}
near(pi.error, 0, 0.01);
const otherPI = PID.simulate({ ...reference, kp: 2, ki: 3 });
near(otherPI.error, 0, 0.01);

const clipped = PID.simulate({ ...reference, ki: 1, limit: 0.4 });
assert.ok(clipped.saturated);
assert.ok(clipped.command.every(u => Math.abs(u) <= 0.4));
near(clipped.final, 0.4, 0.001);
near(clipped.error, 60, 0.01);

const second = { ...reference, plant: 'second', mass: 1, damping: 1, stiffness: 4, duration: 20 };
const withoutD = PID.simulate(second);
const withD = PID.simulate({ ...second, kd: 4 });
near(withD.final, 9 / 13, 1e-6);
assert.ok(withD.overshoot < withoutD.overshoot);
assert.equal(PID.simulate({ ...reference, duration: 0.01 }).final, null);
assert.throws(() => PID.simulate({ ...reference, tau: 0 }), RangeError);
console.log('PASS: P and PI references, second-order derivative damping, clipping and metric availability.');

assert.deepEqual(p.measured, p.output);
const feedbackP = PID.simulate({ ...reference, sensorTau: 0.5 });
for (let i = 0; i < feedbackP.time.length; i += 20) {
  near(feedbackP.command[i], 9 * (1 - feedbackP.measured[i]), 1e-12);
}
assert.ok(feedbackP.output[1] > feedbackP.measured[1]);
const demo = { ...reference, kp: 6, ki: 14, limit: 100, duration: 16 };
const fastSensor = PID.simulate({ ...demo, sensorTau: 0.02 });
const slowSensor = PID.simulate({ ...demo, sensorTau: 1.2 });
near(fastSensor.final, 1, 0.001);
assert.equal(slowSensor.final, null);
assert.equal(slowSensor.saturated, false);
const peak = values => values.reduce((highest, value) => Math.max(highest, value), 0);
assert.ok(peak(slowSensor.output) > 3 * peak(fastSensor.output));
const crossings = slowSensor.output.filter((value, index, values) =>
  index > 0 && (value > 1) !== (values[index - 1] > 1));
assert.ok(crossings.length >= 6);
console.log('PASS: P2 measurement feedback, sensor lag, increased overshoot and oscillation at fixed gains.');
