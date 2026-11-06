// src/config.js
export const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

export const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// Telegram notifications must be sent from a trusted server-side function.
// Never put a Telegram bot token in a public Vite/React bundle.
export const sendTelegramNotification = () => {
  console.warn('Telegram notifications are disabled until a secure server-side integration is configured.');
  return false;
};

export const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'ტანსაცმელი', icon: '👕' },
  { id: 'cat-2', name: 'ფეხსაცმელი', icon: '👟' },
  { id: 'cat-3', name: 'ჩანთები', icon: '👜' },
  { id: 'cat-4', name: 'აქსესუარები', icon: '✨' },
  { id: 'cat-5', name: 'სამკაულები', icon: '💍' }
];

export const INITIAL_VENDORS = [
  { id: 'v1', name: 'GEOSTORE ოფიციალური', commission: 0, phone: '', status: 'აქტიური', contactPerson: '', email: '' }
];

export const INITIAL_PRODUCTS = [];

export const INITIAL_BANNERS = [
  { id: 'b1', title: 'ახალი სეზონი GEOSTORE-ში', subtitle: 'აღმოაჩინე ტანსაცმლის, ფეხსაცმლისა და აქსესუარების შერჩეული კოლექცია.', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=1200' }
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
