// Small procedural mesh shared by the flagship character's WebGL renderer.
export function sphereMesh(latitudes=18,longitudes=24){
  const positions=[],indices=[];
  for(let i=0;i<=latitudes;i++){
    const theta=i*Math.PI/latitudes;
    for(let j=0;j<=longitudes;j++){
      const phi=j*2*Math.PI/longitudes;
      positions.push(Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi));
    }
  }
  for(let i=0;i<latitudes;i++)for(let j=0;j<longitudes;j++){
    const a=i*(longitudes+1)+j,b=a+longitudes+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  return {positions:new Float32Array(positions),indices:new Uint16Array(indices)};
}
export function mascotRgb(hex){
  const value=/^#[0-9a-f]{6}$/i.test(hex)?hex:'#f59e0b';
  return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255);
}
export function foxPose(time,behavior='wave',reduced=false){
  const t=reduced?0:Math.max(0,Math.min(15,Number.isFinite(time)?time:0));
  const gait=['run-wave','walk-wave','patrol'].includes(behavior)&&t<2.35;
  const step=gait?Math.sin(t*15):0;
  return {yaw:reduced?0:Math.sin(t*.9)*.24,breath:reduced?0:Math.sin(t*2.2)*.035,step,
    wave:reduced?0:gait?step*.18:Math.sin(t*6.8)*.23,tail:reduced?0:Math.sin(t*3)*.15};
}
