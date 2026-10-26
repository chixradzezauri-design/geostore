// src/config.js

// Supabase API კონფიგურაცია
export const SUPABASE_URL = "https://your-supabase-project.supabase.co"; // ჩაწერეთ თქვენი რეალური Supabase URL
export const SUPABASE_ANON_KEY = "your-supabase-anon-key"; // ჩაწერეთ თქვენი რეალური Supabase Key

export const headers = {
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json"
};

// Telegram შეტყობინებების ფუნქცია
export const sendTelegramNotification = async (message) => {
  const TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN";
  const TELEGRAM_CHAT_ID = "YOUR_TELEGRAM_CHAT_ID";
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.includes("YOUR")) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" })
    });
  } catch (err) {
    console.error("Telegram error:", err);
  }
};

export const INITIAL_CATEGORIES = [
  { id: 'c1', name: 'სმარტფონები', icon: '📱' },
  { id: 'c2', name: 'ლაპტოპები', icon: '💻' },
  { id: 'c3', name: 'აუდიო / ყურსასმენები', icon: '🎧' },
  { id: 'c4', name: 'სმარტ საათები', icon: '⌚' },
  { id: 'c5', name: 'აქსესუარები', icon: '🔌' }
];

export const INITIAL_VENDORS = [
  { id: 'v1', name: 'Apple Official Georgia', rating: 4.9, productsCount: 15 },
  { id: 'v2', name: 'TechZone Tbilisi', rating: 4.7, productsCount: 24 },
  { id: 'v3', name: 'GeoElectro Hub', rating: 4.8, productsCount: 18 }
];

export const INITIAL_PRODUCTS = [
  {
    id: 'p1',
    name: 'Apple iPhone 15 Pro Max 256GB Natural Titanium',
    sku: 'AP-IP15PM-256',
    category: 'სმარტფონები',
    brand: 'Apple',
    vendor: 'Apple Official Georgia',
    priceGEL: 4499,
    oldPriceGEL: 4899,
    discountPercent: 8,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500',
      'https://images.unsplash.com/photo-1695048066289-5e73ef5e0c8b?w=500'
    ],
    description: 'ოფიციალური ორიგინალი Apple iPhone 15 Pro Max ტიტანის კორპუსით და A17 Pro ჩიპით.',
    warranty: '1 წელი ოფიციალური სერვის ცენტრის გარანტია',
    isPreOrder: false
  },
  {
    id: 'p2',
    name: 'MacBook Pro 16 M3 Max 32GB / 1TB SSD',
    sku: 'AP-MBP16-M3M',
    category: 'ლაპტოპები',
    brand: 'Apple',
    vendor: 'Apple Official Georgia',
    priceGEL: 9299,
    oldPriceGEL: 9999,
    discountPercent: 7,
    stock: 5,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'],
    description: 'პროფესიონალური ლაპტოპი მძლავრი M3 Max პროცესორით და Liquid Retina XDR ეკრანით.',
    warranty: '1 წელი გარანტია',
    isPreOrder: false
  },
  {
    id: 'p3',
    name: 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    sku: 'SN-WH1000XM5',
    category: 'აუდიო / ყურსასმენები',
    brand: 'Sony',
    vendor: 'TechZone Tbilisi',
    priceGEL: 1199,
    oldPriceGEL: 1399,
    discountPercent: 14,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
    description: 'მსოფლიოში საუკეთესო ხმაურის ჩახშობის ტექნოლოგიის მქონე უკაბელო ყურსასმენი.',
    warranty: '1 წელი',
    isPreOrder: false
  },
  {
    id: 'p4',
    name: 'Apple Watch Series 10 GPS 46mm',
    sku: 'AP-W10-46',
    category: 'სმარტ საათები',
    brand: 'Apple',
    vendor: 'Apple Official Georgia',
    priceGEL: 1499,
    oldPriceGEL: 1649,
    discountPercent: 9,
    stock: 10,
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500',
    images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500'],
    description: 'ახალი თაობის სმარტ საათი ჯანმრთელობის მოწინავე სენსორებით.',
    warranty: '1 წელი',
    isPreOrder: false
  }
];

export const INITIAL_BANNERS = [
  { id: 'b1', title: 'Apple Flagship Store', image: 'https://images.unsplash.com/photo-1556742049-0a67d5e52295?w=800' }
];

export const INITIAL_PROMO_SLOTS = [
  { id: 'ps1', title: '0% განვადება თიბისი / საქართველოს ბანკი', tag: 'სპეციალური', bgGradient: 'from-emerald-900/40 to-teal-900/40' },
  { id: 'ps2', title: 'უფასო მიწოდება მთელ საქართველოში', tag: 'აქცია', bgGradient: 'from-teal-900/40 to-slate-900/40' },
  { id: 'ps3', title: '10დღიანი დაბრუნების გარანტია', tag: 'ნდობა', bgGradient: 'from-slate-900/40 to-emerald-900/40' }
];

export const INITIAL_COUPONS = [
  { id: 'cp1', code: 'GEOSTORE10', discountPercent: 10 },
  { id: 'cp2', code: 'WELCOME2026', discountPercent: 15 }
];

export const INITIAL_POLICY = {
  delivery: 'მიწოდება ხორციელდება საქართველოს მასშტაბით 1-3 სამუშაო დღეში. თბილისში მიწოდება უფასოა.',
  warranty: 'ყველა პროდუქტზე მოქმედებს ოფიციალური ქარხნული გარანტია 1 წლიდან 3 წლამდე.'
};
