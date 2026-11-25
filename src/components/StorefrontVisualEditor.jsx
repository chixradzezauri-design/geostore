import StorefrontSectionGeometry from './StorefrontSectionGeometry.jsx';
import StorefrontDesignTemplates from './StorefrontDesignTemplates.jsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronUp, Monitor, RotateCcw, RotateCw,
  Save, Smartphone, Upload, Palette, Type, Layout, Image as ImageIcon, MousePointer2, Plus, Trash2, Copy
} from 'lucide-react';
import StoreView from './StoreView';
import Header from './Header';
import { SignatureMobileNav } from './Header';
import StorefrontFooter from './StorefrontFooter';
import { supabase } from '../supabaseClient';
import {
  DEFAULT_STOREFRONT_VISUAL_DESIGN,
  normalizeStorefrontVisualDesign,
  getStorefrontSectionOrder, setStorefrontSectionOrder, inheritStorefrontSectionOrder, moveFlashSaleAfterHero,
  buildStorefrontVisualStyle
} from '../utils/storefrontVisualDesign.js';

const ELEMENT_STYLE_LABELS = {
  textColor: 'ტექსტის ფერი',
  backgroundColor: 'ფონის ფერი',
  borderColor: 'ჩარჩოს ფერი',
  borderWidth: 'ჩარჩოს სისქე',
  borderRadius: 'კუთხეების მომრგვალება',
  fontSize: 'ტექსტის ზომა',
  fontWeight: 'ტექსტის სისქე',
  fontFamily: 'შრიფტი',
  lineHeight: 'სტრიქონების დაშორება',
  letterSpacing: 'ასოების დაშორება',
  textTransform: 'ასოების ფორმატი',
  textAlign: 'ტექსტის განლაგება',
  padding: 'შიდა დაშორება',
  paddingX: 'ჰორიზონტალური შიდა დაშორება',
  paddingY: 'ვერტიკალური შიდა დაშორება',
  marginTop: 'ზედა გარე დაშორება',
  marginBottom: 'ქვედა გარე დაშორება',
  textDecoration: 'ტექსტის ხაზგასმა',
  fontStyle: 'შრიფტის დახრა',
  objectFit: 'სურათის ჩასმის რეჟიმი',
  objectPositionX: 'სურათის ჰორიზონტალური პოზიცია',
  objectPositionY: 'სურათის ვერტიკალური პოზიცია',
  maxWidth: 'მაქსიმალური სიგანე',
  minWidth: 'მინიმალური სიგანე',
  width: 'სიგანე',
  minHeight: 'მინიმალური სიმაღლე',
  opacity: 'გამჭვირვალობა',
  boxShadow: 'ჩრდილი'
};

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

const flattenStorefrontSnapshot = (value, prefix = '', output = {}) => {
  if (Array.isArray(value)) {
    if (!value.length) output[prefix || 'root'] = '[]';
    value.forEach((item, index) => flattenStorefrontSnapshot(item, prefix ? prefix + '[' + index + ']' : '[' + index + ']', output));
    return output;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    if (!entries.length) output[prefix || 'root'] = '{}';
    entries.forEach(([key, item]) => flattenStorefrontSnapshot(item, prefix ? prefix + '.' + key : key, output));
    return output;
  }
  output[prefix || 'root'] = value === undefined ? '(არ არის)' : value === null ? 'null' : String(value);
  return output;
};

const compareStorefrontSnapshots = (publishedSnapshot, currentDraftSnapshot) => {
  const published = flattenStorefrontSnapshot(publishedSnapshot);
  const current = flattenStorefrontSnapshot(currentDraftSnapshot);
  const paths = [...new Set([...Object.keys(published), ...Object.keys(current)])].sort();
  const differences = paths.filter(path => published[path] !== current[path]).map(path => ({
    path,
    published: Object.prototype.hasOwnProperty.call(published, path) ? published[path] : '(არ არის)',
    draft: Object.prototype.hasOwnProperty.call(current, path) ? current[path] : '(არ არის)'
  }));
  return { changedCount: differences.length, unchanged: differences.length === 0, differences: differences.slice(0, 60), truncated: differences.length > 60 };
};

const formatSnapshotDiffValue = value => {
  const text = String(value);
  return text.length > 180 ? text.slice(0, 177) + '…' : text;
};
// Stage 34: compact, searchable native editor groups; stored design data is untouched.
const STOREFRONT_EDITOR_GROUP_SEARCH = Object.freeze({
  headings: 'ტექსტები სათაურები მაღაზიის სახელი მთავარი ზედა hero content text',
  labels: 'სექციების წარწერები ღილაკები flash sale კატეგორიები labels buttons',
  theme: 'ფერები თემები დიზაინი ფონი აქცენტი color palette theme',
  layout: 'განლაგება ზომები დაშორება შრიფტი typography layout spacing',
  image: 'მთავარი ფოტო სურათი ატვირთვა image hero upload',
  sections: 'სექციების ჩართვა თანმიმდევრობა გადალაგება reorder sections',
  custom: 'საკუთარი სექციების კონსტრუქტორი ელემენტები დამატება custom builder'
});

