import React,{useEffect,useState} from 'react';
import {CONCIERGE_ADVICE,chooseConciergeAdvice,nextConciergeAdvice,CONCIERGE_INTERACTIVE_COPY} from '../utils/characterAdvice.js';
import {CHARACTERS,CHARACTER_SCENARIOS,getCharacterScenario,normalizeCharacterSettings,selectCharacter,styledCharacter,DEFAULT_CHARACTER_APPEARANCE,CHARACTER_GREETING_LANGS,FUNNY_GREETINGS,CHARACTER_GREETING_TONES,CHARACTER_EVENT_LIMIT,CHARACTER_EVENT_THEMES,characterCalendarDay,activeCharacterEvent,applyCharacterEvent,characterDisplayReason,CONCIERGE_PRESETS,applyConciergePreset,CHARACTER_PROFILE_ROLES,applyCharacterProfile,applyRecommendedCharacterRoles} from '../utils/characterStudio.js';
import {CharacterArt,CharacterScene,CharacterContextCard,CharacterReaction} from './CharacterMascot.jsx';

const field='w-full rounded-xl border border-slate-600 bg-slate-950 p-2.5 text-sm text-slate-100';
const choices={
  rotation:[['fixed','არჩეული პერსონაჟი'],['random','შემთხვევითი'],['daypart','დღის მონაკვეთი'],['seasonal','სეზონური'],['sequence','მონაცვლეობით — სხვადასხვა პერსონაჟი']],
  behavior:[['run-wave','შემორბენა და მისალმება'],['wave','ხელის დაქნევა'],['jump','ხტუნვა'],['slide','მსუბუქი შემოსვლა'],['dance','ცეკვა'],['peek','გამოჭყეტა'],['bow','თავის დაკვრა'],['celebrate','სიხარულის ნახტომი'],['sneak','ჩუმად შემოპარვა'],['walk-wave','მოსეირნება და მისალმება'],['look-around','დათვალიერება'],['point','მინიშნება'],['patrol','გადაადგილება, გაჩერება და მისალმება']],
  greetingMode:[['character','პერსონაჟის სტანდარტული ფრაზა'],['funny','სახალისო ფრაზები'],['time','დღის დროის მიხედვით'],['library','ჩემი ფრაზების ბიბლიოთეკა'],['friendly','მეგობრული'],['premium','დახვეწილი / პრემიუმ'],['minimal','მოკლე და მინიმალისტური']],
  interaction:[['wave','საპასუხო მისალმება'],['high-five','ხუთიანი'],['cheer','გამხნევება']],
  effect:[['none','ეფექტის გარეშე'],['sparkles','ვარსკვლავები'],['hearts','გულები'],['confetti','კონფეტი'],['snow','მსუბუქი თოვა'],['festive','სადღესასწაულო ნათება']],
  emotion:[['happy','ღიმილი'],['wink','თვალის ჩაკვრა'],['surprise','გაკვირვება']],
  season:[['none','გამორთული'],['auto','ავტომატურად სეზონის მიხედვით'],['winter','ზამთარი'],['hearts','გულები'],['summer','ზაფხული'],['autumn','შემოდგომა']],
  side:[['left','მარცხნიდან'],['right','მარჯვნიდან'],['alternate','მხარეების მონაცვლეობა']],
  placement:[['bottom','ქვედა კუთხე'],['middle','ეკრანის შუა მხარე (კომპიუტერზე)'],['roam','სხვადასხვა პოზიცია']],
  frequency:[['session','ერთხელ სესიაში'],['daily','ერთხელ 24 საათში'],['repeat','განმეორებით — ინტერვალით']],
  pages:[['home','მხოლოდ მთავარი გვერდი'],['catalogue','მთავარი და კატეგორიები']]
};
export default function AdminCharacterStudio({siteSettings,publishedSettings=null,onTestPublishedCharacter,actualMobile=false,setSiteSettings,busy=false,lang='ka'}){
  const s=normalizeCharacterSettings(siteSettings?.characterStudio);
  const [preview,setPreview]=useState(null);
  const [presetKey,setPresetKey]=useState('balanced');
  const [demoOpen,setDemoOpen]=useState(false);
  const [profileId,setProfileId]=useState('fox');
  const [profileLang,setProfileLang]=useState('ka');
  const [presetUndo,setPresetUndo]=useState(null);
  const [previewMobile,setPreviewMobile]=useState(false);
  const [scenarioKey,setScenarioKey]=useState('flash');
  const [libraryLang,setLibraryLang]=useState('ka');
  const [adviceLang,setAdviceLang]=useState('ka');
  const [adviceTopic,setAdviceTopic]=useState('style');
  const [eventId,setEventId]=useState(null);
  const [eventPreview,setEventPreview]=useState(null);
  const today=characterCalendarDay();
  const event=s.events.find(item=>item.id===eventId)||s.events[0];
  const activeEvent=activeCharacterEvent(s);
  const selectedCharacter=CHARACTERS.find(c=>c.id===s.character);
  const publishedKnown=publishedSettings!==null;
  const actualReason=characterDisplayReason(publishedSettings,{mobile:actualMobile,route:'home'});
  const previewReason=characterDisplayReason(publishedSettings,{mobile:previewMobile,route:'home'});
  const reasons={unconfirmed:'საჯარო ვერსია ჯერ ვერ დადასტურდა',disabled:'გამოქვეყნებული პერსონაჟი გამორთულია',device:'ამ მოწყობილობაზე გამოჩენა გამორთულია',page:'ამ გვერდზე გამოჩენა არ არის დაშვებული',blocked:'გახსნილი ფანჯარა დროებით ბლოკავს მისალმებას',ready:'გამოჩენის ძირითადი პირობები შესრულებულია'};
  const draftDiffers=publishedKnown&&JSON.stringify(s)!==JSON.stringify(normalizeCharacterSettings(publishedSettings));
  const enabledScenarios=Object.values(s.scenarios).filter(item=>item.enabled).length;
  const enabledEvents=s.events.filter(item=>item.enabled&&item.start&&item.end&&item.start<=item.end&&item.end>=today).length;
  const updateEvent=(patch)=>{setPreview(null);setEventPreview(null);setSiteSettings(previous=>{const current=normalizeCharacterSettings(previous?.characterStudio);return {...previous,characterStudio:{...current,greetingLibrary:previous?.characterStudio?.greetingLibrary??current.greetingLibrary,events:current.events.map(item=>item.id===event?.id?{...item,...previous?.characterStudio?.events?.find(raw=>raw.id===item.id),...patch}:item)}};});};
  const addEvent=()=>{if(s.events.length>=CHARACTER_EVENT_LIMIT)return;const id='event-'+Date.now().toString(36);update({events:[...s.events,{id,title:'ახალი ღონისძიება',enabled:false,start:today,end:today,theme:'custom'}]});setEventId(id);};
  const scenario=s.scenarios[scenarioKey];
  const updateScenario=(patch)=>{
    setSiteSettings(previous=>{
      const current=normalizeCharacterSettings(previous?.characterStudio);
      return {...previous,characterStudio:{...current,greetingLibrary:previous?.characterStudio?.greetingLibrary??current.greetingLibrary,scenarios:{...current.scenarios,[scenarioKey]:{...current.scenarios[scenarioKey],...patch}}}};
    });
  };
  const scenarioPreview=getCharacterScenario({...s,enabled:true,mobile:true,desktop:true,scenarios:{...s.scenarios,[scenarioKey]:{...scenario,enabled:true}}},scenarioKey,{mobile:previewMobile,eligible:true});
  const update=(patch)=>{
    setPreview(null);setEventPreview(null);
    setSiteSettings(previous=>({...previous,characterStudio:{...normalizeCharacterSettings({...previous?.characterStudio,...patch}),greetingLibrary:previous?.characterStudio?.greetingLibrary??s.greetingLibrary}}));
  };
  const applyPreset=()=>{
    setPreview(null);setEventPreview(null);
    const previous=siteSettings?.characterStudio;
    const next=applyConciergePreset(previous,presetKey);
    setPresetUndo({previous,applied:JSON.stringify(next)});
    setSiteSettings(value=>({...value,characterStudio:next}));
  };
  const undoPreset=()=>{
    if(!presetUndo||JSON.stringify(s)!==presetUndo.applied)return;
    setSiteSettings(value=>({...value,characterStudio:presetUndo.previous}));setPresetUndo(null);setPreview(null);setEventPreview(null);
  };
  const profile=s.profiles[profileId]||{enabled:false,topic:'inherit',behavior:'inherit',effect:'inherit',emotion:'inherit',side:'inherit',placement:'inherit',target:'inherit',recommendationMode:'inherit',duration:null,repeatInterval:null,tips:true,products:true,sales:true,guides:true,interactions:true,messages:{}};
  const updateProfile=(patch)=>{
    setPreview(null);setEventPreview(null);
    setSiteSettings(previous=>{const raw=previous?.characterStudio||{};const normalized=normalizeCharacterSettings(raw);return {...previous,characterStudio:{...raw,profiles:{...normalized.profiles,[profileId]:{...profile,...patch}}}};});
  };
  const updateAppearance=(patch)=>update({appearance:{...s.appearance,...patch}});
  const updatePalette=(color)=>update({palette:{...s.palette,[s.character]:color}});
  useEffect(()=>{
    if(!preview)return;
    const id=setTimeout(()=>setPreview(null),(preview.settings.delay+preview.settings.duration)*1000);
    return()=>clearTimeout(id);
  },[preview]);
  useEffect(()=>{if(!eventPreview)return;const id=setTimeout(()=>setEventPreview(null),(eventPreview.settings.delay+eventPreview.settings.duration)*1000);return()=>clearTimeout(id);},[eventPreview]);
  const choose=(key,title)=><label className="min-w-0 space-y-1 block"><span className="text-xs font-semibold text-slate-300">{title}</span><select aria-label={title} className={field} value={s[key]} disabled={busy} onChange={e=>update({[key]:e.target.value})}>{choices[key].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>;
  return <section data-character-studio className="gs-character-admin rounded-2xl border border-emerald-500/30 bg-slate-900 p-3 sm:p-4 space-y-3 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-base font-black text-white">Character Studio</h3><p className="text-xs text-slate-300">12 პერსონაჟი · რჩევები · შეთავაზებები</p></div>
      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.enabled} disabled={busy} onChange={e=>update({enabled:e.target.checked})}/> საიტზე ჩართვა</label>
    </div>
    <div data-character-publish-status role="status" className="rounded-lg border border-slate-600 bg-slate-950 p-3 text-xs text-slate-200 space-y-1">
      <p className="font-bold">{publishedKnown?(publishedSettings.enabled?'საჯარო საიტზე: ჩართულია':'საჯარო საიტზე: გამორთულია'):'საჯარო ვერსია ჯერ ვერ დადასტურდა'}</p>
      {draftDiffers?<p className="text-amber-300">მონახაზი განსხვავდება გამოქვეყნებული ვერსიისგან. ზედა ღილაკით „ცვლილებების გამოქვეყნება“ გაააქტიურეთ საიტზე.</p>:<p>საიტზე გამოჩნდება მხოლოდ დადასტურებული გამოქვეყნებული პარამეტრები. ადმინისტრატორსაც შეუძლია საჯარო გვერდზე ნახვა.</p>}
      <p>ახალი გამოქვეყნებული პარამეტრები ხილულ გვერდზე ავტომატურად მოწმდება ყოველ 30 წამში და ჩანართზე დაბრუნებისას.</p>
      <div className="grid gap-2 sm:grid-cols-2 pt-2"><div className="rounded-lg border border-slate-700 p-2"><strong>ამ მოწყობილობაზე ({actualMobile?'ტელეფონი':'კომპიუტერი'})</strong><p>{reasons[actualReason]}</p></div><div className="rounded-lg border border-slate-700 p-2"><strong>არჩეულ სატესტო ეკრანზე ({previewMobile?'ტელეფონი':'კომპიუტერი'})</strong><p>{reasons[previewReason]}</p></div></div>
      <button type="button" data-character-live-test disabled={busy||actualReason!=='ready'||typeof onTestPublishedCharacter!=='function'} onClick={onTestPublishedCharacter} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-40 min-h-[44px]">გამოქვეყნებული პერსონაჟის ნახვა საიტზე</button>
      <p className="text-slate-300">ტესტი გადაგიყვანს მთავარ გვერდზე და ამ ბრაუზერში ერთხელ გაიმეორებს გამოქვეყნებულ მისალმებას, სიხშირის ლიმიტის მიუხედავად. მონახაზი არ ქვეყნდება და სხვა მომხმარებლების პარამეტრები არ იცვლება.</p>
    </div>
    <div className="gs-character-admin-status" aria-label="Character Studio მდგომარეობა">
      <div><span>საიტის რეჟიმი</span><strong>{s.enabled?'ჩართული':'გამორთული'}</strong></div>
      <div><span>პერსონაჟი</span><strong>{s.rotation==='fixed'?selectedCharacter.name:'ავტომატური შერჩევა'}</strong></div>
      <div><span>სცენარები</span><strong>{enabledScenarios}/{Object.keys(CHARACTER_SCENARIOS).length}</strong></div>
      <div><span>დაგეგმილი ღონისძიებები</span><strong>{s.calendarEnabled?enabledEvents:'გამორთული'}</strong></div>
    </div>
    {s.enabled&&!s.mobile&&!s.desktop&&<p role="status" className="rounded-lg border border-amber-500/50 bg-amber-950/40 p-2 text-xs text-amber-200">პერსონაჟი არ გამოჩნდება: ჩართეთ მინიმუმ ერთი ტიპის მოწყობილობა.</p>}
    <div className="gs-concierge-presets" data-character-presets>
      <div><h4>მზა მართვის რეჟიმები</h4><p>აირჩიე რეჟიმი და გამოიყენე მონახაზზე. გამოქვეყნება ცალკე მოქმედებაა.</p></div>
      <div className="gs-concierge-preset-controls">
        <label className="block text-xs text-slate-300">რეჟიმი<select aria-label="მზა რეჟიმი" className={field} value={presetKey} disabled={busy} onChange={e=>setPresetKey(e.target.value)}>{Object.entries(CONCIERGE_PRESETS).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
        <button type="button" data-character-apply-preset disabled={busy} onClick={applyPreset} className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950">რეჟიმის გამოყენება</button>
      </div>
      <p>{CONCIERGE_PRESETS[presetKey].description}</p>
      {presetUndo&&JSON.stringify(s)===presetUndo.applied&&<div role="status" className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200"><span>რეჟიმი გამოყენებულია მონახაზზე.</span><button type="button" data-character-undo-preset disabled={busy} onClick={undoPreset} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-white">გაუქმება</button></div>}
      <div className="gs-concierge-summary" aria-label="აქტიური ფუნქციები">{[['რჩევები',s.advice.enabled,()=>update({advice:{...s.advice,enabled:!s.advice.enabled}})],['პროდუქტები',s.recommendProducts,()=>update({recommendProducts:!s.recommendProducts})],['აქციები',s.saleGuide,()=>update({saleGuide:!s.saleGuide})],['ინტერაქცია',s.interactiveGuide,()=>update({interactiveGuide:!s.interactiveGuide})],['საახალწლო',s.winterCelebration,()=>update({winterCelebration:!s.winterCelebration})],['მინიშნებები',s.guideLinks,()=>update({guideLinks:!s.guideLinks})]].map(([label,on,toggle])=><button type="button" key={label} disabled={busy} data-enabled={on?'true':'false'} aria-label={label+(on?' — გამორთვა':' — ჩართვა')} onClick={toggle}>{on?'✓':'–'} {label}</button>)}</div>
      <p>ფუნქციის ღილაკზე დაჭერით პირდაპირ შეცვლი მის ჩართვას.</p>
      <p>რეჟიმები არ ცვლის საიტზე ჩართვის ღილაკს, მოწყობილობების არჩევანს, შენს ტექსტებს, ფერებს ან ინდივიდუალურ კალენდარს.</p>
    </div>
    <div className="gs-concierge-demo-panel" data-character-functional-preview>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-bold text-white">ფუნქციების გამოცდა</h4><p className="text-xs text-slate-300">გამოსცადე მოქმედებები გამოქვეყნების გარეშე.</p></div><button type="button" aria-expanded={demoOpen} className="rounded-lg border border-emerald-400 px-3 py-2 text-xs font-bold text-emerald-100 min-h-[44px]" onClick={()=>setDemoOpen(v=>!v)}>{demoOpen?'გამოცდის დახურვა':'გამოცდის გახსნა'}</button></div>
      {demoOpen&&<ConciergeFunctionalDemo key={JSON.stringify(s)} settings={s} lang={lang}/>}
    </div>
    <h4 className="text-sm font-bold text-white">პერსონაჟის არჩევა</h4>
    <div className="gs-character-roster">
      {CHARACTERS.map(c=><button type="button" key={c.id} disabled={busy} aria-pressed={s.character===c.id} onClick={()=>update({character:c.id,rotation:'fixed'})} className={'gs-character-roster-card min-w-0 rounded-xl border p-2 text-center text-xs font-bold '+(s.character===c.id?'border-emerald-400 bg-emerald-950 text-emerald-100':'border-slate-700 bg-slate-950 text-slate-200')}><div className="gs-character-roster-art"><CharacterArt character={styledCharacter(c,s)} emotion={s.emotion} season={s.season}/></div><span className="block break-words">{c.name}</span><span className="block text-slate-400 font-normal">{c.label}</span></button>)}
    </div>
    <details className="gs-character-admin-section" data-character-profiles>
      <summary>პერსონაჟების ინდივიდუალური პროფილები · {Object.values(s.profiles).filter(p=>p.enabled).length}/12</summary>
      <div className="rounded-xl border border-slate-600 p-2 space-y-2"><p className="text-xs text-slate-300">ყველა პერსონაჟს მიეცი განსხვავებული როლი ერთი მოქმედებით. უკვე ჩართული ინდივიდუალური პროფილები და საკუთარი ტექსტები უცვლელი დარჩება.</p><button type="button" data-character-all-roles disabled={busy} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 min-h-[44px]" onClick={()=>{setPreview(null);setEventPreview(null);setSiteSettings(previous=>({...previous,characterStudio:applyRecommendedCharacterRoles(previous?.characterStudio)}));}}>12 როლის ერთიანად გამოყენება</button></div>
      <label className="block text-xs text-slate-300">პერსონაჟი<select aria-label="ინდივიდუალური პერსონაჟი" className={field} value={profileId} onChange={e=>setProfileId(e.target.value)}>{CHARACTERS.map(c=><option key={c.id} value={c.id}>{c.name} — {CHARACTER_PROFILE_ROLES[c.id]?.label}</option>)}</select></label>
      <div className="gs-character-profile-heading"><div className="w-16 shrink-0"><CharacterArt character={styledCharacter(CHARACTERS.find(c=>c.id===profileId),s)}/></div><div className="min-w-0"><strong>{CHARACTER_PROFILE_ROLES[profileId]?.label}</strong><p>ამ პერსონაჟის დამოუკიდებელი ფუნქციები და ქცევა.</p></div></div>
      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={profile.enabled} disabled={busy} onChange={e=>updateProfile({enabled:e.target.checked})}/> დამოუკიდებელი პროფილის ჩართვა</label>
      <button type="button" disabled={busy} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 min-h-[44px]" onClick={()=>{const role=CHARACTER_PROFILE_ROLES[profileId];updateProfile({enabled:true,topic:role.topic,behavior:role.behavior,recommendationMode:role.recommendationMode});}}>რეკომენდებული როლის გამოყენება</button>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      { [['topic','რჩევის მიმართულება',[['auto','ავტომატური'],...Object.entries(CONCIERGE_ADVICE).map(([key,value])=>[key,value.label])]],['behavior','ინდივიდუალური მოძრაობა',choices.behavior],['effect','ინდივიდუალური ეფექტი',choices.effect],['emotion','ინდივიდუალური ემოცია',choices.emotion],['side','ინდივიდუალური მხარე',choices.side],['placement','ინდივიდუალური პოზიცია',choices.placement],['target','სასურველი განყოფილება',[['categories','კატეგორიები'],['products','პროდუქტები'],['flash','მოქმედი აქციები']]],['recommendationMode','ინდივიდუალური რეკომენდაცია',[['featured','გამორჩეული'],['category','კატეგორიის მიხედვით'],['variety','მრავალფეროვანი'],['context','მხოლოდ მიმდინარე კატეგორია']]]].map(([key,label,options])=><label key={key} className="block text-xs text-slate-300">{label}<select aria-label={label} className={field} disabled={busy||!profile.enabled} value={profile[key]} onChange={e=>updateProfile({[key]:e.target.value})}><option value="inherit">საერთო პარამეტრი</option>{options.map(([value,text])=><option value={value} key={value}>{text}</option>)}</select></label>)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{[['duration','ინდივიდუალური ხანგრძლივობა',[3,4,5,6,7,8,9,10,11,12]],['repeatInterval','შუალედი ამ პერსონაჟის შემდეგ',[30,45,60,75,90,105,120,135,150,165,180]]].map(([key,label,values])=><label key={key} className="block text-xs text-slate-300">{label}<select aria-label={label} className={field} disabled={busy||!profile.enabled} value={profile[key]??'inherit'} onChange={e=>updateProfile({[key]:e.target.value==='inherit'?null:Number(e.target.value)})}><option value="inherit">საერთო პარამეტრი</option>{[...new Set([...values,...(profile[key]!==null?[profile[key]]:[])])].filter(Number.isFinite).sort((x,y)=>x-y).map(v=><option key={v} value={v}>{v} წმ</option>)}</select></label>)}</div>
      <div className="gs-character-profile-functions">{[['tips','რჩევები'],['products','პროდუქტები'],['sales','აქციები'],['guides','მინიშნებები'],['interactions','ინტერაქცია']].map(([key,label])=><label key={key}><input type="checkbox" checked={profile[key]} disabled={busy||!profile.enabled} onChange={e=>updateProfile({[key]:e.target.checked})}/>{label}</label>)}</div>
      <label className="block text-xs text-slate-300">მისალმების ენა<select aria-label="ინდივიდუალური მისალმების ენა" className={field} value={profileLang} onChange={e=>setProfileLang(e.target.value)}>{CHARACTER_GREETING_LANGS.map(code=><option key={code} value={code}>{({ka:'ქართული',en:'English',ru:'Русский'})[code]}</option>)}</select></label>
      <label className="block text-xs text-slate-300">ინდივიდუალური მისალმება<textarea aria-label="ინდივიდუალური მისალმება" className={field} rows={2} maxLength={120} disabled={busy||!profile.enabled} value={siteSettings?.characterStudio?.profiles?.[profileId]?.messages?.[profileLang]??''} onChange={e=>updateProfile({messages:{...profile.messages,[profileLang]:e.target.value}})}/></label>
      <div className="gs-character-preview p-3" data-device="mobile"><CharacterScene character={styledCharacter(CHARACTERS.find(c=>c.id===profileId),s)} settings={{...applyCharacterProfile(s,profileId,profileLang),behavior:'still'}} lang={profileLang} preview/></div>
      <p className="text-xs text-slate-300">საერთო ჩართვა და ვიზიტის ლიმიტი კვლავ მოქმედებს. ინდივიდუალური პროფილი მხოლოდ ჩართულ ფუნქციებს აკონკრეტებს; კალენდრის ტექსტსა და ანიმაციას არ ცვლის.</p>
    </details>
    <details className="gs-character-admin-section" data-character-motion>
      <summary>მოძრაობა, დრო და მოწყობილობები</summary>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
      {choose('rotation','პერსონაჟის შერჩევა')}{choose('behavior','მოძრაობა')}{choose('emotion','ემოცია')}{choose('season','სეზონური აქსესუარი')}{choose('side','გამოსვლის მხარე')}{choose('placement','გამოჩენის პოზიცია')}{choose('frequency','გამოჩენის სიხშირე')}{choose('pages','გვერდები')}
      {s.frequency==='repeat'&&<><label className="space-y-1 block text-xs text-slate-300">შუალედი გამოჩენებს შორის: {s.repeatInterval} წმ<input aria-label="გამოჩენებს შორის შუალედი" type="range" className="w-full" min="30" max="180" step="15" value={s.repeatInterval} disabled={busy} onChange={e=>update({repeatInterval:Number(e.target.value)})}/></label><label className="space-y-1 block text-xs text-slate-300">მაქსიმუმ ერთ ვიზიტზე: {s.repeatLimit}<input aria-label="გამოჩენის ლიმიტი" type="range" className="w-full" min="2" max="8" value={s.repeatLimit} disabled={busy} onChange={e=>update({repeatLimit:Number(e.target.value)})}/></label><p className="text-xs text-slate-300 sm:col-span-2">მონაცვლეობითი რეჟიმი თითო ჯერზე სხვა პერსონაჟს აჩვენებს. დახურვა აჩერებს მიმდინარე მისალმებას, ხოლო ამ ვიზიტზე დამალვა — ყველა შემდგომ გამოჩენას.</p></>}
      <label className="flex items-center gap-2 text-sm text-slate-100 sm:col-span-2"><input type="checkbox" checked={s.guideLinks} disabled={busy} onChange={e=>update({guideLinks:e.target.checked})}/> კატეგორიებზე, პროდუქტებსა და მიმდინარე აქციებზე გადასვლის მინიშნებები</label>
      <label className="flex items-center gap-2 text-sm text-slate-100 sm:col-span-2"><input type="checkbox" checked={s.recommendProducts} disabled={busy} onChange={e=>update({recommendProducts:e.target.checked})}/> პერსონაჟმა შემომთავაზოს ხელმისაწვდომი პროდუქტები</label>
      {s.recommendProducts&&<label className="space-y-1 block text-xs text-slate-300">რეკომენდაციის ტიპი<select aria-label="რეკომენდაციის ტიპი" className={field} value={s.recommendationMode} disabled={busy} onChange={e=>update({recommendationMode:e.target.value})}><option value="featured">გამორჩეული პროდუქტები</option><option value="category">დათვალიერებული კატეგორიის მიხედვით</option><option value="variety">მრავალფეროვანი არჩევანი</option><option value="context">მხოლოდ მიმდინარე კატეგორია</option></select></label>}
      {(s.recommendProducts||s.saleGuide)&&<label className="space-y-1 block text-xs text-slate-300">რეკომენდაციის მაქსიმალური საწყისი ფასი (₾)<select aria-label="რეკომენდაციის ბიუჯეტი" className={field} value={s.recommendationBudget} disabled={busy} onChange={e=>update({recommendationBudget:Number(e.target.value)})}>{[0,25,50,100,150,200,300,500,1000,...([0,25,50,100,150,200,300,500,1000].includes(s.recommendationBudget)?[]:[s.recommendationBudget])].map(v=><option key={v} value={v}>{v===0?'შეუზღუდავი':v+' ₾-მდე'}</option>)}</select><span>მხოლოდ რეკომენდაციებისთვის; კატალოგის ფასებს არ ცვლის. ვარიანტიან ნივთზე საწყისი ფასია.</span></label>}
      <label className="space-y-1 block"><span className="text-xs font-semibold text-slate-300">დაყოვნება: {s.delay} წმ</span><input className="w-full" type="range" min="0" max="10" value={s.delay} disabled={busy} onChange={e=>update({delay:Number(e.target.value)})}/></label>
      <label className="space-y-1 block"><span className="text-xs font-semibold text-slate-300">ხანგრძლივობა: {s.duration} წმ</span><input className="w-full" type="range" min="3" max="12" value={s.duration} disabled={busy} onChange={e=>update({duration:Number(e.target.value)})}/></label>
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-100"><label><input type="checkbox" checked={s.mobile} disabled={busy} onChange={e=>update({mobile:e.target.checked})}/> ტელეფონი</label><label><input type="checkbox" checked={s.desktop} disabled={busy} onChange={e=>update({desktop:e.target.checked})}/> კომპიუტერი</label></div>
      </div>
    </details>
    <details className="gs-character-admin-section" data-character-winter-settings>
      <summary>საახალწლო განწყობა — Santa & Snowy</summary>
      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.winterCelebration} disabled={busy} onChange={e=>update({winterCelebration:e.target.checked})}/> ყოველწლიური საახალწლო რეჟიმი</label>
      <label className="block text-xs text-slate-300">სადღესასწაულო პერიოდი<select aria-label="სადღესასწაულო პერიოდი" className={field} value={s.winterPeriod} disabled={busy} onChange={e=>update({winterPeriod:e.target.value})}><option value="standard">1 დეკემბერი – 14 იანვარი</option><option value="extended">20 ნოემბერი – 14 იანვარი</option><option value="short">20 დეკემბერი – 7 იანვარი</option></select></label>
      <label className="block text-xs text-slate-300">საახალწლო პერსონაჟი<select aria-label="საახალწლო პერსონაჟი" className={field} value={s.winterStyle} disabled={busy} onChange={e=>update({winterStyle:e.target.value})}><option value="alternate">Santa და Snowy მონაცვლეობით</option><option value="santa">მხოლოდ Santa</option><option value="snowman">მხოლოდ Snowy</option></select></label>
      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.winterEffects} disabled={busy} onChange={e=>update({winterEffects:e.target.checked})}/> თოვლისა და სადღესასწაულო ნათების ეფექტები</label>
      <p className="text-xs text-slate-300">თბილისის დროით მოქმედებს. ინდივიდუალური კალენდრის ღონისძიებას უპირატესობა აქვს. ეფექტები მხოლოდ პერსონაჟთან ჩნდება და შემცირებული მოძრაობის რეჟიმში არ მუშაობს.</p>
    </details>
    <details className="gs-character-admin-section" data-character-sale-settings>
      <summary>Deal Hunter — აქციების დამხმარე</summary>
      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.saleGuide} disabled={busy} onChange={e=>update({saleGuide:e.target.checked})}/> მოქმედი აქციების შეთავაზება</label>
      <label className="block text-xs text-slate-300">აქციების გამოჩენა<select aria-label="აქციების გამოჩენა" className={field} value={s.saleGuidePriority} disabled={busy} onChange={e=>update({saleGuidePriority:e.target.value})}><option value="alternate">სხვა რჩევებთან მონაცვლეობით</option><option value="always">მოქმედ აქციას უპირატესობა</option><option value="deal-only">მხოლოდ Deal Hunter-ის გამოჩენისას</option></select></label>
      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.blackFridayBoost} disabled={busy||!s.saleGuide} onChange={e=>update({blackFridayBoost:e.target.checked})}/> შავი პარასკევი – კიბერ ორშაბათი: მოქმედ აქციებს უპირატესობა</label><p className="text-xs text-slate-300">ყოველწლიურად, თბილისის დროით. ფასდაკლებებს არ ქმნის და მხოლოდ რეალურად მოქმედ შეთავაზებებს აჩვენებს.</p>
      <p className="text-xs text-slate-300">აჩვენებს მხოლოდ გადამოწმებულ, მარაგში არსებულ მოქმედ აქციას და ფასთა ნამდვილ სხვაობას. ვადის გასვლისთანავე შეთავაზება ქრება. ვარიანტიანი პროდუქტები, რომელთა ფასებიც შეიძლება განსხვავდებოდეს, არ გამოიყენება ამ ფასის მინიშნებაში.</p>
    </details>
    <details className="gs-character-admin-section" data-character-advice-settings>
      <summary>რჩევები და საჩუქრების იდეები</summary>
      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.advice.enabled} disabled={busy} onChange={e=>update({advice:{...s.advice,enabled:e.target.checked}})}/> რჩევების ჩართვა</label>
      <label className="block text-xs text-slate-300">რჩევების მიმართულება<select aria-label="რჩევების მიმართულება" className={field} value={s.advice.topic} disabled={busy} onChange={e=>update({advice:{...s.advice,topic:e.target.value}})}><option value="auto">ავტომატურად — პერსონაჟისა და სიტუაციის მიხედვით</option>{Object.entries(CONCIERGE_ADVICE).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><label className="block text-xs text-slate-300">რჩევის თემა<select aria-label="რჩევის თემა" className={field} value={adviceTopic} onChange={e=>setAdviceTopic(e.target.value)}>{Object.entries(CONCIERGE_ADVICE).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label><label className="block text-xs text-slate-300">რჩევის ენა<select aria-label="რჩევის ენა" className={field} value={adviceLang} onChange={e=>setAdviceLang(e.target.value)}>{CHARACTER_GREETING_LANGS.map(code=><option key={code} value={code}>{({ka:'ქართული',en:'English',ru:'Русский'})[code]}</option>)}</select></label></div>
      <label className="block text-xs text-slate-300">ჩემი რჩევა (ცარიელი = მზა ტექსტები)<textarea aria-label="ჩემი რჩევა" className={field} rows={2} maxLength={120} disabled={busy} value={siteSettings?.characterStudio?.advice?.custom?.[adviceTopic]?.[adviceLang]??''} onChange={e=>{const value=e.target.value;setSiteSettings(previous=>{const current=normalizeCharacterSettings(previous?.characterStudio);return {...previous,characterStudio:{...previous?.characterStudio,advice:{...current.advice,custom:{...current.advice.custom,...previous?.characterStudio?.advice?.custom,[adviceTopic]:{...current.advice.custom[adviceTopic],...previous?.characterStudio?.advice?.custom?.[adviceTopic],[adviceLang]:value}}}}};});}}/></label>
      <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200"><strong>რჩევის მაგალითი</strong><p className="mt-1">{chooseConciergeAdvice({...s.advice,enabled:true,topic:adviceTopic},{lang:adviceLang})?.text}</p></div>
      <p className="text-xs text-slate-300">განმეორებით რეჟიმში პირველი გამოჩენა მისალმებაა, შემდეგი — რჩევები. კალენდრის აქტიური ღონისძიების ტექსტს უპირატესობა აქვს.</p>
    </details>
    <label className="block space-y-1"><span className="text-xs font-semibold text-slate-300">მისალმების ტექსტი (ცარიელი = პერსონაჟის ტექსტი)</span><textarea className={field} rows="2" maxLength={120} value={siteSettings?.characterStudio?.message??''} disabled={busy} onChange={e=>{setPreview(null);const message=e.target.value;setSiteSettings(previous=>({...previous,characterStudio:{...normalizeCharacterSettings(previous?.characterStudio),greetingLibrary:previous?.characterStudio?.greetingLibrary??s.greetingLibrary,message}}));}}/></label>
    <details className="gs-character-admin-section" data-character-greetings>
      <summary className="cursor-pointer text-sm font-bold text-white">მისალმებების ბიბლიოთეკა და ეფექტები</summary>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {choose('greetingMode','მისალმების რეჟიმი')}{choose('effect','ვიზუალური ეფექტი')}
        <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.waveBack} disabled={busy} onChange={e=>update({waveBack:e.target.checked})}/> მომხმარებელს შეუძლია საპასუხოდ ხელი დაუქნიოს ან სხვა ჟესტი აირჩიოს</label>
        {s.waveBack&&choose('interaction','საპასუხო ჟესტი')}
        <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.interactiveGuide} disabled={busy} onChange={e=>update({interactiveGuide:e.target.checked})}/> ინტერაქტიული დამხმარე — სხვა რჩევა, სხვა ნივთი, მადლობა</label>
        <p className="text-xs text-slate-300">ღილაკები მუშაობს მხოლოდ ჩართული რჩევებისა და რეკომენდაციების ფარგლებში. თითო გამოჩენაზე მაქსიმუმ 4 მოქმედება და 24 წამი.</p>
      </div>
      {s.message&&<p className="text-xs text-amber-300">ზემოთ ჩაწერილი ინდივიდუალური ტექსტი უპირატესია ყველა რეჟიმზე. ბიბლიოთეკის გამოსაყენებლად გაასუფთავეთ ის ველი.</p>}
      {s.greetingMode==='funny'&&<div className="space-y-1 text-xs text-slate-300">{FUNNY_GREETINGS.map((line,i)=><p key={i}>{line[lang]||line.ka}</p>)}</div>}
      {Object.hasOwn(CHARACTER_GREETING_TONES,s.greetingMode)&&<div className="rounded-xl border border-slate-700 p-3 space-y-2 text-xs text-slate-200"><p className="font-bold text-white">ფრაზების მაგალითები</p>{CHARACTER_GREETING_TONES[s.greetingMode].map((line,i)=><p key={i}>{line[lang]||line.ka}</p>)}</div>}
      {s.greetingMode==='library'&&<div className="space-y-3">
        <label className="block text-xs text-slate-300">ფრაზების ენა<select className={field} value={libraryLang} onChange={e=>setLibraryLang(e.target.value)}>{CHARACTER_GREETING_LANGS.map(code=><option key={code} value={code}>{({ka:'ქართული',en:'English',ru:'Русский'})[code]}</option>)}</select></label>
        {Array.from({length:8},(_,i)=><label key={i} className="block text-xs text-slate-300">ფრაზა {i+1}<input className={field} type="text" maxLength={120} disabled={busy} value={siteSettings?.characterStudio?.greetingLibrary?.[libraryLang]?.[i]??''} onChange={e=>{
          const value=e.target.value;setPreview(null);
          setSiteSettings(previous=>{const current=normalizeCharacterSettings(previous?.characterStudio);const list=Array.from({length:8},(_,j)=>previous?.characterStudio?.greetingLibrary?.[libraryLang]?.[j]??'');list[i]=value;return {...previous,characterStudio:{...current,greetingLibrary:{...current.greetingLibrary,...previous?.characterStudio?.greetingLibrary,[libraryLang]:list}}};});
        }}/></label>)}
        <p className="text-xs text-slate-400">თითოეულ ენაზე მაქსიმუმ 8 ფრაზა. ცარიელი ველები გამოქვეყნებისას გამოტოვებულია. შერჩევა შემთხვევითია და ენის მიხედვით ხდება.</p>
      </div>}
      <p className="text-xs text-slate-400">ეფექტები მოკლეა და მხოლოდ პერსონაჟთან ჩნდება. სისტემის შემცირებული მოძრაობის პარამეტრს პატივს სცემს.</p>
    </details>
    <details className="gs-character-admin-section" data-character-appearance>
      <summary className="cursor-pointer text-sm font-bold text-white">ვიზუალური დიზაინი — ზომები და ფერები</summary>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {[[ 'desktopSize','კომპიუტერზე ზომა',80,144 ],['mobileSize','ტელეფონზე ზომა',56,100],['lift','დამატებითი სიმაღლე ქვედა კიდიდან',0,48],['fontSize','ტექსტის ზომა',12,15]].map(([key,label,min,max])=><label key={key} className="block space-y-1 text-xs text-slate-300">{label}: {s.appearance[key]} px<input aria-label={label} className="w-full" type="range" min={min} max={max} value={s.appearance[key]} disabled={busy} onChange={e=>updateAppearance({[key]:Number(e.target.value)})}/></label>)}
        <label className="block space-y-1 text-xs text-slate-300">არჩეული პერსონაჟის ფერი<input aria-label="პერსონაჟის ფერი" type="color" className="block h-10 w-full rounded-lg border border-slate-600 bg-slate-950" value={s.palette[s.character]} disabled={busy} onChange={e=>updatePalette(e.target.value)}/></label>
        <label className="block space-y-1 text-xs text-slate-300">პერსონაჟების ვიზუალი<select aria-label="პერსონაჟების ვიზუალი" className={field} value={s.appearance.renderMode} disabled={busy} onChange={e=>updateAppearance({renderMode:e.target.value})}><option value="auto">მსუბუქი 3D (ავტომატური)</option><option value="vector">ვექტორული სარეზერვო მოდელი</option></select><span className="block text-slate-400">თორმეტივე პერსონაჟის 3D მუშაობს მისალმების ანიმაციაში; შეუთავსებელ მოწყობილობაზე და ზოგი სეზონური აქსესუარისას ავტომატურად გამოიყენება ვექტორული მოდელი.</span></label>
        <label className="block space-y-1 text-xs text-slate-300">ხილვადობა<select aria-label="ხილვადობა" className={field} value={s.appearance.prominence} disabled={busy} onChange={e=>updateAppearance({prominence:e.target.value})}><option value="enhanced">გამოკვეთილი — უფრო დიდი და შესამჩნევი</option><option value="compact">კომპაქტური — მითითებული ზომა</option></select></label>
        <label className="block space-y-1 text-xs text-slate-300">3D განათება<select aria-label="3D განათება" className={field} value={s.appearance.lighting} disabled={busy} onChange={e=>updateAppearance({lighting:e.target.value})}><option value="studio">სტუდიური — რბილი მოცულობა</option><option value="daylight">დღის განათება — ნათელი</option><option value="cinematic">კინემატოგრაფიული — თბილი და კონტრასტული</option></select></label>
        <label className="block space-y-1 text-xs text-slate-300">მისალმების ფონი<input aria-label="მისალმების ფონი" type="color" className="block h-10 w-full rounded-lg border border-slate-600 bg-slate-950" value={s.appearance.bubbleColor} disabled={busy} onChange={e=>updateAppearance({bubbleColor:e.target.value})}/></label>
        <label className="block space-y-1 text-xs text-slate-300">ბუშტის ფორმა<select className={field} value={s.appearance.bubbleShape} disabled={busy} onChange={e=>updateAppearance({bubbleShape:e.target.value})}><option value="rounded">მომრგვალებული</option><option value="pill">ოვალური</option><option value="square">კუთხეებიანი</option></select></label>
        <button type="button" disabled={busy} className="self-end rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-100" onClick={()=>update({appearance:DEFAULT_CHARACTER_APPEARANCE,palette:{}})}>ვიზუალური პარამეტრების აღდგენა</button>
      </div>
      <p className="text-xs text-slate-400">თითოეულ პერსონაჟს დამოუკიდებელი ფერი აქვს. ტექსტის კონტრასტი ავტომატურად შეირჩევა. ზომები შეზღუდულია, რათა არ დაიფაროს მნიშვნელოვანი ღილაკები.</p>
      <div className="gs-character-preview p-3" data-device={previewMobile?'mobile':'desktop'} style={{maxWidth:previewMobile?320:undefined,marginInline:'auto'}}><CharacterScene character={styledCharacter(CHARACTERS.find(c=>c.id===s.character),s)} settings={{...s,behavior:'still'}} lang={lang} preview/></div>
    </details>
    <div className="flex flex-wrap gap-2 items-center"><button type="button" aria-pressed={!previewMobile} onClick={()=>{setPreviewMobile(false);setPreview(null);}} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-white">კომპიუტერი</button><button type="button" aria-pressed={previewMobile} onClick={()=>{setPreviewMobile(true);setPreview(null);}} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-white">ტელეფონი</button><button type="button" onClick={()=>{setEventPreview(null);setPreview({settings:s,character:selectCharacter(s),key:Date.now()});}} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950">ანიმაციის გაშვება</button></div>
    <div data-character-playback data-playing={preview?'true':'false'} className="gs-character-preview mx-auto w-full" data-device={previewMobile?'mobile':'desktop'} style={{maxWidth:previewMobile?320:undefined}}>
      <span className="gs-character-preview-label text-xs">GEOSTORE · {previewMobile?'მობილური':'კომპიუტერი'} · {preview?'ანიმაცია':'გადახედვა'}</span>
      {preview?<PreviewPlayback key={preview.key} preview={preview} lang={lang}/>:<CharacterScene character={selectedCharacter} settings={{...s,behavior:'still'}} lang={lang} preview/>}
    </div>
    <details className="gs-character-admin-section" data-character-calendar onToggle={e=>{if(!e.currentTarget.open)setEventPreview(null);}}>
      <summary className="cursor-pointer text-sm font-bold text-white">ღონისძიებების კალენდარი</summary>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={s.calendarEnabled} disabled={busy} onChange={e=>update({calendarEnabled:e.target.checked})}/> კალენდრის ჩართვა</label>
        <span className="text-xs text-slate-300">თბილისის დრო · {today} · {s.events.length}/{CHARACTER_EVENT_LIMIT}</span>
        <button type="button" disabled={busy||s.events.length>=CHARACTER_EVENT_LIMIT} onClick={addEvent} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950">ღონისძიების დამატება</button>
      </div>
      <p className="text-xs text-slate-300">{activeEvent?'მოქმედი: '+(activeEvent.title||activeEvent.start):'დღეს სპეციალური ღონისძიება არ მოქმედებს.'} პერიოდები მოიცავს ორივე თარიღს. გადაფარვისას ზედა ჩანაწერს აქვს უპირატესობა; სხვა დროს მოქმედებს ჩვეულებრივი მისალმება. სიხშირისა და მოწყობილობის წესები უცვლელია.</p>
      {s.events.length>0&&<div className="space-y-3">
        <label className="block text-xs text-slate-300">ღონისძიება<select aria-label="ღონისძიება" className={field} value={event.id} onChange={e=>{setEventId(e.target.value);setEventPreview(null);}}>{s.events.map(item=><option key={item.id} value={item.id}>{item.title||'ღონისძიება'} · {item.start||'—'} – {item.end||'—'}{item.enabled?' · ჩართული':''}</option>)}</select></label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs text-slate-300">სახელი<input className={field} maxLength={60} value={siteSettings?.characterStudio?.events?.find(item=>item.id===event.id)?.title??event.title} disabled={busy} onChange={e=>updateEvent({title:e.target.value})}/></label>
          <label className="flex items-center gap-2 text-sm text-slate-100"><input type="checkbox" checked={event.enabled} disabled={busy||!event.start||!event.end||event.start>event.end} onChange={e=>updateEvent({enabled:e.target.checked})}/> ღონისძიება ჩართულია</label>
          {['start','end'].map(key=><label key={key} className="block text-xs text-slate-300">{key==='start'?'დაწყების თარიღი':'დასრულების თარიღი'}<input className={field} aria-label={key==='start'?'დაწყების თარიღი':'დასრულების თარიღი'} type="date" min="2000-01-01" max="2099-12-31" value={event[key]} disabled={busy} onChange={e=>updateEvent({[key]:e.target.value,enabled:false})}/></label>)}
          <label className="block text-xs text-slate-300">თემა<select aria-label="თემა" className={field} value={event.theme} disabled={busy} onChange={e=>{const theme=e.target.value,p=CHARACTER_EVENT_THEMES[theme];updateEvent({theme,character:p.character,season:p.season,effect:p.effect,behavior:p.behavior});}}>{Object.entries(CHARACTER_EVENT_THEMES).map(([key,preset])=><option key={key} value={key}>{preset.label}</option>)}</select></label>
          <label className="block text-xs text-slate-300">პერსონაჟი<select aria-label="ღონისძიების პერსონაჟი" className={field} value={event.character} disabled={busy} onChange={e=>updateEvent({character:e.target.value})}>{CHARACTERS.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          {['behavior','effect','season'].map(key=><label className="block text-xs text-slate-300" key={key}>{({behavior:'ანიმაცია',effect:'ეფექტი',season:'აქსესუარი'})[key]}<select aria-label={({behavior:'ანიმაცია',effect:'ეფექტი',season:'აქსესუარი'})[key]} className={field} value={event[key]} disabled={busy} onChange={e=>updateEvent({[key]:e.target.value})}>{choices[key].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>)}
        </div>
        {event.start&&event.end&&event.start>event.end&&<p role="alert" className="text-xs text-rose-300">დასრულება დაწყებამდე ვერ იქნება.</p>}
        {CHARACTER_GREETING_LANGS.map(code=><label key={code} className="block text-xs text-slate-300">მისალმება ({code})<input className={field} aria-label={'მისალმება ('+code+')'} maxLength={120} value={siteSettings?.characterStudio?.events?.find(item=>item.id===event.id)?.messages?.[code]??event.messages[code]} disabled={busy} onChange={e=>updateEvent({messages:{...event.messages,[code]:e.target.value}})}/></label>)}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950" onClick={()=>{const settings=applyCharacterEvent(s,event,lang);setPreview(null);setEventPreview({settings,character:selectCharacter(settings),key:Date.now()});}}>ღონისძიების ანიმაციის ნახვა</button>
          <button type="button" className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-white" disabled={busy||s.events[0].id===event.id} onClick={()=>update({events:[event,...s.events.filter(item=>item.id!==event.id)]})}>უმაღლესი პრიორიტეტი</button>
          <button type="button" className="rounded-lg border border-rose-500/50 px-3 py-2 text-xs text-rose-200" disabled={busy} onClick={()=>{update({events:s.events.filter(item=>item.id!==event.id)});setEventId(null);}}>ღონისძიების წაშლა</button>
        </div>
        {eventPreview&&<div className="gs-character-preview" data-device={previewMobile?'mobile':'desktop'} style={{maxWidth:previewMobile?320:undefined,marginInline:'auto'}}><PreviewPlayback key={eventPreview.key} preview={eventPreview} lang={lang}/></div>}
      </div>}
    </details>
    <details className="gs-character-admin-section" data-character-scenarios>
      <summary>პერსონაჟების სპეციალური სცენარები · {enabledScenarios}/{Object.keys(CHARACTER_SCENARIOS).length}</summary>
      <label className="block space-y-1 text-xs text-slate-300">სცენარი<select aria-label="სცენარი" className={field} value={scenarioKey} onChange={e=>setScenarioKey(e.target.value)}>{Object.entries(CHARACTER_SCENARIOS).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={scenario.enabled} disabled={busy} onChange={e=>updateScenario({enabled:e.target.checked})}/> ამ სცენარის ჩართვა</label>
      <label className="block space-y-1 text-xs text-slate-300">სცენარის პერსონაჟი<select className={field} value={scenario.character} disabled={busy} onChange={e=>updateScenario({character:e.target.value})}>{CHARACTERS.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="block space-y-1 text-xs text-slate-300">სცენარის ტექსტი<textarea className={field} rows={2} maxLength={120} value={siteSettings?.characterStudio?.scenarios?.[scenarioKey]?.message??''} disabled={busy} onChange={e=>updateScenario({message:e.target.value})}/></label>
      <div className="gs-character-preview p-3" data-device={previewMobile?'mobile':'desktop'} style={{maxWidth:previewMobile?320:undefined,marginInline:'auto'}}>{scenarioKey.endsWith('Added')?<div className="flex items-center gap-2 rounded-xl bg-emerald-500 p-3 text-xs font-bold text-slate-950"><span className="min-w-0 flex-1">წარმატებით დაემატა</span><CharacterReaction scenario={scenarioPreview} lang={lang}/></div>:<CharacterContextCard key={scenarioKey+scenario.character} scenario={scenarioPreview} lang={lang}/>}</div>
      <p className="text-xs text-slate-300">ფლეშ აქციების პერსონაჟი ჩანს მხოლოდ მოქმედ აქციებთან. კალათისა და ფავორიტების პერსონაჟები ჩანს მხოლოდ ცარიელ გვერდზე; დამატებით ფანჯარას არ ხსნის. დამატების რეაქცია მხოლოდ წარმატების არსებულ შეტყობინებაში ჩანს, მაქსიმუმ ერთხელ 15 წამში.</p>
    </details>
    <p className="gs-character-admin-save text-xs text-slate-300 leading-relaxed">ცვლილებები საერთო მონახაზშია. გამოიყენეთ ქვემოთ მონახაზის შენახვა და შემდეგ გამოქვეყნება. გადახედვა საიტზე არ ჩანს.</p>
  </section>;
}
function PreviewPlayback({preview,lang}){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setVisible(true),preview.settings.delay*1000);return()=>clearTimeout(timer);},[preview]);
  return visible?<CharacterScene character={preview.character} settings={preview.settings} lang={lang} preview/>:null;
}

