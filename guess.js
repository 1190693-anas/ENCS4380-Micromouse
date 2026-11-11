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
    document.getElementById("gainGuess").hidden = type !== "first";
    document.querySelector('label[for="gainGuess"]').hidden = type !== "first";
    document.getElementById("tauGuess").hidden = type !== "first";
    document.querySelector('label[for="tauGuess"]').hidden = type !== "first";
    document.getElementById("zetaGuess").hidden = type !== "second";
    document.querySelector('label[for="zetaGuess"]').hidden = type !== "second";
    document.getElementById("omegaGuess").hidden = type !== "second";
    document.querySelector('label[for="omegaGuess"]').hidden = type !== "second";
    document.getElementById("gainGuess").value = "";
    document.getElementById("tauGuess").value = "";
    document.getElementById("zetaGuess").value = "";
    document.getElementById("omegaGuess").value = "";
    document.getElementById("guessResult").textContent = "";
    document.getElementById("hintText").hidden = true;
    const outputs = [];

for (let i = 0; i <= 100; i++) {
        const t = i * 0.1;
        times.push(t);
    if (type === "first") {
    outputs.push(SensorMath.step(t, K, tau, 1));
    } else {
    outputs.push(Dynamics.response(t, zeta, omega).x);
    }
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
const result = document.getElementById("guessResult");
const first = hiddenSensor.type === "first";

const input1 = first ? "gainGuess" : "zetaGuess";
const input2 = first ? "tauGuess" : "omegaGuess";

const guess1 = Number(document.getElementById(input1).value);
const guess2 = Number(document.getElementById(input2).value);

if (!Number.isFinite(guess1) || !Number.isFinite(guess2) || guess1 <= 0 || guess2 <= 0) {
result.textContent = "Please enter two positive numbers.";
return;
}

const actual1 = first ? hiddenSensor.K : hiddenSensor.zeta;
const actual2 = first ? hiddenSensor.tau : hiddenSensor.omega;

const error1 = Math.abs(guess1 - actual1) / actual1;
const error2 = Math.abs(guess2 - actual2) / actual2;

const plot = document.getElementById("sensorPlot");
const times = plot.data[0].x;

const predictedOutputs = times.map(t =>
first
? SensorMath.step(t, guess1, guess2, 1)
: Dynamics.response(t, guess1, guess2).x
);

Plotly.react("sensorPlot", [
plot.data[0],
{
x: times,
y: predictedOutputs,
mode: "lines",
name: "Your Prediction",
line: { dash: "dash" }
}
], plot.layout);

totalGuesses++;

if (error1 <= 0.10 && error2 <= 0.10) {
correctGuesses++;
result.textContent = "Correct! Both parameters are within 10%.";
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
    if (hiddenSensor.type === "first") {
    hint.textContent = "Hint: Estimate K from the final output. Tau is the time when the response reaches 63.2% of K.";
    } else {
    hint.textContent = "Hint: Estimate zeta from overshoot and oscillations. Lower zeta usually means more overshoot. Omega controls how quickly the sensor responds.";
    }

    }
    
    document.getElementById("showHint").addEventListener("click", showHint);
