/* Sampled PID. Euler substeps advance the plant while PWM is held. */
(function (global) {
  'use strict';

  function simulate(settings) {
    const { plant, gain, tau, mass, damping, stiffness, kp, ki, kd,
      setpoint, limit, duration, sampleTime, antiWindup, minCommand = -limit } = settings;
    const first = plant === 'first';
    const time = [], output = [], command = [];
    let y = 0, velocity = 0, integral = 0, previousError = 0;
    let u = 0, saturated = false;
    const clamp = value => Math.max(minCommand, Math.min(limit, value));
    const rate = first ? 1 / tau : damping / mass + Math.sqrt(stiffness / mass);
    const substeps = Math.max(10, Math.ceil(sampleTime * rate * 100));
    if (!Number.isFinite(substeps) || Math.ceil(duration / sampleTime) * substeps > 200000) {
      throw new RangeError('Use a shorter run or a larger sampling interval.');
    }
    const dt = sampleTime / substeps;
    for (let i = 0; i <= Math.ceil(duration / dt); i++) {
      const t = Math.min(i * dt, duration);
      if (i % substeps === 0) {
        const error = setpoint - y;
        const nextIntegral = ki > 0 ? integral + ki * sampleTime * error : 0;
        const pd = kp * error + kd * (error - previousError) / sampleTime;
        const requested = pd + nextIntegral;
        const pushingPastLimit = (requested > limit && error > 0) ||
          (requested < minCommand && error < 0);
        if (!antiWindup || !pushingPastLimit) integral = nextIntegral;
        const raw = pd + integral;
        u = clamp(raw);
        saturated ||= u !== raw;
        previousError = error;
      }
      if (!Number.isFinite(y) || Math.abs(y) > 1e8 * setpoint) {
        throw new RangeError('The response diverged. Reduce the gains or shorten the run.');
      }
      time.push(t);
      output.push(y);
      command.push(u);
      if (t === duration) break;
      const step = Math.min(dt, duration - t);
      if (first) {
        y += step * (gain * u - y) / tau;
      } else {
        const acceleration = (u - damping * velocity - stiffness * y) / mass;
        y += step * velocity;
        velocity += step * acceleration;
      }
    }
    return { time, output, command, saturated, ...global.PID.metrics(time, output, command, setpoint) };
  }

  function arduino({ kp, ki, kd, sampleTime, setpoint, limit, antiWindup, minCommand = -limit }) {
    const number = value => Number(value).toPrecision(9);
    return [
      '// Supply these two functions for your board and motor driver.',
      'float readOutput();',
      '// command is normalized: 0 to 1 for forward-only, -1 to 1 for bidirectional.',
      'void writeActuator(float command);',
      '',
      'const float Kp = ' + number(kp) + ', Ki = ' + number(ki) + ', Kd = ' + number(kd) + ';',
      'const unsigned long periodUs = ' + Math.round(sampleTime * 1e6) + 'UL;',
      'const float Ts = periodUs / 1000000.0f;',
      'const float target = ' + number(setpoint) + ';',
      'const float minU = ' + number(minCommand) + ', maxU = ' + number(limit) + ';',
      'const bool antiWindup = ' + Boolean(antiWindup) + ';',
      'float integral = 0, previousError = 0;',
      'unsigned long lastTick;',
      '',
      'void setup() {',
      '  // Initialize your encoder and motor driver here.',
      '  lastTick = micros() - periodUs;',
      '}',
      '',
      'void loop() {',
      '  unsigned long now = micros();',
      '  if (now - lastTick < periodUs) return;',
      '  lastTick = now;',
      '  float error = target - readOutput();',
      '  float nextIntegral = integral + Ki * Ts * error;',
      '  float pd = Kp * error + Kd * (error - previousError) / Ts;',
      '  float requested = pd + nextIntegral;',
      '  bool pushingPastLimit = (requested > maxU && error > 0) ||',
      '                          (requested < minU && error < 0);',
      '  if (!antiWindup || !pushingPastLimit) integral = nextIntegral;',
      '  float u = constrain(pd + integral, minU, maxU);',
      '  writeActuator(u / maxU);',
      '  previousError = error;',
      '}'
    ].join('\n');
  }

  global.DigitalPID = { simulate, arduino };
})(typeof window === 'undefined' ? globalThis : window);
