import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronUp, Monitor, RotateCcw, RotateCw,
  Save, Smartphone, Upload, Palette, Type, Layout, Image as ImageIcon, MousePointer2, Plus, Trash2, Copy
} from 'lucide-react';
import StoreView from './StoreView';
import Header from './Header';
import StorefrontFooter from './StorefrontFooter';
import {
  DEFAULT_STOREFRONT_VISUAL_DESIGN,
  normalizeStorefrontVisualDesign,
  buildStorefrontVisualStyle
} from '../utils/storefrontVisualDesign.js';

const NOOP = () => {};
const VISUAL_EDITOR_TARGETS = {
  'hero': { label: 'მთავარი Hero ბლოკი', help: 'მთავარი ბლოკის ზომა, ფოტო და განლაგება მარცხენა პარამეტრებში შეცვალეთ.' },
  'hero.image': { label: 'Hero ფოტო', group: 'hero', key: 'imageUrl', help: 'შეცვალეთ ფოტოს URL ან ატვირთეთ ახალი ფოტო მარცხენა პანელში.' },
  'hero.title': { label: 'Hero სათაური', settingKey: 'heroTitle', help: 'სათაური პირდაპირ აქედან შეცვალეთ.' },
  'hero.description': { label: 'Hero აღწერა', settingKey: 'heroSubtitle', multiline: true, help: 'აღწერა პირდაპირ აქედან შეცვალეთ.' },
  'hero.button': { label: 'Hero ღილაკი', group: 'copy', key: 'heroButton', help: 'ღილაკის ტექსტი პირდაპირ აქედან შეცვალეთ.' },
  'banner': { label: 'სარეკლამო ბანერები', help: 'ბანერის ფოტო, სათაური და ბმული მართეთ ადმინისტრაციის „ბანერები“ განყოფილებაში.' },
  'banner.card': { label: 'ბანერის ბარათი', help: 'ბანერის შინაარსი და ბმული მართეთ „ბანერები“ განყოფილებაში.' },
  'banner.image': { label: 'ბანერის ფოტო', help: 'ფოტოს წყარო იცვლება ბანერების მართვაში; აქ შეცვალეთ მისი ჩასმა, ზომა და პოზიცია.' },
  'banner.title': { label: 'ბანერის სათაური', help: 'ბანერის ტექსტი მართეთ ადმინისტრაციის „ბანერები“ განყოფილებაში.' },
  'banner.description': { label: 'ბანერის აღწერა', help: 'ბანერის აღწერა მართეთ ბანერების განყოფილებაში; აქ შეცვალეთ ტექსტის სტილი.' },
  'banner.button': { label: 'ბანერის მოწოდების ტექსტი', help: 'ღილაკის ტექსტი საერთო ბანერის წარწერებში იცვლება; აქ შეცვალეთ მისი ვიზუალი.' },
  'flashSale': { label: 'Flash Sale ბლოკი', help: 'ბლოკის ფერები და განლაგება შეცვალეთ ფერებისა და ზომების პარამეტრებში.' },
  'flashSale.title': { label: 'Flash Sale სათაური', group: 'copy', key: 'flashSaleTitle', help: 'სათაური პირდაპირ აქედან შეცვალეთ.' },
  'flashSale.badge': { label: 'Flash Sale Badge', group: 'copy', key: 'flashSaleBadge', help: 'პატარა წარწერა პირდაპირ აქედან შეცვალეთ.' },
  'flashSale.description': { label: 'Flash Sale აღწერა', group: 'copy', key: 'flashSaleSubtitle', help: 'აღწერა პირდაპირ აქედან შეცვალეთ.' },
  'categories': { label: 'კატეგორიების ბლოკი', help: 'კატეგორიების ფოტოები და დასახელებები მართეთ კატეგორიების განყოფილებაში.' },
  'categories.title': { label: 'კატეგორიების სათაური', group: 'copy', key: 'categoriesTitle', help: 'სათაური პირდაპირ აქედან შეცვალეთ.' },
  'categories.description': { label: 'კატეგორიების აღწერა', group: 'copy', key: 'categoriesSubtitle', help: 'აღწერა პირდაპირ აქედან შეცვალეთ.' },
  'category.card': { label: 'კატეგორიის ბარათი', help: 'შეცვალეთ კატეგორიის ბარათის ფონი, ჩარჩო, ზომა, მომრგვალება და ჩრდილი.' },
  'category.title': { label: 'კატეგორიის სათაური', help: 'შეცვალეთ კატეგორიის სახელის ფერი, ზომა, სისქე და განლაგება.' },
  'category.description': { label: 'კატეგორიის ქვეტექსტი', help: 'შეცვალეთ კატეგორიის დამხმარე ტექსტის სტილი.' },
  'filters': { label: 'ფილტრები და დალაგება', help: 'ფილტრების ფერები და განლაგება შეცვალეთ დიზაინის პარამეტრებში.' },
  'filters.priceLabel': { label: 'ფასის ფილტრის წარწერა', help: 'შეცვალეთ ფასის ფილტრის ტექსტის ფერი და ტიპოგრაფია.' },
  'filters.input': { label: 'ფასის ველები', help: 'შეცვალეთ ფასის ველების ფონი, ტექსტი, ჩარჩო და მომრგვალება.' },
  'filters.clearButton': { label: 'ფილტრის გასუფთავების ღილაკი', help: 'შეცვალეთ გასუფთავების ღილაკის ფერი და ფორმა.' },
  'filters.sortLabel': { label: 'დალაგების წარწერა', help: 'შეცვალეთ დალაგების წარწერის სტილი.' },
  'filters.sortSelect': { label: 'დალაგების ჩამონათვალი', help: 'შეცვალეთ ჩამოსაშლელი სიის ფონი, ტექსტი და ჩარჩო.' },
  'product.card': { label: 'პროდუქტის ბარათი', help: 'პროდუქტის მონაცემები მართეთ პროდუქტების განყოფილებაში; აქ ცვლით ბარათის ვიზუალს.' },
  'product.image': { label: 'კატალოგის პროდუქტის ფოტო', help: 'ფოტოს შეცვლა ხდება პროდუქტების მართვის განყოფილებაში; აქ ცვლით ფოტოს ზომას, ჩასმის რეჟიმსა და პოზიციას.' },
  'product.title': { label: 'პროდუქტის დასახელება', help: 'პროდუქტის დასახელება შეცვალეთ პროდუქტების მართვის განყოფილებაში.' },
  'product.button': { label: 'პროდუქტის ღილაკი', group: 'copy', key: 'productButtonText', help: 'ღილაკის ტექსტი პირდაპირ აქედან შეცვალეთ.' },
  'product.detail.image': { label: 'პროდუქტის დეტალური ფოტო', help: 'პროდუქტის ფოტო და გალერეა შეცვალეთ პროდუქტების მართვის განყოფილებაში; აქ ცვლით ვიზუალურ სტილს.' },
  'product.detail.title': { label: 'პროდუქტის დეტალური სათაური', help: 'პროდუქტის დასახელება შეცვალეთ პროდუქტების მართვის განყოფილებაში; აქ ცვლით სათაურის სტილს.' },
  'product.detail.price': { label: 'პროდუქტის დეტალური ფასი', help: 'ფასის მნიშვნელობა მოდის პროდუქტის მონაცემებიდან; აქ იცვლება ფასის ვიზუალური სტილი.' },
  'product.detail.description': { label: 'პროდუქტის დეტალური აღწერა', help: 'აღწერის ტექსტი შეცვალეთ პროდუქტების მართვის განყოფილებაში; აქ ცვლით მის ვიზუალურ სტილს.' },
  'product.detail.variants': { label: 'ზომები და ვარიანტები', help: 'ზომები, ფერები და მარაგი უცვლელად იმართება პროდუქტის პარამეტრებში; აქ იცვლება ბლოკის დიზაინი.' },
  'product.detail.purchase': { label: 'დეტალური კალათის ღილაკი', help: 'კალათაში დამატების ფუნქცია უცვლელია; აქ იცვლება მხოლოდ ღილაკის ვიზუალი.' },
  'header': { label: 'საიტის Header', help: 'შეცვალეთ ზედა ნაწილის საერთო ფონი, ფერები, ზომა და დაშორებები.' },
  'header.announcement': { label: 'ზედა საინფორმაციო ზოლი', help: 'შეცვალეთ ზედა ზოლის ფონი, ტექსტის ფერი, ზომა და დაშორებები.' },
  'header.announcement.text': { label: 'ზედა ზოლის ტექსტი', settingKey: 'topBarText', help: 'ტექსტი და მისი ვიზუალური სტილი აქედან შეცვალეთ.' },
  'header.brand': { label: 'ლოგოს ბლოკი', help: 'შეცვალეთ ლოგოს ბლოკის ზომა, ფონი, ჩარჩო და დაშორებები.' },
  'header.logo': { label: 'ლოგოს ნიშანი', help: 'შეცვალეთ ლოგოს ნიშნის ფერი, ზომა, ფონი და მომრგვალება.' },
  'header.storeName': { label: 'მაღაზიის სახელი', settingKey: 'storeName', help: 'მაღაზიის სახელი და მისი ტიპოგრაფია აქედან შეცვალეთ.' },
  'header.caption': { label: 'ლოგოს ქვედა წარწერა', settingKey: 'headerCaptionText', help: 'შეცვალეთ ლოგოს ქვედა ტექსტი. ცარიელი ველი აბრუნებს ნაგულისხმევ წარწერას.' },
  'header.menu.toggle': { label: 'მენიუს ღილაკი', help: 'შეცვალეთ მენიუს ღილაკის ფერი, ზომა და ფორმა.' },
  'header.search': { label: 'საძიებო ზოლი', help: 'შეცვალეთ საძიებო ზოლის ფონი, ზომა და განლაგება.' },
  'header.search.input': { label: 'ძიების ველი', settingKey: 'headerSearchPlaceholder', help: 'შეცვალეთ საძიებო ველის placeholder ყველა ენაზე; გასუფთავება აბრუნებს თარგმნილ ნაგულისხმევ ტექსტს.' },
  'header.search.button': { label: 'ფოტოთი ძიების ღილაკი', help: 'შეცვალეთ ფოტოთი ძიების ღილაკის ფერი და ფორმა.' },
  'header.menu': { label: 'სანავიგაციო მენიუ', help: 'შეცვალეთ მენიუს საერთო ფონი, ზომა, ჩარჩო და ჩრდილი.' },
  'header.menu.heading': { label: 'მენიუს ზედა ნაწილი', help: 'შეცვალეთ მენიუს ზედა ნაწილის ფერები და დაშორებები.' },
  'header.menu.section': { label: 'მენიუს სექცია', help: 'შეცვალეთ მენიუს სექციის საერთო სტილი.' },
  'header.menu.sectionTitle': { label: 'მენიუს სექციის სათაური', help: 'შეცვალეთ სექციის სათაურის ფერი და ტიპოგრაფია.' },
  'header.menu.link': { label: 'მენიუს ბმული და ღილაკი', help: 'შეცვალეთ მენიუს ბმულების ფერი, ფონი და ფორმა.' },
  'header.menu.footer': { label: 'მენიუს ქვედა ნაწილი', help: 'შეცვალეთ ენის არჩევის ბლოკის სტილი.' },
  'header.menu.languageButton': { label: 'ენის ღილაკი', help: 'შეცვალეთ ენის ღილაკის ფერი და ფორმა.' },
  'footer': { label: 'საიტის Footer', help: 'შეცვალეთ ქვედა ნაწილის ფონი, ზომა, ჩარჩო და დაშორებები.' },
  'footer.links': { label: 'Footer ბმულების ზოლი', help: 'შეცვალეთ ბმულების ზოლის განლაგება და საერთო ფერები.' },
  'footer.link': { label: 'Footer ბმული', help: 'შეცვალეთ Footer ბმულების საერთო ვიზუალი.' },
  'footer.termsLink': { label: 'Footer — წესები და პირობები', settingKey: 'footerTermsText', help: 'შეცვალეთ ბმულის ტექსტი; ცარიელი ველი აბრუნებს ენის შესაბამის თარგმანს.' },
  'footer.privacyLink': { label: 'Footer — კონფიდენციალურობა', settingKey: 'footerPrivacyText', help: 'შეცვალეთ ბმულის ტექსტი; ცარიელი ველი აბრუნებს ენის შესაბამის თარგმანს.' },
  'footer.warrantyLink': { label: 'Footer — გარანტია', settingKey: 'footerWarrantyText', help: 'შეცვალეთ ბმულის ტექსტი; ცარიელი ველი აბრუნებს ენის შესაბამის თარგმანს.' },
  'footer.copyright': { label: 'საავტორო წარწერა', settingKey: 'footerCopyrightText', help: 'შეცვალეთ Footer-ის საავტორო ტექსტი. ცარიელი ველი აბრუნებს ნაგულისხმევ ტექსტს.' }
};
const VISUAL_EDITOR_TREE = [
  {
    id: 'header',
    label: 'Header — ზედა ნაწილი',
    targets: Object.entries(VISUAL_EDITOR_TARGETS).filter(([id]) => id === 'header' || id.startsWith('header.'))
  },
  {
    id: 'store',
    label: 'მთავარი გვერდი და კატალოგი',
    targets: Object.entries(VISUAL_EDITOR_TARGETS).filter(([id]) => !id.startsWith('header.') && id !== 'header' && !id.startsWith('footer.') && id !== 'footer')
  },
  {
    id: 'footer',
    label: 'Footer — ქვედა ნაწილი',
    targets: Object.entries(VISUAL_EDITOR_TARGETS).filter(([id]) => id === 'footer' || id.startsWith('footer.'))
  }
];

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
  const customIdCounter = useRef(0);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [previewCategory, setPreviewCategory] = useState('ყველა');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [draggedSection, setDraggedSection] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const activeResponsive = previewMode === 'desktop' ? {} : (design.responsive?.[previewMode] || {});
  const activeLayout = { ...design.layout, ...(activeResponsive.layout || {}) };
  const activeTheme = { ...design.theme, ...(activeResponsive.theme || {}) };
  const activeTypography = { ...design.typography, ...(activeResponsive.typography || {}) };
  const previewDesign = useMemo(() => ({
    ...design,
    layout: { ...design.layout, ...(activeResponsive.layout || {}) },
    theme: { ...design.theme, ...(activeResponsive.theme || {}) },
    typography: { ...design.typography, ...(activeResponsive.typography || {}) },
    elementStyles: Object.fromEntries(Object.entries({ ...(design.elementStyles || {}) }).map(([id, style]) => [
      id, { ...(style || {}), ...(activeResponsive.elementStyles?.[id] || {}) }
    ]))
  }), [design, previewMode]);
  const hasViewportOverrides = previewMode !== 'desktop' && Boolean(
    Object.keys(activeResponsive.layout || {}).length ||
    Object.keys(activeResponsive.theme || {}).length ||
    Object.keys(activeResponsive.typography || {}).length ||
    Object.values(activeResponsive.elementStyles || {}).some(style => Object.keys(style || {}).length > 0)
  );
  const previewStyle = useMemo(() => buildStorefrontVisualStyle(design, previewMode), [design, previewMode]);
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
    if (previewMode !== 'desktop' && ['layout', 'theme', 'typography'].includes(group)) {
      commitDesign({
        ...design,
        responsive: {
          ...(design.responsive || {}),
          [previewMode]: {
            ...(design.responsive?.[previewMode] || {}),
            [group]: { ...(design.responsive?.[previewMode]?.[group] || {}), [key]: value }
          }
        }
      });
      return;
    }
    commitDesign({ ...design, [group]: { ...design[group], [key]: value } });
  };

  const updateSiteText = (key, value) => {
    if (typeof setSiteSettings === 'function') setSiteSettings(current => ({ ...(current || {}), [key]: value }));
    setSaveMessage('ტექსტის ცვლილებები მონახაზში ჯერ არ შენახულა.');
  };

  const handlePreviewSelect = event => {
    if (!selectionMode) return;
    const target = event.target?.closest?.('[data-visual-editor-target]');
    if (!target) return;
    const targetId = target.getAttribute('data-visual-editor-target');
    const metadata = VISUAL_EDITOR_TARGETS[targetId];
    if (!metadata) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedElement({ id: targetId, ...metadata });
  };

  const selectElementFromTree = targetId => {
    const metadata = VISUAL_EDITOR_TARGETS[targetId];
    if (!metadata) return;
    setSelectionMode(false);
    setSelectedElement({ id: targetId, ...metadata });
  };

  const selectedElementValue = selectedElement
    ? selectedElement.settingKey
      ? (siteSettings?.[selectedElement.settingKey] || '')
      : selectedElement.group === 'hero'
        ? (design.hero?.imageUrl || '')
        : selectedElement.group
          ? (design[selectedElement.group]?.[selectedElement.key] || '')
          : ''
    : '';

  const updateSelectedElement = value => {
    if (!selectedElement) return;
    if (selectedElement.settingKey) updateSiteText(selectedElement.settingKey, value);
    else if (selectedElement.group) updateGroup(selectedElement.group, selectedElement.key, value);
  };

  const selectedElementStyle = selectedElement
    ? {
        ...(design.elementStyles?.[selectedElement.id] || {}),
        ...(activeResponsive.elementStyles?.[selectedElement.id] || {})
      }
    : {};

  const updateSelectedElementStyle = (key, value) => {
    if (!selectedElement) return;
    if (previewMode !== 'desktop') {
      commitDesign({
        ...design,
        responsive: {
          ...(design.responsive || {}),
          [previewMode]: {
            ...(design.responsive?.[previewMode] || {}),
            elementStyles: {
              ...(design.responsive?.[previewMode]?.elementStyles || {}),
              [selectedElement.id]: {
                ...(design.responsive?.[previewMode]?.elementStyles?.[selectedElement.id] || {}),
                [key]: value
              }
            }
          }
        }
      });
      return;
    }
    commitDesign({
      ...design,
      elementStyles: {
        ...(design.elementStyles || {}),
        [selectedElement.id]: {
          ...(design.elementStyles?.[selectedElement.id] || {}),
          [key]: value
        }
      }
    });
  };

  const clearViewportOverrides = () => {
    if (previewMode === 'desktop' || !design.responsive?.[previewMode]) return;
    const responsive = { ...(design.responsive || {}) };
    delete responsive[previewMode];
    commitDesign({ ...design, responsive });
    setSelectedElement(null);
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

  const reorderSection = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const current = [...design.sectionOrder];
    const from = current.indexOf(sourceId);
    const to = current.indexOf(targetId);
    if (from < 0 || to < 0) return;
    current.splice(from, 1);
    current.splice(to, 0, sourceId);
    commitDesign({ ...design, sectionOrder: current });
  };


  const nextCustomId = prefix => {
    customIdCounter.current += 1;
    return prefix + '-' + Date.now().toString(36) + '-' + customIdCounter.current.toString(36);
  };
  const addCustomSection = () => {
    if ((design.customSections || []).length >= 12) { setSaveMessage('შეგიძლიათ მაქსიმუმ 12 საკუთარი სექციის შექმნა.'); return; }
    const id = nextCustomId('custom-section');
    commitDesign({ ...design, customSections: [...(design.customSections || []), {
      id, title: 'ახალი სექცია', visible: true, backgroundColor: '#ffffff', textColor: '#29241f', padding: 24, align: 'left', maxWidth: 1440, marginTop: 0, marginBottom: 0, borderRadius: 16, minHeight: 0, responsive: {},
      blocks: [{ id: nextCustomId('block'), type: 'heading', text: 'ახალი სათაური', imageUrl: '', videoUrl: '', alt: '', label: '', url: '' }]
    }] });
  };
  const updateCustomSection = (sectionId, key, value) => commitDesign({ ...design, customSections: (design.customSections || []).map(section => section.id === sectionId ? { ...section, [key]: value } : section) });
  const updateCustomSectionStyle = (sectionId, key, value) => commitDesign({
    ...design,
    customSections: (design.customSections || []).map(section => {
      if (section.id !== sectionId) return section;
      if (previewMode === 'desktop') return { ...section, [key]: value };
      return {
        ...section,
        responsive: {
          ...(section.responsive || {}),
          [previewMode]: { ...(section.responsive?.[previewMode] || {}), [key]: value }
        }
      };
    })
  });
  const getCustomSectionStyleValue = (section, key) => previewMode === 'desktop'
    ? section[key]
    : section.responsive?.[previewMode]?.[key] ?? section[key];
  const addCustomBlock = (sectionId, type) => commitDesign({
    ...design, customSections: (design.customSections || []).map(section => {
      if (section.id !== sectionId || section.blocks.length >= 10) return section;
      return { ...section, blocks: [...section.blocks, { id: nextCustomId('block'), type, text: type === 'heading' ? 'ახალი სათაური' : 'ახალი ტექსტი', imageUrl: '', videoUrl: '', alt: '', label: 'ღილაკი', url: '' }] };
    })
  });
  const updateCustomBlock = (sectionId, blockId, key, value) => commitDesign({
    ...design, customSections: (design.customSections || []).map(section => section.id !== sectionId ? section : ({ ...section, blocks: section.blocks.map(block => block.id === blockId ? { ...block, [key]: value } : block) }))
  });
  const removeCustomBlock = (sectionId, blockId) => commitDesign({
    ...design, customSections: (design.customSections || []).map(section => section.id !== sectionId ? section : ({ ...section, blocks: section.blocks.filter(block => block.id !== blockId) }))
  });
  const removeCustomSection = sectionId => commitDesign({ ...design, customSections: (design.customSections || []).filter(section => section.id !== sectionId) });
  const duplicateCustomSection = sectionId => {
    if ((design.customSections || []).length >= 12) { setSaveMessage('შეგიძლიათ მაქსიმუმ 12 საკუთარი სექციის შექმნა.'); return; }
    const source = (design.customSections || []).find(section => section.id === sectionId);
    if (!source) return;
    const duplicate = { ...source, id: nextCustomId('custom-section'), title: (source.title || 'სექცია').slice(0, 90) + ' — ასლი', blocks: source.blocks.map(block => ({ ...block, id: nextCustomId('block') })) };
    const customSections = [...design.customSections];
    customSections.splice(customSections.findIndex(section => section.id === sectionId) + 1, 0, duplicate);
    commitDesign({ ...design, customSections });
  };
  const moveCustomSection = (sectionId, direction) => {
    const customSections = [...(design.customSections || [])];
    const index = customSections.findIndex(section => section.id === sectionId), target = index + direction;
    if (index < 0 || target < 0 || target >= customSections.length) return;
    [customSections[index], customSections[target]] = [customSections[target], customSections[index]];
    commitDesign({ ...design, customSections });
  };

  const applyPreset = preset => {
    const nextTheme = THEME_PRESETS[preset];
    if (!nextTheme) return;
    if (previewMode !== 'desktop') {
      commitDesign({
        ...design,
        responsive: {
          ...(design.responsive || {}),
          [previewMode]: { ...(design.responsive?.[previewMode] || {}), theme: { ...nextTheme } }
        }
      });
      return;
    }
    commitDesign({ ...design, theme: { ...nextTheme } });
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
          <section className="rounded-2xl border border-emerald-400/25 bg-slate-900/90 p-4 space-y-3" aria-label="Preview ელემენტის არჩევა">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-sm font-black text-white"><MousePointer2 className="h-4 w-4 text-emerald-300" /> პირდაპირი არჩევა</h3>
                <p className="mt-1 text-[10px] leading-4 text-slate-400">ჩართეთ რეჟიმი და Preview-ში დააჭირეთ იმ ელემენტს, რომლის შეცვლაც გსურთ.</p>
              </div>
              <button type="button" onClick={() => { setSelectionMode(value => !value); setSelectedElement(null); }} aria-pressed={selectionMode} className={selectionMode ? 'shrink-0 rounded-xl bg-emerald-400 px-3 py-2 text-[11px] font-black text-slate-950' : 'shrink-0 rounded-xl border border-slate-600 px-3 py-2 text-[11px] font-bold text-slate-200'}>
                {selectionMode ? 'არჩევა ჩართულია' : 'არჩევის ჩართვა'}
              </button>
            </div>
            <details className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold text-slate-200">
                <span>კომპონენტების იერარქია</span>
                <span className="text-[10px] font-semibold text-slate-500">{Object.keys(VISUAL_EDITOR_TARGETS).length} ელემენტი</span>
              </summary>
              <div className="mt-3 space-y-2">
                {VISUAL_EDITOR_TREE.map(group => (
                  <details key={group.id} className="rounded-lg border border-slate-800 bg-slate-900/70">
                    <summary className="cursor-pointer px-3 py-2.5 text-[11px] font-black text-emerald-200">{group.label} ({group.targets.length})</summary>
                    <div className="grid grid-cols-1 gap-1 border-t border-slate-800 p-2 sm:grid-cols-2">
                      {group.targets.map(([targetId, metadata]) => (
                        <button
                          key={targetId}
                          type="button"
                          aria-pressed={selectedElement?.id === targetId}
                          onClick={() => selectElementFromTree(targetId)}
                          className={selectedElement?.id === targetId
                            ? 'rounded-lg bg-emerald-400 px-2.5 py-2 text-left text-[10px] font-black text-slate-950'
                            : 'rounded-lg border border-slate-800 px-2.5 py-2 text-left text-[10px] font-semibold text-slate-300 hover:border-emerald-400/50 hover:text-white'}
                        >
                          {metadata.label}
                        </button>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">აქედან შეგიძლიათ მონიშნოთ მენიუსა და სხვა ისეთი ელემენტებიც, რომლებიც Preview-ში ამ მომენტში დამალულია.</p>
            </details>
            {selectedElement && (
              <div className="rounded-xl border border-emerald-400/30 bg-slate-950/80 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-emerald-200">{selectedElement.label}</p>
                  <button type="button" onClick={() => setSelectedElement(null)} className="text-[10px] font-bold text-slate-400 hover:text-white">გასუფთავება</button>
                </div>
                {(selectedElement.settingKey || selectedElement.group) ? (
                  selectedElement.multiline ? (
                    <textarea value={selectedElementValue} maxLength={240} rows={3} onChange={event => updateSelectedElement(event.target.value)} aria-label={selectedElement.label} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white" />
                  ) : (
                    <input value={selectedElementValue} maxLength={selectedElement.settingKey === 'heroTitle' ? 120 : selectedElement.group === 'hero' ? 2048 : 180} onChange={event => updateSelectedElement(event.target.value)} aria-label={selectedElement.label} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white" />
                  )
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-[10px] text-slate-300">
                    <span>ტექსტის ფერი</span>
                    <input type="color" value={selectedElementStyle.textColor || '#29241f'} onChange={event => updateSelectedElementStyle('textColor', event.target.value)} className="gs-visual-color-control h-9 w-full rounded-lg border border-slate-700 bg-slate-900 p-1" />
                  </label>
                  <label className="space-y-1 text-[10px] text-slate-300">
                    <span>ფონის ფერი</span>
                    <input type="color" value={selectedElementStyle.backgroundColor || '#ffffff'} onChange={event => updateSelectedElementStyle('backgroundColor', event.target.value)} className="gs-visual-color-control h-9 w-full rounded-lg border border-slate-700 bg-slate-900 p-1" />
                  </label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span>ჩარჩოს ფერი</span><input type="color" value={selectedElementStyle.borderColor || '#92785f'} onChange={event => updateSelectedElementStyle('borderColor', event.target.value)} className="gs-visual-color-control h-9 w-full rounded-lg border border-slate-700 bg-slate-900 p-1" /></label>
                </div>
                <label className="block space-y-1 text-[10px] text-slate-300">
                  <span className="flex justify-between"><span>ტექსტის ზომა</span><b>{selectedElementStyle.fontSize ?? 'ავტო'} px</b></span>
                  <input type="range" min="10" max="64" step="1" value={selectedElementStyle.fontSize ?? 18} onChange={event => updateSelectedElementStyle('fontSize', Number(event.target.value))} className="w-full accent-emerald-400" />
                </label>
                <label className="block space-y-1 text-[10px] text-slate-300">
                  <span className="flex justify-between"><span>შიდა დაშორება</span><b>{selectedElementStyle.padding ?? 0} px</b></span>
                  <input type="range" min="0" max="48" step="1" value={selectedElementStyle.padding ?? 0} onChange={event => updateSelectedElementStyle('padding', Number(event.target.value))} className="w-full accent-emerald-400" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-[10px] text-slate-300"><span className="flex justify-between"><span>ჰორიზონტალური შიდა დაშორება</span><b>{selectedElementStyle.paddingX ?? 'ავტო'} px</b></span><input type="range" min="0" max="64" value={selectedElementStyle.paddingX ?? 0} onChange={event => updateSelectedElementStyle('paddingX', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span className="flex justify-between"><span>ვერტიკალური შიდა დაშორება</span><b>{selectedElementStyle.paddingY ?? 'ავტო'} px</b></span><input type="range" min="0" max="64" value={selectedElementStyle.paddingY ?? 0} onChange={event => updateSelectedElementStyle('paddingY', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                </div>
                <label className="block space-y-1 text-[10px] text-slate-300">
                  <span className="flex justify-between"><span>კუთხეების მომრგვალება</span><b>{selectedElementStyle.borderRadius ?? 0} px</b></span>
                  <input type="range" min="0" max="32" step="1" value={selectedElementStyle.borderRadius ?? 0} onChange={event => updateSelectedElementStyle('borderRadius', Number(event.target.value))} className="w-full accent-emerald-400" />
                </label>
                <label className="block space-y-1 text-[10px] text-slate-300">
                  <span className="flex justify-between"><span>სიგანე</span><b>{selectedElementStyle.width ?? 100}%</b></span>
                  <input type="range" min="10" max="100" step="1" value={selectedElementStyle.width ?? 100} onChange={event => updateSelectedElementStyle('width', Number(event.target.value))} className="w-full accent-emerald-400" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-[10px] text-slate-300"><span className="flex justify-between"><span>მაქსიმალური სიგანე</span><b>{selectedElementStyle.maxWidth ?? 'ავტო'} px</b></span><input type="range" min="0" max="1200" step="10" value={selectedElementStyle.maxWidth ?? 0} onChange={event => updateSelectedElementStyle('maxWidth', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span className="flex justify-between"><span>მინიმალური სიგანე</span><b>{selectedElementStyle.minWidth ?? 0} px</b></span><input type="range" min="0" max="800" step="10" value={selectedElementStyle.minWidth ?? 0} onChange={event => updateSelectedElementStyle('minWidth', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-[10px] text-slate-300"><span className="flex justify-between"><span>ზედა გარე დაშორება</span><b>{selectedElementStyle.marginTop ?? 0} px</b></span><input type="range" min="0" max="120" step="2" value={selectedElementStyle.marginTop ?? 0} onChange={event => updateSelectedElementStyle('marginTop', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span className="flex justify-between"><span>ქვედა გარე დაშორება</span><b>{selectedElementStyle.marginBottom ?? 0} px</b></span><input type="range" min="0" max="120" step="2" value={selectedElementStyle.marginBottom ?? 0} onChange={event => updateSelectedElementStyle('marginBottom', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                </div>
                <label className="block space-y-1 text-[10px] text-slate-300">
                  <span className="flex justify-between"><span>მინიმალური სიმაღლე</span><b>{selectedElementStyle.minHeight ?? 0} px</b></span>
                  <input type="range" min="0" max="600" step="10" value={selectedElementStyle.minHeight ?? 0} onChange={event => updateSelectedElementStyle('minHeight', Number(event.target.value))} className="w-full accent-emerald-400" />
                </label>
                <label className="block space-y-1 text-[10px] text-slate-300">
                  <span className="flex justify-between"><span>გამჭვირვალობა</span><b>{selectedElementStyle.opacity ?? 100}%</b></span>
                  <input type="range" min="0" max="100" step="5" value={selectedElementStyle.opacity ?? 100} onChange={event => updateSelectedElementStyle('opacity', Number(event.target.value))} className="w-full accent-emerald-400" />
                </label>
                {selectedElement.id.includes('image') && (
                  <>
                    <label className="block space-y-1 text-[10px] text-slate-300">
                      <span>ფოტოს ჩასმის რეჟიმი</span>
                      <select value={selectedElementStyle.objectFit || 'cover'} onChange={event => updateSelectedElementStyle('objectFit', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white">
                        <option value="cover">შევსება (Cover)</option><option value="contain">მთლიანად გამოჩენა (Contain)</option><option value="fill">გაწელვა (Fill)</option>
                      </select>
                    </label>
                    <label className="block space-y-1 text-[10px] text-slate-300">
                      <span className="flex justify-between"><span>ფოტოს ჰორიზონტალური პოზიცია</span><b>{selectedElementStyle.objectPositionX ?? 50}%</b></span>
                      <input type="range" min="0" max="100" step="1" value={selectedElementStyle.objectPositionX ?? 50} onChange={event => updateSelectedElementStyle('objectPositionX', Number(event.target.value))} className="w-full accent-emerald-400" />
                    </label>
                  </>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-[10px] text-slate-300">
                    <span>ტექსტის გასწორება</span>
                    <select value={selectedElementStyle.textAlign || 'left'} onChange={event => updateSelectedElementStyle('textAlign', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white">
                      <option value="left">მარცხნივ</option><option value="center">ცენტრში</option><option value="right">მარჯვნივ</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-[10px] text-slate-300">
                    <span>სისქე</span>
                    <select value={selectedElementStyle.fontWeight ?? 600} onChange={event => updateSelectedElementStyle('fontWeight', Number(event.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white">
                      <option value="400">ჩვეულებრივი</option><option value="500">საშუალო</option><option value="600">ნახევრად სქელი</option><option value="700">სქელი</option><option value="800">ძალიან სქელი</option><option value="900">მაქსიმალური</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-[10px] text-slate-300"><span>ჩარჩოს სისქე</span><input type="range" min="0" max="12" value={selectedElementStyle.borderWidth ?? 0} onChange={event => updateSelectedElementStyle('borderWidth', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span>ხაზებს შორის დაშორება</span><input type="range" min="0.8" max="2.5" step="0.1" value={selectedElementStyle.lineHeight ?? 1.4} onChange={event => updateSelectedElementStyle('lineHeight', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span>ასოების დაშორება</span><input type="range" min="-2" max="12" step="0.5" value={selectedElementStyle.letterSpacing ?? 0} onChange={event => updateSelectedElementStyle('letterSpacing', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span>ჩრდილი</span><select value={selectedElementStyle.boxShadow || 'none'} onChange={event => updateSelectedElementStyle('boxShadow', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"><option value="none">გარეშე</option><option value="soft">მსუბუქი</option><option value="medium">საშუალო</option><option value="strong">ძლიერი</option></select></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span>ტექსტის რეგისტრი</span><select value={selectedElementStyle.textTransform || 'none'} onChange={event => updateSelectedElementStyle('textTransform', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"><option value="none">უცვლელი</option><option value="uppercase">დიდი ასოები</option><option value="lowercase">პატარა ასოები</option><option value="capitalize">სიტყვების პირველი ასო</option></select></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span>ტექსტის სტილი</span><select value={selectedElementStyle.fontStyle || 'normal'} onChange={event => updateSelectedElementStyle('fontStyle', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"><option value="normal">ჩვეულებრივი</option><option value="italic">დახრილი</option></select></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span>ხაზგასმა</span><select value={selectedElementStyle.textDecoration || 'none'} onChange={event => updateSelectedElementStyle('textDecoration', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"><option value="none">გარეშე</option><option value="underline">ქვედა ხაზი</option><option value="line-through">გადახაზვა</option></select></label>
                  <label className="space-y-1 text-[10px] text-slate-300"><span>შრიფტი</span><select value={selectedElementStyle.fontFamily || 'inherit'} onChange={event => updateSelectedElementStyle('fontFamily', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"><option value="inherit">მემკვიდრეობით</option><option value="manrope">Manrope</option><option value="georgia">Georgia</option><option value="arial">Arial</option></select></label>
                </div>
                <button type="button" onClick={() => { updateSelectedElementStyle('textColor', ''); updateSelectedElementStyle('backgroundColor', ''); updateSelectedElementStyle('borderColor', ''); }} className="w-full rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-300">ფერების გასუფთავება</button>
                <p className="text-[10px] leading-4 text-slate-400">{selectedElement.help} სტილები ცალკე ინახება თითოეული ელემენტისთვის.</p>
              </div>
            )}
          </section>
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
            {previewMode !== 'desktop' && <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] leading-4 text-emerald-100">მიმდინარე რეჟიმი: {previewMode === 'tablet' ? 'Tablet' : 'Mobile'}. აქ შეცვლილი ფერები და შრიფტები მხოლოდ ამ მოწყობილობაზე იმოქმედებს; ცარიელი პარამეტრები Desktop-ის საერთო დიზაინს მემკვიდრეობით იღებს.</p>}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ColorControl label="გვერდის ფონი" value={activeTheme.canvas} onChange={value => updateGroup('theme', 'canvas', value)} />
              <ColorControl label="ბლოკების ფონი" value={activeTheme.surface} onChange={value => updateGroup('theme', 'surface', value)} />
              <ColorControl label="ბარათების ფონი" value={activeTheme.surfaceSoft} onChange={value => updateGroup('theme', 'surfaceSoft', value)} />
              <ColorControl label="ძირითადი ტექსტი" value={activeTheme.ink} onChange={value => updateGroup('theme', 'ink', value)} />
              <ColorControl label="მეორეული ტექსტი" value={activeTheme.muted} onChange={value => updateGroup('theme', 'muted', value)} />
              <ColorControl label="ხაზები / საზღვრები" value={activeTheme.line} onChange={value => updateGroup('theme', 'line', value)} />
              <ColorControl label="აქცენტის ფერი" value={activeTheme.accent} onChange={value => updateGroup('theme', 'accent', value)} />
              <ColorControl label="ზედა ზოლის ფონი" value={activeTheme.accentDark} onChange={value => updateGroup('theme', 'accentDark', value)} />
              <ColorControl label="ღილაკის ფონი" value={activeTheme.buttonBackground} onChange={value => updateGroup('theme', 'buttonBackground', value)} />
              <ColorControl label="ღილაკის ტექსტი" value={activeTheme.buttonText} onChange={value => updateGroup('theme', 'buttonText', value)} />
              <ColorControl label="მთავარი სათაურის ფერი" value={activeTheme.heroText} onChange={value => updateGroup('theme', 'heroText', value)} />
            </div>
          </details>

          <details open className="rounded-2xl border border-slate-700 bg-slate-900/90 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-white"><Layout className="h-4 w-4 text-emerald-300" /> შრიფტი და ზომები</summary>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">შრიფტის სტილი
                <select value={activeTypography.fontFamily} onChange={event => updateGroup('typography', 'fontFamily', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white">
                  <option value="manrope">Manrope / ქართული</option>
                  <option value="georgia">Georgia — კლასიკური</option>
                  <option value="arial">Arial — მინიმალისტური</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">სათაურების შრიფტი
                <select value={activeTypography.headingFontFamily} onChange={event => updateGroup('typography', 'headingFontFamily', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white">
                  <option value="georgia">Georgia — კლასიკური</option><option value="manrope">Manrope / ქართული</option><option value="arial">Arial — მარტივი</option>
                </select>
              </label>
              <RangeControl label="ძირითადი ტექსტის ზომა" value={activeTypography.baseFontSize} min={12} max={18} unit=" px" onChange={value => updateGroup('typography', 'baseFontSize', value)} />
              <RangeControl label="სათაურების მასშტაბი" value={activeTypography.headingScale} min={0.8} max={1.25} step={0.05} unit="×" onChange={value => updateGroup('typography', 'headingScale', value)} />
              <RangeControl label="გვერდის სიგანე" value={activeLayout.contentWidth} min={960} max={1600} step={20} unit=" px" onChange={value => updateGroup('layout', 'contentWidth', value)} />
              <RangeControl label="სექციებს შორის დაშორება" value={activeLayout.sectionGap} min={16} max={72} unit=" px" onChange={value => updateGroup('layout', 'sectionGap', value)} />
              <RangeControl label="მთავარი ბლოკის სიმაღლე" value={activeLayout.heroHeight} min={320} max={680} step={10} unit=" px" onChange={value => updateGroup('layout', 'heroHeight', value)} />
              <RangeControl label="Hero ტექსტის ბლოკის სიგანე" value={activeLayout.heroContentWidth} min={40} max={90} unit="%" onChange={value => updateGroup('layout', 'heroContentWidth', value)} />
              <RangeControl label="ბანერის სიმაღლე" value={activeLayout.bannerHeight} min={150} max={340} step={10} unit=" px" onChange={value => updateGroup('layout', 'bannerHeight', value)} />
              <RangeControl label="პროდუქტის ფოტოს პროპორცია" value={activeLayout.productImageRatio} min={0.7} max={1.2} step={0.05} onChange={value => updateGroup('layout', 'productImageRatio', value)} />
              <RangeControl label="კატეგორიის ბარათის სიმაღლე" value={activeLayout.categoryCardHeight} min={110} max={260} step={5} unit=" px" onChange={value => updateGroup('layout', 'categoryCardHeight', value)} />
              <RangeControl label="კატეგორიები ერთ რიგში (Desktop)" value={activeLayout.categoryColumns} min={2} max={6} onChange={value => updateGroup('layout', 'categoryColumns', value)} />
              <RangeControl label="პროდუქტები ერთ რიგში (Desktop)" value={activeLayout.productColumns} min={2} max={5} onChange={value => updateGroup('layout', 'productColumns', value)} />
              <RangeControl label="ბარათების კუთხეები" value={activeLayout.cardRadius} min={0} max={28} unit=" px" onChange={value => updateGroup('layout', 'cardRadius', value)} />
              <RangeControl label="ღილაკების კუთხეები" value={activeLayout.buttonRadius} min={0} max={28} unit=" px" onChange={value => updateGroup('layout', 'buttonRadius', value)} />
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
                <div
                  key={id}
                  draggable
                  onDragStart={event => { setDraggedSection(id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); }}
                  onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
                  onDrop={event => { event.preventDefault(); const sourceId = event.dataTransfer.getData('text/plain') || draggedSection; reorderSection(sourceId, id); setDraggedSection(''); }}
                  onDragEnd={() => setDraggedSection('')}
                  className={`flex items-center gap-2 rounded-xl border bg-slate-950/60 p-2.5 transition ${draggedSection === id ? 'border-emerald-400 opacity-50' : 'border-slate-700'}`}
                >
                  <input type="checkbox" checked={design.sections[id]} onChange={event => updateGroup('sections', id, event.target.checked)} aria-label={SECTION_LABELS[id] + ' — ჩვენება'} className="h-4 w-4 accent-emerald-400" />
                  <span className="min-w-0 flex-1 text-xs font-semibold text-slate-200"><span aria-hidden="true" className="mr-2 text-slate-500">⠿</span>{SECTION_LABELS[id]}</span>
                  <button type="button" onClick={() => moveSection(id, -1)} disabled={index === 0} aria-label={SECTION_LABELS[id] + ' ზემოთ'} className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => moveSection(id, 1)} disabled={index === design.sectionOrder.length - 1} aria-label={SECTION_LABELS[id] + ' ქვემოთ'} className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </details>


          <details open className="rounded-2xl border border-emerald-400/30 bg-slate-900/90 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black text-white"><span className="flex items-center gap-2"><Layout className="h-4 w-4 text-emerald-300" /> საკუთარი სექციების კონსტრუქტორი</span><span className="text-[10px] font-semibold text-emerald-200">{(design.customSections || []).length}/12</span></summary>
            <p className="mt-2 text-[10px] leading-4 text-slate-400">შექმენით დამატებითი კონტენტბლოკები ისე, რომ არსებული მაღაზიის სექციები და ფუნქციები უცვლელი დარჩეს. ცვლილებები საერთო ვიზუალურ მონახაზში ინახება.</p>
            <button type="button" onClick={addCustomSection} disabled={(design.customSections || []).length >= 12} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40"><Plus className="h-4 w-4" /> ახალი სექციის დამატება</button>
            <div className="mt-3 space-y-3">
              {(design.customSections || []).map((section, sectionIndex) => (
                <div key={section.id} className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={section.visible} onChange={event => updateCustomSection(section.id, 'visible', event.target.checked)} aria-label="სექციის ჩვენება" className="h-4 w-4 accent-emerald-400" />
                    <input value={section.title} maxLength={100} onChange={event => updateCustomSection(section.id, 'title', event.target.value)} aria-label="სექციის სახელი" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs font-bold text-white" />
                    <button type="button" onClick={() => moveCustomSection(section.id, -1)} disabled={sectionIndex === 0} aria-label="სექციის ზემოთ გადატანა" className="rounded-lg border border-slate-700 px-2 py-2 text-slate-300 disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => moveCustomSection(section.id, 1)} disabled={sectionIndex === design.customSections.length - 1} aria-label="სექციის ქვემოთ გადატანა" className="rounded-lg border border-slate-700 px-2 py-2 text-slate-300 disabled:opacity-30">↓</button>
                  </div>
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-2 text-[10px] font-bold text-emerald-200">
                    {previewMode === 'desktop' ? 'Desktop — ძირითადი სტილი' : previewMode === 'tablet' ? 'Tablet — დამოუკიდებელი სტილი' : 'Mobile — დამოუკიდებელი სტილი'}
                    {previewMode !== 'desktop' && <span className="ml-1 font-normal text-slate-400">ცარიელი პარამეტრი Desktop-ის მნიშვნელობას იყენებს</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-[10px] text-slate-300">ფონის ფერი<input type="color" value={getCustomSectionStyleValue(section, 'backgroundColor')} onChange={event => updateCustomSectionStyle(section.id, 'backgroundColor', event.target.value)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 p-1" /></label>
                    <label className="space-y-1 text-[10px] text-slate-300">ტექსტის ფერი<input type="color" value={getCustomSectionStyleValue(section, 'textColor')} onChange={event => updateCustomSectionStyle(section.id, 'textColor', event.target.value)} className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 p-1" /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-[10px] text-slate-300">შიდა დაშორება: {getCustomSectionStyleValue(section, 'padding')}px<input type="range" min="0" max="80" value={getCustomSectionStyleValue(section, 'padding')} onChange={event => updateCustomSectionStyle(section.id, 'padding', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                    <label className="space-y-1 text-[10px] text-slate-300">სიგანე: {getCustomSectionStyleValue(section, 'maxWidth')}px<input type="range" min="280" max="1600" step="10" value={getCustomSectionStyleValue(section, 'maxWidth')} onChange={event => updateCustomSectionStyle(section.id, 'maxWidth', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-[10px] text-slate-300">ზედა დაშორება: {getCustomSectionStyleValue(section, 'marginTop')}px<input type="range" min="0" max="160" value={getCustomSectionStyleValue(section, 'marginTop')} onChange={event => updateCustomSectionStyle(section.id, 'marginTop', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                    <label className="space-y-1 text-[10px] text-slate-300">ქვედა დაშორება: {getCustomSectionStyleValue(section, 'marginBottom')}px<input type="range" min="0" max="160" value={getCustomSectionStyleValue(section, 'marginBottom')} onChange={event => updateCustomSectionStyle(section.id, 'marginBottom', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-[10px] text-slate-300">მომრგვალება: {getCustomSectionStyleValue(section, 'borderRadius')}px<input type="range" min="0" max="48" value={getCustomSectionStyleValue(section, 'borderRadius')} onChange={event => updateCustomSectionStyle(section.id, 'borderRadius', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                    <label className="space-y-1 text-[10px] text-slate-300">მინ. სიმაღლე: {getCustomSectionStyleValue(section, 'minHeight')}px<input type="range" min="0" max="800" step="10" value={getCustomSectionStyleValue(section, 'minHeight')} onChange={event => updateCustomSectionStyle(section.id, 'minHeight', Number(event.target.value))} className="w-full accent-emerald-400" /></label>
                  </div>
                  <label className="block space-y-1 text-[10px] text-slate-300">ტექსტის განლაგება<select value={getCustomSectionStyleValue(section, 'align')} onChange={event => updateCustomSectionStyle(section.id, 'align', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"><option value="left">მარცხნივ</option><option value="center">ცენტრში</option><option value="right">მარჯვნივ</option></select></label>
                  <div className="space-y-2">
                    {section.blocks.map((block, blockIndex) => (
                      <div key={block.id} className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 space-y-2">
                        <div className="flex items-center gap-2"><span className="flex-1 text-[10px] font-bold text-emerald-200">ელემენტი {blockIndex + 1}</span>
                          <select value={block.type} onChange={event => updateCustomBlock(section.id, block.id, 'type', event.target.value)} aria-label="ელემენტის ტიპი" className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[10px] text-white"><option value="heading">სათაური</option><option value="text">ტექსტი</option><option value="image">სურათი</option><option value="button">ღილაკი</option><option value="video">ვიდეო</option><option value="spacer">ცარიელი სივრცე</option></select>
                          <button type="button" onClick={() => removeCustomBlock(section.id, block.id)} aria-label="ელემენტის წაშლა" className="rounded-lg border border-rose-500/30 p-1.5 text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        {(block.type === 'heading' || block.type === 'text') && <textarea value={block.text} maxLength={block.type === 'heading' ? 120 : 600} rows={block.type === 'heading' ? 2 : 3} onChange={event => updateCustomBlock(section.id, block.id, 'text', event.target.value)} aria-label="ელემენტის ტექსტი" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" />}
                        {block.type === 'image' && <><input value={block.imageUrl} maxLength={2048} onChange={event => updateCustomBlock(section.id, block.id, 'imageUrl', event.target.value)} placeholder="სურათის HTTPS ბმული" aria-label="სურათის ბმული" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /><input value={block.alt} maxLength={160} onChange={event => updateCustomBlock(section.id, block.id, 'alt', event.target.value)} placeholder="სურათის აღწერა (alt)" aria-label="სურათის აღწერა" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /></>}
                        {block.type === 'video' && <input value={block.videoUrl} maxLength={2048} onChange={event => updateCustomBlock(section.id, block.id, 'videoUrl', event.target.value)} placeholder="YouTube ან Vimeo ბმული" aria-label="ვიდეოს ბმული" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" />}
                        {block.type === 'button' && <><input value={block.label} maxLength={60} onChange={event => updateCustomBlock(section.id, block.id, 'label', event.target.value)} placeholder="ღილაკის ტექსტი" aria-label="ღილაკის ტექსტი" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /><input value={block.url} maxLength={2048} onChange={event => updateCustomBlock(section.id, block.id, 'url', event.target.value)} placeholder="HTTPS ან შიდა ბმული /..." aria-label="ღილაკის ბმული" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white" /></>}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select defaultValue="text" aria-label="ახალი ელემენტის ტიპი" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-[10px] text-white"><option value="heading">სათაური</option><option value="text">ტექსტი</option><option value="image">სურათი</option><option value="button">ღილაკი</option><option value="video">ვიდეო</option><option value="spacer">ცარიელი სივრცე</option></select>
                    <button type="button" disabled={section.blocks.length >= 10} onClick={event => { const select = event.currentTarget.parentElement.querySelector('select'); addCustomBlock(section.id, select?.value || 'text'); }} className="rounded-lg border border-emerald-400/40 px-3 py-2 text-[10px] font-bold text-emerald-200 disabled:opacity-40"><Plus className="mr-1 inline h-3 w-3" /> ელემენტი</button>
                    <button type="button" onClick={() => duplicateCustomSection(section.id)} disabled={design.customSections.length >= 12} className="rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-300 disabled:opacity-40"><Copy className="mr-1 inline h-3 w-3" /> ასლი</button>
                    <button type="button" onClick={() => removeCustomSection(section.id)} className="rounded-lg border border-rose-500/30 px-3 py-2 text-[10px] font-bold text-rose-200"><Trash2 className="mr-1 inline h-3 w-3" /> წაშლა</button>
                  </div>
                </div>
              ))}
              {(design.customSections || []).length === 0 && <p className="rounded-xl border border-dashed border-slate-700 p-3 text-center text-[10px] text-slate-500">ჯერ საკუთარი სექცია არ შეგიქმნიათ.</p>}
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
              <p className="text-[10px] text-slate-400">{selectionMode ? 'დააჭირეთ ელემენტს სტილის შესაცვლელად. პროდუქტის დეტალები გახსენით არჩევის რეჟიმის გამორთვით, შემდეგ ჩართეთ რეჟიმი და მონიშნეთ დეტალური ფანჯრის ელემენტები.' : 'სექციები და პროდუქტები შეგიძლიათ გადაადგილოთ გადათრევით. პროდუქტის დეტალების გასახსნელად დააჭირეთ პროდუქტს; კალათა და შეკვეთა Preview-ში გამორთულია.'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {previewMode !== 'desktop' && <button type="button" onClick={clearViewportOverrides} disabled={!hasViewportOverrides} className="rounded-lg border border-amber-300/40 px-2.5 py-2 text-[10px] font-bold text-amber-100 disabled:opacity-40">ამ მოწყობილობის პარამეტრების გასუფთავება</button>}
              <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1">
              <button type="button" onClick={() => setPreviewMode('desktop')} aria-pressed={previewMode === 'desktop'} className={previewMode === 'desktop' ? 'rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-bold text-slate-950' : 'rounded-lg px-3 py-2 text-[11px] font-bold text-slate-300'}><Monitor className="mr-1 inline h-3.5 w-3.5" /> Desktop</button>
              <button type="button" onClick={() => setPreviewMode('tablet')} aria-pressed={previewMode === 'tablet'} className={previewMode === 'tablet' ? 'rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-bold text-slate-950' : 'rounded-lg px-3 py-2 text-[11px] font-bold text-slate-300'}><Monitor className="mr-1 inline h-3.5 w-3.5" /> Tablet</button>
              <button type="button" onClick={() => setPreviewMode('mobile')} aria-pressed={previewMode === 'mobile'} className={previewMode === 'mobile' ? 'rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-bold text-slate-950' : 'rounded-lg px-3 py-2 text-[11px] font-bold text-slate-300'}><Smartphone className="mr-1 inline h-3.5 w-3.5" /> Mobile</button>
              </div>
            </div>
          </div>
          <style>{`
            .gs-visual-preview-frame.gs-visual-select-mode [data-visual-editor-target] { cursor: crosshair !important; }
            .gs-visual-preview-frame[data-visual-editor-selected="hero"] [data-visual-editor-target="hero"],
            .gs-visual-preview-frame[data-visual-editor-selected="hero.image"] [data-visual-editor-target="hero.image"],
            .gs-visual-preview-frame[data-visual-editor-selected="hero.title"] [data-visual-editor-target="hero.title"],
            .gs-visual-preview-frame[data-visual-editor-selected="hero.description"] [data-visual-editor-target="hero.description"],
            .gs-visual-preview-frame[data-visual-editor-selected="hero.button"] [data-visual-editor-target="hero.button"],
            .gs-visual-preview-frame[data-visual-editor-selected="banner"] [data-visual-editor-target="banner"],
            .gs-visual-preview-frame[data-visual-editor-selected="banner.card"] [data-visual-editor-target="banner.card"],
            .gs-visual-preview-frame[data-visual-editor-selected="banner.title"] [data-visual-editor-target="banner.title"],
            .gs-visual-preview-frame[data-visual-editor-selected="banner.image"] [data-visual-editor-target="banner.image"],
            .gs-visual-preview-frame[data-visual-editor-selected="banner.description"] [data-visual-editor-target="banner.description"],
            .gs-visual-preview-frame[data-visual-editor-selected="banner.button"] [data-visual-editor-target="banner.button"],
            .gs-visual-preview-frame[data-visual-editor-selected="flashSale"] [data-visual-editor-target="flashSale"],
            .gs-visual-preview-frame[data-visual-editor-selected="flashSale.title"] [data-visual-editor-target="flashSale.title"],
            .gs-visual-preview-frame[data-visual-editor-selected="flashSale.badge"] [data-visual-editor-target="flashSale.badge"],
            .gs-visual-preview-frame[data-visual-editor-selected="flashSale.description"] [data-visual-editor-target="flashSale.description"],
            .gs-visual-preview-frame[data-visual-editor-selected="categories"] [data-visual-editor-target="categories"],
            .gs-visual-preview-frame[data-visual-editor-selected="categories.title"] [data-visual-editor-target="categories.title"],
            .gs-visual-preview-frame[data-visual-editor-selected="categories.description"] [data-visual-editor-target="categories.description"],
            .gs-visual-preview-frame[data-visual-editor-selected="category.card"] [data-visual-editor-target="category.card"],
            .gs-visual-preview-frame[data-visual-editor-selected="category.title"] [data-visual-editor-target="category.title"],
            .gs-visual-preview-frame[data-visual-editor-selected="category.description"] [data-visual-editor-target="category.description"],
            .gs-visual-preview-frame[data-visual-editor-selected="filters"] [data-visual-editor-target="filters"],
            .gs-visual-preview-frame[data-visual-editor-selected="filters.priceLabel"] [data-visual-editor-target="filters.priceLabel"],
            .gs-visual-preview-frame[data-visual-editor-selected="filters.input"] [data-visual-editor-target="filters.input"],
            .gs-visual-preview-frame[data-visual-editor-selected="filters.clearButton"] [data-visual-editor-target="filters.clearButton"],
            .gs-visual-preview-frame[data-visual-editor-selected="filters.sortLabel"] [data-visual-editor-target="filters.sortLabel"],
            .gs-visual-preview-frame[data-visual-editor-selected="filters.sortSelect"] [data-visual-editor-target="filters.sortSelect"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.card"] [data-visual-editor-target="product.card"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.image"] [data-visual-editor-target="product.image"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.title"] [data-visual-editor-target="product.title"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.detail.image"] [data-visual-editor-target="product.detail.image"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.detail.title"] [data-visual-editor-target="product.detail.title"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.detail.price"] [data-visual-editor-target="product.detail.price"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.detail.description"] [data-visual-editor-target="product.detail.description"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.detail.variants"] [data-visual-editor-target="product.detail.variants"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.detail.purchase"] [data-visual-editor-target="product.detail.purchase"],
            .gs-visual-preview-frame[data-visual-editor-selected="product.button"] [data-visual-editor-target="product.button"],
            .gs-visual-preview-frame[data-visual-editor-selected="header"] [data-visual-editor-target="header"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.announcement"] [data-visual-editor-target="header.announcement"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.announcement.text"] [data-visual-editor-target="header.announcement.text"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.brand"] [data-visual-editor-target="header.brand"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.logo"] [data-visual-editor-target="header.logo"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.storeName"] [data-visual-editor-target="header.storeName"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.caption"] [data-visual-editor-target="header.caption"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.menu.toggle"] [data-visual-editor-target="header.menu.toggle"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.search"] [data-visual-editor-target="header.search"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.search.input"] [data-visual-editor-target="header.search.input"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.search.button"] [data-visual-editor-target="header.search.button"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.menu"] [data-visual-editor-target="header.menu"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.menu.heading"] [data-visual-editor-target="header.menu.heading"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.menu.section"] [data-visual-editor-target="header.menu.section"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.menu.sectionTitle"] [data-visual-editor-target="header.menu.sectionTitle"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.menu.link"] [data-visual-editor-target="header.menu.link"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.menu.footer"] [data-visual-editor-target="header.menu.footer"],
            .gs-visual-preview-frame[data-visual-editor-selected="header.menu.languageButton"] [data-visual-editor-target="header.menu.languageButton"],
            .gs-visual-preview-frame[data-visual-editor-selected="footer"] [data-visual-editor-target="footer"],
            .gs-visual-preview-frame[data-visual-editor-selected="footer.links"] [data-visual-editor-target="footer.links"],
            .gs-visual-preview-frame[data-visual-editor-selected="footer.link"] [data-visual-editor-target="footer.link"],
            .gs-visual-preview-frame[data-visual-editor-selected="footer.copyright"] [data-visual-editor-target="footer.copyright"],
            .gs-visual-preview-frame[data-visual-editor-selected="footer.copyright"] [data-visual-editor-target="footer.copyright"] {
              outline: 2px solid #34d399 !important; outline-offset: 3px; position: relative; z-index: 3;
            }
          `}</style>
          <div onClickCapture={handlePreviewSelect} data-visual-editor-selected={selectedElement?.id || ''} className={`${previewMode === 'mobile' ? 'geostore-fashion-store gs-visual-preview-frame gs-visual-preview-frame--mobile mx-auto overflow-hidden rounded-2xl border border-slate-600 bg-stone-100 shadow-2xl' : 'geostore-fashion-store gs-visual-preview-frame mx-auto overflow-hidden rounded-2xl border border-slate-600 bg-stone-100 shadow-2xl'}${selectionMode ? ' gs-visual-select-mode' : ''}`} style={{ ...previewStyle, maxWidth: previewMode === 'mobile' ? '420px' : previewMode === 'tablet' ? '820px' : '100%' }}>
            <Header
              siteSettings={{ ...(siteSettings || {}), visualDesign: previewDesign }}
              visualDesign={previewDesign}
              setActiveTab={NOOP}
              activeTab="store"
              wishlistCount={0}
              cartCount={0}
              comparisonCount={0}
              adminLoggedIn={false}
              setIsAuthOpen={NOOP}
              setAuthMode={NOOP}
              setIsAiAssistantOpen={NOOP}
              setIsImageSearchOpen={NOOP}
              setIsComparisonOpen={NOOP}
              setIsTrackerOpen={NOOP}
              setIsNotificationsOpen={NOOP}
              setSupportOpen={NOOP}
              setIsTermsOpen={NOOP}
              setIsWarrantyOpen={NOOP}
              searchQuery=""
              setSearchQuery={NOOP}
              categories={safeCategories}
              selectedCategory={previewCategory}
              setSelectedCategory={setPreviewCategory}
              handleInstallClick={NOOP}
              currentLang="ka"
              setCurrLang={NOOP}
            />
            <div className="gs-visual-preview-content">
              <StoreView
                onProductOrderChange={productOrder => commitDesign({ ...design, productOrder })}
                currentLang="ka"
                siteSettings={{ ...(siteSettings || {}), visualDesign: previewDesign }}
                visualEditorViewport={previewMode}
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
            <StorefrontFooter
              siteSettings={{ ...(siteSettings || {}), visualDesign: previewDesign }}
              visualDesign={previewDesign}
              activeTab="store"
              setActiveTab={NOOP}
              setIsTermsOpen={NOOP}
              setIsWarrantyOpen={NOOP}
              currentLang="ka"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