export default function StorefrontVisualEditor({
  siteSettings = {},
  setSiteSettings,
  categoriesList = [],
  bannersList = [],
  products = [],
  formatPrice,
  isOwner = false,
  onSaveStorefrontDraft,
  onRestoreStorefrontVersion,
  storefrontDraftBusy = false,
  onPublishStorefront,
  storefrontPublishBusy = false
}) {
  const initialDesign = normalizeStorefrontVisualDesign(siteSettings?.visualDesign);
  const [design, setDesign] = useState(initialDesign);
  const designRef = useRef(initialDesign);
  const localDesignDirtyRef = useRef(false);
  const localEditRevisionRef = useRef(0);
  const pendingTextEditsRef = useRef({});
  const draftSaveInFlightRef = useRef(false);
  const publishInFlightRef = useRef(false);
  const heroImageReadRequestRef = useRef(0);
  const heroImagePendingRef = useRef(false);
  const [heroImagePending, setHeroImagePending] = useState(false);
  useEffect(() => () => { heroImageReadRequestRef.current += 1; heroImagePendingRef.current = false; }, []);
  const [history, setHistory] = useState([initialDesign]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyRef = useRef([initialDesign]);
  const historyIndexRef = useRef(0);
  const customIdCounter = useRef(0);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [controlSearch, setControlSearch] = useState('');
  const controlSearchQuery = controlSearch.trim().toLocaleLowerCase('ka-GE');
  const isControlGroupVisible = key => !controlSearchQuery || STOREFRONT_EDITOR_GROUP_SEARCH[key].includes(controlSearchQuery);
  const visibleControlGroupCount = Object.keys(STOREFRONT_EDITOR_GROUP_SEARCH).filter(isControlGroupVisible).length;
  const [previewCategory, setPreviewCategory] = useState('ყველა');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [draggedSection, setDraggedSection] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [versionHistory, setVersionHistory] = useState([]);
  const [versionHistoryLoading, setVersionHistoryLoading] = useState(false);
  const [versionHistoryError, setVersionHistoryError] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [selectedVersionSnapshot, setSelectedVersionSnapshot] = useState(null);
  const [versionRestoreBusy, setVersionRestoreBusy] = useState(false);
  const versionInspectRequestRef = useRef(0);

  useEffect(() => {
    let active = true;
    const loadVersionHistory = async () => {
      setVersionHistoryLoading(true);
      setVersionHistoryError('');
      try {
        const { data, error } = await supabase.from('storefront_versions').select('id,version_label,created_at').eq('config_key', 'storefront').order('created_at', { ascending: false }).limit(20);
        if (error) throw error;
        if (active) setVersionHistory(Array.isArray(data) ? data : []);
      } catch (error) {
        if (active) setVersionHistoryError(error?.message || 'ვერსიების ისტორიის ჩატვირთვა ვერ მოხერხდა.');
      } finally {
        if (active) setVersionHistoryLoading(false);
      }
    };
    loadVersionHistory();
    return () => {
      active = false;
      versionInspectRequestRef.current += 1;
    };
  }, []);

  const inspectStorefrontVersion = async (versionId) => {
    const requestId = versionInspectRequestRef.current + 1;
    versionInspectRequestRef.current = requestId;
    setSelectedVersionId(versionId);
    setSelectedVersionSnapshot(null);
    setVersionHistoryError('');
    try {
      const { data, error } = await supabase.from('storefront_versions').select('id,version_label,created_at,snapshot').eq('config_key', 'storefront').eq('id', versionId).single();
      if (error) throw error;
      if (versionInspectRequestRef.current === requestId && String(data?.id || '') === String(versionId)) {
        setSelectedVersionSnapshot(data);
      }
    } catch (error) {
      if (versionInspectRequestRef.current === requestId) {
        setVersionHistoryError(error?.message || 'არჩეული ვერსიის დეტალები ვერ ჩაიტვირთა.');
      }
    }
  };

  const restoreSelectedStorefrontVersion = async () => {
    if (heroImagePendingRef.current) return setSaveMessage('ფოტო ჯერ იტვირთება. დაელოდეთ ჩატვირთვის დასრულებას.');
    if (!selectedVersionId || !selectedVersionSnapshot?.snapshot || typeof onRestoreStorefrontVersion !== 'function' || versionRestoreBusy) return;
    const label = selectedVersionSnapshot.version_label || 'არჩეული ვერსია';
    if (!window.confirm('გსურთ „' + label + '“-ის მონახაზში აღდგენა? გამოქვეყნებული საიტი უცვლელი დარჩება.')) return;
    setVersionRestoreBusy(true);
    try {
      const restored = await onRestoreStorefrontVersion(selectedVersionId, selectedVersionSnapshot.snapshot);
      if (restored === true) {
        const restoredDesign = normalizeStorefrontVisualDesign(selectedVersionSnapshot.snapshot?.siteSettings?.visualDesign);
        designRef.current = restoredDesign;
        localDesignDirtyRef.current = false;
        pendingTextEditsRef.current = {};
        localEditRevisionRef.current += 1;
        historyRef.current = [restoredDesign];
        historyIndexRef.current = 0;
        setHistory([restoredDesign]);
        setHistoryIndex(0);
        setDesign(restoredDesign);
        setSelectedElement(null);
        setSaveMessage('ძველი ვერსია მონახაზში აღდგა. გამოსაჩენად ცალკე გამოაქვეყნეთ.');
      }
    } finally {
      setVersionRestoreBusy(false);
    }
  };

  const activeResponsive = previewMode === 'desktop' ? {} : (design.responsive?.[previewMode] || {});
  const activeLayout = { ...design.layout, ...(activeResponsive.layout || {}) };
  const activeTheme = { ...design.theme, ...(activeResponsive.theme || {}) };
  const activeTypography = { ...design.typography, ...(activeResponsive.typography || {}) };
  const previewDesign = useMemo(() => ({
    ...design,
    layout: { ...design.layout, ...(activeResponsive.layout || {}) },
    theme: { ...design.theme, ...(activeResponsive.theme || {}) },
    typography: { ...design.typography, ...(activeResponsive.typography || {}) },
    elementStyles: Object.fromEntries(Object.keys({ ...(design.elementStyles || {}), ...(activeResponsive.elementStyles || {}) }).map(id => [
      id, { ...(design.elementStyles?.[id] || {}), ...(activeResponsive.elementStyles?.[id] || {}) }
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
  const selectedVersionDiff = useMemo(() => {
    if (!selectedVersionSnapshot?.snapshot) return null;
    return compareStorefrontSnapshots(selectedVersionSnapshot.snapshot, {
      categories: safeCategories,
      banners: safeBanners,
      siteSettings: siteSettings || {}
    });
  }, [selectedVersionSnapshot, safeCategories, safeBanners, siteSettings]);

  const commitDesign = nextValue => {
    const next = normalizeStorefrontVisualDesign(nextValue);
    designRef.current = next;
    localDesignDirtyRef.current = true;
    localEditRevisionRef.current += 1;
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

  // The shared draft may arrive after this editor mounts. Hydrate only while
  // there are no local edits, so a late network response cannot erase work.
  useEffect(() => {
    const incoming = normalizeStorefrontVisualDesign(siteSettings?.visualDesign);
    if (JSON.stringify(incoming) === JSON.stringify(designRef.current)) return;
    if (localDesignDirtyRef.current) return;
    designRef.current = incoming;
    historyRef.current = [incoming];
    historyIndexRef.current = 0;
    setHistory([incoming]);
    setHistoryIndex(0);
    setDesign(incoming);
    setSelectedElement(null);
  }, [siteSettings?.visualDesign]);

  // Warn on browser navigation only when the local draft has unsaved edits.
  useEffect(() => {
    const warnBeforeUnload = event => {
      if (!localDesignDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, []);

  const updateGroup = (group, key, value) => {
    const currentDesign = designRef.current;
    if (group === 'hero' && key === 'imageUrl') {
      heroImageReadRequestRef.current += 1;
      heroImagePendingRef.current = false;
      setHeroImagePending(false);
    }
    if (previewMode !== 'desktop' && ['layout', 'theme', 'typography'].includes(group)) {
      commitDesign({
        ...currentDesign,
        responsive: {
          ...(currentDesign.responsive || {}),
          [previewMode]: {
            ...(currentDesign.responsive?.[previewMode] || {}),
            [group]: { ...(currentDesign.responsive?.[previewMode]?.[group] || {}), [key]: value }
          }
        }
      });
      return;
    }
    commitDesign({ ...currentDesign, [group]: { ...currentDesign[group], [key]: value } });
  };

  const updateSiteText = (key, value) => {
    // Text changes must obey the same save-before-publish guard as visual styles.
    // Otherwise a text-only edit could be published without saving the draft.
    localDesignDirtyRef.current = true;
    localEditRevisionRef.current += 1;
    pendingTextEditsRef.current = { ...pendingTextEditsRef.current, [key]: value };
    if (typeof setSiteSettings === 'function') setSiteSettings(current => ({ ...(current || {}), [key]: value }));
    setSaveMessage('ტექსტის ცვლილებები მონახაზში ჯერ არ შენახულა.');
  };

  const handlePreviewSelect = event => {
    if (!selectionMode) return;
    // In selection mode, preview links and controls must not navigate or mutate storefront state.
    event.preventDefault();
    event.stopPropagation();
    const target = event.target?.closest?.('[data-visual-editor-target]');
    if (!target) return;
    const targetId = target.getAttribute('data-visual-editor-target');
    const metadata = VISUAL_EDITOR_TARGETS[targetId];
    if (!metadata) return;
    setSelectedElement({ id: targetId, ...metadata });
  };

  const handlePreviewKeyDown = event => {
    if (!selectionMode) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setSelectionMode(false);
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target?.closest?.('[data-visual-editor-target]');
    const targetId = target?.getAttribute('data-visual-editor-target');
    const metadata = VISUAL_EDITOR_TARGETS[targetId];
    // Suppress native Enter/Space activation even on controls without an editor target.
    event.preventDefault();
    event.stopPropagation();
    if (!metadata) return;
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
      : selectedElement.group
        ? (design[selectedElement.group]?.[selectedElement.key] ?? '')
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

  const resetSelectedElementStyleProperty = key => {
    if (!selectedElement || !key) return;
    if (previewMode !== 'desktop') {
      const responsive = { ...(design.responsive || {}) };
      const viewport = { ...(responsive[previewMode] || {}) };
      const elementStyles = { ...(viewport.elementStyles || {}) };
      const style = { ...(elementStyles[selectedElement.id] || {}) };
      if (!Object.prototype.hasOwnProperty.call(style, key)) return;
      delete style[key];
      if (Object.keys(style).length) elementStyles[selectedElement.id] = style;
      else delete elementStyles[selectedElement.id];
      if (Object.keys(elementStyles).length) viewport.elementStyles = elementStyles;
      else delete viewport.elementStyles;
      if (Object.keys(viewport).length) responsive[previewMode] = viewport;
      else delete responsive[previewMode];
      commitDesign({ ...design, responsive });
      return;
    }
    const elementStyles = { ...(design.elementStyles || {}) };
    const style = { ...(elementStyles[selectedElement.id] || {}) };
    if (!Object.prototype.hasOwnProperty.call(style, key)) return;
    delete style[key];
    if (Object.keys(style).length) elementStyles[selectedElement.id] = style;
    else delete elementStyles[selectedElement.id];
    commitDesign({ ...design, elementStyles });
  };

  const clearSelectedElementColors = () => {
    if (!selectedElement) return;
    const keys = ['textColor', 'backgroundColor', 'borderColor'];
    if (previewMode !== 'desktop') {
      const responsive = { ...(design.responsive || {}) };
      const viewport = { ...(responsive[previewMode] || {}) };
      const elementStyles = { ...(viewport.elementStyles || {}) };
      const style = { ...(elementStyles[selectedElement.id] || {}) };
      keys.forEach(key => { delete style[key]; });
      if (Object.keys(style).length) elementStyles[selectedElement.id] = style;
      else delete elementStyles[selectedElement.id];
      if (Object.keys(elementStyles).length) viewport.elementStyles = elementStyles;
      else delete viewport.elementStyles;
      if (Object.keys(viewport).length) responsive[previewMode] = viewport;
      else delete responsive[previewMode];
      commitDesign({ ...design, responsive });
      return;
    }
    const elementStyles = { ...(design.elementStyles || {}) };
    const style = { ...(elementStyles[selectedElement.id] || {}) };
    keys.forEach(key => { delete style[key]; });
    if (Object.keys(style).length) elementStyles[selectedElement.id] = style;
    else delete elementStyles[selectedElement.id];
    commitDesign({ ...design, elementStyles });
  };

  const resetSelectedElementStyle = () => {
    if (!selectedElement) return;
    if (!window.confirm(`გსურთ „${selectedElement.label}“ ელემენტის ${previewMode === 'desktop' ? 'ძირითადი' : previewMode === 'mobile' ? 'მობილურის' : 'ტაბლეტის'} სტილის განულება? სხვა ელემენტების სტილები შენარჩუნდება. დაბრუნება შესაძლებელია Undo-თი.`)) return;
    if (previewMode !== 'desktop') {
      const responsive = { ...(design.responsive || {}) };
      const viewport = { ...(responsive[previewMode] || {}) };
      const elementStyles = { ...(viewport.elementStyles || {}) };
      delete elementStyles[selectedElement.id];
      if (Object.keys(elementStyles).length) viewport.elementStyles = elementStyles;
      else delete viewport.elementStyles;
      if (Object.keys(viewport).length) responsive[previewMode] = viewport;
      else delete responsive[previewMode];
      commitDesign({ ...design, responsive });
      return;
    }
    const elementStyles = { ...(design.elementStyles || {}) };
    delete elementStyles[selectedElement.id];
    commitDesign({ ...design, elementStyles });
  };

  const clearViewportOverrides = () => {
    if (previewMode === 'desktop' || !design.responsive?.[previewMode]) return;
    if (!window.confirm(`გსურთ ${previewMode === 'mobile' ? 'მობილურის' : 'ტაბლეტის'} ყველა ინდივიდუალური პარამეტრის გასუფთავება? ძირითადი დიზაინი შენარჩუნდება. ცვლილების დაბრუნება შესაძლებელია Undo ღილაკით.`)) return;
    const responsive = { ...(design.responsive || {}) };
    delete responsive[previewMode];
    commitDesign({ ...design, responsive });
    setSelectedElement(null);
  };

  const handleHeroFileChange = event => {
    const requestId = ++heroImageReadRequestRef.current;
    const file = event.target.files?.[0];
    heroImagePendingRef.current = false;
    setHeroImagePending(false);
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
      setSaveMessage('აირჩიეთ JPG, PNG, WEBP ან GIF ფოტო, მაქსიმუმ 5 MB.');
      event.target.value = '';
      return;
    }
    const finishRead = () => {
      if (requestId !== heroImageReadRequestRef.current) return;
      heroImagePendingRef.current = false;
      setHeroImagePending(false);
    };
    heroImagePendingRef.current = true;
    setHeroImagePending(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (requestId !== heroImageReadRequestRef.current) return;
      finishRead();
      if (typeof reader.result === 'string' && reader.result.startsWith(`data:${file.type};base64,`)) {
        updateGroup('hero', 'imageUrl', reader.result);
      } else {
        setSaveMessage('ფოტოს წაკითხვა ვერ მოხერხდა. სცადეთ სხვა ფაილი.');
      }
    };
    reader.onerror = () => {
      finishRead();
      if (requestId === heroImageReadRequestRef.current) setSaveMessage('ფოტოს წაკითხვა ვერ მოხერხდა. სცადეთ სხვა ფაილი.');
    };
    reader.onabort = () => {
      finishRead();
      if (requestId === heroImageReadRequestRef.current) setSaveMessage('ფოტოს წაკითხვა შეწყდა. სცადეთ ხელახლა.');
    };
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      finishRead();
      if (requestId === heroImageReadRequestRef.current) setSaveMessage('ფოტოს წაკითხვა ვერ მოხერხდა. სცადეთ სხვა ფაილი.');
    } finally {
      event.target.value = '';
    }
  };

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    const nextIndex = historyIndexRef.current - 1;
    const next = historyRef.current[nextIndex];
    historyIndexRef.current = nextIndex;
    designRef.current = next;
    localDesignDirtyRef.current = true;
    localEditRevisionRef.current += 1;
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
    designRef.current = next;
    localDesignDirtyRef.current = true;
    localEditRevisionRef.current += 1;
    setHistoryIndex(nextIndex);
    setDesign(next);
    setSiteSettings?.(current => ({ ...(current || {}), visualDesign: next }));
    setSaveMessage('ვიზუალური ცვლილება აღდგა.');
  };

  const currentSectionOrder = getStorefrontSectionOrder(design,previewMode);
  const commitSectionOrder = order => {
    const next=setStorefrontSectionOrder(designRef.current,previewMode,order);
    if(next)commitDesign(next);
  };
  const moveSection = (id, direction) => {
    const current = [...currentSectionOrder];
    const index = current.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target], current[index]];
    commitSectionOrder(current);
  };

  const reorderSection = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const current = [...currentSectionOrder];
    const from = current.indexOf(sourceId);
    const to = current.indexOf(targetId);
    if (from < 0 || to < 0) return;
    current.splice(from, 1);
    current.splice(to, 0, sourceId);
    commitSectionOrder(current);
  };


  const nextCustomId = prefix => {
    customIdCounter.current += 1;
    return prefix + '-' + Date.now().toString(36) + '-' + customIdCounter.current.toString(36);
  };

  const saveSelectedStylePreset = () => {
    if (!selectedElement) return;
    const name = window.prompt('დაარქვით სახელი ამ სტილს (მაგ.: მთავარი ღილაკი, სათაური, ბარათი):', selectedElement.label);
    if (!name || !name.trim()) return;
    if ((design.stylePresets || []).length >= 20) {
      setSaveMessage('სტილების ბიბლიოთეკა სავსეა (მაქსიმუმ 20). წაშალეთ ძველი სტილი ახალი ჩანაწერის შესაქმნელად.');
      return;
    }
    const style = Object.fromEntries(Object.entries(selectedElementStyle).filter(([, value]) => value !== '' && value !== null && value !== undefined));
    if (!Object.keys(style).length) {
      setSaveMessage('ჯერ შეცვალეთ ამ ელემენტის ვიზუალური პარამეტრები და შემდეგ შეინახეთ სტილი.');
      return;
    }
    commitDesign({ ...design, stylePresets: [...(design.stylePresets || []), {
      id: nextCustomId('style-preset'), name: name.trim().slice(0, 40), style
    }] });
    setSaveMessage('სტილი შენახულია ბიბლიოთეკაში და ხელახლა გამოყენება შეგიძლიათ.');
  };
  const applyStylePreset = preset => {
    if (!selectedElement || !preset?.style) return;
    if (previewMode !== 'desktop') {
      commitDesign({
        ...design,
        responsive: {
          ...(design.responsive || {}),
          [previewMode]: {
            ...(design.responsive?.[previewMode] || {}),
            elementStyles: {
              ...(design.responsive?.[previewMode]?.elementStyles || {}),
              [selectedElement.id]: { ...(design.responsive?.[previewMode]?.elementStyles?.[selectedElement.id] || {}), ...preset.style }
            }
          }
        }
      });
    } else {
      commitDesign({
        ...design,
        elementStyles: {
          ...(design.elementStyles || {}),
          [selectedElement.id]: { ...(design.elementStyles?.[selectedElement.id] || {}), ...preset.style }
        }
      });
    }
    setSaveMessage('„' + preset.name + '“ სტილი გამოყენებულია მონიშნულ ელემენტზე.');
  };
  const removeStylePreset = presetId => commitDesign({
    ...design, stylePresets: (design.stylePresets || []).filter(preset => preset.id !== presetId)
  });

  const addCustomSection = () => {
    if ((design.customSections || []).length >= 12) { setSaveMessage('შეგიძლიათ მაქსიმუმ 12 საკუთარი სექციის შექმნა.'); return; }
    const id = nextCustomId('custom-section');
    commitDesign({ ...design, customSections: [...(design.customSections || []), {
      id, title: 'ახალი სექცია', visible: true, placement: 'after-products', backgroundColor: '#ffffff', textColor: '#29241f', padding: 24, align: 'left', maxWidth: 1440, marginTop: 0, marginBottom: 0, borderRadius: 16, minHeight: 0, responsive: {},
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
    if (heroImagePendingRef.current) return setSaveMessage('ფოტო ჯერ იტვირთება. დაელოდეთ ჩატვირთვის დასრულებას.');
    if (typeof onSaveStorefrontDraft !== 'function' || storefrontDraftBusy || storefrontPublishBusy || draftSaveInFlightRef.current || publishInFlightRef.current) return;
    draftSaveInFlightRef.current = true;
    const snapshotDesign = designRef.current;
    const snapshotRevision = localEditRevisionRef.current;
    const snapshot = { ...(siteSettings || {}), ...pendingTextEditsRef.current, visualDesign: snapshotDesign };
    setSiteSettings?.(current => ({ ...(current || {}), visualDesign: snapshotDesign }));
    setSaveMessage('მონახაზის შენახვა მიმდინარეობს…');
    let saved = false;
    try {
      saved = await onSaveStorefrontDraft(snapshot);
    } catch (error) {
      setSaveMessage('მონახაზის შენახვა ვერ მოხერხდა. ცვლილებები შეუნახავია; სცადეთ ხელახლა.');
      return;
    } finally {
      draftSaveInFlightRef.current = false;
    }
    const hasNewerLocalChanges = localEditRevisionRef.current !== snapshotRevision;
    if (saved === true && !hasNewerLocalChanges) {
      localDesignDirtyRef.current = false;
      pendingTextEditsRef.current = {};
    }
    setSaveMessage(saved === true
      ? (hasNewerLocalChanges
        ? 'წინა მონახაზი შეინახა, მაგრამ შენახვისას ახალი ცვლილებებიც გაკეთდა. ხელახლა შეინახეთ ბოლო ცვლილებები.'
        : 'მონახაზი წარმატებით შეინახა. მომხმარებლებისთვის გამოსაჩენად ცალკე გამოაქვეყნეთ.')
      : 'მონახაზი ვერ შეინახა. ცვლილებები შეუნახავია; გადაამოწმეთ შეცდომა და სცადეთ ხელახლა.');
  };

  const publish = async () => {
    if (heroImagePendingRef.current) return setSaveMessage('ფოტო ჯერ იტვირთება. დაელოდეთ ჩატვირთვის დასრულებას.');
    if (!isOwner || typeof onPublishStorefront !== 'function' || storefrontDraftBusy || storefrontPublishBusy || draftSaveInFlightRef.current || publishInFlightRef.current) return;
    if (localDesignDirtyRef.current) {
      setSaveMessage('დიზაინში შეუნახავი ცვლილებებია. ჯერ შეინახეთ მონახაზი და შემდეგ გამოაქვეყნეთ.');
      return;
    }
    if (!window.confirm('გსურთ მიმდინარე მთავარი გვერდის ცვლილებების გამოქვეყნება მომხმარებლებისთვის?')) return;
    publishInFlightRef.current = true;
    setSaveMessage('გამოქვეყნება მიმდინარეობს…');
    let published = false;
    try {
      published = await onPublishStorefront();
    } catch (error) {
      setSaveMessage('გამოქვეყნება ვერ მოხერხდა. გადაამოწმეთ სერვერის მდგომარეობა და სცადეთ ხელახლა.');
      return;
    } finally {
      publishInFlightRef.current = false;
    }
    setSaveMessage(published === true ? 'ცვლილებები გამოქვეყნებულია.' : 'გამოქვეყნება არ დადასტურდა. მომხმარებლებისთვის ცვლილებები არ ჩაითვალოს გამოქვეყნებულად; სცადეთ ხელახლა.');
    if (published === true) {
      versionInspectRequestRef.current += 1;
      setSelectedVersionId('');
      setSelectedVersionSnapshot(null);
      try {
        const { data, error } = await supabase.from('storefront_versions').select('id,version_label,created_at').eq('config_key', 'storefront').order('created_at', { ascending: false }).limit(20);
        if (error) throw error;
        setVersionHistory(Array.isArray(data) ? data : []);
        setSelectedVersionId('');
        setSelectedVersionSnapshot(null);
        setVersionHistoryError('');
      } catch (error) {
        setVersionHistoryError(error?.message || 'ახალი ვერსიის ისტორიაში განახლება ვერ მოხერხდა.');
        setSaveMessage('ცვლილებები გამოქვეყნებულია, თუმცა ვერსიების ისტორიის განახლება ვერ მოხერხდა.');
      }
    }
  };

  const resetDesign = () => {
    if (!window.confirm('გსურთ მხოლოდ ვიზუალური პარამეტრების საწყის მნიშვნელობებზე დაბრუნება? ტექსტები, კატეგორიები და პროდუქტები არ შეიცვლება.')) return;
    heroImageReadRequestRef.current += 1;
    heroImagePendingRef.current = false;
    setHeroImagePending(false);
    commitDesign({ ...DEFAULT_STOREFRONT_VISUAL_DESIGN, designTemplates: designRef.current.designTemplates });
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
        {heroImagePending && <p role="status" className="mt-2 text-xs text-amber-200">ფოტო იტვირთება — შენახვა დროებით შეჩერებულია.</p>}
        {saveMessage && <p role={/ვერ |შეუნახავი|არ დადასტურდა|ხელახლა შეინახეთ|ჯერ შეინახეთ|აირჩიეთ JPG|ფოტოს წაკითხვა შეწყდა/.test(saveMessage) ? 'alert' : 'status'} aria-live={/ვერ |შეუნახავი|არ დადასტურდა|ხელახლა შეინახეთ|ჯერ შეინახეთ|აირჩიეთ JPG|ფოტოს წაკითხვა შეწყდა/.test(saveMessage) ? 'assertive' : 'polite'} className={`mt-3 rounded-xl border px-3 py-2 text-xs ${/ვერ |შეუნახავი|არ დადასტურდა|ხელახლა შეინახეთ|ჯერ შეინახეთ|აირჩიეთ JPG|ფოტოს წაკითხვა შეწყდა/.test(saveMessage) ? 'border-rose-400/40 bg-rose-950/40 text-rose-200' : 'border-emerald-400/20 bg-slate-950/70 text-emerald-200'}`}>{saveMessage}</p>}
      </header>

      {/* Keep save/publish reachable above the long phone preview. Real handlers and server guards are shared. */}
      <div className="gs-visual-editor-mobile-actions sticky top-2 z-30 grid grid-cols-2 gap-2 rounded-xl border border-emerald-400/30 bg-slate-950/95 p-2 shadow-xl backdrop-blur md:hidden" role="group" aria-label="მობილური მონახაზის მოქმედებები">
        <button type="button" onClick={saveDraft} disabled={heroImagePending || storefrontDraftBusy || storefrontPublishBusy} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-400 px-2 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"><Save className="h-4 w-4" />{storefrontDraftBusy ? 'ინახება…' : 'მონახაზის შენახვა'}</button>
        <button type="button" onClick={publish} disabled={heroImagePending || !isOwner || storefrontDraftBusy || storefrontPublishBusy} title={!isOwner ? 'გამოქვეყნება მხოლოდ მთავარ ადმინისტრატორს შეუძლია' : ''} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-amber-300/50 bg-amber-300 px-2 py-2.5 text-xs font-black text-slate-950 disabled:opacity-40"><Upload className="h-4 w-4" />{storefrontPublishBusy ? 'ქვეყნდება…' : 'გამოქვეყნება'}</button>
      </div>

      <details className="rounded-2xl border border-sky-400/25 bg-slate-900/80 p-4" aria-label="გამოქვეყნებული ვერსიების ისტორია">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-white">გამოქვეყნებული ვერსიების ისტორია</h3>
            <p className="mt-1 text-[10px] leading-4 text-slate-400">შეამოწმეთ წინა გამოქვეყნებები და საჭიროებისას აღადგინეთ მონახაზში. აღდგენა საიტს არ აქვეყნებს.</p>
          </div>
          <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-300">{versionHistory.length} / 20</span>
        </summary>
        <div className="mt-3 space-y-3">
        {versionHistoryLoading && <p role="status" className="text-xs text-slate-400">ისტორია იტვირთება…</p>}
        {versionHistoryError && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-2 text-xs text-rose-200">{versionHistoryError}</p>}
        {!versionHistoryLoading && !versionHistory.length && !versionHistoryError && <p className="rounded-xl border border-dashed border-slate-700 p-3 text-xs text-slate-400">გამოქვეყნებული ვერსიები ჯერ არ არის.</p>}
        {versionHistory.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {versionHistory.map(version => (
              <div key={version.id} className={selectedVersionId === version.id ? 'rounded-xl border border-sky-300/60 bg-sky-950/30 p-3 space-y-2' : 'rounded-xl border border-slate-700 bg-slate-950/50 p-3 space-y-2'}>
                <div className="min-w-0">
                  <p className="break-words text-xs font-bold text-slate-100">{version.version_label || 'გამოქვეყნებული ვერსია'}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{version.created_at ? new Date(version.created_at).toLocaleString('ka-GE') : 'თარიღი უცნობია'}</p>
                </div>
                <button type="button" onClick={() => inspectStorefrontVersion(version.id)} className="w-full rounded-lg border border-slate-600 px-3 py-2 text-[10px] font-bold text-slate-200 hover:border-sky-300/60">დეტალების ნახვა</button>
                {selectedVersionId === version.id && selectedVersionSnapshot?.snapshot && (
                  <div className="space-y-2 border-t border-slate-700 pt-2">
                    <p className="text-[10px] text-slate-300">კატეგორიები: {Array.isArray(selectedVersionSnapshot.snapshot.categories) ? selectedVersionSnapshot.snapshot.categories.length : 0} · ბანერები: {Array.isArray(selectedVersionSnapshot.snapshot.banners) ? selectedVersionSnapshot.snapshot.banners.length : 0}</p>
                    <p className="break-words text-[10px] text-slate-400">მაღაზია: {selectedVersionSnapshot.snapshot.siteSettings?.storeName || '—'} · მთავარი სათაური: {selectedVersionSnapshot.snapshot.siteSettings?.heroTitle || '—'}</p>
                    {selectedVersionDiff && (
                      <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 space-y-2" aria-live="polite">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-black text-white">მიმდინარე მონახაზთან შედარება</p>
                          <span className={selectedVersionDiff.unchanged ? 'rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-200' : 'rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-200'}>{selectedVersionDiff.unchanged ? 'განსხვავება არ არის' : selectedVersionDiff.changedCount + ' ცვლილება'}</span>
                        </div>
                        {selectedVersionDiff.unchanged ? (
                          <p className="text-[10px] leading-4 text-emerald-200">არჩეული გამოქვეყნებული ვერსია და მიმდინარე მონახაზი იდენტურია.</p>
                        ) : (
                          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                            {selectedVersionDiff.differences.map(change => (
                              <div key={change.path} className="rounded-lg border border-slate-800 bg-slate-900/80 p-2">
                                <p className="break-all text-[10px] font-bold text-sky-200">{change.path}</p>
                                <p className="mt-1 break-words text-[10px] text-slate-400"><span className="text-slate-500">გამოქვეყნებული:</span> {formatSnapshotDiffValue(change.published)}</p>
                                <p className="mt-1 break-words text-[10px] text-amber-100"><span className="text-slate-500">მონახაზი:</span> {formatSnapshotDiffValue(change.draft)}</p>
                              </div>
                            ))}
                            {selectedVersionDiff.truncated && <p className="text-[10px] text-slate-400">ნაჩვენებია პირველი 60 განსხვავება, სულ: {selectedVersionDiff.changedCount}.</p>}
                          </div>
                        )}
                      </div>
                    )}
                    <button type="button" onClick={restoreSelectedStorefrontVersion} disabled={heroImagePending || versionRestoreBusy || storefrontDraftBusy || storefrontPublishBusy || typeof onRestoreStorefrontVersion !== 'function'} className="w-full rounded-lg bg-sky-300 px-3 py-2.5 text-[10px] font-black text-slate-950 disabled:opacity-50">{versionRestoreBusy ? 'მონახაზში აღდგენა…' : 'ამ ვერსიის მონახაზში აღდგენა'}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </details>

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(300px,390px)_minmax(0,1fr)] gap-5 items-start">
        <aside className="gs-visual-editor-controls order-2 min-w-0 space-y-4 2xl:order-1">
          {isOwner && <StorefrontDesignTemplates design={design} disabled={heroImagePending || storefrontDraftBusy || storefrontPublishBusy || versionRestoreBusy} onChange={commitDesign}/>}
          <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3">
            <label htmlFor="gs-visual-editor-control-search" className="block text-xs font-bold text-slate-200">პარამეტრების ჯგუფების ძებნა</label>
            <input id="gs-visual-editor-control-search" type="search" value={controlSearch} onChange={event => setControlSearch(event.target.value)} placeholder="მაგალითად: ფერები, ტექსტი, ფოტო…" className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-base text-white placeholder:text-slate-500" />
            <div className="mt-2 flex flex-wrap justify-between items-center gap-2"><p role="status" aria-live="polite" className="text-[11px] text-slate-400">{visibleControlGroupCount} / 7 ჯგუფი · გასაშლელად შეეხეთ სათაურს</p>{controlSearch && <button type="button" onClick={() => setControlSearch('')} className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200">გასუფთავება</button>}</div>
            {visibleControlGroupCount === 0 && <p role="status" className="mt-2 text-xs text-amber-200">ჯგუფი ვერ მოიძებნა.</p>}
          </div>
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
                    <label className="block space-y-1 text-[10px] text-slate-300">
                      <span className="flex justify-between"><span>ფოტოს ვერტიკალური პოზიცია</span><b>{selectedElementStyle.objectPositionY ?? 50}%</b></span>
                      <input type="range" min="0" max="100" step="1" value={selectedElementStyle.objectPositionY ?? 50} onChange={event => updateSelectedElementStyle('objectPositionY', Number(event.target.value))} className="w-full accent-emerald-400" />
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

                <div className="space-y-2 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-black text-emerald-200">სტილების ბიბლიოთეკა</span><span className="text-[10px] text-slate-400">{(design.stylePresets || []).length}/20</span></div>
                  <button type="button" onClick={saveSelectedStylePreset} disabled={(design.stylePresets || []).length >= 20} className="w-full rounded-lg bg-emerald-400 px-3 py-2 text-[10px] font-black text-slate-950 disabled:opacity-40">მონიშნული ელემენტის სტილის შენახვა</button>
                  {(design.stylePresets || []).length > 0 ? (
                    <div className="space-y-1.5">
                      {(design.stylePresets || []).map(preset => (
                        <div key={preset.id} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-2">
                          <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-slate-200">{preset.name}</span>
                          <button type="button" onClick={() => applyStylePreset(preset)} className="rounded-md bg-slate-700 px-2 py-1.5 text-[10px] font-bold text-white">გამოყენება</button>
                          <button type="button" onClick={() => removeStylePreset(preset.id)} aria-label={preset.name + ' სტილის წაშლა'} className="rounded-md border border-rose-500/30 px-2 py-1.5 text-[10px] text-rose-200">წაშლა</button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-[10px] leading-4 text-slate-400">შეინახეთ ღილაკის, სათაურის, ბარათის ან სხვა ელემენტის სტილი და გამოიყენეთ სხვა მონიშნულ კომპონენტზეც.</p>}
                  <p className="text-[9px] leading-4 text-slate-500">სტილები ინახება საერთო ვიზუალურ მონახაზში და ხელმისაწვდომია ყველა მოწყობილობაზე. მაქსიმუმ 20 ჩანაწერი.</p>
                </div>
                <label className="block text-[10px] font-bold text-slate-300">
                  ერთი პარამეტრის დაბრუნება {previewMode === 'desktop' ? 'საწყის მნიშვნელობაზე' : 'ძირითადი დიზაინიდან'}
                  <select aria-label="ელემენტის ცალკეული პარამეტრის განულება" defaultValue="" key={`${selectedElement.id}-${previewMode}`} onChange={event => { resetSelectedElementStyleProperty(event.target.value); event.target.value = ''; }} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-[11px] text-white">
                    <option value="">აირჩიეთ პარამეტრი…</option>
                    {Object.keys((previewMode === 'desktop' ? design.elementStyles : activeResponsive.elementStyles)?.[selectedElement.id] || {}).map(key => <option key={key} value={key}>{ELEMENT_STYLE_LABELS[key] || key}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button type="button" onClick={clearSelectedElementColors} className="w-full rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-bold text-slate-300">ფერების გასუფთავება</button>
                  <button type="button" onClick={resetSelectedElementStyle} className="w-full rounded-lg border border-rose-500/40 px-3 py-2 text-[10px] font-bold text-rose-200">ამ ელემენტის სტილის სრულად განულება</button>
                </div>
                <p className="text-[10px] leading-4 text-slate-400">{selectedElement.help} სტილები ცალკე ინახება თითოეული ელემენტისთვის.</p>
              </div>
            )}
          </section>
          <details hidden={!isControlGroupVisible('headings')} className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3 sm:p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-white"><Type className="h-4 w-4 text-emerald-300" /> ტექსტები და სათაურები</summary>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">მაღაზიის სახელი<input value={siteSettings?.storeName || 'GEOSTORE'} maxLength={60} onChange={event => updateSiteText('storeName', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">ზედა ზოლის ტექსტი<input value={siteSettings?.topBarText || ''} maxLength={160} onChange={event => updateSiteText('topBarText', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">მთავარი სათაური<input value={siteSettings?.heroTitle || ''} maxLength={120} onChange={event => updateSiteText('heroTitle', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-300">მთავარი აღწერა<textarea value={siteSettings?.heroSubtitle || ''} maxLength={240} rows={3} onChange={event => updateSiteText('heroSubtitle', event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white" /></label>
            </div>
          </details>

          <details hidden={!isControlGroupVisible('labels')} className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3 sm:p-4">
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

          <details hidden={!isControlGroupVisible('theme')} className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3 sm:p-4">
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

          <details hidden={!isControlGroupVisible('layout')} className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3 sm:p-4">
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
              <RangeControl label="პროდუქტები ერთ რიგში (Desktop)" value={activeLayout.productColumns} min={2} max={6} onChange={value => updateGroup('layout', 'productColumns', value)} />
              <RangeControl label="ბარათების კუთხეები" value={activeLayout.cardRadius} min={0} max={28} unit=" px" onChange={value => updateGroup('layout', 'cardRadius', value)} />
              <RangeControl label="ღილაკების კუთხეები" value={activeLayout.buttonRadius} min={0} max={28} unit=" px" onChange={value => updateGroup('layout', 'buttonRadius', value)} />
            </div>
          </details>

          <details hidden={!isControlGroupVisible('image')} className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3 sm:p-4">
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

          <details data-gs-section-controls="true" hidden={!isControlGroupVisible('sections')} className="rounded-2xl border border-slate-700 bg-slate-900/90 p-3 sm:p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-white"><Layout className="h-4 w-4 text-emerald-300" /> სექციების ჩართვა და თანმიმდევრობა</summary>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-400">თანმიმდევრობა: {previewMode==='desktop'?'კომპიუტერი / საერთო':previewMode==='tablet'?'ტაბლეტი':'მობილური'} · სექციების ჩართვა/გამორთვა საერთო რჩება.</p>
              {previewMode!=='desktop'&&<div className="flex flex-wrap gap-2 items-center"><span className="text-xs text-slate-300">{design.responsive?.[previewMode]?.sectionOrder?'ინდივიდუალური რიგი':'საერთო რიგის მემკვიდრეობა'}</span><button type="button" disabled={!design.responsive?.[previewMode]?.sectionOrder} onClick={()=>{const next=inheritStorefrontSectionOrder(designRef.current,previewMode);if(next)commitDesign(next);}} className="min-h-11 rounded-lg border border-slate-700 px-3 py-2 text-xs text-white disabled:opacity-40">საერთო რიგის აღდგენა</button></div>}
              <button type="button" onClick={()=>commitDesign(moveFlashSaleAfterHero(designRef.current))} className="min-h-11 w-full rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100">⚡ აქცია მთავარი ბანერის შემდეგ — ყველა მოწყობილობაზე</button>
              <p className="text-[11px] text-slate-400">მხოლოდ აქციის მდებარეობა იცვლება მონახაზში. საიტზე გამოსაჩენად შეინახეთ და გამოაქვეყნეთ დიზაინი.</p>
              <StorefrontSectionGeometry design={design} viewport={previewMode} labels={SECTION_LABELS} onChange={commitDesign}/>
              {currentSectionOrder.map((id, index) => (
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
                  <button type="button" onClick={() => moveSection(id, 1)} disabled={index === currentSectionOrder.length - 1} aria-label={SECTION_LABELS[id] + ' ქვემოთ'} className="rounded-lg border border-slate-700 p-2 text-slate-300 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </details>


          <details hidden={!isControlGroupVisible('custom')} className="rounded-2xl border border-emerald-400/30 bg-slate-900/90 p-3 sm:p-4">
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
                  <label className="block space-y-1 text-[10px] text-slate-300">სექციის განთავსება<select value={section.placement || 'after-products'} onChange={event => updateCustomSection(section.id, 'placement', event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-white"><option value="after-hero">მთავარი Hero ბლოკის შემდეგ</option><option value="after-banners">ბანერების შემდეგ</option><option value="after-flash-sale">Flash Sale-ის შემდეგ</option><option value="after-categories">კატეგორიების შემდეგ</option><option value="after-filters">ფილტრების შემდეგ</option><option value="after-products">პროდუქტების შემდეგ</option></select></label>
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

          <div className="hidden md:sticky md:bottom-2 md:z-20 md:grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl border border-emerald-400/30 bg-slate-950/95 p-3 shadow-2xl backdrop-blur">
            <button type="button" onClick={saveDraft} disabled={heroImagePending || storefrontDraftBusy || storefrontPublishBusy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-50"><Save className="h-4 w-4" /> {storefrontDraftBusy ? 'ინახება…' : 'მონახაზის შენახვა'}</button>
            <button type="button" onClick={publish} disabled={heroImagePending || !isOwner || storefrontDraftBusy || storefrontPublishBusy} title={!isOwner ? 'გამოქვეყნება მხოლოდ მთავარ ადმინისტრატორს შეუძლია' : ''} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-amber-300 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-40"><Upload className="h-4 w-4" /> {storefrontPublishBusy ? 'ქვეყნდება…' : 'გამოქვეყნება'}</button>
          </div>
        </aside>

        <div className="gs-visual-editor-preview-column order-1 min-w-0 2xl:order-2">
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
            .gs-visual-preview-frame.gs-visual-select-mode { cursor: crosshair; }
            .gs-visual-preview-frame.gs-visual-select-mode [data-visual-editor-target] { cursor: crosshair !important; }
            .gs-visual-preview-frame.gs-visual-select-mode [data-visual-editor-target]:hover {
              outline: 2px dashed #10b981 !important;
              outline-offset: 2px;
            }
            .gs-visual-preview-frame.gs-visual-select-mode [data-visual-editor-target]:focus-visible {
              outline: 3px solid #10b981 !important;
              outline-offset: 3px;
            }
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
            .gs-visual-preview-frame[data-visual-editor-selected="footer.termsLink"] [data-visual-editor-target="footer.termsLink"],
            .gs-visual-preview-frame[data-visual-editor-selected="footer.privacyLink"] [data-visual-editor-target="footer.privacyLink"],
            .gs-visual-preview-frame[data-visual-editor-selected="footer.warrantyLink"] [data-visual-editor-target="footer.warrantyLink"],
            .gs-visual-preview-frame[data-visual-editor-selected="footer.copyright"] [data-visual-editor-target="footer.copyright"] {
              outline: 2px solid #34d399 !important; outline-offset: 3px; position: relative; z-index: 3;
            }
          `}</style>
          <div onClickCapture={handlePreviewSelect} onKeyDownCapture={handlePreviewKeyDown} tabIndex={selectionMode ? 0 : undefined} aria-label={selectionMode ? 'საიტის Preview — ელემენტის არჩევა; გამოსასვლელად Escape' : undefined} data-visual-editor-selected={selectedElement?.id || ''} className={`${previewMode === 'mobile' ? 'geostore-fashion-store gs-visual-preview-frame gs-visual-preview-frame--mobile mx-auto overflow-hidden rounded-2xl border border-slate-600 bg-stone-100 shadow-2xl' : 'geostore-fashion-store gs-visual-preview-frame mx-auto overflow-hidden rounded-2xl border border-slate-600 bg-stone-100 shadow-2xl'}${selectionMode ? ' gs-visual-select-mode' : ''}`} style={{ ...previewStyle, maxWidth: previewMode === 'mobile' ? '420px' : previewMode === 'tablet' ? '820px' : '100%' }}>
            <Header
              visualEditorViewport={previewMode}
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
                onOpenTracker={NOOP}
                onOpenTerms={NOOP}
                onOpenPrivacy={NOOP}
                onOpenSupport={NOOP}
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
              visualEditorViewport={previewMode}
              onOpenSupport={NOOP}
              siteSettings={{ ...(siteSettings || {}), visualDesign: previewDesign }}
              visualDesign={previewDesign}
              activeTab="store"
              setActiveTab={NOOP}
              setIsTermsOpen={NOOP}
              setIsWarrantyOpen={NOOP}
              currentLang="ka"
            />
            {previewDesign.signature2026 === true && previewMode === "mobile" && <SignatureMobileNav currentLang="ka" onHome={() => setPreviewCategory("ყველა")} onCategories={NOOP} onWishlist={NOOP} onProfile={NOOP}/>}
          </div>
        </div>
      </div>
    </section>
  );
}
