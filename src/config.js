// src/config.js
export const SUPABASE_URL = "https://xmtnszxtnfxnrojionoa.supabase.co"; 
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM"; 

export const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// --- TELEGRAM CONFIG ---
const TG_BOT_TOKEN = "8968372156:AAHe6OHQZfdChPXS4wQDQ5omSA1DNIS6VEY";
const TG_CHAT_ID = "8740008890";

export const sendTelegramNotification = (text) => {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TG_CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    })
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
    rating: 4.9,
    reviewsCount: 24,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600',
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'],
    description: 'ახალი თაობის ფლაგმანი A17 Pro ჩიპით და ტიტანის კორპუსით. საუკეთესო კამერა, გეიმინგი და ბატარეის ხანგრძლივობა.',
    isHot: true,
    discountPercent: 10,
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
    rating: 5.0,
    reviewsCount: 18,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600'],
    description: 'ულტრა თხელი და მძლავრი ლეპტოპი M3 პროცესორით. იდეალურია პროგრამირებისთვის, დიზაინისთვის და სწავლისთვის.',
    isHot: true,
    discountPercent: 8,
    warranty: '1 წელი',
    isPreOrder: false
  },
  {
    id: 'prod-3',
    sku: 'GEO-AP-PRO2',
    name: 'AirPods Pro 2nd Gen USB-C',
    category: 'აქსესუარები',
    brand: 'Apple',
    vendor: 'Apple Shop Tbilisi',
    priceGEL: 749,
    oldPriceGEL: 899,
    costPriceGEL: 550,
    stock: 2,
    rating: 4.8,
    reviewsCount: 31,
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=600',
    images: ['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=600'],
    description: 'ხმაურის აქტიური ჩახშობა (ANC), საუკეთესო ჟღერადობა მუსიკისთვის და ზარებისთვის.',
    isHot: false,
    discountPercent: 16,
    warranty: '1 წელი',
    isPreOrder: false
  }
];

export const INITIAL_BANNERS = [
  {
    id: 'b1',
    title: 'ინოვაციური ტექნიკა საუკეთესო ფასად GEOSTORE-ში',
    subtitle: 'მიიღე 20%-მდე ფასდაკლება შერჩეულ Apple-ის პროდუქციაზე!',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=1200',
    buttonText: 'შეიძინე ახლავე'
  }
];

export const INITIAL_PROMO_SLOTS = [
  { id: 'ps1', title: 'საგაზაფხულო ფასდაკლებები', tag: 'HOT DEAL', bgGradient: 'from-emerald-600/30 to-teal-800/40' },
  { id: 'ps2', title: '0% განვადება 24 თვემდე', tag: 'FINANCE', bgGradient: 'from-cyan-600/30 to-blue-800/40' },
  { id: 'ps3', title: 'უფასო მიწოდება თბილისში', tag: 'EXPRESS', bgGradient: 'from-green-600/30 to-emerald-900/40' }
];

export const INITIAL_COUPONS = [
  { code: 'GEO10', discountPercent: 10 },
  { code: 'SPRING20', discountPercent: 20 },
  { code: 'WELCOME5', discountPercent: 5 }
];

export const INITIAL_POLICY = {
  general: 'წინამდებარე წესები და პოლიტიკა არეგულირებს GEOSTORE-ის ვებგვერდის გამოყენებასა და პროდუქციის შეძენის პირობებს.',
  delivery: 'მიწოდება ხორციელდება თბილისში 24 საათში, ხოლო რეგიონებში 48 საათში.',
  warranty: 'ყველა პროდუქტზე ვრცელდება 1 წლიანი ოფიციალური გარანტია.',
  privacy: 'GEOSTORE იცავს მომხმარებლის პერსონალურ მონაცემებს.'
};
