/* Classical fourth-order Runge-Kutta, independently integrating x'=v,
   v'=(F-b*v-k*x)/m, F=k and x(0)=v(0)=0. */
(function(g){
'use strict';
function rk4(m,b,k,end,requestedStep){
 if(![m,b,k,end,requestedStep].every(x=>Number.isFinite(x)&&x>0))throw Error('RK4 parameters must be positive and finite.');
 // Resolve both fast and slow modes, including stiff overdamped settings.
 const rate=b/m+Math.sqrt(k/m),limit=.25/rate;
 const n=Math.ceil(end/Math.min(requestedStep,limit));
 if(n>200000)throw Error('Too many integration steps; use a shorter duration.');
 const h=end/n,t=[0],x=[0],v=[0];
 const f=(q,u)=>[u,(k-b*u-k*q)/m];
 for(let i=0;i<n;i++){
  const q=x[i],u=v[i],a=f(q,u),c=f(q+h*a[0]/2,u+h*a[1]/2),d=f(q+h*c[0]/2,u+h*c[1]/2),e=f(q+h*d[0],u+h*d[1]);
  x.push(q+h*(a[0]+2*c[0]+2*d[0]+e[0])/6);
  v.push(u+h*(a[1]+2*c[1]+2*d[1]+e[1])/6);t.push((i+1)*h);
 }
 return {t,x,v,h,n,limited:requestedStep>limit};
}
g.RK4={solve:rk4};
})(typeof window==='undefined'?globalThis:window);

