import React, { useMemo, useState } from 'react';
import {
  DEFAULT_ADMIN_PANEL_VISUAL_DESIGN,
  normalizeAdminPanelVisualDesign
} from '../utils/adminPanelVisualDesign.js';

const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'mobile', label: 'Mobile' }
];

const COLOR_FIELDS = [
  { key: 'accent', label: 'აქცენტის ფერი' },
  { key: 'canvas', label: 'პანელის საერთო ფონი' },
  { key: 'panel', label: 'მთავარი ბლოკები' },
  { key: 'surface', label: 'შიდა ბარათები' },
  { key: 'text', label: 'ძირითადი ტექსტი' },
  { key: 'muted', label: 'მეორეული ტექსტი' },
  { key: 'border', label: 'ჩარჩოები და გამყოფები' },
  { key: 'navActiveBackground', label: 'აქტიური მენიუს ფონი' },
  { key: 'navActiveText', label: 'აქტიური მენიუს ტექსტი' },
  { key: 'navInactiveBackground', label: 'არააქტიური მენიუს ფონი' },
  { key: 'navInactiveText', label: 'არააქტიური მენიუს ტექსტი' },
  { key: 'headerBackground', label: 'ზედა პანელის ფონი' },
  { key: 'headerBorder', label: 'ზედა პანელის ჩარჩო' },
  { key: 'tableHeaderBackground', label: 'ცხრილის სათაურის ფონი' },
  { key: 'tableHeaderText', label: 'ცხრილის სათაურის ტექსტი' },
  { key: 'inputBackground', label: 'ფორმის ველების ფონი' },
  { key: 'inputText', label: 'ფორმის ველების ტექსტი' },
  { key: 'inputBorder', label: 'ფორმის ველების ჩარჩო' },
  { key: 'inputFocus', label: 'ველის აქტიური ჩარჩო' },
  { key: 'contentCardBackground', label: 'შიდა ბარათების ფონი' },
  { key: 'contentCardBorder', label: 'შიდა ბარათების ჩარჩო' },
  { key: 'modalBackground', label: 'მოდალის ფონი' },
  { key: 'modalText', label: 'მოდალის ტექსტი' },
  { key: 'modalBorder', label: 'მოდალის ჩარჩო' },
  { key: 'modalOverlayBackground', label: 'მოდალის გარე ფონი' },
  { key: 'staffSectionBackground', label: 'თანამშრომლების სექციის ფონი' },
  { key: 'staffSectionBorder', label: 'თანამშრომლების სექციის ჩარჩო' },
  { key: 'inventorySectionBackground', label: 'მარაგების სექციის ფონი' },
  { key: 'inventorySectionBorder', label: 'მარაგების სექციის ჩარჩო' },
  { key: 'analyticsSectionBackground', label: 'ანალიტიკის სექციის ფონი' },
  { key: 'analyticsSectionBorder', label: 'ანალიტიკის სექციის ჩარჩო' },
  { key: 'ordersSectionBackground', label: 'შეკვეთების სექციის ფონი' },
  { key: 'ordersSectionBorder', label: 'შეკვეთების სექციის ჩარჩო' },
  { key: 'supportSectionBackground', label: 'მხარდაჭერის სექციის ფონი' },
  { key: 'supportSectionBorder', label: 'მხარდაჭერის სექციის ჩარჩო' },
  { key: 'discountsSectionBackground', label: 'ფასდაკლებების სექციის ფონი' },
  { key: 'discountsSectionBorder', label: 'ფასდაკლებების სექციის ჩარჩო' },
  { key: 'bannersSectionBackground', label: 'ბანერების სექციის ფონი' },
  { key: 'bannersSectionBorder', label: 'ბანერების სექციის ჩარჩო' },
  { key: 'categoriesSectionBackground', label: 'კატეგორიების სექციის ფონი' },
  { key: 'categoriesSectionBorder', label: 'კატეგორიების სექციის ჩარჩო' },
  { key: 'couponsSectionBackground', label: 'კუპონების სექციის ფონი' },
  { key: 'couponsSectionBorder', label: 'კუპონების სექციის ჩარჩო' }
];

