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
  { key: 'navInactiveText', label: 'არააქტიური მენიუს ტექსტი' }
];

const RANGE_FIELDS = [
  { key: 'fontSize', label: 'საბაზისო ტექსტის ზომა', min: 11, max: 16, suffix: 'px' },
  { key: 'cardRadius', label: 'ბლოკების მომრგვალება', min: 10, max: 36, suffix: 'px' },
  { key: 'cardPadding', label: 'ბლოკების შიდა დაშორება', min: 12, max: 32, suffix: 'px' },
  { key: 'sidebarWidth', label: 'გვერდითი მენიუს სიგანე', min: 240, max: 360, suffix: 'px' },
  { key: 'buttonRadius', label: 'ღილაკების მომრგვალება', min: 0, max: 28, suffix: 'px' },
  { key: 'navItemRadius', label: 'მენიუს ელემენტების მომრგვალება', min: 0, max: 28, suffix: 'px' },
  { key: 'navItemPaddingY', label: 'მენიუს ელემენტის სიმაღლე', min: 6, max: 20, suffix: 'px' },
  { key: 'sectionGap', label: 'ძირითად ბლოკებს შორის დაშორება', min: 12, max: 48, suffix: 'px' }
];

const PRESETS = {
  emerald: { accent: '#34d399', canvas: '#020617', panel: '#0f172a', surface: '#020617', text: '#f8fafc', muted: '#94a3b8', border: '#334155', navActiveBackground: '#34d399', navActiveText: '#020617', navInactiveBackground: '#020617', navInactiveText: '#94a3b8' },
  blue: { accent: '#60a5fa', canvas: '#0b1220', panel: '#142033', surface: '#0b1728', text: '#f8fafc', muted: '#a8b7ca', border: '#34445c', navActiveBackground: '#60a5fa', navActiveText: '#0b1220', navInactiveBackground: '#0b1728', navInactiveText: '#a8b7ca' },
  violet: { accent: '#c4b5fd', canvas: '#100d1d', panel: '#211a33', surface: '#171326', text: '#faf8ff', muted: '#b8aecb', border: '#493d60', navActiveBackground: '#c4b5fd', navActiveText: '#100d1d', navInactiveBackground: '#171326', navInactiveText: '#b8aecb' },
  light: { accent: '#0f766e', canvas: '#eef2f7', panel: '#ffffff', surface: '#f8fafc', text: '#172033', muted: '#596579', border: '#cbd5e1', navActiveBackground: '#0f766e', navActiveText: '#ffffff', navInactiveBackground: '#f8fafc', navInactiveText: '#596579' }
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
