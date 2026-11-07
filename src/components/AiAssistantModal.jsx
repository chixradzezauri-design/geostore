// src/components/AiAssistantModal.jsx - Advanced AI Product Intelligence & Smart Category Concierge Edition
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, Send, X, ShoppingBag, Lightbulb, RotateCcw, Tag, RefreshCw, CheckCircle2, AlertCircle, Shirt, FolderTree } from 'lucide-react';

import { supabase } from '../supabaseClient';

// 🔤 ქართული და ინგლისური სინონიმებისა და სტილისტური ტერმინების გაფართოებული ლექსიკონი
const SYNONYMS = {
  laptop: ['ლეპტოპი', 'ნოუთბუქი', 'laptop', 'macbook', 'მაქბუქი', 'კომპიუტერი'],
  phone: ['ტელეფონი', 'სმარტფონი', 'iphone', 'აიფონი', 'phone', 'მობილური'],
  shoes: ['ფეხსაცმელი', 'ბოტასი', 'sneakers', 'shoe', 'ბათინკი', 'კედი'],
  clothes: ['ტანსაცმელი', 'ქურთუკი', 'შარვალი', 'პერანგი', 'მაისური', 'კაბა', 'shirt', 'jacket', 'pant', 'cloth'],
  cheap: ['იაფი', 'ბიუჯეტური', 'ფასდაკლებული', 'ხელმისაწვდომი'],
  expensive: ['ძვირი', 'ფლაგმანი', 'პრემიუმი', 'premium'],
  discount: ['ფასდაკლება', 'sale', 'აქცია', 'კუპონი', 'პრომო', 'ფასდაკლებული']
};

