import React,{useEffect,useMemo,useRef,useState} from 'react';
import {PUBLIC_AVATARS,AVATAR_BACKGROUNDS,AVATAR_BG,DEFAULT_AVATAR,OWNER_AVATAR_IDS} from '../utils/customerAvatarCatalog.js';
import {avatarDataUri} from '../utils/customerAvatarArt.js';
import {loadAvatarProfile,saveAvatarProfile} from '../utils/customerAvatarProfile.js';
import './customerAvatarStudio.css';
const copy={
 ka:{title:'ჩემი 3D ავატარი',edit:'ავატარის შეცვლა',choose:'აირჩიე პერსონაჟი',all:'ყველა',boy:'ბიჭებისთვის',girl:'გოგოებისთვის',animal:'ცხოველები',fantasy:'ფანტაზია',owner:'მფლობელის ექსკლუზივი',background:'ფონის ფერი',preview:'წინასწარი ნახვა',save:'შენახვა',cancel:'დახურვა',saved:'ავატარი შენახულია.',loading:'იტვირთება…',error:'ავატარის მონაცემები ვერ დადასტურდა. სცადე ხელახლა.',ownerError:'ექსკლუზიური ავატარები დროებით მიუწვდომელია.',retry:'განახლება',note:'შენახული არჩევანი მიბმულია შენს ანგარიშზე.',default:'საწყისი ავატარი'},
 en:{title:'My 3D-style avatar',edit:'Change avatar',choose:'Choose character',all:'All',boy:'Boys',girl:'Girls',animal:'Animals',fantasy:'Fantasy',owner:'Owner exclusives',background:'Background',preview:'Preview',save:'Save',cancel:'Close',saved:'Avatar saved.',loading:'Loading…',error:'Avatar data could not be verified. Try again.',ownerError:'Exclusive avatars temporarily unavailable.',retry:'Refresh',note:'Your saved selection follows your account.',default:'Default avatar'},
 ru:{title:'Мой 3D-аватар',edit:'Изменить аватар',choose:'Выбрать персонажа',all:'Все',boy:'Парни',girl:'Девушки',animal:'Животные',fantasy:'Фантазия',owner:'Эксклюзив владельца',background:'Фон',preview:'Предпросмотр',save:'Сохранить',cancel:'Закрыть',saved:'Аватар сохранён.',loading:'Загрузка…',error:'Не удалось подтвердить данные аватара. Повторите попытку.',ownerError:'Эксклюзивные аватары временно недоступны.',retry:'Обновить',note:'Выбор сохраняется в вашем аккаунте.',default:'Аватар по умолчанию'}
};
export default function CustomerAvatarStudio({ownerId,ownerAccess,lang='ka',auth,supabaseUrl,apiKey,isCurrentOwner}){
 const words=copy[lang]||copy.ka;
 const [saved,setSaved]=useState(DEFAULT_AVATAR),[draft,setDraft]=useState(DEFAULT_AVATAR),[exclusive,setExclusive]=useState([]),[open,setOpen]=useState(false),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(false),[ownerError,setOwnerError]=useState(false),[success,setSuccess]=useState(false);
 const current=useRef(isCurrentOwner);current.current=isCurrentOwner;
 const mounted=useRef(true),lock=useRef(false),openRef=useRef(false),access=useRef(ownerAccess);access.current=ownerAccess;
 const config={auth,ownerId,supabaseUrl,apiKey,isCurrentOwner:()=>mounted.current&&current.current()};
 const refresh=async()=>{
  if(lock.current||!mounted.current)return;
  lock.current=true;setBusy(true);setError(false);
  try{const result=await loadAvatarProfile(config);if(!config.isCurrentOwner())return;setSaved(result.choice);if(!openRef.current)setDraft(result.choice);setExclusive(access.current?result.exclusive:[]);setOwnerError(result.exclusiveUnavailable);setLoaded(true);}
  catch{if(config.isCurrentOwner()){setError(true);setLoaded(false);setExclusive([]);}}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 useEffect(()=>{mounted.current=true;void refresh();const visible=()=>{if(document.visibilityState==='visible'&&!openRef.current)void refresh();};document.addEventListener('visibilitychange',visible);return()=>{mounted.current=false;document.removeEventListener('visibilitychange',visible);};},[ownerId,ownerAccess]);
 const publicRows=useMemo(()=>PUBLIC_AVATARS.map(a=>({...a,src:avatarDataUri(a)})),[]);
 const ownerRows=ownerAccess?exclusive.map(a=>({...a,category:'owner'})):[];
 const rows=[...publicRows,...ownerRows];
 const label=a=>a?.label?.[lang]||a?.label?.ka||words.default;
 const getRow=id=>rows.find(a=>a.id===id)||publicRows[0];
 const show=choice=>{const row=getRow(choice.id);return <span className="gs-avatar-picture" style={{background:AVATAR_BG[choice.background]||AVATAR_BG.sand}}><img src={row.src} alt={label(row)} width="160" height="160" draggable={false}/></span>};
 const save=async()=>{
  if(lock.current||!loaded||!config.isCurrentOwner()||(OWNER_AVATAR_IDS.includes(draft.id)&&!ownerRows.some(a=>a.id===draft.id)))return;
  lock.current=true;setBusy(true);setError(false);setSuccess(false);
  try{const choice=await saveAvatarProfile(config,draft);if(!config.isCurrentOwner())return;setSaved(choice);setDraft(choice);setSuccess(true);setOpen(false);openRef.current=false;}
  catch{if(config.isCurrentOwner())setError(true);}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 };
 return <section className="gs-avatar-studio" aria-label={words.title} aria-busy={busy}>
  <div className="gs-avatar-summary">{show(saved)}<div><h3>{words.title}</h3><p>{words.note}</p><button type="button" disabled={busy||!loaded} onClick={()=>{setDraft(saved);setFilter('all');setSuccess(false);setOpen(true);openRef.current=true;}}>{words.edit}</button></div></div>
  {busy&&!loaded&&<p role="status">{words.loading}</p>}
  {success&&<p role="status">{words.saved}</p>}
  {error&&<div role="alert"><p>{words.error}</p><button type="button" disabled={busy} onClick={()=>{openRef.current=false;setOpen(false);void refresh();}}>{words.retry}</button></div>}
  {ownerAccess&&ownerError&&<p role="status">{words.ownerError}</p>}
  {open&&<div className="gs-avatar-editor">
   <div className="gs-avatar-preview">{show(draft)}<div><strong>{words.preview}</strong><p>{label(getRow(draft.id))}</p></div></div>
   <h4>{words.choose}</h4><div className="gs-avatar-filters" role="group" aria-label={words.choose}>{['all','boy','girl','animal','fantasy',...(ownerRows.length?['owner']:[])].map(k=><button type="button" key={k} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{words[k]}</button>)}</div>
   <div className="gs-avatar-grid">{rows.filter(a=>filter==='all'||a.category===filter).map(a=><button type="button" key={a.id} aria-pressed={draft.id===a.id} aria-label={label(a)} onClick={()=>setDraft(d=>({...d,id:a.id}))}><span className="gs-avatar-picture" style={{background:AVATAR_BG[draft.background]}}><img src={a.src} alt="" width="160" height="160" loading="lazy" decoding="async" draggable={false}/></span><span>{label(a)}</span></button>)}</div>
   <h4>{words.background}</h4><div className="gs-avatar-colors" role="group" aria-label={words.background}>{AVATAR_BACKGROUNDS.map((bg,i)=><button type="button" key={bg} aria-label={words.background+' '+(i+1)} aria-pressed={draft.background===bg} onClick={()=>setDraft(d=>({...d,background:bg}))} style={{background:AVATAR_BG[bg]}}>{draft.background===bg?'✓':''}</button>)}</div>
   <div className="gs-avatar-editor-actions"><button type="button" disabled={busy||!loaded||(draft.id===saved.id&&draft.background===saved.background)||(OWNER_AVATAR_IDS.includes(draft.id)&&!ownerRows.some(a=>a.id===draft.id))} onClick={save}>{words.save}</button><button type="button" disabled={busy} onClick={()=>{setOpen(false);openRef.current=false;setDraft(saved);}}>{words.cancel}</button></div>
  </div>}
 </section>;
}