function ConciergeFunctionalDemo({settings,lang}){
  const [topic,setTopic]=useState('normal');
  const [number,setNumber]=useState(0);
  const [advice,setAdvice]=useState(null);
  const [notice,setNotice]=useState('');
  const [actions,setActions]=useState(0);
  const [revision,setRevision]=useState(0);
  const copy=CONCIERGE_INTERACTIVE_COPY[lang]||CONCIERGE_INTERACTIVE_COPY.ka;
  const reset=(value=topic)=>{setTopic(value);setNumber(0);setAdvice(null);setNotice('');setActions(0);setRevision(v=>v+1);};
  const sale=topic==='sale',winter=topic==='winter'||topic==='snowman';
  const theme=winter?CHARACTER_EVENT_THEMES[topic==='snowman'?'snowman':'santa']:sale?CHARACTER_EVENT_THEMES.blackfriday:null;
  const themed=theme?{...settings,character:theme.character,rotation:'fixed',season:theme.season,effect:winter&&!settings.winterEffects?'none':theme.effect,behavior:theme.behavior,message:theme.lines[lang]||theme.lines.ka}:settings;
  const character=selectCharacter({...themed,rotation:'fixed'});
  const configured=applyCharacterProfile(themed,character.id,lang,{preserveEvent:!!theme});
  const effective={...configured,appearance:{...configured.appearance,renderMode:'vector'},behavior:configured.behavior==='still'?'wave':configured.behavior};
  const canProduct=sale?effective.saleGuide:effective.recommendProducts;
  const names=lang==='en'?['Sample wallet','Sample bag','Sample accessory']:lang==='ru'?['Пример кошелька','Пример сумки','Пример аксессуара']:['საცდელი საფულე','საცდელი ჩანთა','საცდელი აქსესუარი'];
  const recommendation=canProduct?{id:'demo-'+number,name:names[number%names.length],...(sale?{sale:true,price:35+number*5,oldPrice:45+number*5,savings:10}:{})}:null;
  const firstAdvice=effective.advice.enabled?chooseConciergeAdvice(effective.advice,{characterId:character.id,lang,hasProduct:!!recommendation}):null;
  const act=fn=>{if(actions>=4)return;setActions(v=>v+1);fn();};
  return <div className="gs-concierge-demo-content">
    <label className="block text-xs text-slate-300">სატესტო სიტუაცია<select aria-label="სატესტო სიტუაცია" className={field} value={topic} onChange={e=>reset(e.target.value)}><option value="normal">ჩვეულებრივი რეკომენდაცია</option><option value="sale">მოქმედი აქციის მაგალითი</option><option value="winter">Santa — საჩუქრის რჩევა</option><option value="snowman">Snowy — ზამთრის ეფექტი</option><option value="guide">განყოფილებაზე მინიშნება</option></select></label>
    <p className="text-xs text-slate-300">სატესტო მონაცემები და პირობითი ფასები. ღილაკები არ ხსნის ნამდვილ პროდუქტს და არ ცვლის საიტის მონაცემებს.</p>
    {((sale&&!settings.saleGuide)||(winter&&!settings.winterCelebration)||(topic==='guide'&&!settings.guideLinks))&&<p role="status" className="text-xs text-amber-300">ეს შესაძლებლობა მონახაზში გამორთულია — ჩართე შესაბამისი ფუნქციის ღილაკით.</p>}
    <div className="gs-character-preview gs-concierge-demo-stage" data-device="mobile"><CharacterScene key={revision} character={character} settings={effective} lang={lang} preview interactivePreview advice={advice||(winter?null:firstAdvice)} recommendation={topic==='guide'?null:recommendation} guideTarget={settings.guideLinks?'products':null} onGuide={()=>setNotice('საცდელი მოქმედება: პროდუქტების განყოფილებაზე გადასვლა')} onRecommend={()=>setNotice('საცდელი მოქმედება: '+recommendation?.name+' — პროდუქტის გახსნა')} actionCount={actions} interactionNotice={notice} onNextTip={()=>act(()=>{setAdvice(nextConciergeAdvice(effective.advice,advice||firstAdvice,{lang,index:actions}));setNotice('');})} onNextProduct={topic==='guide'?undefined:canProduct?()=>act(()=>{setNumber(v=>(v+1)%names.length);setNotice('');}):undefined} onThanks={()=>act(()=>setNotice(copy.reply))}/></div>
    <div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-300">მოქმედება: {actions}/4</span><button type="button" className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-white min-h-[44px]" onClick={()=>reset()}>გამოცდის თავიდან დაწყება</button></div>
  </div>;
}