const RANGE_FIELDS = [
  { key: 'fontSize', label: 'საბაზისო ტექსტის ზომა', min: 11, max: 16, suffix: 'px' },
  { key: 'cardRadius', label: 'ბლოკების მომრგვალება', min: 10, max: 36, suffix: 'px' },
  { key: 'cardPadding', label: 'ბლოკების შიდა დაშორება', min: 12, max: 32, suffix: 'px' },
  { key: 'sidebarWidth', label: 'გვერდითი მენიუს სიგანე', min: 240, max: 360, suffix: 'px' },
  { key: 'buttonRadius', label: 'ღილაკების მომრგვალება', min: 0, max: 28, suffix: 'px' },
  { key: 'navItemRadius', label: 'მენიუს ელემენტების მომრგვალება', min: 0, max: 28, suffix: 'px' },
  { key: 'navItemPaddingY', label: 'მენიუს ელემენტის სიმაღლე', min: 6, max: 20, suffix: 'px' },
  { key: 'sectionGap', label: 'ძირითად ბლოკებს შორის დაშორება', min: 12, max: 48, suffix: 'px' },
  { key: 'headerRadius', label: 'ზედა პანელის მომრგვალება', min: 10, max: 40, suffix: 'px' },
  { key: 'headerPadding', label: 'ზედა პანელის შიდა დაშორება', min: 12, max: 32, suffix: 'px' },
  { key: 'tableCellPadding', label: 'ცხრილის უჯრების დაშორება', min: 6, max: 20, suffix: 'px' },
  { key: 'inputRadius', label: 'ფორმის ველების მომრგვალება', min: 0, max: 20, suffix: 'px' },
  { key: 'inputHeight', label: 'ფორმის ველების სიმაღლე', min: 36, max: 52, suffix: 'px' },
  { key: 'cardBorderWidth', label: 'ბარათის ჩარჩოს სისქე', min: 0, max: 3, suffix: 'px' },
  { key: 'cardShadowBlur', label: 'ბარათის ჩრდილის სიძლიერე', min: 0, max: 36, suffix: 'px' },
  { key: 'modalRadius', label: 'მოდალის კუთხეების მომრგვალება', min: 12, max: 40, suffix: 'px' },
  { key: 'modalPadding', label: 'მოდალის შიდა დაშორება', min: 12, max: 36, suffix: 'px' },
  { key: 'modalOverlayOpacity', label: 'გარე ფონის გამუქება', min: 40, max: 95, suffix: '%' }
];

