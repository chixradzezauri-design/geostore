import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import StorefrontMediaLibrary from './StorefrontMediaLibrary';
import { Save, Eye, Globe, History, RotateCcw, Plus, Trash2, ChevronUp, ChevronDown, Monitor, Smartphone, Tablet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const CONFIG_KEY = 'geostore-homepage';
const DEFAULT_SECTIONS = [
  { id: 'hero', type: 'hero', title: 'მთავარი ბანერი', visible: true },
  { id: 'categories', type: 'categories', title: 'კატეგორიები', visible: true },
  { id: 'featured', type: 'featured', title: 'რჩეული პროდუქტები', visible: true },
  { id: 'promo', type: 'promo', title: 'სარეკლამო ბლოკები', visible: true }
];

const buildLegacyConfig = ({ siteSettings, bannersList, categoriesList }) => ({
  schemaVersion: 1,
  siteSettings: siteSettings || {},
  banners: Array.isArray(bannersList) ? bannersList : [],
  categories: Array.isArray(categoriesList) ? categoriesList : [],
  sections: DEFAULT_SECTIONS,
  seo: { title: siteSettings?.storeName || 'GEOSTORE', description: '', socialImage: '' },
  popup: { enabled: false, title: '', message: '', image: '', ctaText: '', ctaUrl: '' }
});

const validateCategoryConfig = (categories = []) => {
  const names = new Map();
  const ids = new Map();
  for (const [index, category] of categories.entries()) {
    const item = typeof category === 'string' ? { name: category } : category || {};
    const name = String(item.name || '').trim();
    if (!name) return `კატეგორია #${index + 1}: სახელი ცარიელია.`;
    const normalized = name.toLocaleLowerCase();
    if (names.has(normalized)) return `კატეგორიის სახელი დუბლირებულია: "${name}". სახელები უნიკალური უნდა იყოს.`;
    names.set(normalized, true);
    if (item.id) {
      if (ids.has(item.id)) return `კატეგორიის ID დუბლირებულია: ${item.id}.`;
      ids.set(item.id, item);
    }
  }
  for (const [index, category] of categories.entries()) {
    if (!category || typeof category !== 'object' || !category.parentId) continue;
    const parent = ids.get(category.parentId);
    if (!parent) return `ქვეკატეგორია #${index + 1}: მთავარი კატეგორია ვერ მოიძებნა.`;
    if (parent.id === category.id) return 'კატეგორია საკუთარ თავზე ვერ იქნება მიბმული.';
    if (parent.parentId) return 'ქვეკატეგორიების ჩაშენება მეორე დონეზე არ არის მხარდაჭერილი. აირჩიეთ მთავარი კატეგორია.';
  }
  return '';
};

export default function StorefrontStudio({ siteSettings, bannersList, categoriesList }) {
  const [config, setConfig] = useState(() => buildLegacyConfig({ siteSettings, bannersList, categoriesList }));
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [activePanel, setActivePanel] = useState('home');
  const [isDirty, setIsDirty] = useState(false);
  const [configExists, setConfigExists] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: readError } = await supabase
        .from('storefront_config')
        .select('draft_config,published_config,is_published,draft_updated_at,published_at')
        .eq('config_key', CONFIG_KEY)
        .maybeSingle();
      if (readError) throw readError;
      setConfigExists(!!data);
      if (data?.draft_config) setConfig(data.draft_config);
      const { data: history, error: historyError } = await supabase
        .from('storefront_versions')
        .select('id,snapshot,version_label,created_at')
        .eq('config_key', CONFIG_KEY)
        .order('created_at', { ascending: false })
        .limit(20);
      if (historyError) throw historyError;
      setVersions(history || []);
    } catch (e) {
      setError(e?.message || 'მონაცემების ჩატვირთვა ვერ მოხერხდა. გადაამოწმეთ ადმინისტრატორის წვდომა.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (path, value) => {
    setConfig(prev => {
      const next = { ...prev };
      if (path === 'siteSettings') next.siteSettings = { ...prev.siteSettings, ...value };
      else if (path === 'seo') next.seo = { ...prev.seo, ...value };
      else if (path === 'popup') next.popup = { ...prev.popup, ...value };
      else next[path] = value;
      return next;
    });
    setIsDirty(true);
    setMessage('');
  };

  const saveDraft = async () => {
    const categoryError = validateCategoryConfig(config.categories || []);
    if (categoryError) { setError(categoryError); setMessage(''); return; }
    setSaving(true); setError(''); setMessage('');
    let draftSaved = false;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const payload = {
        draft_config: config,
        draft_updated_at: new Date().toISOString(),
        updated_by: authData?.user?.id || null
      };
      const saveQuery = configExists
        ? supabase.from('storefront_config').update(payload).eq('config_key', CONFIG_KEY)
        : supabase.from('storefront_config').insert({ ...payload, config_key: CONFIG_KEY });
      const { error: saveError } = await saveQuery;
      if (saveError) throw saveError;
      draftSaved = true;
      const { error: versionError } = await supabase.from('storefront_versions').insert({
        config_key: CONFIG_KEY, snapshot: config, version_label: 'Draft-ის შენახვა',
        created_by: authData?.user?.id || null
      });
      if (versionError) throw versionError;
      setConfigExists(true); setIsDirty(false); setMessage('Draft წარმატებით შეინახა.');
      await load();
    } catch (e) {
      if (draftSaved) { setConfigExists(true); setIsDirty(false); setError('Draft შენახულია, მაგრამ Version History ჩანაწერი ვერ დაემატა. ხელახლა სცადეთ შენახვა. ' + (e?.message || '')); }
      else setError(e?.message || 'Draft-ის შენახვა ვერ მოხერხდა.');
    }
    finally { setSaving(false); }
  };

  const publish = async () => {
    const categoryError = validateCategoryConfig(config.categories || []);
    if (categoryError) { setError(categoryError); setMessage(''); return; }
    if (!window.confirm('გამოქვეყნდეს ეს ვერსია საიტის ვიზუალურ კონფიგურაციად?')) return;
    setPublishing(true); setError(''); setMessage('');
    let published = false;
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const { error: saveError } = await supabase.from('storefront_config').upsert({
        config_key: CONFIG_KEY, draft_config: config, published_config: config,
        is_published: true, draft_updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(), updated_by: authData?.user?.id || null
      }, { onConflict: 'config_key' });
      if (saveError) throw saveError;
      published = true;
      const { error: versionError } = await supabase.from('storefront_versions').insert({
        config_key: CONFIG_KEY, snapshot: config, version_label: 'გამოქვეყნებული ვერსია',
        created_by: authData?.user?.id || null
      });
      if (versionError) throw versionError;
      setConfigExists(true); setIsDirty(false); setMessage('ვერსია გამოქვეყნდა. საჯარო გვერდი ახალ კონფიგურაციას ჩატვირთავს განახლებისას.');
      await load();
    } catch (e) {
      if (published) { setConfigExists(true); setIsDirty(false); setError('კონფიგურაცია გამოქვეყნებულია, მაგრამ Version History ჩანაწერი ვერ დაემატა. ' + (e?.message || '')); }
      else setError(e?.message || 'გამოქვეყნება ვერ მოხერხდა.');
    }
    finally { setPublishing(false); }
  };

  const restore = (snapshot) => {
    if (!window.confirm('აღდგეს ეს ვერსია მიმდინარე Draft-ში? გამოქვეყნება ავტომატურად არ მოხდება.')) return;
    setConfig(snapshot); setIsDirty(true); setMessage('ვერსია აღდგენილია Draft-ში. შეინახეთ ცვლილება დასადასტურებლად.');
  };

  const moveSection = (index, direction) => {
    const next = [...(config.sections || DEFAULT_SECTIONS)];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update('sections', next);
  };

  const addSection = () => {
    const sections = [...(config.sections || DEFAULT_SECTIONS)];
    sections.push({ id: 'custom-' + Date.now(), type: 'custom', title: 'ახალი სექცია', visible: true });
    update('sections', sections);
  };

  const panelItems = [
    ['home', 'მთავარი გვერდი'], ['banners', 'ბანერები'], ['categories', 'კატეგორიები'],
    ['design', 'დიზაინი და ტექსტები'], ['seo', 'SEO'], ['popup', 'Popup'],
    ['media', 'მედიაბიბლიოთეკა'], ['history', 'ვერსიების ისტორია']
  ];

  if (loading) return <div className="rounded-3xl bg-white p-8 text-slate-700 flex items-center gap-3"><Loader2 className="animate-spin" /> Storefront Studio იტვირთება...</div>;

  return (
    <div className="space-y-5 text-slate-800">
      <div className="rounded-3xl border border-stone-200 bg-[#fbfaf7] p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-stone-500">GEOSTORE / ADMIN</p><h2 className="mt-1 text-2xl font-black">Storefront Studio</h2><p className="mt-1 text-sm text-stone-600">საიტის ვიზუალური მართვა — Draft, Preview და ვერსიების ისტორია</p></div>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveDraft} disabled={saving || !isDirty} className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2"><Save size={16}/>{saving ? 'ინახება...' : 'Draft შენახვა'}</button>
            <button onClick={publish} disabled={publishing || isDirty} className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold disabled:opacity-40 flex items-center gap-2"><Globe size={16}/>{publishing ? 'მუშავდება...' : 'გამოქვეყნება'}</button>
          </div>
        </div>
        {isDirty && <p className="mt-3 text-xs font-semibold text-amber-700">შეუნახავი ცვლილებები გაქვთ.</p>}
        {message && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={16}/>{message}</p>}
        {error && <p className="mt-3 flex items-center gap-2 text-sm text-rose-700"><AlertCircle size={16}/>{error}</p>}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
        <nav className="rounded-3xl border border-stone-200 bg-white p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-1 gap-2 h-fit">
          {panelItems.map(([id,label]) => <button key={id} onClick={() => setActivePanel(id)} className={'rounded-xl px-3 py-3 text-left text-sm font-bold '+(activePanel===id?'bg-stone-900 text-white':'bg-stone-50 text-stone-700 hover:bg-stone-100')}>{label}</button>)}
        </nav>
        <section className="min-w-0 rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 space-y-5">
          {activePanel === 'home' && <>
            <div><h3 className="text-lg font-black">მთავარი გვერდის სექციები</h3><p className="text-sm text-stone-500">გადაალაგეთ, დამალეთ ან დაამატეთ გვერდის ბლოკები. ეს ჯერ Preview/Draft კონფიგურაციაა.</p></div>
            {(config.sections || DEFAULT_SECTIONS).map((section,index) => <div key={section.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 p-3">
              <div className="min-w-0 flex-1"><input value={section.title} onChange={e=>update('sections',(config.sections||DEFAULT_SECTIONS).map(s=>s.id===section.id?{...s,title:e.target.value}:s))} className="w-full rounded-lg border border-stone-200 px-3 py-2 font-bold"/><p className="mt-1 text-xs text-stone-500">{section.type}</p></div>
              <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={section.visible!==false} onChange={e=>update('sections',(config.sections||DEFAULT_SECTIONS).map(s=>s.id===section.id?{...s,visible:e.target.checked}:s))}/> გამოჩენა</label>
              <button onClick={()=>moveSection(index,-1)} className="rounded-lg bg-stone-100 p-2" aria-label="ზემოთ"><ChevronUp size={17}/></button>
              <button onClick={()=>moveSection(index,1)} className="rounded-lg bg-stone-100 p-2" aria-label="ქვემოთ"><ChevronDown size={17}/></button>
              <button onClick={()=>update('sections',(config.sections||DEFAULT_SECTIONS).filter(s=>s.id!==section.id))} className="rounded-lg bg-rose-50 p-2 text-rose-600" aria-label="წაშლა"><Trash2 size={17}/></button>
            </div>)}
            <button onClick={addSection} className="rounded-xl border border-dashed border-stone-400 px-4 py-3 text-sm font-bold flex items-center gap-2"><Plus size={16}/> სექციის დამატება</button>
            <div className="rounded-2xl bg-stone-50 p-4"><h4 className="font-bold">მოწყობილობის Preview</h4><div className="mt-3 flex gap-2">{[['desktop',Monitor],['tablet',Tablet],['mobile',Smartphone]].map(([id,Icon])=><button key={id} onClick={()=>setPreviewDevice(id)} className={'rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-bold '+(previewDevice===id?'bg-stone-900 text-white':'bg-white border border-stone-200')}><Icon size={15}/>{id}</button>)}</div><div className="mt-4 flex justify-center rounded-2xl bg-stone-200 p-4"><div className={'rounded-xl border border-stone-300 bg-white p-4 shadow-sm '+(previewDevice==='mobile'?'w-56':previewDevice==='tablet'?'w-3/4':'w-full')}><div className="text-xs font-black tracking-widest">GEOSTORE</div><div className="mt-4 rounded-lg bg-stone-100 p-5"><p className="text-lg font-black">{config.siteSettings?.heroTitle || config.siteSettings?.storeName || 'GEOSTORE — ახალი კოლექცია'}</p><p className="mt-1 text-xs text-stone-500">{config.siteSettings?.heroSubtitle || 'აღმოაჩინე შენი სტილი'}</p></div>{(config.sections||[]).filter(s=>s.visible!==false).map(s=><div key={s.id} className="mt-3 rounded-lg border border-dashed border-stone-300 p-3 text-xs font-bold">{s.title}</div>)}</div></div><p className="mt-2 text-xs text-stone-500">ეს არის ადმინისტრაციული ვიზუალური მონახაზი და არა ჯერ ცოცხალი storefront preview.</p></div>
          </>}
          {activePanel === 'banners' && <>
            <div><h3 className="text-lg font-black">ბანერების მართვა</h3><p className="text-sm text-stone-500">არსებული ბანერები გადმოტანილია მიმდინარე აპის მდგომარეობიდან.</p></div>
            {(config.banners||[]).map((banner,index)=><div key={banner.id||index} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-stone-200 p-3">
              <input value={banner.title||''} placeholder="სათაური" onChange={e=>update('banners',config.banners.map((b,i)=>i===index?{...b,title:e.target.value}:b))} className="rounded-lg border border-stone-200 p-3"/>
              <input value={banner.subtitle||''} placeholder="ქვესათაური" onChange={e=>update('banners',config.banners.map((b,i)=>i===index?{...b,subtitle:e.target.value}:b))} className="rounded-lg border border-stone-200 p-3"/>
              <input value={banner.image||''} placeholder="სურათის URL" onChange={e=>update('banners',config.banners.map((b,i)=>i===index?{...b,image:e.target.value}:b))} className="rounded-lg border border-stone-200 p-3 sm:col-span-2"/>
              <input value={banner.ctaText||''} placeholder="ღილაკის ტექსტი" onChange={e=>update('banners',config.banners.map((b,i)=>i===index?{...b,ctaText:e.target.value}:b))} className="rounded-lg border border-stone-200 p-3"/>
              <input value={banner.ctaUrl||''} placeholder="ღილაკის ბმული" onChange={e=>update('banners',config.banners.map((b,i)=>i===index?{...b,ctaUrl:e.target.value}:b))} className="rounded-lg border border-stone-200 p-3"/>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={banner.visible!==false} onChange={e=>update('banners',config.banners.map((b,i)=>i===index?{...b,visible:e.target.checked}:b))}/> გამოჩენა</label>
              <div className="flex gap-2"><button onClick={()=>{const next=[...config.banners];if(index>0){[next[index-1],next[index]]=[next[index],next[index-1]];update('banners',next);}}} className="rounded-lg bg-stone-100 px-3 py-2 text-xs">↑</button><button onClick={()=>{const next=[...config.banners];if(index<next.length-1){[next[index+1],next[index]]=[next[index],next[index+1]];update('banners',next);}}} className="rounded-lg bg-stone-100 px-3 py-2 text-xs">↓</button></div>
              <button onClick={()=>update('banners',config.banners.filter((_,i)=>i!==index))} className="justify-self-start rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">ბანერის წაშლა</button>
            </div>)}
            <button onClick={()=>update('banners',[...(config.banners||[]),{id:'banner-'+Date.now(),title:'ახალი ბანერი',subtitle:'',image:''}])} className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white flex items-center gap-2"><Plus size={16}/> ბანერის დამატება</button>
          </>}
          {activePanel === 'categories' && <>
            <div><h3 className="text-lg font-black">კატეგორიებისა და ქვეკატეგორიების მართვა</h3><p className="text-sm text-stone-500">სახელი, სურათი, ხილვადობა და რიგითობა. გამოქვეყნების შემდეგ დამალული კატეგორია მაღაზიაში აღარ გამოჩნდება.</p></div>
            {(config.categories||[]).map((cat,index)=><div key={cat.id||index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border border-stone-200 p-3">
              <input value={cat.name||''} placeholder="კატეგორიის სახელი" onChange={e=>update('categories',config.categories.map((item,i)=>{if(i!==index)return item;const nextName=e.target.value;const oldName=item.name;const aliases=Array.isArray(item.aliases)?item.aliases:[];return {...item,name:nextName,aliases:oldName&&oldName!==nextName&&!aliases.includes(oldName)?[...aliases,oldName]:aliases};}))} className="rounded-lg border border-stone-200 p-3"/>
              <input value={cat.image||cat.img||''} placeholder="სურათის URL" onChange={e=>update('categories',config.categories.map((item,i)=>i===index?{...item,image:e.target.value}:item))} className="rounded-lg border border-stone-200 p-3"/>
              <select value={cat.parentId || ''} onChange={e=>update('categories',config.categories.map((item,i)=>i===index?{...item,parentId:e.target.value||null}:item))} className="rounded-lg border border-stone-200 p-3 text-sm"><option value="">მთავარი კატეგორია</option>{config.categories.filter(item=>item.id!==cat.id && !item.parentId).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={cat.visible!==false} onChange={e=>update('categories',config.categories.map((item,i)=>i===index?{...item,visible:e.target.checked}:item))}/> გამოჩენა</label>
                <button onClick={()=>{const next=[...config.categories];if(index>0){[next[index-1],next[index]]=[next[index],next[index-1]];update('categories',next);}}} className="rounded-lg bg-stone-100 px-2 py-2 text-xs">↑</button>
                <button onClick={()=>{const next=[...config.categories];if(index<next.length-1){[next[index+1],next[index]]=[next[index],next[index+1]];update('categories',next);}}} className="rounded-lg bg-stone-100 px-2 py-2 text-xs">↓</button>
                <button onClick={()=>{const children=config.categories.filter(item=>item.parentId===cat.id);if(children.length){window.alert('ამ კატეგორიას აქვს ქვეკატეგორიები. ჯერ გადაიყვანეთ ისინი სხვა მთავარ კატეგორიაში ან გახადეთ მთავარ კატეგორიებად, შემდეგ წაშალეთ.');return;}if(!window.confirm('წაიშალოს კატეგორია?'))return;update('categories',config.categories.filter((_,i)=>i!==index));}} className="rounded-lg bg-rose-50 px-2 py-2 text-xs text-rose-700">წაშლა</button></div>
            </div>)}
            <button onClick={()=>update('categories',[...(config.categories||[]),{id:'category-'+Date.now(),name:'ახალი კატეგორია',parentId:null,visible:true,image:''}])} className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white">+ კატეგორიის დამატება</button>
          </>}
          {activePanel === 'design' && <><h3 className="text-lg font-black">დიზაინი და ტექსტები</h3><label className="block text-sm font-semibold">მაღაზიის სახელი<input value={config.siteSettings?.storeName||''} onChange={e=>update('siteSettings',{storeName:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label><label className="block text-sm font-semibold">მთავარი სათაური<input value={config.siteSettings?.heroTitle||''} onChange={e=>update('siteSettings',{heroTitle:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label><label className="block text-sm font-semibold">მთავარი აღწერა<textarea value={config.siteSettings?.heroSubtitle||''} onChange={e=>update('siteSettings',{heroSubtitle:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label><label className="block text-sm font-semibold">ზედა ზოლის ტექსტი<input value={config.siteSettings?.topBarText||''} onChange={e=>update('siteSettings',{topBarText:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label></>}
          {activePanel === 'seo' && <><h3 className="text-lg font-black">SEO პარამეტრები</h3><label className="block text-sm font-semibold">გვერდის სათაური<input value={config.seo?.title||''} onChange={e=>update('seo',{title:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label><label className="block text-sm font-semibold">Meta აღწერა<textarea value={config.seo?.description||''} onChange={e=>update('seo',{description:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label><label className="block text-sm font-semibold">Social image URL<input value={config.seo?.socialImage||''} onChange={e=>update('seo',{socialImage:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label></>}
          {activePanel === 'popup' && <><h3 className="text-lg font-black">Popup Studio</h3><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!config.popup?.enabled} onChange={e=>update('popup',{enabled:e.target.checked})}/> Popup ჩართულია</label><label className="block text-sm font-semibold">სათაური<input value={config.popup?.title||''} onChange={e=>update('popup',{title:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label><label className="block text-sm font-semibold">შეტყობინება<textarea value={config.popup?.message||''} onChange={e=>update('popup',{message:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label><label className="block text-sm font-semibold">სურათის URL<input value={config.popup?.image||''} onChange={e=>update('popup',{image:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label><label className="block text-sm font-semibold">ღილაკის ტექსტი<input value={config.popup?.ctaText||''} onChange={e=>update('popup',{ctaText:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label><label className="block text-sm font-semibold">ღილაკის ბმული<input value={config.popup?.ctaUrl||''} onChange={e=>update('popup',{ctaUrl:e.target.value})} className="mt-1 w-full rounded-xl border border-stone-200 p-3"/></label></>}
          {activePanel === 'media' && <StorefrontMediaLibrary />}
          {activePanel === 'history' && <><h3 className="text-lg font-black flex items-center gap-2"><History size={18}/> ვერსიების ისტორია</h3>{versions.length===0?<p className="text-sm text-stone-500">შენახული ვერსიები ჯერ არ არის.</p>:versions.map(v=><div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 p-3"><div><p className="text-sm font-bold">{v.version_label||'ვერსია'}</p><p className="text-xs text-stone-500">{new Date(v.created_at).toLocaleString('ka-GE')}</p></div><button onClick={()=>restore(v.snapshot)} className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-bold flex items-center gap-2"><RotateCcw size={14}/> Draft-ში აღდგენა</button></div>)}</>}
        </section>
      </div>
    </div>
  );
}
