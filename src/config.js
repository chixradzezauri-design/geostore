// src/config.js
export const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

export const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

const TG_BOT_TOKEN = "8968372156:AAHe6OHQZfdChPXS4wQDQ5omSA1DNIS6VEY";
const TG_CHAT_ID = "8740008890";

export const sendTelegramNotification = (text) => {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text, parse_mode: 'Markdown' })
  }).catch(err => console.log("TG Error:", err));
};

export const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'სმარტფონები', icon: '📱' },
  { id: 'cat-2', name: 'ლეპტოპები', icon: '💻' },
  { id: 'cat-3', name: 'აქსესუარები', icon: '🎧' },
  { id: 'cat-4', name: 'ჭკვიანი საათები', icon: '⌚' },
  { id: 'cat-5', name: 'ტელევიზორები', icon: '📺' }
];

export const INITIAL_VENDORS = [
  { id: 'v1', name: 'GEOSTORE ოფიციალური', commission: 0, phone: '+995 32 200 00 00', status: 'აქტიური', contactPerson: 'გიორგი ბერიძე', email: 'official@geostore.ge' },
  { id: 'v2', name: 'TechHub Georgia', commission: 10, phone: '+995 555 11 22 33', status: 'აქტიური', contactPerson: 'დავით მარაქველიძე', email: 'hub@techhub.ge' },
  { id: 'v3', name: 'Apple Shop Tbilisi', commission: 8, phone: '+995 599 88 77 66', status: 'აქტიური', contactPerson: 'ნიკა ქავთარაძე', email: 'sales@appleshop.ge' }
];

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    sku: 'GEO-IP15P',
    name: 'iPhone 15 Pro Max 256GB Titanium',
    category: 'სმარტფონები',
    brand: 'Apple',
    vendor: 'GEOSTORE ოფიციალური',
    priceGEL: 3899,
    oldPriceGEL: 4299,
    costPriceGEL: 3200,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600',
    description: 'ახალი თაობის ფლაგმანი A17 Pro ჩიპით და ტიტანის კორპუსით.',
    warranty: '1 წელი',
    isPreOrder: false
  },
  {
    id: 'prod-2',
    sku: 'GEO-MBA-M3',
    name: 'MacBook Air 15" M3 16GB / 512GB',
    category: 'ლეპტოპები',
    brand: 'Apple',
    vendor: 'TechHub Georgia',
    priceGEL: 4499,
    oldPriceGEL: 4899,
    costPriceGEL: 3800,
    stock: 4,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
    description: 'ულტრა თხელი და მძლავრი ლეპტოპი M3 პროცესორით.',
    warranty: '1 წელი',
    isPreOrder: false
  }
];

export const INITIAL_BANNERS = [
  { id: 'b1', title: 'ინოვაციური ტექნიკა საუკეთესო ფასად GEOSTORE-ში', subtitle: 'მიიღე 20%-მდე ფასდაკლება შერჩეულ პროდუქციაზე!', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1200' }
];

export const INITIAL_PROMO_SLOTS = [
  { id: 'ps1', title: 'საგაზაფხულო ფასდაკლებები', tag: 'HOT DEAL', bgGradient: 'from-emerald-600/30 to-teal-800/40' }
];

export const INITIAL_COUPONS = [
  { code: 'GEO10', discountPercent: 10 }
];

export const INITIAL_POLICY = {
  general: 'GEOSTORE-ის წესები და პოლიტიკა.',
  delivery: 'მიწოდება თბილისში 24 საათში.',
  warranty: 'ყველა პროდუქტზე ვრცელდება 1 წლიანი გარანტია.',
  privacy: 'მონაცემთა დაცვა.'
};
