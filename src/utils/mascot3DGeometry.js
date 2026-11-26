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
// Character-specific gait and gesture envelopes. All motion is finite and deterministic.
const profiles={
 fox:[1,.85,1,1],panda:[.66,.68,.65,.65],rabbit:[1.28,1.3,1.1,.9],
 robot:[.87,.62,1.15,0],cat:[.82,.8,.7,1.3],monkey:[1.15,1.2,1.3,1.2],
 bear:[.59,.60,.6,.5],owl:[.72,.65,1.4,0],cheetah:[1.45,1.25,1,1.4]
};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const smooth=t=>{const x=clamp(t,0,1);return x*x*(3-2*x);};
export function mascotPose(id,time,behavior='wave',reduced=false){
 const zero={yaw:0,breath:0,step:0,wave:0,tail:0,lift:0,lean:0,ear:0,wing:0,head:0};
 if(reduced||behavior==='still')return zero;
 const t=clamp(Number.isFinite(time)?time:0,0,15);
 const [pace,stride,gesture,tailRange]=Object.hasOwn(profiles,id)?profiles[id]:profiles.fox;
 const travel={'run-wave':1.44,'walk-wave':2.32,patrol:2.65,sneak:1.4}[behavior]||0;
 const gait=travel>0&&t<travel;
 const envelope=gait?smooth(t/.18)*smooth((travel-t)/.24):0;
 const phase=t*(behavior==='walk-wave'?9:behavior==='sneak'?7:15)*pace;
 const step=envelope>0?Math.sin(phase)*stride*envelope:0;
 const after=Math.max(0,t-travel);
 const greeting=smooth(after/.22)*(1-smooth((after-2.05)/.38));
 const pulse=Math.sin(t*7);
 const breath=id==='robot'?0:Math.sin(t*2.1)*.025;
 const result={...zero,step,breath,tail:Math.sin(t*3*pace)*.13*tailRange,head:Math.sin(t*1.8)*.04};
 if(gait){result.lean=.10*envelope;result.yaw=.19*envelope;result.wave=step*.19;result.lift=Math.abs(step)*.07;}
 else{
   result.wave=Math.sin(after*6.4)*.25*gesture*greeting;
   result.yaw=Math.sin(t*.85)*.13;
 }
 switch(behavior){
   case 'jump':result.lift=Math.max(0,pulse)*.16;result.wave=.30*pulse*gesture;break;
   case 'celebrate':result.lift=Math.max(0,Math.sin(t*8))*.13;result.wave=.44*pulse*gesture;break;
   case 'dance':result.lean=Math.sin(t*6)*.14;result.yaw=Math.sin(t*3)*.24;result.wave=.34*pulse*gesture;break;
   case 'bow':result.lean=.17*Math.sin(t*3)**2;result.head=.18*Math.sin(t*3)**2;result.wave=0;break;
   case 'look-around':result.yaw=Math.sin(t*2.5)*.42;result.head=Math.sin(t*2)*.09;result.wave=0;break;
   case 'point':result.wave=.52*smooth(t/.3)*(1-smooth((t-2.1)/.4));result.yaw=-.18;break;
   case 'peek':result.yaw=.26*(1-smooth(t/.9));result.lean=-.12*(1-smooth(t/.9));result.wave=0;break;
   case 'slide':result.wave=0;result.lean=.07*(1-smooth(t));break;
 }
 if(id==='rabbit'){result.lift+=Math.abs(step)*.07;result.ear=Math.sin(t*8)*.16*(.3+envelope);}
 if(id==='cat')result.ear=Math.sin(t*3)*.07;
 if(id==='owl'){result.wing=(gait?Math.abs(step)*.24:Math.sin(after*5)*.22*greeting);result.head+=Math.sin(t*2.4)*.055;}
 if(id==='robot'){result.yaw=Math.round(result.yaw*12)/12;result.wave=Math.round(result.wave*16)/16;result.head=0;}
 if(id==='bear'||id==='panda')result.lean*=.65;
 if(id==='monkey')result.tail*=1.2;
 if(id==='cheetah')result.lean+=.07*envelope;
 result.lift=clamp(result.lift,0,.20);
 return result;
}
export function foxPose(time,behavior='wave',reduced=false){return mascotPose('fox',time,behavior,reduced);}
// A limb pivots around its actual shoulder; the paw follows the limb rather than floating.
export function mascotLimb(anchor,length,angle){
 const delta=[Math.sin(angle)*length,-Math.cos(angle)*length,0];
 return {center:anchor.map((v,i)=>v+delta[i]*.5),tip:anchor.map((v,i)=>v+delta[i]),tilt:angle};
}

// A calmer presentation envelope preserves the authored gesture and species gait,
// but ends in a relaxed pose. Keep the original pose API for existing consumers.
export const PREMIUM_MASCOT_MOTION_SECONDS=8;
export function premiumMascotPose(id,time,behavior='wave',reduced=false){
 const t=clamp(Number.isFinite(time)?time:0,0,PREMIUM_MASCOT_MOTION_SECONDS);
 const p=mascotPose(id,t,behavior,reduced);
 const fade=1-smooth((t-5.5)/2.5);
 const gesture=1-smooth((t-2.8)/1.8);
 return {...p,yaw:p.yaw*.58*fade,breath:p.breath*.72*fade,
   step:p.step*.65*gesture,wave:p.wave*.68*gesture,tail:p.tail*.60*fade,
   lift:p.lift*.32*gesture,lean:p.lean*.48*gesture,ear:p.ear*.55*fade,
   wing:p.wing*.65*gesture,head:p.head*.68*fade};
}
export function premiumMascotBlink(time,reduced=false){
 if(reduced||!Number.isFinite(time)||time<0||time>=PREMIUM_MASCOT_MOTION_SECONDS)return false;
 return (time>=2.35&&time<2.47)||(time>=5.12&&time<5.24);
}
