# ENCS4380 Dynamic Characteristics Toolkit

Team: Zaid, Ahmad, Anas and Khalid.

Published site: https://1190693-anas.github.io/ENCS4380-Micromouse/

The final implementation includes all four modules and the RK4 bonus.

## Run
Open `index.html` in a browser, or run `python -m http.server 8000` in this folder and open http://localhost:8000. Plotly loads from a CDN and requires internet access. No application server or build step is required.

## Modules
- **1 — Time response:** first-order step/ramp, gain/time constant controls, 63.2% and 95% markers, ramp lag/error and natural-log error slope.
- **2 — Frequency response:** input/output sinusoids, amplitude/phase, Bode plots, cutoff and dynamic-error calculator.
- **3 — Second order:** all damping cases, sampled response metrics and curve markers, live state-space matrices, poles/eigenvalues and phase trajectory. Force F=k gives unit final displacement.
- **4 — Guess the sensor:** noisy first-order step or steady-state sine and underdamped second-order step challenges. Guess before revealing the true parameters, clean response and prediction overlay. Both parameter errors within 10% earns one point; each round counts once. Hints and New Sensor are provided. The session score resets on reload. Sine frequency and unit input amplitude are stated. Second-order rounds are underdamped so overshoot/peak-time identification applies.
- **Bonus — RK4:** an independently implemented fourth-order Runge-Kutta solver integrates the mass-spring-damper state equations. Compare its displacement against the exact response and inspect absolute error. Module 3 controls update both models. Adjust the requested integration step; a cap of 0.25/(b/m + sqrt(k/m)) resolves fast modes. The actual step, step count and maximum error are displayed.

## Homework 2 · Control
- **P1 — PID playground:** select the Module 1 first-order plant or the Module 3 mass–spring–damper plant. Adjust the gains, setpoint step, actuator limit and duration. The page simulates unity negative feedback and displays the output, actuator command and four response metrics.
- **P1 owner:** pending team assignment.
- **P2 — A slow sensor in the loop:** adjust the first-order feedback sensor's time constant and all three PID gains. The same plot shows true output, measured output, and setpoint. The predictor has fast and slow presets with identical gains to isolate sensor lag.
- **P2 owner:** pending team assignment.

The controller differentiates the measurement to avoid setpoint kick. The simulator integrates the plant and integral state with RK4. Saturation is symmetric about zero, and integral action continues during saturation. The prediction box includes the P-only and PI reference settings.

With K = τ = 1 and Kp = 9, the unclipped closed loop has a time constant of 0.1 s and a 10% steady-state error. With Kp = Ki = 1, the ideal characteristic polynomial is s² + 2s + 1, so ωn = 1 rad/s and ζ = 1. The PI zero cancels one of those poles in the setpoint response. Stable PI reaches zero step error when the actuator can sustain the target.

In P2, the RK4 solver adds the sensor state τₛ·dyₘ/dt + yₘ = y. The PID uses the measured output yₘ for both error and derivative action. For the demonstration with K = τ = 1, Kp = 6, Ki = 14, and Kd = 0, the unclipped characteristic polynomial is τₛs³ + (1 + τₛ)s² + 7s + 14. Its stability boundary is τₛ = 1 s. Try 0.02 s for a fast sensor and 1.2 s to see growing oscillations. P2 reports the peak above the setpoint within the simulated window.

## Contributions
- **Ahmad and Zaid** worked together on Modules 1–3, including sensor models, plots, interface and integration. Both Ahmad and Zaid committed their work.
- **Anas and Khalid** worked together on Module 4, the Guess the Sensor challenge. Anas committed their joint work.

Commit authors identify who uploaded the changes; the paired contributions above describe the joint work.

## Micromouse project
The original Micromouse source files, ESP32 files, mazes and documentation are preserved in this repository. See [the original Micromouse README](MICROMOUSE-README.md) for that project's instructions.

## AI assistance
Codex/ChatGPT assisted with Modules 2–3, Module 4 development and completion, local integration, the RK4 solver, tests and documentation. For Homework 2, Codex assisted with the P1 and P2 simulator, interface, validation and documentation. Team members must review and understand every equation and implementation before the demonstration.

## Verification
Run:

```text
node test-dynamics.cjs
node test-final.cjs
node test-pid.cjs
```

The first suite verifies homework reference values, governing equations, damping cases, metric markers and extremes. The second checks RK4 across 45 parameter combinations, fourth-order convergence, and all three challenge types including invalid inputs, true-value reveal, round locking and resets. Halving the reference-case RK4 step reduces maximum displacement error by about 16.2 times.

The PID suite checks the handout reference cases, actuator clipping, derivative damping, and the behavior when the run is too short to estimate a steady state. It also checks that P2 feeds back the measured output and reproduces the expected increase in overshoot and oscillation.

Browser verification: ten reference rows pass; all eight checkpoint/bonus plots render; all damping presets and three challenge types work. All three pages fit a 390-pixel viewport. Response metrics are sampled estimates; sine responses exclude the startup transient.

## Screenshots
![Frequency response](screenshots/frequency-desktop.png)
![Second-order response](screenshots/second-order-desktop.png)
![Sensor challenge](screenshots/challenge-desktop.png)
![RK4 comparison](screenshots/rk4-desktop.png)

## Final submission steps
- Confirm the instructor has collaborator access to this submission repository.
- Submit the published Pages link and `v1.0` release link on the course page.
- Prepare for the group demonstration and individual code/equation questions.

Course-page submission and the demonstration must be completed by the team.
