const assert=require('node:assert/strict');
require('./dynamics.js');const D=globalThis.Dynamics;
const close=(a,b,t)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
close(D.frequency(.2,2).M,.93,.005);close(-D.frequency(.2,2).phase*180/Math.PI,21.8,.1);
const tau=Math.sqrt(1/.95**2-1)/(200*Math.PI);
close(tau*1000,.52,.005);close(-D.frequency(tau,100*Math.PI).phase*180/Math.PI,9.3,.1);
const under=D.second(1,2,4),critical=D.second(1,4,4),over=D.second(1,6,4);
// Curve markers must agree with the continuous closed-form response.
for(const s of [under,critical,over]){
 close(D.response(s.riseStart,s.z,s.w).x,.1,1e-4);
 close(D.response(s.riseEnd,s.z,s.w).x,.9,1e-4);
 close(s.rise,s.riseEnd-s.riseStart,1e-12);
 const firstSettled=s.t.findIndex(t=>t===s.settling);
 assert.ok(firstSettled>0);
 assert.ok(Math.abs(s.x[firstSettled-1]-1)>.02);
 assert.ok(s.x.slice(firstSettled).every(x=>Math.abs(x-1)<=.02));
}
close(under.peakTime,Math.PI/Math.sqrt(3),.01);
close(under.peakValue,1+Math.exp(-Math.PI/Math.sqrt(3)),1e-4);
close(under.overshoot,16.3,.1);close(critical.overshoot,0,.001);
close(under.poles.re[0],-1,1e-10);close(under.poles.im[0],Math.sqrt(3),1e-10);
for(const b of [2,4,6]){const s=D.second(1,b,4);close(s.x[0],0,1e-10);close(s.v[0],0,1e-10);close(s.x.at(-1),1,.002);assert.ok(s.rise>0&&s.settling>0);for(const t of [.1,.5,1,2]){const h=1e-5,a=D.response(t-h,b/4,2),c=D.response(t+h,b/4,2),r=D.response(t,b/4,2);close((c.x-a.x)/(2*h),r.v,1e-7);close((c.v-a.v)/(2*h)+b*r.v+4*r.x,4,1e-6);}}
assert.ok(over.x.every((x,i)=>i===0||x>=over.x[i-1]));
for(const m of [.2,5])for(const b of [.2,12])for(const k of [.5,12]){const s=D.second(m,b,k);assert.ok(s.x.every(Number.isFinite));close(s.x.at(-1),1,.002);}
console.log('PASS: homework reference values, derivatives, governing ODE, damping cases, and slider extremes.');
