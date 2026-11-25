import React,{useEffect,useState} from 'react';
import {CHARACTERS,normalizeCharacterSettings,selectCharacter} from '../utils/characterStudio.js';
import {CharacterArt,CharacterScene} from './CharacterMascot.jsx';

const field='w-full rounded-xl border border-slate-600 bg-slate-950 p-2.5 text-sm text-slate-100';
const choices={
  rotation:[['fixed','არჩეული პერსონაჟი'],['random','შემთხვევითი'],['daypart','დღის მონაკვეთი'],['seasonal','სეზონური']],
  behavior:[['run-wave','შემორბენა და მისალმება'],['wave','ხელის დაქნევა'],['jump','ხტუნვა'],['slide','მსუბუქი შემოსვლა']],
  side:[['left','მარცხნიდან'],['right','მარჯვნიდან']],
  frequency:[['session','ერთხელ სესიაში'],['daily','ერთხელ 24 საათში']],
  pages:[['home','მხოლოდ მთავარი გვერდი'],['catalogue','მთავარი და კატეგორიები']]
};
export default function AdminCharacterStudio({siteSettings,setSiteSettings,busy=false,lang='ka'}){
  const s=normalizeCharacterSettings(siteSettings?.characterStudio);
  const [preview,setPreview]=useState(null);
  const [previewMobile,setPreviewMobile]=useState(false);
  const update=(patch)=>{
    setPreview(null);
    setSiteSettings(previous=>({...previous,characterStudio:normalizeCharacterSettings({...previous?.characterStudio,...patch})}));
  };
  useEffect(()=>{
    if(!preview)return;
    const id=setTimeout(()=>setPreview(null),(preview.settings.delay+preview.settings.duration)*1000);
    return()=>clearTimeout(id);
  },[preview]);
  const choose=(key,title)=><label className="min-w-0 space-y-1 block"><span className="text-xs font-semibold text-slate-300">{title}</span><select className={field} value={s[key]} disabled={busy} onChange={e=>update({[key]:e.target.value})}>{choices[key].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>;
  return <section data-character-studio className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-4 space-y-4 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-base font-black text-white">Character Studio</h3><p className="text-xs text-slate-300">GEOSTORE-ის პერსონაჟები და მისალმება</p></div>
      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.enabled} disabled={busy} onChange={e=>update({enabled:e.target.checked})}/> საიტზე ჩართვა</label>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {CHARACTERS.map(c=><button type="button" key={c.id} disabled={busy} aria-pressed={s.character===c.id} onClick={()=>update({character:c.id,rotation:'fixed'})} className={'min-w-0 rounded-xl border p-2 text-center text-xs font-bold '+(s.character===c.id?'border-emerald-400 bg-emerald-950 text-emerald-100':'border-slate-700 bg-slate-950 text-slate-200')}><div className="mx-auto w-16 max-w-full"><CharacterArt character={c}/></div><span className="block break-words">{c.name}</span><span className="block text-slate-400 font-normal">{c.label}</span></button>)}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {choose('rotation','პერსონაჟის შერჩევა')}{choose('behavior','მოძრაობა')}{choose('side','გამოსვლის მხარე')}{choose('frequency','გამოჩენის სიხშირე')}{choose('pages','გვერდები')}
      <label className="space-y-1 block"><span className="text-xs font-semibold text-slate-300">დაყოვნება: {s.delay} წმ</span><input className="w-full" type="range" min="0" max="10" value={s.delay} disabled={busy} onChange={e=>update({delay:Number(e.target.value)})}/></label>
      <label className="space-y-1 block"><span className="text-xs font-semibold text-slate-300">ხანგრძლივობა: {s.duration} წმ</span><input className="w-full" type="range" min="3" max="12" value={s.duration} disabled={busy} onChange={e=>update({duration:Number(e.target.value)})}/></label>
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-100"><label><input type="checkbox" checked={s.mobile} disabled={busy} onChange={e=>update({mobile:e.target.checked})}/> ტელეფონი</label><label><input type="checkbox" checked={s.desktop} disabled={busy} onChange={e=>update({desktop:e.target.checked})}/> კომპიუტერი</label></div>
    </div>
    <label className="block space-y-1"><span className="text-xs font-semibold text-slate-300">მისალმების ტექსტი (ცარიელი = პერსონაჟის ტექსტი)</span><textarea className={field} rows="2" maxLength={120} value={siteSettings?.characterStudio?.message??''} disabled={busy} onChange={e=>{setPreview(null);const message=e.target.value;setSiteSettings(previous=>({...previous,characterStudio:{...normalizeCharacterSettings(previous?.characterStudio),message}}));}}/></label>
    <div className="flex flex-wrap gap-2 items-center"><button type="button" aria-pressed={!previewMobile} onClick={()=>{setPreviewMobile(false);setPreview(null);}} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-white">კომპიუტერი</button><button type="button" aria-pressed={previewMobile} onClick={()=>{setPreviewMobile(true);setPreview(null);}} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-white">ტელეფონი</button><button type="button" onClick={()=>setPreview({settings:s,character:selectCharacter(s),key:Date.now()})} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950">ანიმაციის გაშვება</button></div>
    <div className="gs-character-preview mx-auto w-full" data-device={previewMobile?'mobile':'desktop'} style={{maxWidth:previewMobile?320:undefined}}>
      <span className="text-sm">GEOSTORE · გადახედვა</span>
      {preview&&<PreviewPlayback key={preview.key} preview={preview} lang={lang}/>}
    </div>
    <p className="text-xs text-slate-300 leading-relaxed">ცვლილებები საერთო მონახაზშია. გამოიყენეთ ქვემოთ მონახაზის შენახვა და შემდეგ გამოქვეყნება. გადახედვა საიტზე არ ჩანს.</p>
  </section>;
}
function PreviewPlayback({preview,lang}){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setVisible(true),preview.settings.delay*1000);return()=>clearTimeout(timer);},[preview]);
  return visible?<CharacterScene character={preview.character} settings={preview.settings} lang={lang} preview/>:null;
}
