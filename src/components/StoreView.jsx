// src/components/StoreView.jsx - Premium Category & Subcategory UI/UX Redesign Edition (100% Full & Safe with Category Image Support)
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, ShoppingBag, Sparkles, ArrowUpRight, ShieldCheck, Zap, X, Tag, 
  CheckCircle2, Eye, Award, Star, Smartphone, Laptop, Headphones, Watch, 
  Camera as CameraIcon, Tv, Speaker, Shirt, Briefcase, Gem, UserRound, SlidersHorizontal, ArrowUpDown, Calculator, Scale, MessageSquare, Timer, Ruler, Layers, Image as ImageIcon, Gift, PackageCheck, FileText, ShieldAlert, Compass, Footprints, ChevronDown, FolderTree, CornerDownRight 
} from 'lucide-react';

export default function StoreView({
  currentLang = 'ka',
  siteSettings,
  promoSlots,
  categories = [],
  selectedCategory,
  setSelectedCategory,
  filteredProducts: initialFilteredProducts,
  wishlist,
  toggleWishlist,
  comparisonList = [],
  toggleComparison,
  addToCart,
  formatPrice
}) {
  // პროდუქტების ერთადერთი წყარო App.jsx-ია — აქ აღარ იგზავნება მეორე, დამოუკიდებელი Supabase მოთხოვნა.
  const activeProducts = initialFilteredProducts || [];

  const storeText = ({
    ka: { allCategories: 'ყველა კატეგორია', fullCollection: 'სრული კოლექცია', subcategories: 'სუბკატეგორიები კატეგორიისთვის:', close: 'დახურვა', allItems: 'ყველა', sort: 'დალაგება:', defaultSort: 'ნაგულისხმევი', priceLow: 'ფასით: დაბლიდან მაღლა ⬆', priceHigh: 'ფასით: მაღლიდან დაბლა ⬇', nameSort: 'დასახელებით (A-Z)', chooseSize: 'ზომის არჩევა', viewAdd: 'ნახვა და დამატება', addToCart: 'კალათაში დამატება', sizePrompt: 'აირჩიეთ ზომა (მხოლოდ მარაგშია):', recommendedSize: 'რეკომენდებული ზომა თქვენი პარამეტრებით:', color: 'ფერი:', description: 'პროდუქტის აღწერა:', defaultDescription: 'უმაღლესი ხარისხის პრემიუმ პროდუქცია.', inStock: 'მარაგშია:', available: 'ხელმისაწვდომია', deliveryFit: '(მორგება მიტანისას)', reviews: 'მომხმარებელთა ფოტო-შეფასებები', leaveReview: 'დატოვეთ შეფასება და ატვირთეთ ფოტო:', rating: 'შეფასება:', yourName: 'თქვენი სახელი *', reviewPlaceholder: 'როგორ მოგეწონათ პროდუქტი?...', minPrice: 'Min', maxPrice: 'Max', smartSize: 'ჭკვიანი ზომის შერჩევა', styleKicker: 'შეარჩიე შენი სტილი', viewCollection: 'კოლექციის ნახვა', limitedOffer: 'დროში შეზღუდული შეთავაზება', hurryDiscount: 'იჩქარეთ, ფასდაკლება იწურება!', hours: 'საათი', minutes: 'წუთი', seconds: 'წამი', discoverCollections: 'აღმოაჩინე კოლექციები', collectionIntro: 'შერჩეული მიმართულებები — იპოვე შენი შემდეგი საყვარელი სტილი', navigation: 'ნავიგაცია:', publishReview: '{storeText.publishReview}', price: 'ფასი:', clear: 'გასუფთავება', noFilterResults: 'მითითებული ფილტრებით პროდუქტები ვერ მოიძებნა.', wishlistTitle: 'სურვილების სიაში დამატება', compareTitle: 'შედარებაში დამატება', discount: 'ფასდაკლება', viewDetails: 'დეტალურად ნახვა', productDetails: 'პროდუქტის დეტალური ხედი', vendor: 'მომწოდებელი:', variant: 'აირჩიეთ ინდივიდუალური ვარიანტი:', material: 'მასალა / შემადგენლობა', durability: 'მდგრადობა / მახასიათებელი', giftWrap: 'სასაჩუქრე პრემიუმ შეფუთვა', giftWrapInfo: 'ყუთი, ბაფთა და ბარათი (+5 ₾)', giftMessage: 'სასაჩუქრე ბარათის ტექსტი (უფასო):', giftPlaceholder: 'ჩაწერეთ თქვენი სურვილი...', vipWarranty: 'VIP დაზღვევა და გაფართოებული გარანტია (+1 წელი)', warrantyInfo: 'სრული დაცვა დაზიანებისგან (+15 ₾)', uploadPhoto: 'ატვირთეთ ფოტო:', photoSelected: 'ფოტო არჩეულია', noReviews: 'ამ პროდუქტზე ჯერ არ არის შეფასებები.', enterMeasurements: 'მიეთითეთ თქვენი პარამეტრები', height: 'თქვენი სიმაღლე (სმ):', weight: 'თქვენი წონა (კგ):', heightExample: 'მაგ: 178', weightExample: 'მაგ: 75', calculateSize: 'ზომის გამოთვლა და შერჩევა', sizeGuide: 'ზომების გიდი', sizeChart: 'ზომების ცხრილი', clothingSizes: 'ტანსაცმლის ზომები', chest: 'გულმკერდი', waist: 'წელი', understand: 'გასაგებია', subcategoryHint: 'აირჩიეთ სუბკატეგორია ▾', categoryHint: 'კატეგორიის ნახვა', subCount: 'სუბ' },
    en: { allCategories: 'All categories', fullCollection: 'Full collection', subcategories: 'Subcategories for:', close: 'Close', allItems: 'All', sort: 'Sort:', defaultSort: 'Default', priceLow: 'Price: low to high ⬆', priceHigh: 'Price: high to low ⬇', nameSort: 'Name (A-Z)', chooseSize: 'Choose size', viewAdd: 'View & add', addToCart: 'Add to cart', sizePrompt: 'Choose a size (in-stock sizes only):', recommendedSize: 'Recommended size based on your measurements:', color: 'Color:', description: 'Product description:', defaultDescription: 'Premium product of excellent quality.', inStock: 'In stock:', available: 'Available', deliveryFit: '(fit can be checked on delivery)', reviews: 'Customer photo reviews', leaveReview: 'Leave a review and upload a photo:', rating: 'Rating:', yourName: 'Your name *', reviewPlaceholder: 'How did you like the product?...', minPrice: 'Min', maxPrice: 'Max', smartSize: 'Smart size selection', styleKicker: 'Find your style', viewCollection: 'Explore collection', limitedOffer: 'Limited-time offer', hurryDiscount: 'Hurry, the discount is ending!', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds', discoverCollections: 'Discover collections', collectionIntro: 'Curated collections — find your next favourite style', navigation: 'Navigation:', publishReview: 'Publish review and photo', price: 'Price:', clear: 'Clear', noFilterResults: 'No products match the selected filters.', wishlistTitle: 'Add to wishlist', compareTitle: 'Add to comparison', discount: 'Sale', viewDetails: 'View details', productDetails: 'Product details', vendor: 'Vendor:', variant: 'Choose a product option:', material: 'Material / composition', durability: 'Durability / features', giftWrap: 'Premium gift wrapping', giftWrapInfo: 'Box, ribbon and card (+5 ₾)', giftMessage: 'Gift card message (free):', giftPlaceholder: 'Write your message...', vipWarranty: 'VIP protection and extended warranty (+1 year)', warrantyInfo: 'Protection against damage (+15 ₾)', uploadPhoto: 'Upload a photo:', photoSelected: 'Photo selected', noReviews: 'There are no reviews for this product yet.', enterMeasurements: 'Enter your measurements', height: 'Your height (cm):', weight: 'Your weight (kg):', heightExample: 'e.g. 178', weightExample: 'e.g. 75', calculateSize: 'Calculate & select size', sizeGuide: 'Size guide', sizeChart: 'Size chart', clothingSizes: 'Clothing sizes', chest: 'Chest', waist: 'Waist', understand: 'Got it', subcategoryHint: 'Choose a subcategory ▾', categoryHint: 'View category', subCount: 'sub' }, ru: { allCategories: 'Все категории', fullCollection: 'Полная коллекция', subcategories: 'Подкатегории:', close: 'Закрыть', allItems: 'Все', sort: 'Сортировка:', defaultSort: 'По умолчанию', priceLow: 'Цена: по возрастанию ⬆', priceHigh: 'Цена: по убыванию ⬇', nameSort: 'Название (А-Я)', chooseSize: 'Выбрать размер', viewAdd: 'Посмотреть и добавить', addToCart: 'Добавить в корзину', sizePrompt: 'Выберите размер (только в наличии):', recommendedSize: 'Рекомендуемый размер по вашим параметрам:', color: 'Цвет:', description: 'Описание товара:', defaultDescription: 'Премиальный товар отличного качества.', inStock: 'В наличии:', available: 'Доступен', deliveryFit: '(можно проверить при доставке)', reviews: 'Фотоотзывы покупателей', leaveReview: 'Оставьте отзыв и загрузите фото:', rating: 'Оценка:', yourName: 'Ваше имя *', reviewPlaceholder: 'Как вам понравился товар?...', minPrice: 'Мин', maxPrice: 'Макс', smartSize: 'Подбор размера', styleKicker: 'Найди свой стиль', viewCollection: 'Смотреть коллекцию', limitedOffer: 'Предложение ограничено по времени', hurryDiscount: 'Поторопитесь, скидка скоро закончится!', hours: 'Часы', minutes: 'Минуты', seconds: 'Секунды', discoverCollections: 'Откройте коллекции', collectionIntro: 'Подборка направлений — найдите свой новый любимый стиль', navigation: 'Навигация:', publishReview: 'Опубликовать отзыв и фото', price: 'Цена:', clear: 'Очистить', noFilterResults: 'По выбранным фильтрам товары не найдены.', wishlistTitle: 'Добавить в избранное', compareTitle: 'Добавить к сравнению', discount: 'Скидка', viewDetails: 'Подробнее', productDetails: 'Информация о товаре', vendor: 'Поставщик:', variant: 'Выберите вариант товара:', material: 'Материал / состав', durability: 'Износостойкость / характеристики', giftWrap: 'Премиальная подарочная упаковка', giftWrapInfo: 'Коробка, лента и открытка (+5 ₾)', giftMessage: 'Текст подарочной открытки (бесплатно):', giftPlaceholder: 'Напишите пожелание...', vipWarranty: 'VIP-защита и расширенная гарантия (+1 год)', warrantyInfo: 'Полная защита от повреждений (+15 ₾)', uploadPhoto: 'Загрузить фото:', photoSelected: 'Фото выбрано', noReviews: 'Пока нет отзывов об этом товаре.', enterMeasurements: 'Укажите ваши параметры', height: 'Ваш рост (см):', weight: 'Ваш вес (кг):', heightExample: 'например, 178', weightExample: 'например, 75', calculateSize: 'Рассчитать и выбрать размер', sizeGuide: 'Таблица размеров', sizeChart: 'Таблица размеров', clothingSizes: 'Размеры одежды', chest: 'Грудь', waist: 'Талия', understand: 'Понятно', subcategoryHint: 'Выберите подкатегорию ▾', categoryHint: 'Смотреть категорию', subCount: 'подкат.' }
  })[currentLang] || { allCategories: 'ყველა კატეგორია', fullCollection: 'სრული კოლექცია', subcategories: 'სუბკატეგორიები კატეგორიისთვის:', close: 'დახურვა', allItems: 'ყველა', sort: 'დალაგება:', defaultSort: 'ნაგულისხმევი', priceLow: 'ფასით: დაბლიდან მაღლა ⬆', priceHigh: 'ფასით: მაღლიდან დაბლა ⬇', nameSort: 'დასახელებით (A-Z)', chooseSize: 'ზომის არჩევა', viewAdd: 'ნახვა და დამატება', addToCart: 'კალათაში დამატება', sizePrompt: 'აირჩიეთ ზომა (მხოლოდ მარაგშია):', recommendedSize: 'რეკომენდებული ზომა თქვენი პარამეტრებით:', color: 'ფერი:', description: 'პროდუქტის აღწერა:', defaultDescription: 'უმაღლესი ხარისხის პრემიუმ პროდუქცია.', inStock: 'მარაგშია:', available: 'ხელმისაწვდომია', deliveryFit: '(მორგება მიტანისას)', reviews: 'მომხმარებელთა ფოტო-შეფასებები', leaveReview: 'დატოვეთ შეფასება და ატვირთეთ ფოტო:', rating: 'შეფასება:', yourName: 'თქვენი სახელი *', reviewPlaceholder: 'როგორ მოგეწონათ პროდუქტი?...', minPrice: 'Min', maxPrice: 'Max' };

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(null);

  const [sortBy, setSortBy] = useState('default');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedCustomVariant, setSelectedCustomVariant] = useState(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  // 🌟 ჭკვიანი ზომის შერჩევის სახელმწიფო (Smart Size Recommender)
  const [isSmartSizeModalOpen, setIsSmartSizeModalOpen] = useState(false);
  const [userHeight, setUserHeight] = useState('');
  const [userWeight, setUserWeight] = useState('');
  const [smartRecommendedSize, setSmartRecommendedSize] = useState(null);

  const [isGiftWrapped, setIsGiftWrapped] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [hasVipWarranty, setHasVipWarranty] = useState(false);

  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [openParentCatId, setOpenParentCatId] = useState(null);

  const [timeLeft, setTimeLeft] = useState({ hours: 11, minutes: 45, seconds: 30 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [allReviews, setAllReviews] = useState(() => {
    try { const saved = localStorage.getItem('geostore_product_reviews'); return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewImage, setNewReviewImage] = useState('');

  useEffect(() => {
    try { localStorage.setItem('geostore_product_reviews', JSON.stringify(allReviews)); } catch {}
  }, [allReviews]);

  // 🌟 შემოწმება: არის თუ არა პროდუქტი ტანსაცმელი ან ფეხსაცმელი
  const isClothingOrFootwear = (prod) => {
    if (!prod) return false;
    const cat = (prod.category || '').toLowerCase();
    const name = (prod.name || '').toLowerCase();
    const keywords = ['ტანსაცმელ', 'ფეხსაცმელ', 'შარვალ', 'ქურთუკ', 'პერანგ', 'შორტ', 'კაბა', 'shoe', 'cloth', 'shirt', 'jacket', 'pant', 'sneaker', 'ბათინკ', 'ქუდ', 'майк'];
    return keywords.some(kw => cat.includes(kw) || name.includes(kw));
  };

  const handleOpenProduct = (prod) => {
    setSelectedProduct(prod);
    setActiveImage(prod.image);
    
    const defaultSizes = prod.availableSizes || ['S', 'M', 'L', 'XL'];
    setSelectedSize(defaultSizes[0] || 'M');

    const defaultColors = prod.availableColors || ['შავი'];
    setSelectedColor(defaultColors[0] || '');

    setSelectedCustomVariant(prod.variants && prod.variants.length > 0 ? prod.variants[0] : null);

    setIsGiftWrapped(false);
    setGiftMessage('');
    setHasVipWarranty(false);
    setSmartRecommendedSize(null);
    setUserHeight('');
    setUserWeight('');
    setNewReviewAuthor('');
    setNewReviewComment('');
    setNewReviewRating(5);
    setNewReviewImage('');
  };

  const handleCalculateSmartSize = (e) => {
    e.preventDefault();
    const h = Number(userHeight);
    const w = Number(userWeight);
    if (!h || !w) return;

    let rec = 'M';
    const cat = (selectedProduct?.category || '').toLowerCase();
    const isShoe = cat.includes('ფეხსაცმელ') || cat.includes('shoe');

    if (isShoe) {
      if (h < 165) rec = '39';
      else if (h < 172) rec = '40';
      else if (h < 178) rec = '41';
      else if (h < 184) rec = '42';
      else rec = '43';
    } else {
      if (w < 60) rec = 'S';
      else if (w < 72) rec = 'M';
      else if (w < 85) rec = 'L';
      else if (w < 98) rec = 'XL';
      else rec = 'XXL';
    }

    const available = selectedProduct?.availableSizes || ['S', 'M', 'L', 'XL'];
    if (!available.includes(rec)) {
      rec = available[0] || 'M';
    }

    setSmartRecommendedSize(rec);
    setSelectedSize(rec);
  };

  const handleReviewImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewReviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddReview = (e, productId) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    const reviewObj = {
      id: `rev-${Date.now()}`,
      author: newReviewAuthor.trim(),
      comment: newReviewComment.trim(),
      rating: Number(newReviewRating),
      image: newReviewImage || null,
      date: new Date().toLocaleDateString('ka-GE')
    };

    setAllReviews(prev => {
      const currentProdReviews = prev[productId] || [];
      return {
        ...prev,
        [productId]: [reviewObj, ...currentProdReviews]
      };
    });

    setNewReviewAuthor('');
    setNewReviewComment('');
    setNewReviewRating(5);
    setNewReviewImage('');
  };

  const mainCategories = useMemo(() => {
    return (categories || []).filter(c => !c.parentId);
  }, [categories]);

  const getSubCategories = (parentId) => {
    return (categories || []).filter(c => c.parentId === parentId);
  };

  const getCategoryProductCount = (catName, isSub = false) => {
    if (!activeProducts || activeProducts.length === 0) return 0;
    if (!isSub) {
      const matchedParent = mainCategories.find(c => (typeof c === 'object' ? c.name : c) === catName);
      if (matchedParent) {
        const pId = matchedParent.id || matchedParent.name;
        const subNames = getSubCategories(pId).map(s => s.name);
        return activeProducts.filter(p => p.category === catName || subNames.includes(p.category)).length;
      }
      return activeProducts.filter(p => p.category === catName).length;
    } else {
      return activeProducts.filter(p => p.category === catName).length;
    }
  };

  const processedProducts = useMemo(() => {
    let result = [...activeProducts];

    if (selectedSubCategory) {
      result = result.filter(p => p.category === selectedSubCategory);
    } else if (selectedCategory && selectedCategory !== 'ყველა') {
      const matchedParent = mainCategories.find(c => (typeof c === 'object' ? c.name : c) === selectedCategory);
      if (matchedParent) {
        const pId = matchedParent.id || matchedParent.name;
        const subNames = getSubCategories(pId).map(s => s.name);
        result = result.filter(p => p.category === selectedCategory || subNames.includes(p.category));
      } else {
        result = result.filter(p => p.category === selectedCategory);
      }
    }

    if (minPrice !== '' && !isNaN(minPrice)) {
      result = result.filter(p => p.priceGEL >= Number(minPrice));
    }
    if (maxPrice !== '' && !isNaN(maxPrice)) {
      result = result.filter(p => p.priceGEL <= Number(maxPrice));
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.priceGEL - b.priceGEL);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.priceGEL - a.priceGEL);
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'ka'));
    }

    return result;
  }, [activeProducts, selectedCategory, selectedSubCategory, minPrice, maxPrice, sortBy, mainCategories]);

  const flashSaleProducts = useMemo(() => {
    return activeProducts.filter(p => p.oldPriceGEL && p.oldPriceGEL > p.priceGEL).slice(0, 4);
  }, [activeProducts]);

  const getCategoryIcon = (catName) => {
    const name = (catName || '').toLowerCase();
    if (name.includes('ფეხსაცმელ') || name.includes('shoe') || name.includes('sneaker') || name.includes('ბათინკ')) return <Footprints className="w-5 h-5" />;
    if (name.includes('აქსესუარ') || name.includes('accessor') || name.includes('ჩანთა') || name.includes('bag')) return <Briefcase className="w-5 h-5" />;
    if (name.includes('სამკაულ') || name.includes('jewel') || name.includes('ბეჭედ') || name.includes('ყელსაბამ')) return <Gem className="w-5 h-5" />;
    if (name.includes('კაც') || name.includes('men') || name.includes('male')) return <UserRound className="w-5 h-5" />;
    if (name.includes('ქალ') || name.includes('women') || name.includes('female') || name.includes('ტანსაცმ') || name.includes('clothing') || name.includes('apparel')) return <Shirt className="w-5 h-5" />;
    if (name.includes('სმარტფონ') || name.includes('phone') || name.includes('მობილურ')) return <Smartphone className="w-5 h-5" />;
    if (name.includes('ლაპტოპ') || name.includes('computer') || name.includes('კომპიუტერ') || name.includes('notebook')) return <Laptop className="w-5 h-5" />;
    if (name.includes('ყურსასმენ') || name.includes('audio') || name.includes('sound') || name.includes('აუდიო')) return <Headphones className="w-5 h-5" />;
    if (name.includes('საათ') || name.includes('watch')) return <Watch className="w-5 h-5" />;
    if (name.includes('ფოტო') || name.includes('camera') || name.includes('ვიდეო')) return <CameraIcon className="w-5 h-5" />;
    if (name.includes('ტელევიზორ') || name.includes('tv')) return <Tv className="w-5 h-5" />;
    if (name.includes('დინამიკ') || name.includes('speaker')) return <Speaker className="w-5 h-5" />;
    return <Sparkles className="w-5 h-5" />;
  };

  const getCategoryImage = (catName) => {
    const name = (catName || '').toLowerCase();
    if (name.includes('ფეხსაცმელ') || name.includes('shoe') || name.includes('sneaker') || name.includes('ბათინკ')) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=88';
    if (name.includes('აქსესუარ') || name.includes('accessor') || name.includes('bag') || name.includes('ჩანთა')) return 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=88';
    if (name.includes('კაც') || name.includes('men') || name.includes('male')) return 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=1000&q=88';
    if (name.includes('ქალ') || name.includes('women') || name.includes('female')) return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=88';
    if (name.includes('ტანსაცმ') || name.includes('clothing') || name.includes('apparel')) return 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=1000&q=88';
    if (name.includes('სამკაულ') || name.includes('jewel')) return 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1000&q=88';
    return 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=88';
  };

  const currentBasePrice = selectedCustomVariant ? selectedCustomVariant.priceGEL : (selectedProduct?.priceGEL || 0);

  return (
    <div className="geostore-storefront space-y-6 sm:space-y-8 w-full pb-28 animate-in fade-in duration-500 overflow-x-hidden px-2 sm:px-0">
      
      {/* GEOSTORE FASHION EDITORIAL HERO */}
      <section className="gs-fashion-hero" aria-label="GEOSTORE fashion collection">
        <div className="gs-fashion-hero__image" role="img" aria-label="Fashion editorial collection" />
        <div className="gs-fashion-hero__content">
          <span className="gs-fashion-eyebrow">GEOSTORE / NEW SEASON</span>
          <p className="gs-fashion-kicker">{storeText.styleKicker}</p>
          <h1>{/მრავალვენდერიანი|მარკეტფლეისი|ტექნიკის/i.test(siteSettings?.heroTitle || '') ? 'შენი სტილი. შენი არჩევანი.' : (siteSettings?.heroTitle || 'შენი სტილი. შენი არჩევანი.')}</h1>
          <p className="gs-fashion-hero__description">{/მომწოდებლ|ბრენდები და მომწოდებლ|ტექნიკის/i.test(siteSettings?.heroSubtitle || '') ? 'აღმოაჩინე ტანსაცმლის, ფეხსაცმლისა და აქსესუარების შერჩეული კოლექცია.' : (siteSettings?.heroSubtitle || 'აღმოაჩინე ტანსაცმლის, ფეხსაცმლისა და აქსესუარების შერჩეული კოლექცია.')}</p>
          <div className="gs-fashion-hero__actions">
            <button type="button" onClick={() => { setSelectedCategory('ყველა'); setSelectedSubCategory(null); setOpenParentCatId(null); }} className="gs-fashion-primary">{storeText.viewCollection} <span aria-hidden="true">↗</span></button>
            <span className="gs-fashion-hero__note">CLOTHING · SHOES · ACCESSORIES</span>
          </div>
        </div>
        <div className="gs-fashion-hero__stamp"><span>CURATED</span><strong>STYLE<br/>EDITION</strong><span>GEORGIA · 2026</span></div>
      </section>

      {/* ⚡ FLASH SALE COUNTDOWN SECTION */}
      {flashSaleProducts.length > 0 && (
        <div className="gs-flash-sale-section bg-gradient-to-r from-amber-950/40 via-[#0e0e12] to-amber-950/40 border border-amber-500/30 rounded-[2.5rem] p-5 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-amber-500/20 pb-5">
            <div className="flex items-center gap-3">
              <div className="bg-amber-400 p-3 rounded-2xl text-slate-950 shadow-lg shadow-amber-500/30 animate-pulse">
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                  ⚡ FLASH SALE <span className="text-amber-400 text-[10px] sm:text-xs bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30">{storeText.limitedOffer}</span>
                </h3>
                <p className="text-slate-400 text-xs">{storeText.hurryDiscount}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-black">
              <div className="gs-flash-sale-timer bg-[#141418] border border-amber-500/30 px-3.5 py-2 rounded-2xl text-amber-400 shadow-inner text-center">
                <span className="text-sm sm:text-base">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="block text-[8px] sm:text-[9px] text-slate-400 uppercase">{storeText.hours}</span>
              </div>
              <span className="text-amber-400 text-base">:</span>
              <div className="gs-flash-sale-timer bg-[#141418] border border-amber-500/30 px-3.5 py-2 rounded-2xl text-amber-400 shadow-inner text-center">
                <span className="text-sm sm:text-base">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="block text-[8px] sm:text-[9px] text-slate-400 uppercase">{storeText.minutes}</span>
              </div>
              <span className="text-amber-400 text-base">:</span>
              <div className="gs-flash-sale-timer bg-[#141418] border border-amber-500/30 px-3.5 py-2 rounded-2xl text-amber-400 shadow-inner text-center">
                <span className="text-sm sm:text-base">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <span className="block text-[8px] sm:text-[9px] text-slate-400 uppercase">{storeText.seconds}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {flashSaleProducts.map(prod => {
              return (
                <div key={`flash-${prod.id}`} className="gs-flash-sale-card group bg-[#060608] border border-amber-500/20 rounded-3xl p-4 flex flex-col justify-between hover:border-amber-400 transition-all shadow-xl">
                  <div onClick={() => handleOpenProduct(prod)} className="gs-flash-sale-media relative bg-[#0d0d12] rounded-2xl p-4 h-40 sm:h-44 flex items-center justify-center cursor-pointer overflow-hidden">
                    <img src={prod.image} alt="" className="h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                    <span className="absolute top-3 left-3 bg-rose-500 text-white px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase">SALE</span>
                  </div>
                  <div className="py-3 space-y-1.5">
                    <h4 onClick={() => handleOpenProduct(prod)} className="font-black text-white text-xs line-clamp-1 cursor-pointer hover:text-amber-300">{prod.name}</h4>
                    <div className="flex items-baseline gap-2">
                      <span className="text-amber-400 font-black text-sm">{formatPrice(prod.priceGEL)}</span>
                      {prod.oldPriceGEL && <span className="text-slate-500 font-bold text-[11px] line-through">{formatPrice(prod.oldPriceGEL)}</span>}
                    </div>
                  </div>
                  <button onClick={() => addToCart(prod)} className="w-full bg-[#16161a] hover:bg-amber-400 hover:text-slate-950 text-white font-black py-2.5 rounded-xl text-xs transition border border-amber-500/20 cursor-pointer">
                    კალათაში
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🌟 PREMIUM REDESIGNED CATEGORIES & SUBCATEGORIES DISCOVERY SECTION (WITH UPLOADED PHOTO SUPPORT) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2 border-b border-amber-500/20 pb-4">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-amber-400" /> {storeText.discoverCollections}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">{storeText.collectionIntro}</p>
          </div>
          <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-4 py-2 rounded-2xl border border-amber-500/30 shadow-inner">
            {processedProducts?.length || 0} პროდუქტი ვიტრინაზე
          </span>
        </div>
        
        {(selectedCategory !== 'ყველა' || selectedSubCategory) && (
          <div className="gs-category-breadcrumb flex items-center gap-2 text-xs bg-[#121216] px-4 py-3 rounded-2xl border border-amber-500/30 shadow">
            <span className="text-slate-400 font-bold">{storeText.navigation}</span>
            <button 
              onClick={() => { setSelectedCategory('ყველა'); setSelectedSubCategory(null); setOpenParentCatId(null); }}
              className="text-amber-400 hover:underline font-black cursor-pointer"
            >
              {storeText.allCategories}
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-white font-bold">{selectedCategory}</span>
            {selectedSubCategory && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-amber-300 font-bold">{selectedSubCategory}</span>
              </>
            )}
            <button 
              onClick={() => { setSelectedCategory('ყველა'); setSelectedSubCategory(null); setOpenParentCatId(null); }}
              className="ml-auto text-rose-400 hover:text-rose-300 font-bold text-[11px] underline cursor-pointer"
            >
              {storeText.clear} ✕
            </button>
          </div>
        )}

        {/* 🌟 Premium Category Cards Grid with Uploaded Photos */}
        <div className="gs-category-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div 
            role="button"
            tabIndex={0}
            aria-pressed={selectedCategory === 'ყველა' && !selectedSubCategory}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCategory('ყველა'); setSelectedSubCategory(null); setOpenParentCatId(null); } }}
            onClick={() => { setSelectedCategory('ყველა'); setSelectedSubCategory(null); setOpenParentCatId(null); }}
            className={`gs-category-card gs-category-card--all group relative overflow-hidden bg-gradient-to-br from-[#121216] to-[#08080a] border rounded-3xl p-5 flex flex-col justify-between h-36 sm:h-40 cursor-pointer transition-all duration-300 shadow-xl ${
              selectedCategory === 'ყველა' && !selectedSubCategory
                ? 'border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]' 
                : 'border-amber-500/20 hover:border-amber-400 hover:scale-[1.02]'
            }`}
          >
            <div className="gs-category-photo" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=88")' }} />
            <div className="flex justify-between items-start z-10">
              <div className="gs-category-icon gs-category-icon--all"><Sparkles className="w-5 h-5" /></div>
              <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                {activeProducts.length}
              </span>
            </div>
            <div className="relative z-10">
              <h4 className="font-black text-white text-xs sm:text-sm group-hover:text-amber-300 transition-colors">{storeText.allCategories}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{storeText.fullCollection}</p>
            </div>
          </div>

          {(mainCategories.length > 0 ? mainCategories : (categories || []).map(c => typeof c === 'object' ? c : { id: c, name: c })).map(cat => {
            const catName = cat.name;
            const catId = cat.id || catName;
            const catImage = cat.image || cat.img || getCategoryImage(catName); // Admin-uploaded image takes priority
            const subCats = getSubCategories(catId);
            const isSelected = selectedCategory === catName;
            const isOpen = openParentCatId === catId;
            const pCount = getCategoryProductCount(catName, false);

            return (
              <div 
                key={catId}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCategory(catName); setSelectedSubCategory(null); setOpenParentCatId(isOpen ? null : catId); } }}
                onClick={() => { 
                  setSelectedCategory(catName); 
                  setSelectedSubCategory(null);
                  setOpenParentCatId(isOpen ? null : catId);
                }}
                className={`gs-category-card group relative overflow-hidden bg-gradient-to-br from-[#121216] to-[#08080a] border rounded-3xl p-5 flex flex-col justify-between h-36 sm:h-40 cursor-pointer transition-all duration-300 shadow-xl ${
                  isSelected 
                    ? 'border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]' 
                    : 'border-amber-500/20 hover:border-amber-400 hover:scale-[1.02]'
                }`}
              >
                {/* 🌟 თუ ატვირთულია ფოტო, გამოჩნდეს ფონზე მსუბუქი გამჭვირვალობით */}
                <div className="gs-category-photo" style={{ backgroundImage: `url("${catImage}")` }} />
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
                <div className="flex justify-between items-start z-10">
                  <div className="gs-category-icon" aria-hidden="true">{getCategoryIcon(catName)}</div>
                  <div className="flex items-center gap-1 z-10">
                    {subCats.length > 0 && <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">{subCats.length} {storeText.subCount}</span>}
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">{pCount}</span>
                  </div>
                </div>
                <div className="z-10">
                  <h4 className="font-black text-white text-xs sm:text-sm group-hover:text-amber-300 transition-colors line-clamp-1">{catName}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{subCats.length > 0 ? storeText.subcategoryHint : storeText.categoryHint}</p>
                </div>
              </div>
            );
          })}
        </div>

        {openParentCatId && getSubCategories(openParentCatId).length > 0 && (
          <div className="gs-subcategory-panel bg-[#0e0e12] border border-amber-500/40 p-5 rounded-3xl space-y-3 animate-in fade-in duration-300 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-400 font-bold flex items-center gap-2">
                <CornerDownRight className="w-4 h-4" /> {storeText.subcategories} <b className="text-white underline">{selectedCategory}</b>
              </span>
              <button onClick={() => setOpenParentCatId(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">{storeText.close} ✕</button>
            </div>
            
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={() => setSelectedSubCategory(null)}
                className={`gs-subcategory-chip px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer border ${!selectedSubCategory ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg' : 'bg-[#141418] text-slate-300 border-amber-500/20 hover:text-white'}`}
              >
                {storeText.allItems} ({selectedCategory})
              </button>
              {getSubCategories(openParentCatId).map(sub => {
                const subCount = getCategoryProductCount(sub.name, true);
                const isSubSel = selectedSubCategory === sub.name;
                return (
                  <button
                    key={sub.id || sub.name}
                    onClick={() => setSelectedSubCategory(sub.name)}
                    className={`gs-subcategory-chip px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer border flex items-center gap-2 ${isSubSel ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg' : 'bg-[#141418] text-slate-300 border-amber-500/20 hover:text-white'}`}
                  >
                    <span>{sub.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg ${isSubSel ? 'bg-slate-950 text-amber-400' : 'bg-slate-900 text-amber-400'}`}>{subCount}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filters & Sorting */}
      <div className="gs-filter-panel bg-[#0e0e12] border border-amber-500/20 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" /> {storeText.price}
          </div>
          <input 
            type="number" 
            placeholder={storeText.minPrice} 
            aria-label={storeText.minPrice}
            value={minPrice} 
            onChange={e => setMinPrice(e.target.value)}
            className="w-20 sm:w-24 bg-[#060608] border border-amber-500/20 rounded-xl p-2.5 text-white outline-none focus:border-amber-400 shadow-inner"
          />
          <span className="text-slate-500">-</span>
          <input 
            type="number" 
            placeholder={storeText.maxPrice} 
            aria-label={storeText.maxPrice}
            value={maxPrice} 
            onChange={e => setMaxPrice(e.target.value)}
            className="w-20 sm:w-24 bg-[#060608] border border-amber-500/20 rounded-xl p-2.5 text-white outline-none focus:border-amber-400 shadow-inner"
          />
          {(minPrice !== '' || maxPrice !== '') && (
            <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-amber-400 hover:text-amber-300 font-bold underline px-1 cursor-pointer">{storeText.clear}</button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold shrink-0">
            <ArrowUpDown className="w-4 h-4 text-amber-400" /> {storeText.sort}
          </div>
          <select 
            aria-label={storeText.sort}
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="bg-[#060608] border border-amber-500/20 text-white rounded-xl p-2.5 outline-none focus:border-amber-400 shadow-inner cursor-pointer font-bold w-full sm:w-auto"
          >
            <option value="default">{storeText.defaultSort}</option>
            <option value="price-asc">{storeText.priceLow}</option>
            <option value="price-desc">{storeText.priceHigh}</option>
            <option value="name-asc">{storeText.nameSort}</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {processedProducts.length === 0 ? (
        <div className="gs-empty-products text-center py-16 bg-[#0e0e12] border border-amber-500/20 rounded-[2.5rem]">
          <p className="text-slate-400 text-sm font-bold">{storeText.noFilterResults}</p>
        </div>
      ) : (
        <div className="gs-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
          {processedProducts.map(prod => {
            const isWish = wishlist.some(w => w.id === prod.id);
            const isCompared = comparisonList.some(c => c.id === prod.id);
            const prodReviews = allReviews[prod.id] || [];
            const avgRating = prodReviews.length > 0 
              ? (prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length).toFixed(1) 
              : '5.0';
            const tagsArray = Array.isArray(prod.tags) ? prod.tags : (prod.tags ? prod.tags.split(',').map(t => t.trim()) : []);

            return (
              <article key={prod.id} className="gs-product-card group flex flex-col">
                
                <div 
                  onClick={() => handleOpenProduct(prod)}
                  className="gs-product-media relative flex items-center justify-center overflow-hidden cursor-pointer group/img"
                >
                  <img src={prod.image} alt={prod.name} className="w-full h-full object-contain group-hover/img:scale-110 transition-transform duration-700 drop-shadow-xl" />
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleWishlist(prod); }} 
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2.5 sm:p-3 bg-[#121216]/90 backdrop-blur-md rounded-2xl text-rose-400 border border-amber-500/20 hover:scale-110 transition cursor-pointer z-10 shadow-lg"
                    title={storeText.wishlistTitle}
                  >
                    <Heart className={`w-4 h-4 ${isWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleComparison(prod); }} 
                    className={`absolute top-14 right-3 sm:top-16 sm:right-4 p-2.5 sm:p-3 backdrop-blur-md rounded-2xl border transition cursor-pointer z-10 shadow-lg ${isCompared ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-[#121216]/90 text-amber-400 border-amber-500/20 hover:scale-110'}`}
                    title={storeText.compareTitle}
                  >
                    <Scale className="w-4 h-4" />
                  </button>

                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-1.5 z-10">
                    {prod.oldPriceGEL && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 sm:px-3 py-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow">{storeText.discount}</span>
                    )}
                    {tagsArray.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 sm:px-3 py-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow">{tag}</span>
                    ))}
                  </div>

                  <div className="absolute inset-0 bg-[#060608]/80 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-xs font-black text-amber-300 backdrop-blur-sm">
                    <Eye className="w-4 h-4 text-amber-400" /> {storeText.viewDetails}
                  </div>
                </div>

                <div className="gs-product-info py-3 sm:py-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider bg-[#16161a] px-2.5 py-1 rounded-lg border border-amber-500/20">{prod.vendor || 'GEOSTORE'}</span>
                    <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 text-[10px] font-bold text-amber-300">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {avgRating} ({prodReviews.length})
                    </div>
                  </div>
                  <h3 onClick={() => handleOpenProduct(prod)} className="gs-product-title font-black text-white text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors cursor-pointer">{prod.name}</h3>
                  <div className="gs-product-price flex items-baseline gap-2.5 pt-0.5">
                    <p className="text-amber-400 font-black text-base sm:text-lg">{formatPrice(prod.priceGEL)}</p>
                    {prod.oldPriceGEL && <p className="text-slate-500 font-bold text-xs line-through">{formatPrice(prod.oldPriceGEL)}</p>}
                  </div>
                </div>

                <button 
                  onClick={() => handleOpenProduct(prod)} 
                  className="gs-product-action gs-product-card-action w-full font-black py-3.5 sm:py-4 text-xs transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-95 group/btn"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400 group-hover/btn:text-slate-950 transition-colors" /> {isClothingOrFootwear(prod) ? storeText.chooseSize : storeText.viewAdd}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* 🌟 100% SMOOTH & FIXED PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="gs-product-modal fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
          
          <div className="gs-product-dialog relative w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh]">
            
            <div className="gs-product-modal-header flex justify-between items-center px-5 sm:px-6 py-3.5 sm:py-4 shrink-0 z-20">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> {storeText.productDetails}
              </span>
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="p-2.5 bg-[#1e1e24] hover:bg-rose-500/20 text-slate-200 hover:text-rose-400 rounded-2xl border border-amber-500/30 transition cursor-pointer shadow"
                title={storeText.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="gs-product-modal-body p-4 sm:p-7 overflow-y-auto space-y-6 scrollbar-thin pb-28">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
                
                <div className="space-y-4">
                  <div className="gs-product-detail-image flex items-center justify-center h-60 sm:h-80">
                    <img src={activeImage || selectedProduct.image} alt={selectedProduct.name || storeText.productDetails} className="max-h-full max-w-full object-contain drop-shadow-2xl" />
                  </div>
                  
                  {selectedProduct.gallery && selectedProduct.gallery.length > 1 && (
                    <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
                      {selectedProduct.gallery.map((img, idx) => (
                        <button key={idx} onClick={() => setActiveImage(img)} className={`w-16 h-16 sm:w-20 sm:h-20 bg-[#060608] rounded-2xl p-2 border-2 transition cursor-pointer shrink-0 shadow ${activeImage === img ? 'border-amber-400 scale-105' : 'border-amber-500/20 hover:border-amber-400/50'}`}>
                          <img src={img} alt={`${selectedProduct.name || storeText.productDetails} ${idx + 1}`} className="w-full h-full object-contain rounded-xl" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-5 sm:space-y-6 text-xs w-full">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] sm:text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/30 font-black px-3 py-1.5 rounded-xl uppercase tracking-wider">{selectedProduct.category}</span>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold bg-[#141418] px-3 py-1.5 rounded-xl border border-amber-500/20">SKU: {selectedProduct.sku || 'N/A'}</span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black text-white leading-tight pt-1">{selectedProduct.name}</h2>
                    <p className="text-slate-400 text-xs">{storeText.vendor} <b className="text-amber-300">{selectedProduct.vendor || 'GEOSTORE'}</b></p>
                  </div>

                  <div className="gs-product-price-panel bg-[#141418] p-4 sm:p-5 rounded-3xl border border-amber-500/30 flex items-baseline gap-4 shadow-inner">
                    <span className="text-xl sm:text-3xl font-black text-amber-400">
                      {formatPrice(currentBasePrice + (isGiftWrapped ? 5 : 0) + (hasVipWarranty ? 15 : 0))}
                    </span>
                    {selectedProduct.oldPriceGEL && <span className="text-slate-500 font-bold line-through text-sm sm:text-base">{formatPrice(selectedProduct.oldPriceGEL)}</span>}
                  </div>

                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div className="space-y-2.5 bg-[#121216] p-4 rounded-3xl border border-amber-500/30">
                      <span className="text-amber-400 font-bold block flex items-center gap-1.5">
                        <Layers className="w-4 h-4" /> {storeText.variant}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedProduct.variants.map(v => {
                          const isSel = selectedCustomVariant?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedCustomVariant(v)}
                              className={`gs-product-variant-option p-3 rounded-2xl text-left transition cursor-pointer border flex justify-between items-center ${isSel ? 'bg-amber-400 text-slate-950 border-amber-400 font-black shadow' : 'bg-[#08080a] text-slate-300 border-amber-500/20 hover:border-amber-400/50'}`}
                            >
                              <span>{v.name}</span>
                              <span className="font-black">{v.priceGEL} ₾</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(selectedProduct.material || selectedProduct.durability) && (
                    <div className="bg-[#121216] p-3.5 sm:p-4 rounded-3xl border border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {selectedProduct.material && (
                        <div className="bg-[#08080a] p-3 rounded-2xl border border-amber-500/10">
                          <span className="text-slate-400 block text-[10px]">{storeText.material}</span>
                          <b className="text-white font-bold mt-0.5 block">{selectedProduct.material}</b>
                        </div>
                      )}
                      {selectedProduct.durability && (
                        <div className="bg-[#08080a] p-3 rounded-2xl border border-amber-500/10">
                          <span className="text-slate-400 block text-[10px]">{storeText.durability}</span>
                          <b className="text-amber-400 font-bold mt-0.5 block">{selectedProduct.durability}</b>
                        </div>
                      )}
                    </div>
                  )}

                  {isClothingOrFootwear(selectedProduct) && (
                    <div className="gs-size-selector space-y-3 bg-[#121216] p-4 rounded-3xl border border-amber-500/20">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="text-slate-300 font-bold">{storeText.sizePrompt} <b className="text-amber-400">{selectedSize}</b></span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIsSmartSizeModalOpen(true)} className="text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-amber-500/20 transition shadow">
                            <Calculator className="w-3.5 h-3.5 text-amber-400" /> {storeText.smartSize}
                          </button>
                          <button onClick={() => setIsSizeGuideOpen(true)} className="text-slate-400 hover:text-white font-bold flex items-center gap-1 text-[11px] underline cursor-pointer">
                            <Ruler className="w-3.5 h-3.5" /> {storeText.sizeGuide}
                          </button>
                        </div>
                      </div>

                      {smartRecommendedSize && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-2xl text-amber-300 text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{storeText.recommendedSize} <b className="text-white underline">{smartRecommendedSize}</b></span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 w-full">
                        {(selectedProduct.availableSizes || ['S', 'M', 'L', 'XL']).map(size => {
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setSelectedSize(size)}
                              className={`gs-size-option px-3.5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer border ${selectedSize === size ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-105' : 'bg-[#08080a] text-slate-300 border-amber-500/20 hover:text-white'}`}
                            >
                              {size} 🟢
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {((selectedProduct.availableColors && selectedProduct.availableColors.length > 0) || selectedProduct.colors) && (
                    <div className="space-y-2.5 bg-[#121216] p-4 rounded-3xl border border-amber-500/20 w-full overflow-hidden">
                      <span className="text-slate-300 font-bold block">{storeText.color} <b className="text-amber-400">{selectedColor}</b></span>
                      <div className="flex flex-wrap gap-2.5 w-full">
                        {(selectedProduct.availableColors || (selectedProduct.colors ? selectedProduct.colors.split(',').map(c => c.trim()) : [])).map(colName => (
                          <button
                            key={colName}
                            type="button"
                            onClick={() => setSelectedColor(colName)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${selectedColor === colName ? 'border-amber-400 bg-amber-500/10 text-amber-300 shadow' : 'border-amber-500/20 bg-[#08080a] text-slate-400'}`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full border border-amber-400/40 bg-amber-400/80"></span>
                            {colName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-amber-950/20 via-[#121216] to-amber-950/20 p-4 rounded-3xl border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsGiftWrapped(!isGiftWrapped)}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl border ${isGiftWrapped ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-[#08080a] text-amber-400 border-amber-500/30'}`}>
                          <Gift className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">{storeText.giftWrap}</h4>
                          <p className="text-[10px] text-slate-400">{storeText.giftWrapInfo}</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={isGiftWrapped} onChange={() => setIsGiftWrapped(!isGiftWrapped)} className="w-4 h-4 accent-amber-400 cursor-pointer" />
                    </div>

                    {isGiftWrapped && (
                      <div className="pt-2 animate-in fade-in">
                        <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5 text-[11px]">
                          <FileText className="w-3.5 h-3.5" /> {storeText.giftMessage}
                        </div>
                        <textarea
                          rows="2"
                          placeholder={storeText.giftPlaceholder}
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value)}
                          className="w-full bg-[#060608] border border-amber-500/30 rounded-xl p-2.5 text-white outline-none focus:border-amber-400 text-xs resize-none shadow-inner"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-gradient-to-r from-amber-950/20 via-[#121216] to-amber-950/20 p-4 rounded-3xl border border-amber-500/30 flex items-center justify-between cursor-pointer" onClick={() => setHasVipWarranty(!hasVipWarranty)}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl border ${hasVipWarranty ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-[#08080a] text-amber-400 border-amber-500/30'}`}>
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs">{storeText.vipWarranty}</h4>
                        <p className="text-[10px] text-slate-400">{storeText.warrantyInfo}</p>
                      </div>
                    </div>
                    <input type="checkbox" checked={hasVipWarranty} onChange={() => setHasVipWarranty(!hasVipWarranty)} className="w-4 h-4 accent-amber-400 cursor-pointer" />
                  </div>

                  <div className="space-y-2 bg-[#101014] p-4 sm:p-5 rounded-3xl border border-amber-500/20 shadow-inner">
                    <span className="text-amber-300 font-bold block text-sm">{storeText.description}</span>
                    <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-line">{selectedProduct.description || storeText.defaultDescription}</p>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-200 text-xs bg-amber-500/5 p-3.5 rounded-2xl border border-amber-500/20">
                    <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" /> 
                    <span>{storeText.inStock} <b className="text-amber-400 font-black">{storeText.available}</b> {storeText.deliveryFit}</span>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-amber-500/20">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-400" /> {storeText.reviews} ({(allReviews[selectedProduct.id] || []).length})
                    </h3>

                    <form onSubmit={(e) => handleAddReview(e, selectedProduct.id)} className="bg-[#121216] p-4 rounded-3xl border border-amber-500/20 space-y-3">
                      <span className="text-amber-300 font-bold block text-xs">{storeText.leaveReview}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-slate-400">{storeText.rating}</span>
                        <select 
                          value={newReviewRating} 
                          onChange={e => setNewReviewRating(Number(e.target.value))}
                          className="bg-[#060608] text-amber-400 font-bold border border-amber-500/30 rounded-xl p-2 outline-none text-xs"
                        >
                          <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                          <option value="4">⭐⭐⭐⭐ (4)</option>
                          <option value="3">⭐⭐⭐ (3)</option>
                          <option value="2">⭐⭐ (2)</option>
                          <option value="1">⭐ (1)</option>
                        </select>
                      </div>
                      <input 
                        type="text" 
                        placeholder={storeText.yourName} 
                        value={newReviewAuthor} 
                        onChange={e => setNewReviewAuthor(e.target.value)}
                        required
                        className="w-full bg-[#060608] border border-amber-500/20 p-3 rounded-2xl text-white outline-none focus:border-amber-400"
                      />
                      <textarea 
                        placeholder={storeText.reviewPlaceholder} 
                        value={newReviewComment} 
                        onChange={e => setNewReviewComment(e.target.value)}
                        required
                        rows="2"
                        className="w-full bg-[#060608] border border-amber-500/20 p-3 rounded-2xl text-white outline-none focus:border-amber-400 resize-none"
                      ></textarea>

                      <div className="flex items-center gap-3 bg-[#060608] p-3 rounded-2xl border border-amber-500/20">
                        <label className="flex items-center gap-2 text-xs text-amber-400 font-bold cursor-pointer hover:underline">
                          <ImageIcon className="w-4 h-4" /> {storeText.uploadPhoto}
                          <input type="file" accept="image/*" onChange={handleReviewImageChange} className="hidden" />
                        </label>
                        {newReviewImage && <span className="text-emerald-400 text-[10px] font-bold">✅ {storeText.photoSelected}</span>}
                      </div>

                      <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition cursor-pointer">
                        შეფასების და ფოტოს გამოქვეყნება
                      </button>
                    </form>

                    <div className="space-y-3 pt-2">
                      {(!allReviews[selectedProduct.id] || allReviews[selectedProduct.id].length === 0) ? (
                        <p className="text-slate-500 text-xs text-center py-4">{storeText.noReviews}</p>
                      ) : (
                        allReviews[selectedProduct.id].map(rev => (
                          <div key={rev.id} className="bg-[#141418] p-4 rounded-2xl border border-amber-500/15 space-y-2.5 shadow-inner">
                            <div className="flex justify-between items-center">
                              <b className="text-white text-xs">{rev.author}</b>
                              <span className="text-[10px] text-slate-500">{rev.date}</span>
                            </div>
                            <div className="flex items-center gap-1 text-amber-400 text-xs">
                              {Array.from({ length: rev.rating }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400" />
                              ))}
                            </div>
                            <p className="text-slate-300 text-xs leading-relaxed">{rev.comment}</p>
                            {rev.image && (
                              <div className="mt-2">
                                <img src={rev.image} alt="UGC" className="w-24 h-24 object-cover rounded-xl border border-amber-500/30 shadow-md" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="gs-product-modal-cta absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-30">
              <button 
                onClick={() => { 
                  const isCf = isClothingOrFootwear(selectedProduct);
                  let customName = `${selectedProduct.name} (${isCf ? `ზომა: ${selectedSize}` : ''}${selectedColor ? `, ფერი: ${selectedColor}` : ''}${selectedCustomVariant ? ` [ვარიანტი: ${selectedCustomVariant.name}]` : ''})`;
                  if (isGiftWrapped) customName += ' + სასაჩუქრე შეფუთვა';
                  if (giftMessage.trim()) customName += ` [ბარათი: "${giftMessage}"]`;
                  if (hasVipWarranty) customName += ' + VIP გარანტია';

                  addToCart({ 
                    ...selectedProduct, 
                    priceGEL: currentBasePrice + (isGiftWrapped ? 5 : 0) + (hasVipWarranty ? 15 : 0),
                    name: customName,
                    selectedSize: isCf ? selectedSize : null,
                    selectedColor: selectedColor
                  }); 
                  setSelectedProduct(null); 
                }} 
                className="gs-modal-add-to-cart w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-4 rounded-2xl text-sm transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className="gs-modal-add-label">{storeText.addToCart}{isClothingOrFootwear(selectedProduct) ? ` · ${selectedSize}` : ''}</span>
                <span className="gs-modal-add-price">{formatPrice(currentBasePrice + (isGiftWrapped ? 5 : 0) + (hasVipWarranty ? 15 : 0))}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🌟 ჭკვიანი ზომის შერჩევის მოდალი */}
      {isSmartSizeModalOpen && (
        <div className="gs-size-modal fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-in fade-in">
          <form onSubmit={handleCalculateSmartSize} className="gs-size-modal-panel p-6 sm:p-7 max-w-md w-full space-y-5 text-xs relative">
            <button type="button" onClick={() => setIsSmartSizeModalOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-base cursor-pointer p-1">✕</button>
            
            <div className="flex items-center gap-3.5 border-b border-amber-500/20 pb-4">
              <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
                <Calculator className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">{storeText.smartSize}</h3>
                <p className="text-[11px] text-slate-400">{storeText.enterMeasurements}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">{storeText.height}</label>
                <input 
                  type="number" 
                  placeholder={storeText.heightExample} 
                  required
                  value={userHeight}
                  onChange={e => setUserHeight(e.target.value)}
                  className="w-full bg-[#060608] border border-amber-500/30 rounded-xl p-3 text-white outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-slate-300 font-bold block mb-1">{storeText.weight}</label>
                <input 
                  type="number" 
                  placeholder={storeText.weightExample} 
                  required
                  value={userWeight}
                  onChange={e => setUserWeight(e.target.value)}
                  className="w-full bg-[#060608] border border-amber-500/30 rounded-xl p-3 text-white outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {storeText.calculateSize}
            </button>
          </form>
        </div>
      )}

      {/* 📏 ზომების გიდის მოდალი */}
      {isSizeGuideOpen && (
        <div className="gs-size-modal fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="gs-size-modal-panel p-6 sm:p-7 max-w-md w-full space-y-5 text-xs relative">
            <button onClick={() => setIsSizeGuideOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-base cursor-pointer p-1">✕</button>
            
            <div className="flex items-center gap-3.5 border-b border-amber-500/20 pb-4">
              <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
                <Ruler className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">{storeText.sizeChart}</h3>
                <p className="text-[11px] text-slate-400">{storeText.clothingSizes}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-amber-400 font-bold block mb-2">👕 {storeText.clothingSizes}:</span>
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-amber-500/20 text-amber-400">
                      <th className="py-2">{storeText.chooseSize}</th>
                      <th className="py-2">{storeText.chest}</th>
                      <th className="py-2">{storeText.waist}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr><td className="py-1.5 font-bold text-amber-300">S</td><td>88-92</td><td>70-74</td></tr>
                    <tr><td className="py-1.5 font-bold text-amber-300">M</td><td>93-96</td><td>75-79</td></tr>
                    <tr><td className="py-1.5 font-bold text-amber-300">L</td><td>97-102</td><td>80-85</td></tr>
                    <tr><td className="py-1.5 font-bold text-amber-300">XL</td><td>103-108</td><td>86-91</td></tr>
                    <tr><td className="py-1.5 font-bold text-amber-300">XXL</td><td>109-115</td><td>92-98</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <button 
              onClick={() => setIsSizeGuideOpen(false)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {storeText.understand}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
