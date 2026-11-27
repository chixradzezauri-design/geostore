// Read-only visual metrics for synthetic owner workspace. No text contents,
// images, identifiers, form values or account data are collected.
export async function collectAdminVisualBaseline(shell,module){
 return shell.evaluate((root,tab)=>{
  const main=root.querySelector('.admin-workspace-main');
  if(!main)throw Error('Missing admin workspace');
  const visible=element=>{
   const rect=element.getBoundingClientRect();
   if(rect.width<=0||rect.height<=0)return false;
   const style=getComputedStyle(element);
   return style.visibility==='visible'&&style.display!=='none'&&!element.closest('[hidden],[aria-hidden="true"]');
  };
  const rounded=n=>Math.round(n*10)/10;
  const countBy=(nodes,property)=>{
   const values={};
   for(const node of nodes){
    const value=getComputedStyle(node)[property];
    values[value]=(values[value]||0)+1;
   }
   return Object.entries(values).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8);
  };
  const headings=[...main.querySelectorAll('h1,h2,h3,h4')].filter(visible);
  const labels=[...main.querySelectorAll('label')].filter(visible);
  const controls=[...main.querySelectorAll('button,input:not([type="hidden"]),select,textarea')].filter(visible);
  const buttons=controls.filter(el=>el.tagName==='BUTTON');
  const touch=controls.filter(el=>!el.matches('input[type="checkbox"],input[type="radio"],input[type="range"]'));
  // Diagnostic counts only: native controls and intentional truncation can
  // produce overflow, so investigate these signals before enforcing a gate.
  const textNodes=[...main.querySelectorAll('h1,h2,h3,h4,label,button,th,td')].filter(visible);
  const clippedText=textNodes.filter(el=>el.clientWidth>0 && el.scrollWidth-el.clientWidth>2);
  const tinyText=textNodes.filter(el=>parseFloat(getComputedStyle(el).fontSize)<12);
  const narrowControls=touch.filter(el=>el.getBoundingClientRect().width<43.5);
  const tables=[...main.querySelectorAll('table')].filter(visible);
  const images=[...main.querySelectorAll('img')].filter(visible);
  const metrics=element=>({width:rounded(element.getBoundingClientRect().width),scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,overflow:Math.max(0,element.scrollWidth-element.clientWidth)});
  return {
   module:tab, viewport:window.innerWidth, documentOverflow:Math.max(0,document.documentElement.scrollWidth-window.innerWidth),
   shell:metrics(root),main:metrics(main),
   headings:headings.length,headingSizes:countBy(headings,'fontSize'),
   labelSizes:countBy(labels,'fontSize'),buttonSizes:countBy(buttons,'fontSize'),
   controls:controls.length,shortControls:touch.filter(el=>el.getBoundingClientRect().height<43.5).length,
   buttonColors:countBy(buttons,'backgroundColor'),
   textElements:textNodes.length, horizontallyOverflowingText:clippedText.length,
   smallTextElements:tinyText.length, narrowControls:narrowControls.length,
   tables:tables.length,images:images.length,
   imageLoadFailures:images.filter(el=>el.complete&&el.naturalWidth===0).length
  };
 },module);
}
