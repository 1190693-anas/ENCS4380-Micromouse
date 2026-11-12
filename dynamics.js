/* Closed-form models: normalized unit step, zero initial conditions. */
(function(g){
'use strict';
function frequency(tau,w){return {M:1/Math.hypot(1,w*tau),phase:-Math.atan(w*tau)};}
function response(t,z,w){
 if(z<1){const a=Math.sqrt(1-z*z),d=w*a;return {x:1-Math.exp(-z*w*t)*(Math.cos(d*t)+z/a*Math.sin(d*t)),v:w/a*Math.exp(-z*w*t)*Math.sin(d*t)};}
 if(z===1)return {x:1-(1+w*t)*Math.exp(-w*t),v:w*w*t*Math.exp(-w*t)};
 const a=Math.sqrt(z*z-1),r1=-w/(z+a),r2=-w*(z+a),e1=Math.exp(r1*t),e2=Math.exp(r2*t);
 return {x:1+(r2*e1-r1*e2)/(r1-r2),v:r1*r2*(e1-e2)/(r1-r2)};
}
function second(m,b,k){
 const w=Math.sqrt(k/m),z=b/(2*Math.sqrt(k*m));
 const decay=z<=1?z*w:w/(z+Math.sqrt(z*z-1));
 const end=Math.max(12/w,9/decay),n=Math.max(1800,Math.ceil(end*w*50));
 const t=[],x=[],v=[];
 for(let i=0;i<=n;i++){const time=end*i/n,r=response(time,z,w);t.push(time);x.push(r.x);v.push(r.v);}
 function crossing(level){for(let i=1;i<x.length;i++)if(x[i]>=level)return t[i-1]+(level-x[i-1])/(x[i]-x[i-1])*(t[i]-t[i-1]);return NaN;}
 let last=-1;for(let i=0;i<x.length;i++)if(Math.abs(x[i]-1)>.02)last=i;
 let peak=0;for(let i=1;i<x.length;i++)if(x[i]>x[peak])peak=i;
 const poles=z<1?{re:[-z*w,-z*w],im:[w*Math.sqrt(1-z*z),-w*Math.sqrt(1-z*z)]}:{re:[-w/(z+Math.sqrt(z*z-1)),-w*(z+Math.sqrt(z*z-1))],im:[0,0]};
 const riseStart=crossing(.1),riseEnd=crossing(.9);
 return {w,z,t,x,v,poles,riseStart,riseEnd,rise:riseEnd-riseStart,peakValue:x[peak],peakTime:z<1?t[peak]:null,overshoot:Math.max(0,(x[peak]-1)*100),settling:last+1<t.length?t[last+1]:null};
}
g.Dynamics={frequency,response,second};
})(typeof window==='undefined'?globalThis:window);
