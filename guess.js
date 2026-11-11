
"use strict";

function startChallenge() {
    const times = [];
    const K = 0.5 + Math.random() * 2;
    const tau = 0.5 + Math.random() * 3;
    const outputs = [];

    for (let i = 0; i <= 100; i++) {
        const t = i * 0.1;
        times.push(t);
        outputs.push(SensorMath.step(t, K, tau, 1));
    }

    Plotly.newPlot("sensorPlot",
        [{ x: times, y: outputs, mode: "lines", name: "Sensor Output" }],
        {
            title: "Unknown Sensor Response",
            xaxis: { title: "Time (s)" },
            yaxis: { title: "Output" }
        },
        { responsive: true }
    );
}

startChallenge();
document.getElementById("newSensor").addEventListener("click", startChallenge);
