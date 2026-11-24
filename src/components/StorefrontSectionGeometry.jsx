import React,{useState} from 'react';
import {getStorefrontSectionGeometry,setStorefrontSectionGeometry} from '../utils/storefrontVisualDesign.js';
const controls=[['marginTop','ზედა დაშორება',0,72,'px'],['maxWidth','მაქსიმალური სიგანე',85,100,'%']];
export default function StorefrontSectionGeometry({design,viewport,labels,onChange}){
 const [id,setId]=useState('hero');
 const current=getStorefrontSectionGeometry(design,id,viewport),own=(viewport==='desktop'?design.sectionGeometry:design.responsive?.[viewport]?.sectionGeometry)?.[id]||{};
 function change(key,value){const next=setStorefrontSectionGeometry(design,id,viewport,key,value);if(next)onChange(next);}
 return <details className="gs-section-geometry min-w-0 rounded-xl border border-slate-700 p-3 space-y-2">
  <summary className="cursor-pointer text-xs font-bold text-white">სექციის დაშორება და სიგანე</summary>
  <p className="text-xs text-slate-400">არჩეულ ხედში დაარეგულირეთ სექციის ზედა დაშორება (საერთო gap-ის დამატებით) და მაქსიმალური სიგანე. მითითებული პარამეტრები შესაბამისი სექციის გარე სტილზე უპირატესია; შიდა ელემენტები არ იცვლება.</p>
  <label className="block text-xs text-slate-300">სექცია<select aria-label="დაშორების სექცია" value={id} onChange={e=>setId(e.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white">{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  {controls.map(([key,label,min,max,unit])=><div key={key} className="space-y-1"><label className="block text-xs text-slate-300"><span className="flex flex-wrap justify-between gap-1"><span>{label}</span><b>{current[key]===undefined?'ავტომატური':current[key]+unit}</b></span><input type="range" aria-label={label} min={min} max={max} step={1} value={current[key]??(key==='maxWidth'?100:0)} onChange={e=>change(key,Number(e.target.value))} className="w-full accent-emerald-400"/></label><div className="flex flex-wrap items-center justify-between gap-1"><span className="text-xs text-slate-400">{Object.hasOwn(own,key)?'ინდივიდუალური':current[key]===undefined?'ავტომატური':'საერთო პარამეტრი'}</span><button type="button" disabled={!Object.hasOwn(own,key)} className="min-h-11 rounded-lg border border-slate-700 px-2 text-xs text-white disabled:opacity-40" onClick={()=>change(key,null)}>{viewport==='desktop'?'ავტომატური':'საერთო'} მნიშვნელობის აღდგენა</button></div></div>)}
 </details>;
}