const PRESETS = {
  emerald: { accent: '#34d399', canvas: '#020617', panel: '#0f172a', surface: '#020617', text: '#f8fafc', muted: '#94a3b8', border: '#334155', navActiveBackground: '#34d399', navActiveText: '#020617', navInactiveBackground: '#020617', navInactiveText: '#94a3b8', headerBackground: '#0f172a', headerBorder: '#334155', tableHeaderBackground: '#020617', tableHeaderText: '#94a3b8', inputBackground: '#020617', inputText: '#f8fafc', inputBorder: '#334155', inputFocus: '#34d399', contentCardBackground: '#0f172a', contentCardBorder: '#334155', modalBackground: '#0d0d10', modalText: '#f8fafc', modalBorder: '#334155', modalOverlayBackground: '#020617', staffSectionBackground: '#0f172a', staffSectionBorder: '#334155', inventorySectionBackground: '#0f172a', inventorySectionBorder: '#334155', analyticsSectionBackground: '#0f172a', analyticsSectionBorder: '#334155', supportSectionBorder: '#334155', supportSectionBackground: '#0f172a', ordersSectionBorder: '#334155', ordersSectionBackground: '#0f172a' , discountsSectionBackground: '#0f172a', discountsSectionBorder: '#334155', bannersSectionBackground: '#0f172a', bannersSectionBorder: '#334155', categoriesSectionBackground: '#0f172a', categoriesSectionBorder: '#334155', couponsSectionBackground: '#0f172a', couponsSectionBorder: '#334155'},
  blue: { accent: '#60a5fa', canvas: '#0b1220', panel: '#142033', surface: '#0b1728', text: '#f8fafc', muted: '#a8b7ca', border: '#34445c', navActiveBackground: '#60a5fa', navActiveText: '#0b1220', navInactiveBackground: '#0b1728', navInactiveText: '#a8b7ca', headerBackground: '#142033', headerBorder: '#34445c', tableHeaderBackground: '#0b1728', tableHeaderText: '#a8b7ca', inputBackground: '#0b1728', inputText: '#f8fafc', inputBorder: '#34445c', inputFocus: '#60a5fa', contentCardBackground: '#142033', contentCardBorder: '#34445c', modalBackground: '#142033', modalText: '#f8fafc', modalBorder: '#34445c', modalOverlayBackground: '#020617', staffSectionBackground: '#142033', staffSectionBorder: '#34445c', inventorySectionBackground: '#142033', inventorySectionBorder: '#34445c', analyticsSectionBackground: '#142033', analyticsSectionBorder: '#34445c' , ordersSectionBackground: '#142033', ordersSectionBorder: '#34445c', supportSectionBackground: '#142033', supportSectionBorder: '#34445c', discountsSectionBackground: '#142033', discountsSectionBorder: '#34445c', bannersSectionBackground: '#142033', bannersSectionBorder: '#34445c', categoriesSectionBackground: '#142033', categoriesSectionBorder: '#34445c', couponsSectionBackground: '#142033', couponsSectionBorder: '#34445c'},
  violet: { accent: '#c4b5fd', canvas: '#100d1d', panel: '#211a33', surface: '#171326', text: '#faf8ff', muted: '#b8aecb', border: '#493d60', navActiveBackground: '#c4b5fd', navActiveText: '#100d1d', navInactiveBackground: '#171326', navInactiveText: '#b8aecb', headerBackground: '#211a33', headerBorder: '#493d60', tableHeaderBackground: '#171326', tableHeaderText: '#b8aecb', inputBackground: '#171326', inputText: '#faf8ff', inputBorder: '#493d60', inputFocus: '#c4b5fd', contentCardBackground: '#211a33', contentCardBorder: '#493d60', modalBackground: '#211a33', modalText: '#faf8ff', modalBorder: '#493d60', modalOverlayBackground: '#100d1d', staffSectionBackground: '#211a33', staffSectionBorder: '#493d60', inventorySectionBackground: '#211a33', inventorySectionBorder: '#493d60', analyticsSectionBackground: '#211a33', analyticsSectionBorder: '#493d60' , ordersSectionBackground: '#211a33', ordersSectionBorder: '#493d60', supportSectionBackground: '#211a33', supportSectionBorder: '#493d60', discountsSectionBackground: '#211a33', discountsSectionBorder: '#493d60', bannersSectionBackground: '#211a33', bannersSectionBorder: '#493d60', categoriesSectionBackground: '#211a33', categoriesSectionBorder: '#493d60', couponsSectionBackground: '#211a33', couponsSectionBorder: '#493d60'},
  light: { accent: '#0f766e', canvas: '#eef2f7', panel: '#ffffff', surface: '#f8fafc', text: '#172033', muted: '#596579', border: '#cbd5e1', navActiveBackground: '#0f766e', navActiveText: '#ffffff', navInactiveBackground: '#f8fafc', navInactiveText: '#596579', headerBackground: '#ffffff', headerBorder: '#cbd5e1', tableHeaderBackground: '#f1f5f9', tableHeaderText: '#596579', inputBackground: '#ffffff', inputText: '#172033', inputBorder: '#cbd5e1', inputFocus: '#0f766e', contentCardBackground: '#ffffff', contentCardBorder: '#cbd5e1', modalBackground: '#ffffff', modalText: '#172033', modalBorder: '#cbd5e1', modalOverlayBackground: '#64748b', staffSectionBackground: '#ffffff', staffSectionBorder: '#cbd5e1', inventorySectionBackground: '#ffffff', inventorySectionBorder: '#cbd5e1', analyticsSectionBackground: '#ffffff', analyticsSectionBorder: '#cbd5e1' , ordersSectionBackground: '#ffffff', ordersSectionBorder: '#cbd5e1', supportSectionBackground: '#ffffff', supportSectionBorder: '#cbd5e1', discountsSectionBackground: '#ffffff', discountsSectionBorder: '#cbd5e1', bannersSectionBackground: '#ffffff', bannersSectionBorder: '#cbd5e1', categoriesSectionBackground: '#ffffff', categoriesSectionBorder: '#cbd5e1', couponsSectionBackground: '#ffffff', couponsSectionBorder: '#cbd5e1'}
};

