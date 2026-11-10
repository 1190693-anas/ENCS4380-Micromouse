(function(){
'use strict';
const $=id=>document.getElementById(id),num=id=>Number($(id).value),fmt=x=>Number(x.toPrecision(5)).toString();
function line(x,y,name){return {x,y,name,type:'scatter',mode:'lines'};}
function plot(id,traces,title,xTitle,yTitle,extra={}){return Plotly.react(id,traces,{title:{text:title},height:420,margin:{l:65,r:20,t:55,b:110},xaxis:{title:{text:xTitle}},yaxis:{title:{text:yTitle}},legend:{orientation:'h',y:-.38},...extra},{responsive:true,displaylogo:false});}
function labels(){document.querySelectorAll('output').forEach(e=>e.textContent=$(e.htmlFor).value);}
async function frequency(){
const tau=num('ftau'),w=num('omega'),f=Dynamics.frequency(tau,w),t=Array.from({length:801},(_,i)=>i/800*6*Math.PI/w);
$('frequencyMetrics').textContent=`Amplitude ratio M = ${fmt(f.M)} · Phase φ = ${fmt(f.phase*180/Math.PI)}° · Cutoff ωc = ${fmt(1/tau)} rad/s (${fmt(1/(2*Math.PI*tau))} Hz)`;
$('dynamicError').textContent=`δ = M − 1 = ${fmt(f.M-1)} (${fmt(100*(f.M-1))}%). Attenuation magnitude: ${fmt(100*(1-f.M))}%.`;
const ws=Array.from({length:301},(_,i)=>10**(-2+4*i/300)/tau),fs=ws.map(v=>Dynamics.frequency(tau,v));
await Promise.all([plot('sines',[line(t,t.map(v=>Math.sin(w*v)),'Input'),line(t,t.map(v=>f.M*Math.sin(w*v+f.phase)),'Output')],'Steady-state input and output','Time (s)','Amplitude'),plot('bodeMagnitude',[line(ws,fs.map(v=>20*Math.log10(v.M)),'Magnitude'),{x:[1/tau],y:[-3.0103],mode:'markers',name:'Cutoff −3.01 dB'}],'Bode magnitude','ω (rad/s)','Magnitude (dB)',{xaxis:{type:'log',title:{text:'ω (rad/s)'}}}),plot('bodePhase',[line(ws,fs.map(v=>v.phase*180/Math.PI),'Phase'),{x:[1/tau],y:[-45],mode:'markers',name:'Cutoff −45°'}],'Bode phase','ω (rad/s)','Phase (degrees)',{xaxis:{type:'log',title:{text:'ω (rad/s)'}}})]);
}
function calculator(){const e=num('errorLimit')/100,hz=num('maxHz');$('calculator').textContent=e>0&&e<1&&hz>0&&Number.isFinite(hz)?`τmax = √(1/(1 − ε)² − 1)/(2πfmax) = ${fmt(Math.sqrt(1/(1-e)**2-1)/(2*Math.PI*hz)*1000)} ms`:'Enter an error between 0 and 100%, and a positive frequency.';}
async function second(){const m=num('mass'),b=num('damping'),k=num('stiffness'),s=Dynamics.second(m,b,k);
$('secondMetrics').textContent=`ζ = ${fmt(s.z)} · ωₙ = ${fmt(s.w)} rad/s · ${s.z<1?'Underdamped':s.z===1?'Critically damped':'Overdamped'} · Rise: ${fmt(s.rise)} s · Peak time: ${s.peakTime===null?'Not applicable':fmt(s.peakTime)+' s'} · Overshoot: ${fmt(s.overshoot)}% · Settling: ${s.settling===null?'Outside window':fmt(s.settling)+' s'}`;
$('matrices').textContent=`A = [ 0          1 ]
    [ ${fmt(-k/m)}       ${fmt(-b/m)} ]
B = [ 0, ${fmt(1/m)} ]ᵀ     C = [1, 0]     D = 0`;
$('eigenvalues').textContent='Eigenvalues of A = poles of 1/(ms² + bs + k): '+s.poles.re.map((r,i)=>`${fmt(r)} ${s.poles.im[i]<0?'−':'+'} j${fmt(Math.abs(s.poles.im[i]))}`).join(', ');
const markers={x:[s.riseStart,s.riseEnd],y:[.1,.9],mode:'markers',marker:{size:10},name:'Rise: 10% / 90%'};
const stepTraces=[line(s.t,s.x,'Displacement'),line([0,s.t.at(-1)],[1,1],'Final value'),markers];
if(s.peakTime!==null)stepTraces.push({x:[s.peakTime],y:[s.peakValue],mode:'markers',marker:{size:11,symbol:'diamond'},name:'Peak / overshoot'});
const settlingLine=s.settling===null?[]:[{type:'line',x0:s.settling,x1:s.settling,yref:'paper',y0:0,y1:1,line:{color:'#526675',dash:'dot'}}];
await Promise.all([plot('step',stepTraces,'Unit-final-value step response','Time (s)','Displacement (m)',{shapes:[...settlingLine,{type:'rect',xref:'paper',x0:0,x1:1,y0:.98,y1:1.02,fillcolor:'#d9ead3',opacity:.4,line:{width:0},layer:'below'}]}),plot('poles',[{x:s.poles.re,y:s.poles.im,mode:'markers',marker:{symbol:'x',size:14},name:'Poles / eigenvalues'}],'Poles = eigenvalues','Real (s⁻¹)','Imaginary (s⁻¹)'),plot('phase',[{...line(s.x,s.v,'Trajectory'),customdata:s.t,hovertemplate:'x=%{x:.4f} m<br>v=%{y:.4f} m/s<br>t=%{customdata:.4f} s<extra></extra>'},{x:[0,1],y:[0,0],mode:'markers',name:'Start / equilibrium'}],'Phase plane','Displacement x₁ (m)','Velocity x₂ (m/s)')]);
}
function validation(){const f=Dynamics.frequency(.2,2),tau=Math.sqrt(1/.95**2-1)/(200*Math.PI),s=Dynamics.second(1,2,4),c=Dynamics.second(1,4,4);const rows=[...SensorMath.validate(1,1,1).checks.map(c=>[`First-order step at ${c.multiple}τ (y/KA)`,c.expected,c.calculated,.001]),['Sine amplitude, τ=.2, ω=2',.93,f.M,.005],['Sine phase lag (degrees)',21.8,-f.phase*180/Math.PI,.1],['τmax at 100 Hz / 5% error (ms)',.52,tau*1000,.005],['Phase lag at 50 Hz (degrees)',9.3,-Dynamics.frequency(tau,100*Math.PI).phase*180/Math.PI,.1],['Overshoot, ζ=.5 (%)',16.3,s.overshoot,.1],['Critical overshoot (%)',0,c.overshoot,.001],['Eigenvalue real part',-1,s.poles.re[0],.001],['Eigenvalue imaginary magnitude',1.732,s.poles.im[0],.001]];
$('validation').innerHTML=rows.map(([name,expected,actual,tol])=>`<tr><td>${name}</td><td>${expected} ± ${tol}</td><td>${fmt(actual)}</td><td class="${Math.abs(expected-actual)<=tol?'pass':'fail'}">${Math.abs(expected-actual)<=tol?'Pass':'Fail'}</td></tr>`).join('');}
let running=false,pending=false;async function update(){if(running){pending=true;return;}running=true;try{labels();calculator();if(!window.Plotly)throw Error('Plotly did not load. Check your connection and reload.');await Promise.all([frequency(),second()]);validation();$('error').textContent='';}catch(e){$('error').textContent=e.message;}finally{running=false;if(pending){pending=false;void update();}}}
document.querySelectorAll('input').forEach(e=>e.addEventListener('input',update));document.querySelectorAll('[data-damping]').forEach(e=>e.addEventListener('click',()=>{$('mass').value=1;$('stiffness').value=4;$('damping').value=e.dataset.damping;update();}));update();
})();