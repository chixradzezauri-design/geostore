// Eight additional original procedural models, sharing the bounded sphere mesh.
// Each part has a real position, scale, orientation and material in three dimensions.
export const MASCOT_3D_IDS=Object.freeze(['fox','panda','rabbit','robot','cat','monkey','bear','owl','cheetah']);
export function drawMascot3DModel(id,draw,base,pose,{emotion='happy',blink=false,season='none'}={}){
  const ivory=[.96,.91,.81],black=[.09,.08,.09],pink=[.83,.48,.44],gold=[.94,.66,.19],white=[.99,.98,.95],iris=[.29,.15,.065],metal=[.29,.35,.43],cyan=[.19,.87,.98];
  const robot=id==='robot',owl=id==='owl',panda=id==='panda',rabbit=id==='rabbit',cat=id==='cat',monkey=id==='monkey',bear=id==='bear',cheetah=id==='cheetah';
  const body=panda?ivory:base,limb=panda?black:robot?metal:base;
  const broad=bear||panda?.65:cheetah||monkey?.43:.52;
  const material=robot?.75:.12,fur=robot?0:1;
  const part=(c,s,color=body,tilt=0,gloss=material,texture=fur)=>draw(c,s,color,tilt,gloss,texture);
  const {step=0,wave=0,tail=0,breath=0}=pose;
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
  if(robot){
    part([0,-.45,.35],[.34,.38,.10],metal,0,.75,0);
    part([0,-.41,.45],[.19,.11,.04],cyan,0,.9,0);
    for(const sign of [-1,1])part([sign*.29,-.72,.33],[.065,.065,.055],gold,0,.85,0);
  }else{
    part([0,-.55,.30],[broad*.65,.46,.20],owl?ivory:panda?ivory:ivory);
    if(owl)for(let row=0;row<3;row++)for(const sign of [-1,1])part([sign*.13,-.38-row*.16,.48],[.10,.095,.04],base,sign*.25,.08,1);
  }
  if(owl){
    part([-.50,-.42,.02],[.22,.53,.20],base,-.40-step*.15);
    part([.62,-.24,.02],[.24,.52,.20],base,-.92-wave);
    for(let i=0;i<3;i++)part([.78+i*.07,-.06+i*.055,.06],[.09,.25,.08],base,-.94-wave+i*.08);
  }else{
    part([-.53,-.45,0],[.17,.45,.18],limb,-.27-step*.20);
    part([-.65,-.79,.09],[.16,.17,.17],limb);
    part([.58,-.15,.01],[.17,.44,.19],limb,-.84-wave);
    part([.88,.15,.12],[.17,.19,.17],limb,-wave);
    if(robot)for(const sign of [-1,1])part([sign*.55,-.39,.02],[.20,.16,.20],cyan,0,.8,0);
  }
  if(panda||bear||monkey||cheetah){
    for(const sign of [-1,1]){
      const ey=monkey?.72:1.10,ex=monkey?.77:.60,r=cheetah?.20:monkey?.26:.28;
      part([sign*ex,ey,-.08],[r,r,r*.75],panda?black:base);
      part([sign*ex,ey,.10],[r*.60,r*.60,.08],panda?metal:pink);
    }
  }
  if(rabbit)for(const sign of [-1,1]){
    part([sign*.31,1.40,-.08],[.18,.61,.18],base,-sign*.13);
    part([sign*.31,1.45,.06],[.09,.45,.08],pink,-sign*.13);
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
  const hy=.56+breath*.4,headX=bear?.80:monkey?.70:.75;
  part([0,hy,0],[headX,.65,.57],body);
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
      part([-.20,hy-.29,.45],[.27,.20,.23],ivory,-.10);
      part([.20,hy-.29,.45],[.27,.20,.23],ivory,.10);
      part([0,hy-.27,.66],[cat? .10:.14,.09,.10],cat?pink:black,0,.85,0);
      part([0,hy-.44,.57],[.13,.04,.08],black,0,.1,0);
      if(rabbit)for(const sign of [-1,1])part([sign*.045,hy-.44,.65],[.045,.09,.04],white,0,.3,0);
    }else part([0,hy-.19,.66],[.11,.16,.14],gold,.12,.55,0);
    for(const sign of [-1,1]){
      const closed=blink||(emotion==='wink'&&sign===1),radius=owl?.22:.17;
      part([sign*.29,hy+.08,.56],[radius,closed?.025:emotion==='surprise'?.21:radius,.10],white,0,.3,0);
      if(!closed){
        part([sign*.29,hy+.08,.65],[radius*.68,radius*.72,.06],owl?gold:iris,0,.6,0);
        part([sign*.29,hy+.08,.70],[radius*.38,radius*.49,.045],black,0,.85,0);
        part([sign*.29-.035,hy+.13,.74],[.028,.032,.02],white,0,.9,0);
      }
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
  if(season==='winter')part([0,-.02,.07],[.53,.13,.43],[.65,.05,.12],0,.1,0);
}
