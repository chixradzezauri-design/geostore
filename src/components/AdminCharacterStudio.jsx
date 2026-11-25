import React,{useEffect,useState} from 'react';
import {CHARACTERS,CHARACTER_SCENARIOS,getCharacterScenario,normalizeCharacterSettings,selectCharacter} from '../utils/characterStudio.js';
import {CharacterArt,CharacterScene,CharacterContextCard} from './CharacterMascot.jsx';

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
  const [scenarioKey,setScenarioKey]=useState('flash');
  const scenario=s.scenarios[scenarioKey];
  const updateScenario=(patch)=>{
    setSiteSettings(previous=>{
      const current=normalizeCharacterSettings(previous?.characterStudio);
      return {...previous,characterStudio:{...current,scenarios:{...current.scenarios,[scenarioKey]:{...current.scenarios[scenarioKey],...patch}}}};
    });
  };
  const scenarioPreview=getCharacterScenario({...s,enabled:true,mobile:true,desktop:true,scenarios:{...s.scenarios,[scenarioKey]:{...scenario,enabled:true}}},scenarioKey,{mobile:previewMobile,eligible:true});
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
    <div className="border-t border-slate-700 pt-4 space-y-3" data-character-scenarios>
      <h4 className="text-sm font-bold text-white">პერსონაჟების სპეციალური სცენარები</h4>
      <label className="block space-y-1 text-xs text-slate-300">სცენარი<select className={field} value={scenarioKey} onChange={e=>setScenarioKey(e.target.value)}>{Object.entries(CHARACTER_SCENARIOS).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={scenario.enabled} disabled={busy} onChange={e=>updateScenario({enabled:e.target.checked})}/> ამ სცენარის ჩართვა</label>
      <label className="block space-y-1 text-xs text-slate-300">სცენარის პერსონაჟი<select className={field} value={scenario.character} disabled={busy} onChange={e=>updateScenario({character:e.target.value})}>{CHARACTERS.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="block space-y-1 text-xs text-slate-300">სცენარის ტექსტი<textarea className={field} rows={2} maxLength={120} value={siteSettings?.characterStudio?.scenarios?.[scenarioKey]?.message??''} disabled={busy} onChange={e=>updateScenario({message:e.target.value})}/></label>
      <div className="gs-character-preview p-3" data-device={previewMobile?'mobile':'desktop'} style={{maxWidth:previewMobile?320:undefined,marginInline:'auto'}}><CharacterContextCard key={scenarioKey+scenario.character} scenario={scenarioPreview} lang={lang}/></div>
      <p className="text-xs text-slate-300">ფლეშ აქციების პერსონაჟი ჩანს მხოლოდ მოქმედ აქციებთან. კალათისა და ფავორიტების პერსონაჟები ჩანს მხოლოდ ცარიელ გვერდზე; დამატებით ფანჯარას არ ხსნის.</p>
    </div>
    <p className="text-xs text-slate-300 leading-relaxed">ცვლილებები საერთო მონახაზშია. გამოიყენეთ ქვემოთ მონახაზის შენახვა და შემდეგ გამოქვეყნება. გადახედვა საიტზე არ ჩანს.</p>
  </section>;
}
function PreviewPlayback({preview,lang}){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setVisible(true),preview.settings.delay*1000);return()=>clearTimeout(timer);},[preview]);
  return visible?<CharacterScene character={preview.character} settings={preview.settings} lang={lang} preview/>:null;
}