export default function AdminPanelVisualEditor({ design, onChange, onReset }) {
  const [viewport, setViewport] = useState('desktop');
  const normalized = useMemo(() => normalizeAdminPanelVisualDesign(design), [design]);
  const active = viewport === 'desktop'
    ? { theme: normalized.theme, layout: normalized.layout }
    : {
        theme: { ...normalized.theme, ...(normalized.responsive?.[viewport]?.theme || {}) },
        layout: { ...normalized.layout, ...(normalized.responsive?.[viewport]?.layout || {}) }
      };

  const updateValue = (group, key, value) => {
    if (viewport === 'desktop') {
      onChange(normalizeAdminPanelVisualDesign({
        ...normalized,
        [group]: { ...normalized[group], [key]: value }
      }));
      return;
    }

    onChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      responsive: {
        ...(normalized.responsive || {}),
        [viewport]: {
          ...(normalized.responsive?.[viewport] || {}),
          [group]: {
            ...(normalized.responsive?.[viewport]?.[group] || {}),
            [key]: value
          }
        }
      }
    }));
  };

  const applyPreset = preset => {
    if (!PRESETS[preset]) return;
    if (viewport === 'desktop') {
      onChange(normalizeAdminPanelVisualDesign({ ...normalized, theme: PRESETS[preset] }));
      return;
    }
    onChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      responsive: {
        ...(normalized.responsive || {}),
        [viewport]: {
          ...(normalized.responsive?.[viewport] || {}),
          theme: PRESETS[preset]
        }
      }
    }));
  };

  const resetViewport = () => {
    if (viewport === 'desktop') {
      onReset?.();
      return;
    }
    const responsive = { ...(normalized.responsive || {}) };
    delete responsive[viewport];
    onChange(normalizeAdminPanelVisualDesign({ ...normalized, responsive }));
  };

  return (
    <section className="admin-visual-editor-panel space-y-5 rounded-3xl border border-emerald-400/25 bg-slate-900/90 p-4 sm:p-6" aria-labelledby="admin-visual-editor-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">GEOSTORE / ADMIN STUDIO</p>
          <h2 id="admin-visual-editor-title" className="mt-1 text-lg font-black text-white">ადმინ პანელის დიზაინის რედაქტორი</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">ცვლილებები მყისიერად აისახება პანელზე და ავტომატურად ინახება ამ ბრაუზერში. მაღაზიის მომხმარებლის მხარეს არ ცვლის.</p>
        </div>
        <button type="button" onClick={resetViewport} className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-200">მიმდინარე ხედის Reset</button>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="მოწყობილობის დიზაინის არჩევა">
        {VIEWPORTS.map(item => (
          <button
            key={item.id}
            type="button"
            aria-pressed={viewport === item.id}
            onClick={() => setViewport(item.id)}
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${viewport === item.id ? 'border-emerald-300 bg-emerald-400 text-slate-950' : 'border-slate-700 bg-slate-950 text-slate-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {viewport !== 'desktop' && (
        <p className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-[11px] leading-5 text-sky-100">
          {viewport === 'tablet' ? 'Tablet' : 'Mobile'} პარამეტრები დამოუკიდებლად ინახება. შეუცვლელი ველები Desktop-ის მნიშვნელობას მემკვიდრეობით იღებს.
        </p>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-white">ფერების პალიტრა</h3>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => applyPreset('emerald')} className="rounded-lg border border-emerald-400/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200">Emerald</button>
            <button type="button" onClick={() => applyPreset('blue')} className="rounded-lg border border-blue-400/30 px-2.5 py-1.5 text-[10px] font-bold text-blue-200">Blue</button>
            <button type="button" onClick={() => applyPreset('violet')} className="rounded-lg border border-violet-400/30 px-2.5 py-1.5 text-[10px] font-bold text-violet-200">Violet</button>
            <button type="button" onClick={() => applyPreset('light')} className="rounded-lg border border-slate-400/40 px-2.5 py-1.5 text-[10px] font-bold text-slate-200">Light</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COLOR_FIELDS.map(field => (
            <label key={field.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-xs text-slate-200">
              <span>{field.label}</span>
              <input
                type="color"
                value={active.theme[field.key]}
                onChange={event => updateValue('theme', field.key, event.target.value)}
                aria-label={field.label}
                className="h-9 w-14 cursor-pointer rounded-lg border border-slate-600 bg-slate-900 p-1"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black text-white">განლაგება და ზომები</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {RANGE_FIELDS.map(field => (
            <label key={field.key} className="block space-y-1.5 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-xs text-slate-200">
              <span className="flex items-center justify-between gap-2">
                <span>{field.label}</span>
                <b className="tabular-nums text-emerald-300">{active.layout[field.key]} {field.suffix}</b>
              </span>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step="1"
                value={active.layout[field.key]}
                onChange={event => updateValue('layout', field.key, Number(event.target.value))}
                className="w-full accent-emerald-400"
                aria-label={field.label}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-[11px] leading-5 text-slate-300">
        პარამეტრები მოქმედებს მხოლოდ მთავარ ადმინისტრატორზე და მხოლოდ ამ მოწყობილობის ბრაუზერში. სხვა ადმინისტრატორების ხედს და მაღაზიის საჯარო დიზაინს არ ცვლის.
      </div>
    </section>
  );
}
