
"use strict";

function startChallenge() {
    const times = [];
    const outputs = [];

    for (let i = 0; i <= 100; i++) {
        const t = i * 0.1;
        times.push(t);
        outputs.push(SensorMath.step(t, 1, 2, 1));
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
