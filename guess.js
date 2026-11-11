"use strict";
let hiddenSensor = null;
let correctGuesses = 0;
let totalGuesses = 0;
function startChallenge() {
    const times = [];
    const K = 0.5 + Math.random() * 2;
    const tau = 0.5 + Math.random() * 3;    
    const zeta = 0.2 + Math.random() * 1.3;
    const omega = 1 + Math.random() * 3;        
    const type = Math.random() < 0.5 ? "first" : "second";
    hiddenSensor = { type, K, tau, zeta, omega };
    document.getElementById("gainGuess").value = "";
    document.getElementById("tauGuess").value = "";
    document.getElementById("guessResult").textContent = "";
    document.getElementById("hintText").hidden = true;
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


function checkGuess() {
    const Kguess = Number(document.getElementById("gainGuess").value);
    const tauGuess = Number(document.getElementById("tauGuess").value);
    const result = document.getElementById("guessResult");

    if (Kguess <= 0 || tauGuess <= 0) {
        result.textContent = "Please enter positive values for K and tau.";
        return;
    }

    const kError = Math.abs(Kguess - hiddenSensor.K) / hiddenSensor.K;
    const tauError = Math.abs(tauGuess - hiddenSensor.tau) / hiddenSensor.tau;
    const plot = document.getElementById("sensorPlot");
    const times = plot.data[0].x;
    const predictedOutputs = times.map(t => SensorMath.step(t, Kguess, tauGuess, 1));
    Plotly.react("sensorPlot", [
    plot.data[0],
    {
    x: times, y: predictedOutputs, mode: "lines",
    name: "Your Prediction", line: { dash: "dash" }
    }
    ], plot.layout);
    totalGuesses++;

    if (kError <= 0.10 && tauError <= 0.10) {
        correctGuesses++;
        result.textContent = "Correct! Both values are within 10%.";
    } else {
        result.textContent = "Not quite. Try again!";
    }
    
document.getElementById("score").textContent =
    `Score: ${correctGuesses} / ${totalGuesses}`;

}

document.getElementById("checkGuess").addEventListener("click", checkGuess);

function showHint() {
const hint = document.getElementById("hintText");
hint.hidden = false;
hint.textContent = "Hint: Estimate K from the final output level. The time constant (tau) is the time when the output reaches 63.2% of K.";
}

document.getElementById("showHint").addEventListener("click", showHint);
