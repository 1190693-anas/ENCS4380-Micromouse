# Final demonstration guide

1. Open index.html. Show the step markers at tau and 3*tau, then switch to ramp and explain lag and steady error. Explain the natural-log error slope.
2. Open checkpoint.html. At tau=0.2 and omega=2, show M=0.92848 and phase=-21.801 degrees. Show the cutoff and 100 Hz/5% error calculator.
3. Compare the three damping presets. Explain rise/peak/settling markers, overshoot, matrices and poles. For m=1,b=2,k=4 the poles are -1 +/- j1.732.
4. Scroll to the RK4 bonus. Explain x'=v and v'=(k-b*v-k*x)/m. RK4 uses four slopes and weights 1,2,2,1 divided by 6. Change the step from 0.05 to 0.025: the error should fall about sixteenfold when the stability cap is inactive. Show the error plot, not only overlapping response curves.
5. Open guess.html. Use New Sensor to explore first-order step, first-order sine and second-order step rounds. Use a hint, make a prediction, and show the true values and curve after submitting. Each round is scored once.
6. Show the ten passing validation rows. Run both Node test suites if asked.

Review the formulas and code personally; these notes do not replace understanding or prove submission/attendance. Use the published Pages site and v1.0 release for submission.
