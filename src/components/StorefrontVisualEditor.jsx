import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronUp, Monitor, RotateCcw, RotateCw,
  Save, Smartphone, Upload, Palette, Type, Layout, Image as ImageIcon
} from 'lucide-react';
import StoreView from './StoreView';
import {
  DEFAULT_STOREFRONT_VISUAL_DESIGN,
  normalizeStorefrontVisualDesign,
  buildStorefrontVisualStyle
} from '../utils/storefrontVisualDesign.js';

const NOOP = () => {};
const SECTION_LABELS = {
  hero: 'მთავარი ბლოკი (Hero)',
  banners: 'სარეკლამო ბანერები',
  flashSale: 'Flash Sale',
  categories: 'კატეგორიები',
  filters: 'ფილტრები და დალაგება',
  products: 'პროდუქტების კატალოგი'
};
const THEME_PRESETS = {
  luxury: {
    canvas: '#f7f4ef', surface: '#fffdfa', surfaceSoft: '#f0ebe4',
    ink: '#29241f', muted: '#776b60', line: '#e6ddd3',
    accent: '#92785f', accentDark: '#302a24',
    buttonBackground: '#29241f', buttonText: '#ffffff', heroText: '#25201c'
  },
  dark: {
    canvas: '#171411', surface: '#24201c', surfaceSoft: '#302a24',
    ink: '#f7f1e9', muted: '#c2b5a7', line: '#4a4037',
    accent: '#d4a373', accentDark: '#241d17',
    buttonBackground: '#d4a373', buttonText: '#1d1712', heroText: '#ffffff'
  },
  clean: {
    canvas: '#ffffff', surface: '#f7f7f7', surfaceSoft: '#eeeeee',
    ink: '#171717', muted: '#666666', line: '#dddddd',
    accent: '#2563eb', accentDark: '#1d4ed8',
    buttonBackground: '#171717', buttonText: '#ffffff', heroText: '#171717'
  }
};

function ColorControl({ label, value, onChange }) {
  return (
    <label className="gs-visual-color-control flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5">
      <span className="min-w-0 text-xs font-semibold text-slate-200">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        <code className="text-[10px] text-slate-500">{value}</code>
        <input type="color" value={value} onChange={event => onChange(event.target.value)} aria-label={label} className="h-9 w-11 cursor-pointer rounded-lg border border-slate-600 bg-transparent p-1" />
      </span>
    </label>
  );
}

function RangeControl({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <label className="block space-y-2 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-200">
        <span>{label}</span>
        <strong className="text-emerald-300 tabular-nums">{value}{unit}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} className="w-full accent-emerald-400" />
    </label>
  );
}

