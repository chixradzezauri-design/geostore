import {mascotLimb} from './mascot3DGeometry.js';
// Eight additional original procedural models, sharing the bounded sphere mesh.
// Each part has a real position, scale, orientation and material in three dimensions.
export const MASCOT_3D_IDS=Object.freeze(['fox','panda','rabbit','robot','cat','monkey','bear','owl','cheetah','santa','snowman','deal']);
// Sculpted eye layers: subtle socket, organic lids, iris and a restrained catchlight.
// All pieces are opaque depth-tested geometry; no texture downloads or new meshes.
export function drawPremiumMascotEye(draw,{x,y,z,radius=.17,opening=1,tilt=0,coat=[.56,.34,.20],iris=[.29,.15,.065],closed=false}){
  const shadow=coat.map(v=>Math.max(.035,v*.60));
  const height=radius*.76*opening;
  if(closed){
    draw([x,y,z],[radius,.026,.064],shadow,tilt,.08,0);
    return;
  }
  draw([x,y,z-.023],[radius*1.12,height*1.22,.078],shadow,tilt,.07,.5);
  draw([x,y,z+.018],[radius,height,.090],[.96,.95,.90],tilt,.17,0);
  draw([x,y,z+.091],[radius*.65,height*.84,.050],iris,0,.28,0);
  draw([x,y,z+.129],[radius*.35,height*.58,.030],[.035,.028,.025],0,.42,0);
  draw([x-radius*.19,y+height*.34,z+.153],[radius*.135,radius*.135,.013],[1,.99,.96],0,.5,0);
  draw([x,y+height*.88,z+.048],[radius*.94,.034,.053],coat,tilt,.07,.7);
}
export function drawMascot3DModel(id,draw,base,pose,{emotion='happy',blink=false,season='none'}={}){
  const ivory=[.96,.91,.81],black=[.09,.08,.09],pink=[.83,.48,.44],gold=[.94,.66,.19],white=[.99,.98,.95],iris=[.29,.15,.065],metal=[.29,.35,.43],cyan=[.19,.87,.98];
  const santa=id==='santa',snow=id==='snowman',deal=id==='deal';
  const robot=id==='robot'||deal,owl=id==='owl',panda=id==='panda',rabbit=id==='rabbit',cat=id==='cat',monkey=id==='monkey',bear=id==='bear'||santa||snow,cheetah=id==='cheetah';
  const body=panda?ivory:base,limb=panda?black:robot?metal:base;
  const broad=bear||panda?.60:cheetah||monkey?.40:.49;
  const material=robot?.75:.12,fur=robot?0:1;
  const part=(c,s,color=body,tilt=0,gloss=material,texture=fur)=>draw(c,s,color,tilt,gloss,texture);
  const {step=0,wave=0,tail=0,breath=0,ear=0,wing=0,head=0}=pose;
  if(cat||monkey||cheetah){
    part([-.62,-.65,-.30],[.15,.56,.16],base,-.70+tail);
    part([-.92,-.28,-.32],[.13,.31,.14],cheetah?black:base,-.25+tail);
  }
  if(rabbit)part([.46,-.77,-.32],[.26,.25,.26],ivory);
  for(const sign of [-1,1]){
    part([sign*.31,-1.13+sign*step*.10,.08],[rabbit?.30:.23,.25,.32],limb,sign*step*.15);
    if(!robot&&!owl)for(const toe of [-1,0,1])part([sign*.31+toe*.12,-1.22+sign*step*.10,.34],[.065,.055,.07],panda?metal:ivory,0,.08,0);
  }
  part([0,-.45+breath,0],[broad,.69,.40],body);
  if(!robot&&!snow)part([0,-.04+breath,.015],[broad*.76,.29,.34],body,0,.08,fur);
  if(robot){
    part([0,-.45,.35],[.34,.38,.10],metal,0,.75,0);
    part([0,-.41,.45],[.19,.11,.04],cyan,0,.9,0);
    for(const sign of [-1,1])part([sign*.29,-.72,.33],[.065,.065,.055],gold,0,.85,0);
  }else{
    part([0,-.55,.30],[broad*.65,.46,.20],owl?ivory:panda?ivory:ivory);
    if(owl)for(let row=0;row<3;row++)for(const sign of [-1,1])part([sign*.13,-.38-row*.16,.48],[.10,.095,.04],base,sign*.25,.08,1);
  }
  if(owl){
    const left=mascotLimb([-.40,-.06,.02],.86,-.42-wing-step*.15),right=mascotLimb([.40,-.06,.02],.86,1.75+wave+wing);
    part(left.center,[.22,.53,.20],base,left.tilt);
    part(right.center,[.24,.52,.20],base,right.tilt);
    for(let i=0;i<3;i++)part([right.tip[0]-.06*i,right.tip[1]-.04*i,.06],[.09,.25,.08],base,right.tilt+i*.08);
  }else{
    const armLength=monkey?.82:bear?.65:.70;
    const left=mascotLimb([-.42,-.13,.07],armLength,-.30-step*.26),right=mascotLimb([.42,-.13,.07],armLength,1.87+wave);
    part(left.center,[.17,armLength*.62,.18],limb,left.tilt);
    part(left.tip,[.16,.17,.17],limb,left.tilt);
    part(right.center,[.17,armLength*.62,.19],limb,right.tilt);
    part(right.tip,[.17,.19,.17],limb,right.tilt);
    if(robot)for(const sign of [-1,1])part([sign*.55,-.39,.02],[.20,.16,.20],cyan,0,.8,0);
  }
  if((panda||bear||monkey||cheetah)&&!santa&&!snow){
    for(const sign of [-1,1]){
      const ey=monkey?.72:1.10,ex=monkey?.77:.60,r=cheetah?.20:monkey?.26:.28;
      part([sign*ex,ey,-.08],[r,r,r*.75],panda?black:base);
      part([sign*ex,ey,.10],[r*.60,r*.60,.08],panda?metal:pink);
    }
  }
  if(rabbit)for(const sign of [-1,1]){
    part([sign*.31,1.40,-.08],[.18,.61,.18],base,-sign*.13+ear);
    part([sign*.31,1.45,.06],[.09,.45,.08],pink,-sign*.13+ear);
  }
  if(cat||owl)for(const sign of [-1,1]){
    part([sign*.49,1.17,-.07],[.20,.42,.18],base,-sign*.36);
    if(cat)part([sign*.50,1.24,.07],[.10,.24,.09],pink,-sign*.36);
  }
  if(robot){
    part([0,1.19,0],[.065,.29,.065],metal,0,.9,0);
    part([0,1.46,0],[.13,.13,.13],gold,0,.9,0);
    for(const sign of [-1,1])part([sign*.77,.57,0],[.19,.30,.24],metal,0,.85,0);
  }
  const hy=.56+breath*.4-head*.12,headX=bear?.74:monkey?.66:owl?.75:robot?.75:.69;
  part([0,hy,0],[headX,owl||robot?.65:.62,.57],body);
  if(robot){
    part([0,hy,.35],[.65,.47,.30],black,0,.9,0);
    for(const sign of [-1,1]){
      const closed=blink||(emotion==='wink'&&sign===1);
      part([sign*.29,hy+.06,.62],[.15,closed?.035:.17,.07],cyan,0,.9,0);
      if(!closed)part([sign*.29-.03,hy+.11,.68],[.045,.045,.025],white,0,.9,0);
    }
    part([0,hy-.24,.59],[.20,.045,.07],cyan,0,.85,0);
  }else{
    if(panda||owl||monkey)for(const sign of [-1,1])part([sign*.30,hy+.04,.39],[owl?.31:.26,owl?.35:.30,.20],panda?black:ivory,-sign*.12);
    if(!owl){
      const muzzleWidth=cat?.22:cheetah?.23:bear?.28:.25;
      const muzzleDepth=cheetah?.28:bear?.25:.23;
      part([-.19,hy-.28,.45],[muzzleWidth,.19,muzzleDepth],ivory,-.10,.07,1);
      part([.19,hy-.28,.45],[muzzleWidth,.19,muzzleDepth],ivory,.10,.07,1);
      part([0,hy-.27,cheetah?.72:.67],[cat?.10:.13,.078,.095],cat?pink:black,0,.46,0);
      part([0,hy-.44,.57],[.13,.04,.08],black,0,.1,0);
      if(rabbit)for(const sign of [-1,1])part([sign*.045,hy-.44,.65],[.045,.09,.04],white,0,.3,0);
    }else part([0,hy-.19,.66],[.11,.16,.14],gold,.12,.55,0);
    for(const sign of [-1,1]){
      const closed=blink||(emotion==='wink'&&sign===1),radius=owl?.22:cat||cheetah?.145:.155;
      drawPremiumMascotEye(draw,{x:sign*.29,y:hy+.08,z:.55,radius,opening:emotion==='surprise'?1.35:owl?1.16:1,tilt:cat||cheetah?-sign*.10:0,coat:panda?black:owl?ivory:body,iris:owl?gold:iris,closed});
    }
    if(cheetah){
      for(const sign of [-1,1]){
        for(const [x,y,z,r] of [[.49,.91,.35,.065],[.60,.69,.35,.055],[.35,1.02,.38,.045],[.56,.43,.37,.06],[.24,.97,.46,.045]])part([sign*x,y,z],[r,r,.035],black,0,.06,0);
        part([sign*.43,hy-.14,.57],[.065,.16,.035],black,-sign*.27,.08,0);
      }
    }
    if(cat)for(const sign of [-1,1])for(let i=0;i<3;i++)part([sign*.47,hy-.28+i*.055,.48],[.15,.012,.02],ivory,sign*(i-1)*.20,.10,0);
    if(bear){part([-.16,-.15,.40],[.18,.10,.09],gold,.35,.4,0);part([.16,-.15,.40],[.18,.10,.09],gold,-.35,.4,0);part([0,-.15,.49],[.075,.075,.075],gold,0,.65,0);}
  }
  if(santa){
    const red=[.78,.07,.12];
    part([0,1.18,0],[.63,.15,.48],ivory);
    part([.09,1.43,-.01],[.48,.39,.40],red,.35);
    part([.48,1.58,.03],[.15,.15,.15],ivory);
    part([0,.14,.57],[.48,.35,.24],ivory);
    part([0,-.64,.34],[.55,.10,.14],black,0,.4,0);
    part([0,-.64,.49],[.12,.12,.055],gold,0,.8,0);
  }
  if(snow){
    part([0,1.14,0],[.65,.09,.48],black,0,.25,0);
    part([0,1.39,0],[.40,.33,.34],black,0,.25,0);
    part([0,1.20,.15],[.41,.09,.27],[.72,.06,.14]);
    part([0,.34,.82],[.08,.08,.20],[1,.47,.08],0,.15,0);
    for(const y of [-.34,-.61,-.85])part([0,y,.49],[.055,.055,.035],black,0,.45,0);
  }
  if(deal){
    part([.42,-.45,.52],[.26,.32,.06],gold,-.32,.65,0);
    part([.34,-.39,.59],[.055,.055,.027],black,0,.4,0);
    part([.52,-.53,.59],[.055,.055,.027],black,0,.4,0);
    part([.43,-.46,.59],[.035,.14,.025],black,-.65,.4,0);
  }
  if(season==='winter')part([0,-.02,.07],[.53,.13,.43],[.65,.05,.12],0,.1,0);
}
