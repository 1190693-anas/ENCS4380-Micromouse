const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
require('./dynamics.js');require('./rk4.js');
function error(r,z,w){return r.x.reduce((a,x,i)=>Math.max(a,Math.abs(x-Dynamics.response(r.t[i],z,w).x)),0);}
for(const m of [.2,1,5])for(const b of [.2,2,4,6,12])for(const k of [.5,4,12]){
 const s=Dynamics.second(m,b,k),r=RK4.solve(m,b,k,s.t.at(-1),.2);
 assert.ok(r.x.every(Number.isFinite));assert.ok(error(r,s.z,s.w)<.002);
}
const coarse=error(RK4.solve(1,2,4,9,.05),.5,2),fine=error(RK4.solve(1,2,4,9,.025),.5,2);
assert.ok(coarse/fine>12&&coarse/fine<20);console.log('RK4: 45 parameter combinations pass; halving step reduces error by',coarse/fine);
for(const kind of ['first-step','first-sine','second']){
 const nodes={};const get=id=>nodes[id]??={value:'',textContent:'',hidden:false,disabled:false,addEventListener(){}};
 const math=Object.create(Math);let calls=0;math.random=()=>{calls++;if(calls===1)return kind==='second'?.9:.1;if(calls===2&&kind!=='second')return kind==='first-sine'?.1:.9;return .5;};
 const ctx={Math:math,console,document:{getElementById:get,querySelector:get},Plotly:{newPlot(id,data,layout){Object.assign(get(id),{data,layout});},react(id,data,layout){Object.assign(get(id),{data,layout});}}};ctx.window=ctx;vm.createContext(ctx);
 for(const p of ['physics.js','dynamics.js','guess.js'])vm.runInContext(fs.readFileSync(p,'utf8'),ctx);
 vm.runInContext('checkGuess()',ctx);assert.match(get('guessResult').textContent,/positive/);assert.equal(vm.runInContext('totalGuesses',ctx),0);
 const s=vm.runInContext('hiddenSensor',ctx),first=s.type==='first';
 assert.equal(s.mode,kind==='first-sine'?'sine':'step');
 get(first?'gainGuess':'zetaGuess').value=first?s.K:s.zeta;get(first?'tauGuess':'omegaGuess').value=first?s.tau:s.omega;
 vm.runInContext('checkGuess();checkGuess();showHint()',ctx);
 assert.equal(vm.runInContext('correctGuesses',ctx),1);assert.equal(vm.runInContext('totalGuesses',ctx),1);
 assert.match(get('guessResult').textContent,/True/);assert.ok(get('sensorPlot').data.some(t=>t.name==='True response'));assert.ok(get('checkGuess').disabled);
 vm.runInContext('startChallenge()',ctx);assert.equal(get('guessResult').textContent,'');assert.equal(get('checkGuess').disabled,false);assert.equal(vm.runInContext('totalGuesses',ctx),1);
 const nextFirst=vm.runInContext('hiddenSensor.type',ctx)==='first';get(nextFirst?'gainGuess':'zetaGuess').value=100;get(nextFirst?'tauGuess':'omegaGuess').value=100;
 vm.runInContext('checkGuess()',ctx);assert.match(get('guessResult').textContent,/Outside/);assert.equal(vm.runInContext('correctGuesses',ctx),1);
 console.log('Challenge passes:',kind,'invalid inputs, reveal, score lock, reset and incorrect guess');
}