export default function AiAssistantModal({
  isAiAssistantOpen,
  setIsAiAssistantOpen,
  products = [],
  categories = [],
  vendorsList = [],
  lookupOrderForTracking,
  coupons = [],
  siteSettings = {},
  selectedProduct = null,
  deliveryFees = { tbilisi: 0, bigCities: 10, other: 15 },
  addToCart,
  formatPrice,
  currentLang = 'ka'
}) {
  const uiText = ({
    ka: {
      title: 'AI სტილისტი', context: 'კატალოგის ჭკვიანი ასისტენტი', ready: 'მზადაა',
      clear: 'საუბრის გასუფთავება', close: 'AI ასისტენტის დახურვა',
      welcome: 'მომწერე რას ეძებ — დაგეხმარები პროდუქტისა და სტილის შერჩევაში.', greeting: 'გამარჯობა! 🌟 მე ვარ GEOSTORE-ის შოპინგ-ასისტენტი. დაგეხმარები კატალოგში პროდუქტის მოძებნაში, ვარიანტების შედარებასა და სტილის შერჩევაში.', selectedGreeting: (name, price) => `გამარჯობა! 👋 ახლა ათვალიერებ პროდუქტს „${name}“ (${price}). გინდა დეტალების, ზომების ან შესაფერისი ნივთების შერჩევაში დაგეხმარო?`,
      recommendations: 'შერჩეული პროდუქტები', inStock: 'მარაგშია', outOfStock: 'ამოწურულია',
      addToCart: 'კალათაში', typing: 'ვარჩევ საუკეთესო ვარიანტებს...',
      placeholder: 'რას ეძებ? მიუთითე პროდუქტი, ზომა ან ბიუჯეტი...',
      inputLabel: 'შეტყობინება AI ასისტენტისთვის', send: 'შეტყობინების გაგზავნა',
      disclaimer: 'პასუხები ეფუძნება კატალოგის მონაცემებსა და წინასწარ წესებს · GEOSTORE',
      quickPrompts: 'სწრაფი კითხვები', productImage: 'პროდუქტის ფოტო', selectedProductContext: 'კონტექსტი: ', prompts: [{ label: '👋 გამარჯობა', query: 'გამარჯობა' }, { label: '🧥 ტანსაცმელი', query: 'ტანსაცმელი' }, { label: '👟 ფეხსაცმელები', query: 'ფეხსაცმელები' }, { label: '📱 სმარტფონები', query: 'სმარტფონები' }, { label: '💻 ლეპტოპები', query: 'ლეპტოპები' }, { label: '🔥 ფასდაკლებები', query: 'ფასდაკლებები' }, { label: '🚚 მიწოდება', query: 'მიწოდება' }]
    },
    en: {
      title: 'AI Stylist', context: 'Smart catalog assistant', ready: 'Ready',
      clear: 'Clear chat', close: 'Close AI assistant',
      welcome: 'Tell me what you are looking for — I can help you choose a product or style.',
      greeting: 'Hello! I’m your GEOSTORE shopping assistant. I can help you explore products, compare options and find a style.',
      selectedGreeting: (name, price) => `Hello! I see you’re viewing “${name}” (${price}). Would you like help checking its details, available sizes or matching items?`,
      recommendations: 'Recommended products', inStock: 'In stock', outOfStock: 'Out of stock',
      addToCart: 'Add to cart', typing: 'Finding the best options...',
      placeholder: 'What are you looking for? Add a product, size or budget...',
      inputLabel: 'Message for AI assistant', send: 'Send message',
      disclaimer: 'Replies use catalog data and predefined rules · GEOSTORE',
      quickPrompts: 'Quick prompts', productImage: 'Product image', selectedProductContext: 'Selected product: ', prompts: [{ label: '👋 Hello', query: 'Hello' }, { label: '🧥 Clothing', query: 'Clothing' }, { label: '👟 Shoes', query: 'Shoes' }, { label: '📱 Smartphones', query: 'Smartphones' }, { label: '💻 Laptops', query: 'Laptops' }, { label: '🔥 Discounts', query: 'Discounts' }, { label: '🚚 Delivery', query: 'Delivery' }]
    },
    ru: {
      title: 'AI-стилист', context: 'Умный помощник каталога', ready: 'Готов',
      clear: 'Очистить чат', close: 'Закрыть AI-помощника',
      welcome: 'Напишите, что вы ищете — я помогу выбрать товар или стиль.',
      greeting: 'Здравствуйте! Я ваш помощник по покупкам GEOSTORE. Помогу найти товары, сравнить варианты и подобрать стиль.',
      selectedGreeting: (name, price) => `Здравствуйте! Вы просматриваете «${name}» (${price}). Помочь проверить характеристики, размеры или подобрать сочетающиеся товары?`,
      recommendations: 'Рекомендуемые товары', inStock: 'В наличии', outOfStock: 'Нет в наличии',
      addToCart: 'В корзину', typing: 'Подбираю лучшие варианты...',
      placeholder: 'Что вы ищете? Укажите товар, размер или бюджет...',
      inputLabel: 'Сообщение для AI-помощника', send: 'Отправить сообщение',
      disclaimer: 'Ответы основаны на данных каталога и заданных правилах · GEOSTORE',
      quickPrompts: 'Быстрые вопросы', productImage: 'Фото товара', selectedProductContext: 'Товар: ', prompts: [{ label: '👋 Привет', query: 'Привет' }, { label: '🧥 Одежда', query: 'Одежда' }, { label: '👟 Обувь', query: 'Обувь' }, { label: '📱 Смартфоны', query: 'Смартфоны' }, { label: '💻 Ноутбуки', query: 'Ноутбуки' }, { label: '🔥 Скидки', query: 'Скидки' }, { label: '🚚 Доставка', query: 'Доставка' }]
    }
  })[currentLang] || ({
    title: 'AI სტილისტი', context: 'კატალოგის ჭკვიანი ასისტენტი', ready: 'მზადაა',
    clear: 'საუბრის გასუფთავება', close: 'AI ასისტენტის დახურვა',
    welcome: 'მომწერე რას ეძებ — დაგეხმარები პროდუქტისა და სტილის შერჩევაში.', greeting: 'გამარჯობა! 🌟 მე ვარ GEOSTORE-ის შოპინგ-ასისტენტი. დაგეხმარები კატალოგში პროდუქტის მოძებნაში, ვარიანტების შედარებასა და სტილის შერჩევაში.', selectedGreeting: (name, price) => `გამარჯობა! 👋 ახლა ათვალიერებ პროდუქტს „${name}“ (${price}). გინდა დეტალების, ზომების ან შესაფერისი ნივთების შერჩევაში დაგეხმარო?`,
    recommendations: 'შერჩეული პროდუქტები', inStock: 'მარაგშია', outOfStock: 'ამოწურულია',
    addToCart: 'კალათაში', typing: 'ვარჩევ საუკეთესო ვარიანტებს...',
    placeholder: 'რას ეძებ? მიუთითე პროდუქტი, ზომა ან ბიუჯეტი...',
    inputLabel: 'შეტყობინება AI ასისტენტისთვის', send: 'შეტყობინების გაგზავნა',
    disclaimer: 'AI რეკომენდაციები საინფორმაციო ხასიათისაა · GEOSTORE',
    quickPrompts: 'სწრაფი კითხვები', productImage: 'პროდუქტის ფოტო'
  });

  const getInitialGreeting = () => {
    let wardrobeCount = 0;
    try {
      const savedWardrobe = localStorage.getItem('geostore_digital_wardrobe');
      if (savedWardrobe) {
        wardrobeCount = JSON.parse(savedWardrobe).length;
      }
    } catch {}

    if (selectedProduct) {
      return {
        id: 'm1',
        sender: 'ai',
        text: uiText.selectedGreeting ? uiText.selectedGreeting(selectedProduct.name, formatPrice(selectedProduct.priceGEL)) : `გამარჯობა! 👋 ვხედავ, რომ ათვალიერებთ პროდუქტს: "${selectedProduct.name}" (${formatPrice(selectedProduct.priceGEL)}).\n\nრით შემიძლია დაგეხმაროთ მის შესახებ?`,
        recommendedProducts: [selectedProduct]
      };
    }
    return {
      id: 'm1',
      sender: 'ai',
      text: uiText.greeting || `გამარჯობა! 🌟 მე ვარ ${siteSettings?.storeName || 'GEOSTORE'}-ის შოპინგ-ასისტენტი. თქვენს ციფრულ გარდერობში შენახულია ${wardrobeCount} ნივთი. როგორ დაგეხმაროთ პროდუქტის მოძებნაში ან სტილის შერჩევაში?`
    };
  };

  const [messages, setMessages] = useState([getInitialGreeting()]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingOrderCode, setPendingOrderCode] = useState('');
  const [liveProducts, setLiveProducts] = useState(products);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isAiAssistantOpen) {
      setMessages([getInitialGreeting()]);
      setPendingOrderCode('');
      fetchLiveProducts();
    } else {
      setPendingOrderCode('');
    }
  }, [isAiAssistantOpen, selectedProduct]);

  // Keep the assistant keyboard-dismissable without changing its chat or shopping flow.
  useEffect(() => {
    if (!isAiAssistantOpen) return undefined;
    const handleDialogKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsAiAssistantOpen(false);
      }
    };
    document.addEventListener('keydown', handleDialogKeyDown);
    return () => document.removeEventListener('keydown', handleDialogKeyDown);
  }, [isAiAssistantOpen, setIsAiAssistantOpen]);

  // 🔄 სრული კატალოგის დინამიური წამოღება Supabase ბაზიდან
  const fetchLiveProducts = async () => {
    try {
      // Request only public catalog columns; purchase_cost must remain private.
      const { data, error } = await supabase
        .from('products')
        .select('id,sku,name,category,vendor,price_gel,old_price_gel,stock,image,tags,available_sizes,available_colors,variants,description,material,durability')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
          const formatted = data.map(p => {
            let parsedTags = [];
            if (p.tags) {
              if (Array.isArray(p.tags)) parsedTags = p.tags;
              else parsedTags = String(p.tags).split(',').map(t => t.trim());
            }

            let parsedSizes = [];
            if (p.available_sizes) {
              if (Array.isArray(p.available_sizes)) parsedSizes = p.available_sizes;
              else parsedSizes = String(p.available_sizes).split(',').map(s => s.trim());
            }

            let parsedColors = [];
            if (p.available_colors) {
              if (Array.isArray(p.available_colors)) parsedColors = p.available_colors;
              else parsedColors = String(p.available_colors).split(',').map(c => c.trim());
            }

            let parsedVariants = [];
            if (Array.isArray(p.variants)) parsedVariants = p.variants;
            else if (typeof p.variants === 'string') {
              try {
                const decoded = JSON.parse(p.variants);
                if (Array.isArray(decoded)) parsedVariants = decoded;
              } catch {}
            }
            return {
              id: p.id,
              sku: p.sku || 'N/A',
              name: p.name || '',
              category: p.category || 'ზოგადი',
              priceGEL: Number(p.price_gel) || 0,
              oldPriceGEL: p.old_price_gel ? Number(p.old_price_gel) : null,
              stock: Number.isFinite(Number(p.stock)) ? Math.max(0, Number(p.stock)) : 0,
              vendor: p.vendor || 'GEOSTORE ოფიციალური',
              image: p.image || null,
              tags: parsedTags,
              availableSizes: parsedSizes,
              availableColors: parsedColors,
              variants: parsedVariants,
              description: p.description || '',
              material: p.material || '',
              durability: p.durability || ''
            };
          });
          setLiveProducts(formatted);
          return formatted;
      }
    } catch {}
    return liveProducts.length > 0 ? liveProducts : products;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiAssistantOpen) {
      scrollToBottom();
    }
  }, [messages, isAiAssistantOpen]);

  const handleResetChat = () => {
    setMessages([getInitialGreeting()]);
    setPendingOrderCode('');
  };

  if (!isAiAssistantOpen) return null;

  // 🧠 ულტრა-ინტელექტუალური AI ძრავი კატეგორიების იერარქიის სრული მხარდაჭერით
  const generateAiReply = (userQuery, currentProductsList) => {
    const rawQuery = userQuery.trim();
    const localizedPromptAliases = {
      hello: 'გამარჯობა', привет: 'გამარჯობა',
      clothing: 'ტანსაცმელი', одежда: 'ტანსაცმელი',
      shoes: 'ფეხსაცმელები', обувь: 'ფეხსაცმელები',
      smartphones: 'სმარტფონები', смартфоны: 'სმარტფონები',
      laptops: 'ლეპტოპები', ноутбуки: 'ლეპტოპები',
      discounts: 'ფასდაკლებები', скидки: 'ფასდაკლებები',
      delivery: 'მიწოდება', доставка: 'მიწოდება'
    };
    const query = (localizedPromptAliases[rawQuery.toLowerCase()] || rawQuery).toLowerCase();
    const words = query.split(/\s+/).filter(w => w.length > 0);
    const sourceProducts = currentProductsList && currentProductsList.length > 0 ? currentProductsList : (liveProducts.length > 0 ? liveProducts : products);
    const availableVariants = (product) => (Array.isArray(product?.variants) ? product.variants : [])
      .filter(variant => variant && variant.priceGEL !== null && variant.priceGEL !== undefined &&
        variant.priceGEL !== '' && Number.isFinite(Number(variant.priceGEL)) &&
        Number(variant.priceGEL) > 0 && Number(variant.stock) > 0);
    const hasAvailableStock = (product) => {
      const hasCustomVariants = Array.isArray(product?.variants) && product.variants.length > 0;
      return hasCustomVariants ? availableVariants(product).length > 0 : Number(product?.stock) > 0;
    };
    const matchesBudget = (product, budget) => {
      const hasCustomVariants = Array.isArray(product?.variants) && product.variants.length > 0;
      if (hasCustomVariants) return availableVariants(product).some(variant => Number(variant.priceGEL) <= budget);
      return Number(product?.stock) > 0 && Number(product?.priceGEL) > 0 && Number(product.priceGEL) <= budget;
    };

    // 1. სალამი და ზოგადი საუბარი
    if (query.includes('გამარჯობა') || query.includes('სალამი') || query.includes('მოგესალმებით') || query.includes('hello')) {
      return {
        text: selectedProduct 
          ? `დიახ! კვლავ ვსაუბრობთ პროდუქტზე "${selectedProduct.name}". რით შეგვიძლია გავაგრძელოთ?`
          : `გამარჯობა! 🌟 სიამოვნებით დაგეხმარებით შოპინგში. მკითხეთ სასურველი კატეგორიის, პროდუქტის, ფასის, ფერის ან ციფრული გარდერობიდან ლუქების შექმნის შესახებ!`,
        products: selectedProduct ? [selectedProduct] : []
      };
    }

    // 2. ციფრული გარდერობი და სტილისტი
    if (query.includes('გარდერობ') || query.includes('ლუქი') || query.includes('რა მოვუხდინო') || query.includes('ჩემი ტანსაცმელ')) {
      let userWardrobe = [];
      try {
        const saved = localStorage.getItem('geostore_digital_wardrobe');
        if (saved) userWardrobe = JSON.parse(saved);
      } catch {}

      if (userWardrobe.length === 0) {
        return {
          text: `🧥 თქვენი ციფრული გარდერობი ჯერ ცარიელია. დაამატეთ თქვენი ტანსაცმელი და ფეხსაცმელი, შემდეგ კი მიუთითეთ კატეგორია, ფერი ან ბიუჯეტი — კატალოგში შესაბამის პროდუქტებს მოვძებნი.`,
          products: []
        };
      }

      return {
        text: `✨ თქვენს ციფრულ გარდერობში შენახულია ${userWardrobe.length} ნივთი. ზუსტი შეთავსების დასადგენად მიუთითეთ სასურველი კატეგორია, ფერი ან ბიუჯეტი — ამის მიხედვით მოვძებნი შესაბამის პროდუქტებს კატალოგში.`,
        products: []
      };
    }

    // 3. შეკვეთის ტრეკინგი ხორციელდება დაცული RPC-ით და მოითხოვს შეკვეთის კოდსა და ტელეფონს.
    if (query.includes('შეკვეთ') || query.includes('სტატუს') || /order|tracking|заказ|статус/.test(query)) {
      return {
        text: 'შეკვეთის შესამოწმებლად გამოგზავნეთ შეკვეთის კოდი (მაგ. ORD-...) და შეკვეთისას მითითებული ტელეფონის ნომერი ერთ შეტყობინებაში.',
        products: [],
        requiresOrderLookup: true
      };
    }
    // 4. ფასდაკლებები და აქციები
    const isDiscountQuery = SYNONYMS.discount.some(w => query.includes(w));
    if (isDiscountQuery) {
      const sales = sourceProducts.filter(p => (!Array.isArray(p.variants) || p.variants.length === 0) && hasAvailableStock(p) && p.oldPriceGEL && p.oldPriceGEL > p.priceGEL);
      return {
        text: `🔥 მიმდინარე სპეციალური ფასდაკლებები და აქციები (${sales.length} ნივთი):`,
        products: sales.slice(0, 4)
      };
    }

    // 5. პირობები (მიწოდება, გარანტია)
    if (query.includes('მიწოდება') || query.includes('კურიერი') || query.includes('ტარიფ')) {
      return {
        text: `🚀 მიწოდება მთელი საქართველოს მასშტაბით:\n• თბილისი / რუსთავი: ${deliveryFees.tbilisi === 0 ? 'უფასო' : `${deliveryFees.tbilisi} ₾`}\n• დიდი ქალაქები: ${deliveryFees.bigCities} ₾\n• სხვა რეგიონები: ${deliveryFees.other} ₾`,
        products: []
      };
    }

    if (query.includes('გარანტია')) {
      return {
        text: `🛡️ ყველა პროდუქტზე მოქმედებს ოფიციალური ქარხნული გარანტია და დაბრუნების პოლიტიკა.`,
        products: []
      };
    }

    // 🌟 6. კატეგორიებისა და სუბკატეგორიების ინტელექტუალური ამოცნობა (Categories & Subcategories Match)
    let matchedCategoryNames = [];
    if (Array.isArray(categories)) {
      categories.forEach(cat => {
        if (cat && cat.name) {
          const cNameLower = cat.name.toLowerCase();
          if (query.includes(cNameLower) || words.some(w => cNameLower.includes(w))) {
            matchedCategoryNames.push(cat.name);
            // თუ ეს მთავარი კატეგორიაა, მოვნახოთ მისი შვილობილი სუბკატეგორიებიც
            const subCats = categories.filter(sub => sub.parentId === cat.id);
            subCats.forEach(sub => {
              if (sub && sub.name) matchedCategoryNames.push(sub.name);
            });
          }
        }
      });
    }

    let filtered = sourceProducts.filter(hasAvailableStock);

    if (matchedCategoryNames.length > 0) {
      filtered = filtered.filter(p => {
        const pCatLower = String(p.category || '').toLowerCase();
        return matchedCategoryNames.some(catName => pCatLower.includes(catName.toLowerCase()));
      });
    }

    // ბიუჯეტი, ფერი და ზომა მოწმდება რეალურ, მარაგში არსებულ მონაცემებზე.
    const priceMatch = query.match(/(\d+)\s*(ლარამდე|ლარი|gel|₾)/);
    const maxBudget = priceMatch ? Number(priceMatch[1]) : null;
    const colorKeywords = ['შავი', 'თეთრი', 'წითელი', 'ლურჯი', 'მწვანე', 'ყვითელი', 'ნაცრისფერი', 'ვერცხლისფერი', 'ოქროსფერი', 'ტიტანი'];
    const foundColor = colorKeywords.find(c => query.includes(c));
    const sizeKeywords = ['xxl', 'xl', 's', 'm', 'l', '39', '40', '41', '42', '43', '44'];
    const foundSize = sizeKeywords.find(s => query.split(/\b/).includes(s));

    if (maxBudget !== null) filtered = filtered.filter(p => matchesBudget(p, maxBudget));

    if (foundColor) {
      filtered = filtered.filter(p => {
        const variantNames = availableVariants(p).map(variant => String(variant.name || '')).join(' ');
        const colors = [...(Array.isArray(p.availableColors) ? p.availableColors : []), variantNames].join(' ').toLowerCase();
        return colors.includes(foundColor) || String(p.name || '').toLowerCase().includes(foundColor);
      });
    }

    if (foundSize) {
      filtered = filtered.filter(p => {
        const sizes = (Array.isArray(p.availableSizes) ? p.availableSizes : []).map(s => String(s).toLowerCase());
        const variantNames = availableVariants(p).map(variant => String(variant.name || '').toLowerCase());
        return sizes.includes(foundSize) || variantNames.some(name => name.split(/[^a-z0-9]+/).includes(foundSize));
      });
    }

    const searchWords = words.filter(w => !w.match(/\d+/) && !['ლარამდე', 'ლარი', 'გთხოვ', 'მაჩვენე', 'მინდა', 'შემირჩიე'].includes(w));
    if (searchWords.length > 0 && matchedCategoryNames.length === 0 && maxBudget === null && !foundColor && !foundSize) {
      filtered = filtered.filter(p => {
        const pName = String(p.name || '').toLowerCase();
        const pCat = String(p.category || '').toLowerCase();
        const pDesc = String(p.description || '').toLowerCase();
        const pTags = (Array.isArray(p.tags) ? p.tags : []).map(t => String(t).toLowerCase());
        return searchWords.some(w => pName.includes(w) || pCat.includes(w) || pDesc.includes(w) || pTags.some(t => t.includes(w)));
      });
    }

    if (filtered.length > 0) {
      return {
        text: `✨ მოთხოვნის შესაბამისად ნაპოვნია ${filtered.length} ხელმისაწვდომი პროდუქტი:`,
        products: filtered.slice(0, 4)
      };
    }

    return {
      text: '🤔 ამ მოთხოვნასთან შესაბამისი, მარაგში არსებული პროდუქტი ვერ მოიძებნა. სცადეთ სხვა ზომა, ფერი ან უფრო მაღალი ბიუჯეტი.',
      products: []
    };
  };

  // პასუხების ლოკალიზაცია: არსებული კატალოგის ძიება და შეკვეთის ლოგიკა უცვლელი რჩება.
  const localizeAiReply = (result, userQuery) => {
    if (currentLang === 'ka' || !result) return result;
    const query = String(userQuery || '').trim().toLowerCase();
    const isEnglish = currentLang === 'en';
    const t = (en, ru) => isEnglish ? en : ru;
    const text = result.text || '';

    if (text.includes('კვლავ ვსაუბრობთ პროდუქტზე')) {
      return { ...result, text: selectedProduct
        ? t(`Yes! We are still discussing “${selectedProduct.name}”. What would you like to know next?`, `Да! Мы всё ещё обсуждаем товар «${selectedProduct.name}». Что хотите узнать дальше?`)
        : t('Hello! 🌟 I can help you shop. Ask me about a category, product, price, color, or outfit ideas.', 'Здравствуйте! 🌟 Я помогу с покупками. Спросите о категории, товаре, цене, цвете или подборе образа.') };
    }
    if (text.startsWith('გამარჯობა! 🌟 სიამოვნებით')) {
      return { ...result, text: t('Hello! 🌟 I’d be happy to help you shop. Ask about a category, product, price, color, or outfit ideas from your digital wardrobe!', 'Здравствуйте! 🌟 Буду рад помочь с покупками. Спросите о категории, товаре, цене, цвете или образах из цифрового гардероба!') };
    }
    if (text.includes('ციფრული გარდერობი ჯერ ცარიელია')) {
      return { ...result, text: t('🧥 Your digital wardrobe is empty for now. Open the “AI Digital Wardrobe” section, add your clothing, and I can help create outfits and choose matching items from the store.', '🧥 Ваш цифровой гардероб пока пуст. Перейдите в раздел «AI Digital Wardrobe», добавьте свою одежду, и я помогу составить образы и подобрать подходящие товары из магазина.') };
    }
    if (text.includes('ციფრულ გარდერობში ფიქსირდება')) {
      const count = text.match(/(\\d+) ნივთი/)?.[1] || '';
      return { ...result, text: t(`✨ Your digital wardrobe contains ${count} item(s). Stylist tip: one of the premium items below could complement your existing clothes.`, `✨ В вашем цифровом гардеробе ${count} предмет(а). Совет стилиста: один из представленных ниже премиальных товаров может дополнить вашу одежду.`) };
    }
    if (text.startsWith('📦 შეკვეთა #')) {
      const id = text.match(/შეკვეთა #([^:\\n]+)/)?.[1] || '';
      const recipient = text.match(/მიმღები: ([^\\n]+)/)?.[1] || '';
      const date = text.match(/თარიღი: ([^\\n]+)/)?.[1] || '';
      const amount = text.match(/თანხა: ([^\\n]+)/)?.[1] || '';
      const status = text.match(/სტატუსი: 🟢 ([^\\n]+)/)?.[1] || '';
      return { ...result, text: t(`📦 Order #${id}:\\n• Recipient: ${recipient}\\n• Date: ${date}\\n• Total: ${amount}\\n• Status: 🟢 ${status}`, `📦 Заказ #${id}:\\n• Получатель: ${recipient}\\n• Дата: ${date}\\n• Сумма: ${amount}\\n• Статус: 🟢 ${status}`) };
    }
    if (text.includes('ვერ მოიძებნა ბაზაში')) {
      const code = text.match(/კოდით "([^"]+)"/)?.[1] || '';
      return { ...result, text: t(`🔍 Order with code “${code}” was not found in the database.`, `🔍 Заказ с кодом «${code}» не найден в базе данных.`) };
    }
    if (text.includes('უნიკალური ნომერი')) {
      return { ...result, text: t('To check your order, please send its unique order number (for example, ORD-1025)! 📦', 'Чтобы проверить заказ, отправьте его уникальный номер (например, ORD-1025)! 📦') };
    }
    if (text.startsWith('🔥 მიმდინარე სპეციალური ფასდაკლებები')) {
      const count = text.match(/\\((\\d+) ნივთი\\)/)?.[1] || result.products?.length || 0;
      return { ...result, text: t(`🔥 Current special offers and discounts (${count} items):`, `🔥 Текущие специальные предложения и скидки (${count} товаров):`) };
    }
    if (text.startsWith('🚀 მიწოდება მთელი საქართველოს მასშტაბით')) {
      const fee = value => Number(value) === 0 ? t('Free', 'Бесплатно') : `${value} ₾`;
      return { ...result, text: t(`🚀 Delivery across Georgia:\\n• Tbilisi / Rustavi: ${fee(deliveryFees.tbilisi)}\\n• Major cities: ${fee(deliveryFees.bigCities)}\\n• Other regions: ${fee(deliveryFees.other)}`, `🚀 Доставка по всей Грузии:\\n• Тбилиси / Рустави: ${fee(deliveryFees.tbilisi)}\\n• Крупные города: ${fee(deliveryFees.bigCities)}\\n• Другие регионы: ${fee(deliveryFees.other)}`) };
    }
    if (text.includes('ოფიციალური ქარხნული გარანტია')) {
      return { ...result, text: t('🛡️ All products are covered by the applicable official manufacturer warranty and return policy.', '🛡️ На все товары распространяются соответствующая официальная гарантия производителя и политика возврата.') };
    }
    if (text.startsWith('✨ კატეგორიებისა და მოთხოვნის შესაბამისად ნაპოვნია')) {
      const count = text.match(/\\((\\d+) ვარიანტი\\)/)?.[1] || result.products?.length || 0;
      return { ...result, text: t(`✨ Found ${count} matching product option(s) based on your request:`, `✨ По вашему запросу найдено подходящих вариантов: ${count}:`) };
    }
    if (text.startsWith('🤔 ამ მოთხოვნასთან შესაბამისი')) {
      return { ...result, text: t('🤔 No matching in-stock product was found. Try another size, color or a higher budget.', '🤔 Подходящий товар в наличии не найден. Попробуйте другой размер, цвет или увеличьте бюджет.') };
    }
    if (text.startsWith('✨ მოთხოვნის შესაბამისად ნაპოვნია')) {
      const count = text.match(/(\d+)/)?.[1] || result.products?.length || 0;
      return { ...result, text: t(`✨ Found ${count} matching in-stock product(s):`, `✨ Найдено подходящих товаров в наличии: ${count}:`) };
    }
    return result;
  };

  const handleSendMessage = async (textToSend) => {
    const queryText = String(textToSend || inputMessage).trim();
    if (!queryText) return;

    const orderCodeMatch = queryText.match(/\bORD-[A-Z0-9_-]{6,60}\b/i);
    const phoneCandidates = queryText
      .replace(orderCodeMatch?.[0] || '', ' ')
      .match(/\+?\d[\d\s().-]{5,}\d/g) || [];
    const phoneCandidate = phoneCandidates[0] || '';
    const phone = phoneCandidate.replace(/\D/g, '');
    const orderCode = orderCodeMatch?.[0].replace(/\s+/g, '').toUpperCase() || '';
    const activeOrderCode = orderCode || pendingOrderCode;
    const orderIntent = Boolean(orderCode || pendingOrderCode) ||
      /შეკვეთ|სტატუს|order|tracking|заказ|статус/i.test(queryText);
    const safeUserText = orderIntent && phoneCandidate
      ? queryText.replace(phoneCandidate, '•••••••••')
      : queryText;

    setMessages(prev => [...prev, {
      id: \`u-\${Date.now()}\`,
      sender: 'user',
      text: safeUserText
    }]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    if (orderIntent) {
      const language = currentLang === 'en' ? 'en' : currentLang === 'ru' ? 'ru' : 'ka';
      const copy = {
        ka: {
          askCode: 'შეკვეთის შესამოწმებლად გამოგზავნეთ შეკვეთის კოდი (მაგ. ORD-...).',
          askPhone: 'კოდი მივიღე. ახლა გამოგზავნეთ შეკვეთისას მითითებული ტელეფონის ნომერი (9–15 ციფრი). ნომერი ჩატის ისტორიაში დაფარული იქნება.',
          invalidPhone: 'ტელეფონის ნომერი უნდა შეიცავდეს 9–15 ციფრს. სცადეთ ხელახლა.',
          unavailable: 'შეკვეთის უსაფრთხო ძიება ამჟამად მიუწვდომელია. გთხოვთ, სცადოთ მოგვიანებით.',
          rateLimited: 'უსაფრთხოების მიზნით შეკვეთის ძიების დროებითი ლიმიტი ამოიწურა. გთხოვთ, მოგვიანებით სცადოთ.',
          notFound: 'მითითებული კოდითა და ტელეფონის ნომრით შეკვეთა ვერ მოიძებნა. გადაამოწმეთ ორივე მონაცემი.',
          failed: 'შეკვეთის შემოწმება ამჟამად ვერ მოხერხდა. მოგვიანებით სცადეთ.',
          heading: id => \`📦 შეკვეთა #\${id}\`,
          date: value => \`• თარიღი: \${value}\`,
          total: value => \`• თანხა: \${value}\`,
          status: value => \`• სტატუსი: \${value}\`,
          items: value => \`• ნივთები: \${value}\`
        },
        en: {
          askCode: 'To check your order, send your order code (for example, ORD-...).',
          askPhone: 'Got the code. Now send the phone number used for the order (9–15 digits). The number will be hidden in chat history.',
          invalidPhone: 'The phone number must contain 9–15 digits. Please try again.',
          unavailable: 'Secure order lookup is currently unavailable. Please try again later.',
          rateLimited: 'The order lookup limit has been reached for security. Please try again later.',
          notFound: 'No order matched that code and phone number. Please check both details.',
          failed: 'The order could not be checked right now. Please try again later.',
          heading: id => \`📦 Order #\${id}\`,
          date: value => \`• Date: \${value}\`,
          total: value => \`• Total: \${value}\`,
          status: value => \`• Status: \${value}\`,
          items: value => \`• Items: \${value}\`
        },
        ru: {
          askCode: 'Чтобы проверить заказ, отправьте код заказа (например, ORD-...).',
          askPhone: 'Код получен. Теперь отправьте номер телефона, указанный при заказе (9–15 цифр). Номер будет скрыт в истории чата.',
          invalidPhone: 'Номер телефона должен содержать 9–15 цифр. Попробуйте ещё раз.',
          unavailable: 'Безопасный поиск заказа сейчас недоступен. Попробуйте позже.',
          rateLimited: 'Достигнут лимит поиска заказа в целях безопасности. Попробуйте позже.',
          notFound: 'Заказ с таким кодом и номером телефона не найден. Проверьте оба значения.',
          failed: 'Сейчас не удалось проверить заказ. Попробуйте позже.',
          heading: id => \`📦 Заказ #\${id}\`,
          date: value => \`• Дата: \${value}\`,
          total: value => \`• Сумма: \${value}\`,
          status: value => \`• Статус: \${value}\`,
          items: value => \`• Товары: \${value}\`
        }
      }[language];

      let replyText = '';
      if (!activeOrderCode) {
        replyText = copy.askCode;
      } else if (!phoneCandidate) {
        setPendingOrderCode(activeOrderCode);
        replyText = copy.askPhone;
      } else if (phone.length < 9 || phone.length > 15) {
        setPendingOrderCode(activeOrderCode);
        replyText = copy.invalidPhone;
      } else if (typeof lookupOrderForTracking !== 'function') {
        setPendingOrderCode('');
        replyText = copy.unavailable;
      } else {
        setPendingOrderCode('');
        try {
          const order = await lookupOrderForTracking(activeOrderCode, phone);
          if (order?.rateLimited === true) {
            replyText = copy.rateLimited;
          } else if (!order || typeof order !== 'object' || !order.id) {
            replyText = copy.notFound;
          } else {
            replyText = [
              copy.heading(order.id),
              copy.date(order.date || '—'),
              copy.total(formatPrice(Number(order.totalGEL) || 0)),
              copy.status(order.status || 'ახალი'),
              copy.items(order.itemSummary || '—')
            ].join('\n');
          }
        } catch (error) {
          replyText = error?.message === 'ORDER_TRACKING_RATE_LIMITED'
            ? copy.rateLimited
            : copy.failed;
        }
      }

      setMessages(prev => [...prev, {
        id: \`ai-\${Date.now()}\`,
        sender: 'ai',
        text: replyText,
        recommendedProducts: []
      }]);
      setIsTyping(false);
      return;
    }

    try {
      const refreshedProducts = await fetchLiveProducts();
      const aiResult = localizeAiReply(generateAiReply(queryText, refreshedProducts), queryText);
      setMessages(prev => [...prev, {
        id: \`ai-\${Date.now()}\`,
        sender: 'ai',
        text: aiResult.text,
        recommendedProducts: aiResult.products
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: \`ai-\${Date.now()}\`,
        sender: 'ai',
        text: currentLang === 'en'
          ? 'I could not process that request. Please try again.'
          : currentLang === 'ru'
            ? 'Не удалось обработать запрос. Попробуйте ещё раз.'
            : 'მოთხოვნის დამუშავება ვერ მოხერხდა. გთხოვთ, სცადოთ ხელახლა.',
        recommendedProducts: []
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="gs-ai-overlay">
      <section
        className="gs-ai-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gs-ai-title"
        aria-describedby="gs-ai-description"
      >
        <header className="gs-ai-header">
          <div className="gs-ai-brand">
            <span className="gs-ai-brand-icon">
              <Bot aria-hidden="true" />
              <span className="gs-ai-brand-sparkle"><Sparkles aria-hidden="true" /></span>
            </span>
            <span className="gs-ai-brand-copy">
              <span className="gs-ai-overline">GEOSTORE PERSONAL SHOPPING</span>
              <strong id="gs-ai-title">{siteSettings?.storeName || 'GEOSTORE'} {uiText.title}</strong>
              <span id="gs-ai-description" className="gs-ai-context">
                <FolderTree aria-hidden="true" />
                {selectedProduct ? uiText.selectedProductContext + selectedProduct.name : uiText.context}
              </span>
            </span>
          </div>
          <div className="gs-ai-header-actions">
            <span className="gs-ai-status"><i aria-hidden="true" /> {uiText.ready}</span>
            <button
              type="button"
              onClick={handleResetChat}
              title={uiText.clear}
              aria-label={uiText.clear}
              className="gs-ai-icon-button"
            >
              <RotateCcw aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIsAiAssistantOpen(false)}
              title={uiText.close}
              aria-label={uiText.close}
              className="gs-ai-icon-button gs-ai-close"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="gs-ai-conversation">
          <div className="gs-ai-welcome-note">
            <Sparkles aria-hidden="true" />
            <span>{uiText.welcome}</span>
          </div>

          <div className="gs-ai-messages" role="log" aria-live="polite" aria-relevant="additions text">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={'gs-ai-message-row ' + (msg.sender === 'user' ? 'is-user' : 'is-ai')}
              >
                {msg.sender !== 'user' && (
                  <span className="gs-ai-message-avatar" aria-hidden="true"><Bot /></span>
                )}
                <article className={'gs-ai-bubble ' + (msg.sender === 'user' ? 'gs-ai-bubble--user' : 'gs-ai-bubble--assistant')}>
                  <p className="gs-ai-message-text">{msg.text}</p>

                  {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                    <div className="gs-ai-recommendations">
                      <div className="gs-ai-recommendations-title">
                        <ShoppingBag aria-hidden="true" />
                        <span>{uiText.recommendations}</span>
                      </div>
                      {msg.recommendedProducts.map((prod) => (
                        <article key={prod.id} className="gs-ai-product-card">
                          <img
                            src={prod.image}
                            alt={prod.name || uiText.productImage}
                            className="gs-ai-product-image"
                          />
                          <div className="gs-ai-product-info">
                            <h4>{prod.name}</h4>
                            <div className="gs-ai-product-price-row">
                              <strong>{formatPrice(prod.priceGEL)}</strong>
                              {prod.oldPriceGEL && (
                                <del>{formatPrice(prod.oldPriceGEL)}</del>
                              )}
                            </div>
                            <span className={prod.stock > 0 ? 'gs-ai-stock is-available' : 'gs-ai-stock is-unavailable'}>
                              {prod.stock > 0 ? (
                                <><CheckCircle2 aria-hidden="true" /> {uiText.inStock}</>
                              ) : (
                                <><AlertCircle aria-hidden="true" /> {uiText.outOfStock}</>
                              )}
                            </span>
                            {prod.tags && prod.tags.length > 0 && (
                              <div className="gs-ai-product-tags">
                                {prod.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index}>#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => addToCart(prod)}
                            className="gs-ai-add-button"
                          >
                            <ShoppingBag aria-hidden="true" />
                            <span>{uiText.addToCart}</span>
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </article>
              </div>
            ))}

            {isTyping && (
              <div className="gs-ai-message-row is-ai">
                <span className="gs-ai-message-avatar" aria-hidden="true"><Bot /></span>
                <div className="gs-ai-typing" role="status">
                  <span className="gs-ai-typing-dots"><i /><i /><i /></span>
                  <span>{uiText.typing}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <footer className="gs-ai-composer-area">
          <div className="gs-ai-suggestions" aria-label={uiText.quickPrompts}>
            {uiText.prompts.map((prompt, index) => (
              <button
                type="button"
                key={index}
                onClick={() => handleSendMessage(prompt.query)}
                className="gs-ai-suggestion-chip"
              >
                <Lightbulb aria-hidden="true" />
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSendMessage();
            }}
            className="gs-ai-composer"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              placeholder={uiText.placeholder}
              aria-label={uiText.inputLabel}
              className="gs-ai-input"
            />
            <button type="submit" className="gs-ai-send-button" aria-label={uiText.send}>
              <Send aria-hidden="true" />
            </button>
          </form>
          <p className="gs-ai-disclaimer">{uiText.disclaimer}</p>
        </footer>
      </section>
    </div>
  );
}
