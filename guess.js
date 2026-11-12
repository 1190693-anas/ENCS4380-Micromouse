"use strict";
// Extends Anas's challenge: sine rounds, true-value reveal and one score per round.
let hiddenSensor = null, correctGuesses = 0, totalGuesses = 0, answered = false;
const el = id => document.getElementById(id);
const fmt = x => Number(x.toPrecision(5)).toString();
function curve(sensor, t, a, b) {
    if (sensor.type === 'second') return Dynamics.response(t, a, b).x;
    if (sensor.mode === 'step') return SensorMath.step(t, a, b, 1);
    const f = Dynamics.frequency(b, sensor.omega);
    return a * f.M * Math.sin(sensor.omega * t + f.phase);
}
function startChallenge() {
    if (!window.Plotly) { el('challengeError').textContent = 'Plots could not load. Check your internet connection and reload.'; return; }
    const type = Math.random() < .5 ? 'first' : 'second';
    const mode = type === 'first' && Math.random() < .5 ? 'sine' : 'step';
    hiddenSensor = {type, mode, K: .5 + Math.random()*2, tau: .5 + Math.random()*3,
        zeta: .2 + Math.random()*.65, omega: 1 + Math.random()*3};
    const s = hiddenSensor;
    answered = false;
    el('checkGuess').disabled = false;
    for (const id of ['gainGuess','tauGuess','zetaGuess','omegaGuess']) {
        const visible = (type === 'first') === ['gainGuess','tauGuess'].includes(id);
        el(id).hidden = !visible;
        document.querySelector(`label[for="${id}"]`).hidden = !visible;
        el(id).value = '';
    }
    el('guessResult').textContent = '';
    el('hintText').hidden = true;
    el('challengeDescription').textContent = mode === 'sine'
        ? `First-order steady-state response to x(t) = sin(${fmt(s.omega)}t), unit input amplitude, ω = ${fmt(s.omega)} rad/s. Estimate K and τ from amplitude and phase lag. No startup transient.`
        : type === 'first' ? 'First-order response to a unit step. Estimate K and τ.'
        : 'Underdamped second-order unit-final-value step. Estimate ζ and ωₙ from overshoot and peak time.';
    const end = mode === 'sine' ? 6*Math.PI/s.omega : type === 'first' ? 7*s.tau : 9/(s.zeta*s.omega);
    const times = Array.from({length:801},(_,i)=>i*end/800);
    const a = type === 'first' ? s.K : s.zeta, b = type === 'first' ? s.tau : s.omega;
    const clean = times.map(t=>curve(s,t,a,b));
    const scale = type === 'second' ? 1 : mode === 'step' ? s.K : s.K*Dynamics.frequency(s.tau,s.omega).M;
    s.times = times; s.clean = clean;
    s.measured = {x:times,y:clean.map(y=>y+(Math.random()*2-1)*.02*scale),mode:'lines',name:'Noisy measurement'};
    s.input = mode === 'sine' ? [{x:times,y:times.map(t=>Math.sin(s.omega*t)),mode:'lines',name:'Known input',line:{dash:'dot'}}] : [];
    Plotly.newPlot('sensorPlot',[s.measured,...s.input],{
        title:{text:'Unknown sensor response'},margin:{l:55,r:20,t:55,b:110},
        xaxis:{title:{text:'Time (s)'}},yaxis:{title:{text:'Output'}},legend:{orientation:'h',y:-.25}
    },{responsive:true,displaylogo:false});
}
function checkGuess() {
    if (!hiddenSensor || answered) return;
    const s=hiddenSensor, first=s.type==='first';
    const a=Number(el(first?'gainGuess':'zetaGuess').value),b=Number(el(first?'tauGuess':'omegaGuess').value);
    if (!Number.isFinite(a)||!Number.isFinite(b)||a<=0||b<=0) {
        el('guessResult').textContent='Please enter two positive finite numbers.'; return;
    }
    let predicted;
    try { predicted=s.times.map(t=>curve(s,t,a,b)); if(!predicted.every(Number.isFinite))throw Error(); }
    catch { el('guessResult').textContent='These values are too large to simulate. Use smaller values.';return; }
    const actualA=first?s.K:s.zeta,actualB=first?s.tau:s.omega;
    const errorA=Math.abs(a-actualA)/actualA,errorB=Math.abs(b-actualB)/actualB;
    const correct=errorA<=.1+1e-12&&errorB<=.1+1e-12;
    answered=true;totalGuesses++;if(correct)correctGuesses++;
    el('checkGuess').disabled=true;
    el('score').textContent=`Score: ${correctGuesses} / ${totalGuesses} completed rounds`;
    el('guessResult').textContent=`${correct?'Correct! Both parameters are within 10%.':'Outside the 10% target.'} True ${first?'K':'ζ'} = ${fmt(actualA)}, ${first?'τ (s)':'ωₙ (rad/s)'} = ${fmt(actualB)}. Your errors: ${fmt(errorA*100)}% and ${fmt(errorB*100)}%. Select New Sensor for another round.`;
    Plotly.react('sensorPlot',[s.measured,...s.input,
        {x:s.times,y:s.clean,mode:'lines',name:'True response',line:{color:'#16845b',width:3}},
        {x:s.times,y:predicted,mode:'lines',name:'Your prediction',line:{dash:'dash',color:'#cc651f'}}
    ],el('sensorPlot').layout,{responsive:true,displaylogo:false});
}
function showHint() {
    if(!hiddenSensor)return;
    el('hintText').hidden=false;
    el('hintText').textContent=hiddenSensor.mode==='sine'
        ? 'Measure the time lag Δt between input/output peaks. φ = ωΔt, τ = tan(φ)/ω. Then K = output amplitude × √(1 + (ωτ)²).'
        :hiddenSensor.type==='first'
        ? 'K is the final output for a unit step. τ is the time to reach 63.2% of K; alternatively ln(remaining error fraction) has slope −1/τ.'
        : 'Let p = (peak − final)/final. ζ = −ln(p)/√(π² + ln(p)²); ωₙ = π/(peak time × √(1 − ζ²)).';
}
el('newSensor').addEventListener('click',startChallenge);
el('checkGuess').addEventListener('click',checkGuess);
el('showHint').addEventListener('click',showHint);
startChallenge();
