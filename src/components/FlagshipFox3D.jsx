import React,{useEffect,useRef,useState} from 'react';
import {sphereMesh,mascotRgb,premiumMascotPose,premiumMascotBlink,PREMIUM_MASCOT_MOTION_SECONDS,mascotLimb} from '../utils/mascot3DGeometry.js';
import {drawMascot3DModel,drawPremiumMascotEye} from '../utils/mascot3DModels.js';
import {mascotLighting} from '../utils/mascot3DLighting.js';

// Actual depth-tested geometry, with no external scripts, downloads, or dependencies.
const vertex=`
attribute vec3 p;
uniform vec3 center,scale;
uniform float tilt,yaw,aspect,rootLean,rootLift;
varying vec3 normal,local,worldPos;
vec3 rz(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x-s*v.y,s*v.x+c*v.y,v.z);}
vec3 ry(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
void main(){
  vec3 world=ry(rz(rz(p*scale,tilt)+center,rootLean),yaw)+vec3(0.,rootLift,0.);
  normal=normalize(ry(rz(rz(p/scale,tilt),rootLean),yaw));
  local=p;
  worldPos=world;
  float w=7.0-world.z;
  gl_Position=vec4(world.x*3.15/aspect,(world.y-.12)*3.15,1.01005*w-.201005,w);
}`;
const fragment=`
precision mediump float;
uniform vec3 tint,keyColor,fillColor,rimColor,lightStrength;
uniform float gloss,fur,ambient,feather;
varying vec3 normal,local,worldPos;
void main(){
  vec3 n=normalize(normal);
  vec3 key=normalize(vec3(-.55,.85,1.0));
  vec3 fill=normalize(vec3(.75,.25,.65));
  vec3 rim=normalize(vec3(.85,.42,-.72));
  vec3 view=normalize(vec3(0.,0.,7.)-worldPos);
  float diffuse=max(dot(n,key),0.0);
  float softFill=max(dot(n,fill),0.0);
  float rimLight=max(dot(n,rim),0.0)*pow(1.0-max(dot(n,view),0.0),1.6);
  float spec=pow(max(dot(n,normalize(key+view)),0.0),mix(12.0,52.0,clamp(gloss,0.0,1.0)));
  float fresnel=pow(1.0-max(dot(n,view),0.0),4.0);
  // Broad irregular coat shading plus fine directional strands; no texture assets.
  float coat=sin(local.x*11.0+sin(local.y*7.0)*1.8)*sin(local.z*13.0-local.y*5.0);
  float strands=sin(local.x*41.0+sin(local.y*15.0)*2.3)*sin(local.z*37.0+local.y*12.0);
  float featherBands=sin(local.y*25.0+abs(local.x)*8.0);
  float surface=(mix(strands,featherBands,feather)*.025+coat*.024)*fur;
  float occlusion=mix(.72,1.0,smoothstep(-1.0,.65,local.y));
  vec3 base=max(tint,vec3(.008));
  vec3 illumination=vec3(ambient)+keyColor*diffuse*lightStrength.x+fillColor*softFill*lightStrength.y+rimColor*rimLight*lightStrength.z;
  vec3 rgb=base*illumination*occlusion+base*surface+keyColor*spec*gloss*.24+rimColor*fresnel*(.035*gloss+.022*fur);
  // Gentle tone curve keeps pale fur from clipping and dark materials legible.
  rgb=pow(clamp(rgb,0.0,1.0),vec3(.88));
  gl_FragColor=vec4(rgb,1.0);
}`;
function compile(gl,type,source){
  const shader=gl.createShader(type);
  if(!shader)throw Error('shader unavailable');
  gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('shader compile failed');}
  return shader;
}
export default function FlagshipFox3D({characterId='fox',color,emotion='happy',behavior='wave',season='none',lighting='studio',fallback}){
  const canvas=useRef(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const node=canvas.current;
    if(!node)return;
    setReady(false);
    let gl,program,vert,frag,positions,indices,frame=0,stopped=false;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const cleanup=()=>{
      if(stopped)return;
      stopped=true;cancelAnimationFrame(frame);
      if(gl){if(positions)gl.deleteBuffer(positions);if(indices)gl.deleteBuffer(indices);if(program)gl.deleteProgram(program);if(vert)gl.deleteShader(vert);if(frag)gl.deleteShader(frag);}
    };
    const lost=e=>{e.preventDefault();cleanup();setReady(false);};
    const fail=()=>{cleanup();setReady(false);};
    node.addEventListener('webglcontextlost',lost);
    try{
      gl=node.getContext('webgl',{alpha:true,antialias:true,depth:true,premultipliedAlpha:true,powerPreference:'low-power',failIfMajorPerformanceCaveat:true});
      if(!gl)throw Error('WebGL unavailable');
      vert=compile(gl,gl.VERTEX_SHADER,vertex);frag=compile(gl,gl.FRAGMENT_SHADER,fragment);
      program=gl.createProgram();if(!program)throw Error('program unavailable');
      gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link failed');
      const mesh=sphereMesh();
      positions=gl.createBuffer();indices=gl.createBuffer();
      if(!positions||!indices)throw Error('buffer unavailable');
      gl.bindBuffer(gl.ARRAY_BUFFER,positions);gl.bufferData(gl.ARRAY_BUFFER,mesh.positions,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
      gl.useProgram(program);
      const pos=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,0,0);
      const names=['center','scale','tilt','yaw','aspect','tint','gloss','fur','rootLean','rootLift','keyColor','fillColor','rimColor','lightStrength','ambient','feather'];
      const loc=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
      gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
      const lights=mascotLighting(lighting);
      gl.uniform3fv(loc.keyColor,lights.key);gl.uniform3fv(loc.fillColor,lights.fill);gl.uniform3fv(loc.rimColor,lights.rim);gl.uniform3fv(loc.lightStrength,lights.strength);gl.uniform1f(loc.ambient,lights.ambient);gl.uniform1f(loc.feather,characterId==='owl'?1:0);
      const base=mascotRgb(color),cream=[.97,.90,.76],dark=[.19,.11,.09],pink=[.82,.49,.43],white=[.99,.98,.91],iris=[.38,.20,.08],black=[.055,.04,.035];
      const draw=(center,scale,tint,tilt=0,gloss=.1,fur=1)=>{
        gl.uniform3fv(loc.center,center);gl.uniform3fv(loc.scale,scale);gl.uniform3fv(loc.tint,tint);
        gl.uniform1f(loc.tilt,tilt);gl.uniform1f(loc.gloss,gloss);gl.uniform1f(loc.fur,fur);
        gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_SHORT,0);
      };
      let start=null,last=-Infinity,firstFrame=true;
      const render=now=>{
        if(stopped)return;
        try{
          if(start===null)start=now;
          const elapsed=(now-start)/1000;
          if(now-last>=32||last===-Infinity||elapsed>=PREMIUM_MASCOT_MOTION_SECONDS){
            last=now;
            const dpr=Math.min(1.6,window.devicePixelRatio||1);
            const width=Math.min(256,Math.max(64,Math.round(node.clientWidth*dpr))),height=Math.round(width*1.13);
            if(node.width!==width||node.height!==height){node.width=width;node.height=height;}
            gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
            const pose=premiumMascotPose(characterId,elapsed,behavior,motion.matches);
            gl.uniform1f(loc.aspect,width/height);gl.uniform1f(loc.yaw,pose.yaw);gl.uniform1f(loc.rootLean,pose.lean);gl.uniform1f(loc.rootLift,pose.lift);
            if(characterId!=='fox')drawMascot3DModel(characterId,draw,base,pose,{emotion,blink:premiumMascotBlink(elapsed,motion.matches),season});
            else{
            // Tail, feet, trunk and limbs are independently posed ellipsoid meshes.
            draw([-.74,-.48,-.35],[.29,.78,.32],base,-.85+pose.tail);
            draw([-1.05,-.12,-.35],[.27,.35,.30],cream,-.85+pose.tail);
            for(const sign of [-1,1]){
              draw([sign*.30,-1.12+sign*pose.step*.09,.05],[.25,.29,.34],dark,sign*pose.step*.18);
            }
            draw([0,-.47+pose.breath,0],[.49,.69,.39],base);
            draw([0,-.07+pose.breath,.015],[.36,.30,.33],base,0,.07,1);
            draw([0,-.55,.29],[.36,.49,.20],cream);
            const left=mascotLimb([-.43,-.12,.07],.72,-.26-pose.step*.25),right=mascotLimb([.43,-.12,.07],.72,1.87+pose.wave);
            draw(left.center,[.18,.45,.19],base,left.tilt);
            draw(left.tip,[.18,.17,.18],cream,left.tilt);
            draw(right.center,[.18,.45,.19],base,right.tilt);
            draw(right.tip,[.18,.19,.18],cream,right.tilt);
            // Distinct pointed ears and a projecting muzzle, not a flat picture.
            for(const sign of [-1,1]){
              draw([sign*.48,1.32,-.06],[.23,.52,.21],base,-sign*.35);
              draw([sign*.48,1.40,.08],[.13,.34,.12],pink,-sign*.35);
            }
            draw([0,.56+pose.breath*.4,0],[.71,.62,.57],base);
            draw([-.29,.27,.43],[.34,.23,.28],cream,-.17,.07,1);
            draw([.29,.27,.43],[.34,.23,.28],cream,.17,.07,1);
            draw([0,.24,.67],[.27,.18,.29],cream,0,.07,1);
            draw([0,.28,.91],[.13,.078,.095],black,0,.46,0);
            draw([0,.06,.70],[.14,.055,.09],dark,0,.1,0);
            for(const sign of [-1,1]){
              const wink=emotion==='wink'&&sign===1;
              const blink=premiumMascotBlink(elapsed,motion.matches);
              drawPremiumMascotEye(draw,{x:sign*.30,y:.62,z:.49,radius:.165,opening:emotion==='surprise'?1.32:1,tilt:-sign*.10,coat:base,iris,closed:wink||blink});
            }
            if(season==='winter')draw([0,-.02,.06],[.52,.13,.42],[.65,.05,.12],0,.1,0);
            }
            if(gl.getError()!==gl.NO_ERROR)throw Error('draw failed');
            if(firstFrame){firstFrame=false;setReady(true);}
          }
          if(!motion.matches&&elapsed<PREMIUM_MASCOT_MOTION_SECONDS)frame=requestAnimationFrame(render);
        }catch{fail();}
      };
      frame=requestAnimationFrame(render);
    }catch{fail();}
    return()=>{node.removeEventListener('webglcontextlost',lost);cleanup();};
  },[characterId,color,emotion,behavior,season,lighting]);
  return <div className="gs-character-3d" data-character-3d={ready?'ready':'fallback'} data-character-3d-model={characterId}>
    {!ready&&fallback}
    <canvas ref={canvas} aria-hidden="true" className="gs-character-3d-canvas" style={{visibility:ready?'visible':'hidden'}}/>
  </div>;
}
