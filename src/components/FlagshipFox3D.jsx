import React,{useEffect,useRef,useState} from 'react';
import {sphereMesh,mascotRgb,foxPose} from '../utils/mascot3DGeometry.js';

// Actual depth-tested geometry, with no external scripts, downloads, or dependencies.
const vertex=`
attribute vec3 p;
uniform vec3 center,scale;
uniform float tilt,yaw,aspect;
varying vec3 normal,local;
vec3 rz(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x-s*v.y,s*v.x+c*v.y,v.z);}
vec3 ry(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
void main(){
  vec3 world=ry(rz(p*scale,tilt)+center,yaw);
  normal=normalize(ry(rz(p/scale,tilt),yaw));
  local=p;
  float w=7.0-world.z;
  gl_Position=vec4(world.x*3.15/aspect,(world.y-.12)*3.15,1.01005*w-.201005,w);
}`;
const fragment=`
precision mediump float;
uniform vec3 tint;
uniform float gloss,fur;
varying vec3 normal,local;
void main(){
  vec3 n=normalize(normal);
  vec3 key=normalize(vec3(-.55,.85,1.0));
  vec3 rim=normalize(vec3(.9,.15,-.7));
  float light=max(dot(n,key),0.0);
  float edge=pow(max(0.0,1.0-n.z),2.0)*max(dot(n,rim),0.0);
  float shine=pow(max(dot(n,normalize(key+vec3(0.,0.,1.))),0.0),24.0)*gloss;
  float grain=sin(local.x*113.0+sin(local.y*75.0)*2.0)*sin(local.z*91.0+local.y*38.0);
  vec3 rgb=tint*(.48+.60*light+.13*edge+grain*.035*fur)+vec3(.18,.16,.13)*shine;
  gl_FragColor=vec4(clamp(rgb,0.0,1.0),1.0);
}`;
function compile(gl,type,source){
  const shader=gl.createShader(type);
  if(!shader)throw Error('shader unavailable');
  gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('shader compile failed');}
  return shader;
}
export default function FlagshipFox3D({color,emotion='happy',behavior='wave',season='none',fallback}){
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
      const names=['center','scale','tilt','yaw','aspect','tint','gloss','fur'];
      const loc=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)]));
      gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
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
          if(now-last>=32||last===-Infinity){
            last=now;
            const dpr=Math.min(1.6,window.devicePixelRatio||1);
            const width=Math.min(256,Math.max(64,Math.round(node.clientWidth*dpr))),height=Math.round(width*1.13);
            if(node.width!==width||node.height!==height){node.width=width;node.height=height;}
            gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
            const pose=foxPose(elapsed,behavior,motion.matches);
            gl.uniform1f(loc.aspect,width/height);gl.uniform1f(loc.yaw,pose.yaw);
            // Tail, feet, trunk and limbs are independently posed ellipsoid meshes.
            draw([-.74,-.48,-.35],[.29,.78,.32],base,-.85+pose.tail);
            draw([-1.05,-.12,-.35],[.27,.35,.30],cream,-.85+pose.tail);
            for(const sign of [-1,1]){
              draw([sign*.30,-1.12+sign*pose.step*.09,.05],[.25,.29,.34],dark,sign*pose.step*.18);
            }
            draw([0,-.47+pose.breath,0],[.54,.69,.39],base);
            draw([0,-.55,.29],[.36,.49,.20],cream);
            draw([-.54,-.48,.03],[.18,.46,.19],base,-.26-pose.step*.18);
            draw([-.66,-.82,.10],[.18,.17,.18],cream);
            draw([.60,-.16,.02],[.18,.46,.19],base,-.85-pose.wave);
            draw([.91,.15,.12],[.18,.19,.18],cream,-pose.wave);
            // Distinct pointed ears and a projecting muzzle, not a flat picture.
            for(const sign of [-1,1]){
              draw([sign*.48,1.32,-.06],[.23,.52,.21],base,-sign*.35);
              draw([sign*.48,1.40,.08],[.13,.34,.12],pink,-sign*.35);
            }
            draw([0,.56+pose.breath*.4,0],[.78,.67,.57],base);
            draw([-.32,.26,.42],[.39,.26,.29],cream,-.17);
            draw([.32,.26,.42],[.39,.26,.29],cream,.17);
            draw([0,.22,.66],[.34,.22,.25],cream);
            draw([0,.28,.88],[.15,.10,.10],black,0,.9,0);
            draw([0,.06,.70],[.14,.055,.09],dark,0,.1,0);
            for(const sign of [-1,1]){
              const wink=emotion==='wink'&&sign===1;
              const blink=!motion.matches&&elapsed%3.1>2.92;
              const ry=wink||blink?.025:emotion==='surprise'?.205:.17;
              draw([sign*.30,.62,.49],[.19,ry,.11],white,sign*.08,.25,0);
              if(!wink&&!blink){
                draw([sign*.30,.62,.59],[.115,.125,.07],iris,0,.45,0);
                draw([sign*.30,.62,.645],[.066,.086,.045],black,0,.8,0);
                draw([sign*.30-.035,.68,.68],[.028,.035,.018],white,0,.8,0);
              }
            }
            if(season==='winter')draw([0,-.02,.06],[.52,.13,.42],[.65,.05,.12],0,.1,0);
            if(gl.getError()!==gl.NO_ERROR)throw Error('draw failed');
            if(firstFrame){firstFrame=false;setReady(true);}
          }
          if(!motion.matches&&elapsed<15)frame=requestAnimationFrame(render);
        }catch{fail();}
      };
      frame=requestAnimationFrame(render);
    }catch{fail();}
    return()=>{node.removeEventListener('webglcontextlost',lost);cleanup();};
  },[color,emotion,behavior,season]);
  return <div className="gs-character-3d" data-character-3d={ready?'ready':'fallback'}>
    {!ready&&fallback}
    <canvas ref={canvas} aria-hidden="true" className="gs-character-3d-canvas" style={{visibility:ready?'visible':'hidden'}}/>
  </div>;
}