export default function StorefrontVisualEditor({
  siteSettings = {},
  setSiteSettings,
  categoriesList = [],
  bannersList = [],
  products = [],
  formatPrice,
  isOwner = false,
  onSaveStorefrontDraft,
  storefrontDraftBusy = false,
  onPublishStorefront,
  storefrontPublishBusy = false
}) {
  const initialDesign = normalizeStorefrontVisualDesign(siteSettings?.visualDesign);
  const [design, setDesign] = useState(initialDesign);
  const [history, setHistory] = useState([initialDesign]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyRef = useRef([initialDesign]);
  const historyIndexRef = useRef(0);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [previewCategory, setPreviewCategory] = useState('ყველა');
  const [saveMessage, setSaveMessage] = useState('');
  const previewStyle = useMemo(() => buildStorefrontVisualStyle(design), [design]);
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categoriesList) ? categoriesList : [];
  const safeBanners = Array.isArray(bannersList) ? bannersList : [];

  const commitDesign = nextValue => {
    const next = normalizeStorefrontVisualDesign(nextValue);
    const nextHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), next].slice(-40);
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setDesign(next);
    if (typeof setSiteSettings === 'function') {
      setSiteSettings(current => ({ ...(current || {}), visualDesign: next }));
    }
    setSaveMessage('ცვლილებები მონახაზში ჯერ არ შენახულა.');
  };

  const updateGroup = (group, key, value) => {
    commitDesign({ ...design, [group]: { ...design[group], [key]: value } });
  };

  const updateSiteText = (key, value) => {
    if (typeof setSiteSettings === 'function') setSiteSettings(current => ({ ...(current || {}), [key]: value }));
    setSaveMessage('ტექსტის ცვლილებები მონახაზში ჯერ არ შენახულა.');
  };

  const handleHeroFileChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setSaveMessage('აირჩიეთ JPG, PNG, WEBP ან GIF ფოტო, მაქსიმუმ 5 MB.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') updateGroup('hero', 'imageUrl', reader.result);
    };
    reader.onerror = () => setSaveMessage('ფოტოს წაკითხვა ვერ მოხერხდა. სცადეთ სხვა ფაილი.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    const nextIndex = historyIndexRef.current - 1;
    const next = historyRef.current[nextIndex];
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setDesign(next);
    setSiteSettings?.(current => ({ ...(current || {}), visualDesign: next }));
    setSaveMessage('ბოლო ვიზუალური ცვლილება გაუქმდა.');
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    const next = historyRef.current[nextIndex];
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    setDesign(next);
    setSiteSettings?.(current => ({ ...(current || {}), visualDesign: next }));
    setSaveMessage('ვიზუალური ცვლილება აღდგა.');
  };

  const moveSection = (id, direction) => {
    const current = [...design.sectionOrder];
    const index = current.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target], current[index]];
    commitDesign({ ...design, sectionOrder: current });
  };

  const applyPreset = preset => {
    const nextTheme = THEME_PRESETS[preset];
    if (nextTheme) commitDesign({ ...design, theme: { ...nextTheme } });
  };

  const saveDraft = async () => {
    if (typeof onSaveStorefrontDraft !== 'function' || storefrontDraftBusy || storefrontPublishBusy) return;
    const snapshot = { ...(siteSettings || {}), visualDesign: design };
    setSiteSettings?.(current => ({ ...(current || {}), visualDesign: design }));
    setSaveMessage('მონახაზის შენახვა მიმდინარეობს…');
    const saved = await onSaveStorefrontDraft(snapshot);
    setSaveMessage(saved === true
      ? 'მონახაზი წარმატებით შეინახა. მომხმარებლებისთვის გამოსაჩენად ცალკე გამოაქვეყნეთ.'
      : 'შენახვის შედეგი გადაამოწმეთ შეტყობინებაში. გამოქვეყნება ჯერ არ მომხდარა.');
  };

  const publish = async () => {
    if (!isOwner || typeof onPublishStorefront !== 'function' || storefrontDraftBusy || storefrontPublishBusy) return;
    if (!window.confirm('გსურთ მიმდინარე მთავარი გვერდის ცვლილებების გამოქვეყნება მომხმარებლებისთვის?')) return;
    setSaveMessage('გამოქვეყნება მიმდინარეობს…');
    const published = await onPublishStorefront();
    setSaveMessage(published === true ? 'ცვლილებები გამოქვეყნებულია.' : 'გამოქვეყნების შედეგი გადაამოწმეთ შეტყობინებაში.');
  };

  const resetDesign = () => {
    if (!window.confirm('გსურთ მხოლოდ ვიზუალური პარამეტრების საწყის მნიშვნელობებზე დაბრუნება? ტექსტები, კატეგორიები და პროდუქტები არ შეიცვლება.')) return;
    commitDesign(DEFAULT_STOREFRONT_VISUAL_DESIGN);
  };

  return (
    <section className="gs-storefront-visual-editor space-y-5" aria-labelledby="gs-visual-editor-title">
      <header className="rounded-2xl border border-emerald-400/25 bg-slate-900/80 p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">GEOSTORE / VISUAL STUDIO</p>
            <h2 id="gs-visual-editor-title" className="mt-1 text-xl font-black text-white">მთავარი გვერდის ვიზუალური რედაქტორი</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">ცვლილებები ჯერ მხოლოდ მონახაზში ინახება. გამოქვეყნება ცალკე მოქმედებაა.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={undo} disabled={historyIndex <= 0} className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-35"><RotateCcw className="mr-1 inline h-3.5 w-3.5" /> გაუქმება</button>
            <button type="button" onClick={redo} disabled={historyIndex >= history.length - 1} className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-35"><RotateCw className="mr-1 inline h-3.5 w-3.5" /> გამეორება</button>
            <button type="button" onClick={resetDesign} className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-200">ვიზუალური Reset</button>
          </div>
        </div>
        {saveMessage && <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-slate-950/70 px-3 py-2 text-xs text-emerald-200">{saveMessage}</p>}
      </header>

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(300px,390px)_minmax(0,1fr)] gap-5 items-start">
        <aside className="gs-visual-editor-controls min-w-0 space-y-4">
          <details open className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-white"><Type className="h-4 w-4 text-emerald-300" /> ტექსტები და სათაურები</summary>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">მაღაზიის სახელი<input value={siteSettings?.storeName || 'GEOSTORE'} maxLength={60} onChange={event => updateSiteText('storeName', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">ზედა ზოლის ტექსტი<input value={siteSettings?.topBarText || ''} maxLength={160} onChange={event => updateSiteText('topBarText', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">მთავარი სათაური<input value={siteSettings?.heroTitle || ''} maxLength={120} onChange={event => updateSiteText('heroTitle', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">მთავარი აღწერა<textarea value={siteSettings?.heroSubtitle || ''} maxLength={240} rows={3} onChange={event => updateSiteText('heroSubtitle', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label>
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-white"><Type className="h-4 w-4 text-emerald-300" /> სექციების წარწერები და ღილაკები</summary>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['heroEyebrow', 'Hero ზედა წარწერა', 60], ['heroKicker', 'Hero მცირე სათაური', 80],
                ['heroButton', 'Hero ღილაკი', 50], ['heroNote', 'Hero ქვედა წარწერა', 80],
                ['heroStampTop', 'Hero დეკორატიული ზედა ტექსტი', 30], ['heroStampTitle', 'Hero დეკორატიული სათაური', 40],
                ['heroStampBottom', 'Hero დეკორატიული ქვედა ტექსტი', 40], ['categoriesTitle', 'კატეგორიების სათაური', 100],
                ['categoriesSubtitle', 'კატეგორიების აღწერა', 160], ['flashSaleTitle', 'Flash Sale სათაური', 60],
                ['flashSaleSubtitle', 'Flash Sale აღწერა', 120], ['flashSaleBadge', 'Flash Sale პატარა წარწერა', 60],
                ['productButtonText', 'პროდუქტის ღილაკის ტექსტი', 40], ['bannerButtonText', 'ბანერის ღილაკის ტექსტი', 50]
              ].map(([key, label, maxLength]) => (
                <label key={key} className="block space-y-1.5 text-xs font-semibold text-slate-300">{label}
                  <input value={design.copy[key]} maxLength={maxLength} onChange={event => updateGroup('copy', key, event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" />
                </label>
              ))}
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-white"><Palette className="h-4 w-4 text-emerald-300" /> ფერები და თემები</summary>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => applyPreset('luxury')} className="rounded-full border border-amber-300/40 px-3 py-2 text-[11px] font-bold text-amber-100">Luxury</button>
              <button type="button" onClick={() => applyPreset('dark')} className="rounded-full border border-slate-500 px-3 py-2 text-[11px] font-bold text-slate-100">Dark</button>
              <button type="button" onClick={() => applyPreset('clean')} className="rounded-full border border-blue-300/40 px-3 py-2 text-[11px] font-bold text-blue-100">Clean</button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ColorControl label="გვერდის ფონი" value={design.theme.canvas} onChange={value => updateGroup('theme', 'canvas', value)} />
              <ColorControl label="ბლოკების ფონი" value={design.theme.surface} onChange={value => updateGroup('theme', 'surface', value)} />
              <ColorControl label="ბარათების ფონი" value={design.theme.surfaceSoft} onChange={value => updateGroup('theme', 'surfaceSoft', value)} />
              <ColorControl label="ძირითადი ტექსტი" value={design.theme.ink} onChange={value => updateGroup('theme', 'ink', value)} />
              <ColorControl label="მეორეული ტექსტი" value={design.theme.muted} onChange={value => updateGroup('theme', 'muted', value)} />
              <ColorControl label="ხაზები / საზღვრები" value={design.theme.line} onChange={value => updateGroup('theme', 'line', value)} />
              <ColorControl label="აქცენტის ფერი" value={design.theme.accent} onChange={value => updateGroup('theme', 'accent', value)} />
              <ColorControl label="ზედა ზოლის ფონი" value={design.theme.accentDark} onChange={value => updateGroup('theme', 'accentDark', value)} />
              <ColorControl label="ღილაკის ფონი" value={design.theme.buttonBackground} onChange={value => updateGroup('theme', 'buttonBackground', value)} />
              <ColorControl label="ღილაკის ტექსტი" value={design.theme.buttonText} onChange={value => updateGroup('theme', 'buttonText', value)} />
              <ColorControl label="მთავარი სათაურის ფერი" value={design.theme.heroText} onChange={value => updateGroup('theme', 'heroText', value)} />
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-white"><Layout className="h-4 w-4 text-emerald-300" /> შრიფტი და ზომები</summary>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">შრიფტის სტილი
                <select value={design.typography.fontFamily} onChange={event => updateGroup('typography', 'fontFamily', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white">
                  <option value="manrope">Manrope / ქართული</option>
                  <option value="georgia">Georgia — კლასიკური</option>
                  <option value="arial">Arial — მინიმალისტური</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">სათაურების შრიფტი
                <select value={design.typography.headingFontFamily} onChange={event => updateGroup('typography', 'headingFontFamily', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white">
                  <option value="georgia">Georgia — კლასიკური</option><option value="manrope">Manrope / ქართული</option><option value="arial">Arial — მარტივი</option>
                </select>
              </label>
              <RangeControl label="ძირითადი ტექსტის ზომა" value={design.typography.baseFontSize} min={12} max={18} unit=" px" onChange={value => updateGroup('typography', 'baseFontSize', value)} />
              <RangeControl label="სათაურების მასშტაბი" value={design.typography.headingScale} min={0.8} max={1.25} step={0.05} unit="×" onChange={value => updateGroup('typography', 'headingScale', value)} />
              <RangeControl label="გვერდის სიგანე" value={design.layout.contentWidth} min={960} max={1600} step={20} unit=" px" onChange={value => updateGroup('layout', 'contentWidth', value)} />
              <RangeControl label="სექციებს შორის დაშორება" value={design.layout.sectionGap} min={16} max={72} unit=" px" onChange={value => updateGroup('layout', 'sectionGap', value)} />
              <RangeControl label="მთავარი ბლოკის სიმაღლე" value={design.layout.heroHeight} min={320} max={680} step={10} unit=" px" onChange={value => updateGroup('layout', 'heroHeight', value)} />
              <RangeControl label="Hero ტექსტის ბლოკის სიგანე" value={design.layout.heroContentWidth} min={40} max={90} unit="%" onChange={value => updateGroup('layout', 'heroContentWidth', value)} />
              <RangeControl label="ბანერის სიმაღლე" value={design.layout.bannerHeight} min={150} max={340} step={10} unit=" px" onChange={value => updateGroup('layout', 'bannerHeight', value)} />
              <RangeControl label="პროდუქტის ფოტოს პროპორცია" value={design.layout.productImageRatio} min={0.7} max={1.2} step={0.05} onChange={value => updateGroup('layout', 'productImageRatio', value)} />
              <RangeControl label="კატეგორიის ბარათის სიმაღლე" value={design.layout.categoryCardHeight} min={110} max={260} step={5} unit=" px" onChange={value => updateGroup('layout', 'categoryCardHeight', value)} />
              <RangeControl label="კატეგორიები ერთ რიგში (Desktop)" value={design.layout.categoryColumns} min={2} max={6} onChange={value => updateGroup('layout', 'categoryColumns', value)} />
              <RangeControl label="პროდუქტები ერთ რიგში (Desktop)" value={design.layout.productColumns} min={2} max={5} onChange={value => updateGroup('layout', 'productColumns', value)} />
              <RangeControl label="ბარათების კუთხეები" value={design.layout.cardRadius} min={0} max={28} unit=" px" onChange={value => updateGroup('layout', 'cardRadius', value)} />
              <RangeControl label="ღილაკების კუთხეები" value={design.layout.buttonRadius} min={0} max={28} unit=" px" onChange={value => updateGroup('layout', 'buttonRadius', value)} />
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-white"><ImageIcon className="h-4 w-4 text-emerald-300" /> მთავარი ფოტოს მართვა</summary>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">Hero ფოტოს HTTP/HTTPS ბმული
                <input type="text" maxLength={7 * 1024 * 1024} value={design.hero.imageUrl.startsWith('data:') ? 'მოწყობილობიდან არჩეული ფოტო' : design.hero.imageUrl} onChange={event => updateGroup('hero', 'imageUrl', event.target.value)} placeholder="https://..." className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" />
              </label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">ან ატვირთეთ ფოტო მოწყობილობიდან (მაქს. 5 MB)
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleHeroFileChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950" />
              </label>
              <p className="text-[10px] leading-5 text-slate-500">ფაილი ჯერ მხოლოდ მონახაზში აირჩევა; Supabase Storage-ში უსაფრთხოდ აიტვირთება მონახაზის შენახვისას. კატეგორიებისა და ბანერების ატვირთვა კვლავ შესაბამის არსებულ განყოფილებებში ხდება.</p>
              <RangeControl label="ფოტოს მარცხნივ / მარჯვნივ პოზიცია" value={design.hero.imagePositionX} min={0} max={100} unit="%" onChange={value => updateGroup('hero', 'imagePositionX', value)} />
              <RangeControl label="ფოტოზე ღია ფენის ინტენსივობა" value={design.hero.overlayOpacity} min={0} max={100} unit="%" onChange={value => updateGroup('hero', 'overlayOpacity', value)} />
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-white"><Layout className="h-4 w-4 text-emerald-300" /> სექციების ჩართვა და თანმიმდევრობა</summary>
            <div className="mt-4 space-y-2">
              {design.sectionOrder.map((id, index) => (
                <div key={id} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 p-2.5">
                  <input type="checkbox" checked={design.sections[id]} onChange={event => updateGroup('sections', id, event.target.checked)} aria-label={SECTION_LABELS[id] + ' — ჩვენება'} className="h-4 w-4 accent-emerald-400" />
                  <span className="min-w-0 flex-1 text-xs font-semibold text-slate-200">{SECTION_LABELS[id]}</span>
                  <button type="button" onClick={() => moveSection(id, -1)} disabled={index === 0} aria-label={SECTION_LABELS[id] + ' ზემოთ'} className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => moveSection(id, 1)} disabled={index === design.sectionOrder.length - 1} aria-label={SECTION_LABELS[id] + ' ქვემოთ'} className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </details>

          <div className="sticky bottom-2 z-20 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl border border-emerald-400/30 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
            <button type="button" onClick={saveDraft} disabled={storefrontDraftBusy || storefrontPublishBusy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-50"><Save className="h-4 w-4" /> {storefrontDraftBusy ? 'ინახება…' : 'მონახაზის შენახვა'}</button>
            <button type="button" onClick={publish} disabled={!isOwner || storefrontDraftBusy || storefrontPublishBusy} title={!isOwner ? 'გამოქვეყნება მხოლოდ მთავარ ადმინისტრატორს შეუძლია' : ''} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-amber-300 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-40"><Upload className="h-4 w-4" /> {storefrontPublishBusy ? 'ქვეყნდება…' : 'გამოქვეყნება'}</button>
          </div>
        </aside>

        <div className="gs-visual-editor-preview-column min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-white">ცოცხალი Preview</h3>
              <p className="text-[10px] text-slate-400">მონაცემები რეალურია; კალათისა და შეკვეთის მოქმედებები Preview-ში გამორთულია.</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1">
              <button type="button" onClick={() => setPreviewMode('desktop')} aria-pressed={previewMode === 'desktop'} className={previewMode === 'desktop' ? 'rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-bold text-slate-950' : 'rounded-lg px-3 py-2 text-[11px] font-bold text-slate-300'}><Monitor className="mr-1 inline h-3.5 w-3.5" /> Desktop</button>
              <button type="button" onClick={() => setPreviewMode('mobile')} aria-pressed={previewMode === 'mobile'} className={previewMode === 'mobile' ? 'rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-bold text-slate-950' : 'rounded-lg px-3 py-2 text-[11px] font-bold text-slate-300'}><Smartphone className="mr-1 inline h-3.5 w-3.5" /> Mobile</button>
            </div>
          </div>
          <div className={previewMode === 'mobile' ? 'geostore-fashion-store gs-visual-preview-frame gs-visual-preview-frame--mobile mx-auto overflow-hidden rounded-2xl border border-slate-600 bg-stone-100 shadow-2xl' : 'geostore-fashion-store gs-visual-preview-frame mx-auto overflow-hidden rounded-2xl border border-slate-600 bg-stone-100 shadow-2xl'} style={{ ...previewStyle, maxWidth: previewMode === 'mobile' ? '420px' : '100%' }}>
            <div className="gs-site-header gs-visual-preview-header">
              <div>{siteSettings?.topBarText || 'GEOSTORE — ტანსაცმელი, ფეხსაცმელი და აქსესუარები'}</div>
              <div className="max-w-7xl">
                <div className="gs-brand-lockup">
                  <span className="gs-brand-monogram">G</span>
                  <span className="gs-brand-wordmark">
                    <strong className="gs-brand-name">{siteSettings?.storeName || 'GEOSTORE'}</strong>
                    <span className="gs-brand-caption">STYLE · COLLECTION · GEORGIA</span>
                  </span>
                </div>
                <span className="hidden text-[10px] font-semibold sm:inline">მთავარი გვერდის Preview</span>
              </div>
            </div>
            <div className="gs-visual-preview-content">
              <StoreView
                currentLang="ka"
                siteSettings={siteSettings}
                banners={safeBanners}
                categories={safeCategories}
                selectedCategory={previewCategory}
                setSelectedCategory={setPreviewCategory}
                filteredProducts={safeProducts}
                wishlist={[]}
                toggleWishlist={NOOP}
                comparisonList={[]}
                toggleComparison={NOOP}
                addToCart={NOOP}
                formatPrice={formatPrice || (value => String(Number(value || 0).toLocaleString('ka-GE')) + ' ₾')}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
