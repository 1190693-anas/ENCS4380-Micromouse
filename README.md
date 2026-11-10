# ENCS4380 Dynamic Characteristics Toolkit

Team: Zaid and Ahmad.

Live site: https://zaidbarham-droid.github.io/encs4380-dynamics-ZaidandAhmad/

Checkpoint 2: open `checkpoint.html` from the Module 1 navigation link.

## Modules
- Module 1: existing first-order step/ramp response and error plots.
- Module 2: sinusoidal steady-state response, magnitude/phase Bode plots, cutoff and dynamic-error calculator.
- Module 3: mass-spring-damper response, sampled response metrics, live state-space matrices, poles/eigenvalues and phase trajectory.

Module 2 and 3 ownership must be confirmed by the team; no contribution is attributed to another member by this update.

## Running and checking
Open `index.html` in a browser, or serve this folder with a static server. Plotly is loaded from a CDN and needs an internet connection. There is no backend or build step. Check `checkpoint.html` on desktop and mobile.

Run `node test-dynamics.cjs` to check reference values, the governing differential equation, all damping cases and slider extremes. The checkpoint page displays expected/calculated values and pass/fail results.

Module 3 uses closed-form responses with zero initial conditions. The force step is F=k, so displacement settles to 1 m. Rise time is 10–90%, settling time uses the 2% band, and peak time is applicable only to underdamped responses. Metrics are sampled estimates. The step plot marks the 10% and 90% crossings, peak/overshoot, and settling time. The frequency module shows steady state, without the startup transient.

## AI assistance
Codex assisted with implementing Modules 2 and 3, integrating navigation, and numerical verification for Checkpoint 2. Team members must review and understand the equations and code before the lab demonstration.

## Remaining final-release work
Module 4, confirmed ownership/issues, and the final v1.0 release are separate from Checkpoint 2. This checkpoint does not claim the final homework is complete.

## Checkpoint preview
![Frequency-response module](screenshots/frequency-desktop.png)

Verified in headless Microsoft Edge: all ten validation rows (covering the six homework checks) pass, all six plots render, frequency slider and three damping presets update, and the layout fits a 390-pixel viewport.

![Second-order response with live metric markers](screenshots/second-order-desktop.png)
