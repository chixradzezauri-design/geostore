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
  orders = [],
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
      disclaimer: 'AI რეკომენდაციები საინფორმაციო ხასიათისაა · GEOSTORE',
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
      disclaimer: 'AI recommendations are for informational purposes · GEOSTORE',
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
      disclaimer: 'Рекомендации AI носят информационный характер · GEOSTORE',
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
  const [liveProducts, setLiveProducts] = useState(products);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isAiAssistantOpen) {
      setMessages([getInitialGreeting()]);
      fetchLiveProducts();
    }
  }, [isAiAssistantOpen, selectedProduct]);

  // 🔄 სრული კატალოგის დინამიური წამოღება Supabase ბაზიდან
  const fetchLiveProducts = async () => {
    try {
      // Request only public catalog columns; purchase_cost must remain private.
      const { data, error } = await supabase
        .from('products')
        .select('id,sku,name,category,vendor,price_gel,old_price_gel,stock,image,tags,available_sizes,available_colors,description,material,durability')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data && data.length > 0) {
          const formatted = data.map(p => {
            let parsedTags = [];
            if (p.tags) {
              if (Array.isArray(p.tags)) parsedTags = p.tags;
              else parsedTags = String(p.tags).split(',').map(t => t.trim());
            }

            let parsedSizes = ['S', 'M', 'L', 'XL'];
            if (p.available_sizes) {
              if (Array.isArray(p.available_sizes)) parsedSizes = p.available_sizes;
              else parsedSizes = String(p.available_sizes).split(',').map(s => s.trim());
            }

            let parsedColors = ['შავი', 'თეთრი'];
            if (p.available_colors) {
              if (Array.isArray(p.available_colors)) parsedColors = p.available_colors;
              else parsedColors = String(p.available_colors).split(',').map(c => c.trim());
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
              image: p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
              tags: parsedTags,
              availableSizes: parsedSizes,
              availableColors: parsedColors,
              description: p.description || '',
              material: p.material || '',
              durability: p.durability || ''
            };
          });
          setLiveProducts(formatted);
          return formatted;
        }
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
          text: `🧥 თქვენი ციფრული გარდერობი ჯერ ცარიელია. გადადით „AI ციფრული გარდერობის“ განყოფილებაში, ატვირთეთ თქვენი ტანსაცმელი და მე შევძლებ სრულყოფილი ლუქების და მაღაზიიდან დამატებითი ნივთების შერჩევას!`,
          products: sourceProducts.slice(0, 2)
        };
      }

      const randomStoreItem = sourceProducts[Math.floor(Math.random() * sourceProducts.length)];
      return {
        text: `✨ თქვენს ციფრულ გარდერობში ფიქსირდება ${userWardrobe.length} ნივთი. AI სტილისტის რეკომენდაცია: თქვენს არსებულ ტანსაცმელს შესანიშნავად მოუხდება ჩვენი ვიტრინიდან ქვემოთ წარმოდგენილი პრემიუმ პროდუქტი!`,
        products: [randomStoreItem]
      };
    }

    // 3. შეკვეთის ტრეკინგი
    const orderMatch = query.match(/ord[-\s]?\d+/i) || query.match(/#?\d{4,}/);
    if (orderMatch || query.includes('შეკვეთა') || query.includes('სტატუსი')) {
      if (orderMatch) {
        const orderIdClean = orderMatch[0].toUpperCase().replace(/\s+/g, '');
        const foundOrder = (orders || []).find(o => o.id?.toUpperCase().includes(orderIdClean));
        
        if (foundOrder) {
          return {
            text: `📦 შეკვეთა #${foundOrder.id}:\n• მიმღები: ${foundOrder.customerName}\n• თარიღი: ${foundOrder.date}\n• თანხა: ${formatPrice(foundOrder.totalGEL)}\n• სტატუსი: 🟢 ${foundOrder.status || 'ახალი'}`,
            products: []
          };
        } else {
          return {
            text: `🔍 შეკვეთა კოდით "${orderMatch[0].toUpperCase()}" ვერ მოიძებნა ბაზაში.`,
            products: []
          };
        }
      } else {
        return {
          text: 'შეკვეთის შესამოწმებლად, გთხოვთ მომწეროთ შეკვეთის უნიკალური ნომერი (მაგ: ORD-1025)! 📦',
          products: []
        };
      }
    }

    // 4. ფასდაკლებები და აქციები
    const isDiscountQuery = SYNONYMS.discount.some(w => query.includes(w));
    if (isDiscountQuery) {
      const sales = sourceProducts.filter(p => p.oldPriceGEL && p.oldPriceGEL > p.priceGEL);
      return {
        text: `🔥 მიმდინარე სპეციალური ფასდაკლებები და აქციები (${sales.length} ნივთი):`,
        products: sales.length > 0 ? sales.slice(0, 4) : sourceProducts.slice(0, 4)
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

    let filtered = [...sourceProducts];

    if (matchedCategoryNames.length > 0) {
      filtered = filtered.filter(p => {
        const pCatLower = (p.category || '').toLowerCase();
        return matchedCategoryNames.some(catName => pCatLower.includes(catName.toLowerCase()));
      });
    }

    // 7. ბიუჯეტი, ფერი და ზომა
    const priceMatch = query.match(/(\d+)\s*(ლარამდე|ლარი|gel|₾)/);
    const maxBudget = priceMatch ? Number(priceMatch[1]) : null;

    const colorKeywords = ['შავი', 'თეთრი', 'წითელი', 'ლურჯი', 'მწვანე', 'ყვითელი', 'ნაცრისფერი', 'ვერცხლისფერი', 'ოქროსფერი', 'ტიტანი'];
    const foundColor = colorKeywords.find(c => query.includes(c));

    const sizeKeywords = ['s', 'm', 'l', 'xl', 'xxl', '39', '40', '41', '42', '43', '44'];
    const foundSize = sizeKeywords.find(s => query.split(/\b/).includes(s));

    if (maxBudget) {
      filtered = filtered.filter(p => p.priceGEL <= maxBudget);
    }

    if (foundColor) {
      filtered = filtered.filter(p => {
        const colStr = (p.availableColors || []).join(' ').toLowerCase();
        const nameStr = p.name.toLowerCase();
        return colStr.includes(foundColor) || nameStr.includes(foundColor);
      });
    }

    if (foundSize) {
      filtered = filtered.filter(p => {
        const sizes = (p.availableSizes || []).map(s => String(s).toLowerCase());
        return sizes.includes(foundSize);
      });
    }

    const searchWords = words.filter(w => !w.match(/\d+/) && !['ლარამდე', 'ლარი', 'გთხოვ', 'მაჩვენე', 'მინდა', 'შემირჩიე'].includes(w));
    
    if (searchWords.length > 0 && matchedCategoryNames.length === 0 && !maxBudget && !foundColor && !foundSize) {
      filtered = sourceProducts.filter(p => {
        const pName = p.name.toLowerCase();
        const pCat = p.category.toLowerCase();
        const pDesc = p.description.toLowerCase();
        const pTags = (p.tags || []).map(t => t.toLowerCase());

        return searchWords.some(w => pName.includes(w) || pCat.includes(w) || pDesc.includes(w) || pTags.some(t => t.includes(w)));
      });
    }

    if (filtered.length > 0) {
      return {
        text: `✨ კატეგორიებისა და მოთხოვნის შესაბამისად ნაპოვნია საუკეთესო პროდუქტები (${filtered.length} ვარიანტი):`,
        products: filtered.slice(0, 4)
      };
    }

    return {
      text: `🤔 ზუსტი დამთხვევა ვერ მოიძებნა, თუმცა გთავაზობთ ჩვენი პრემიუმ კატალოგის ტოპ პროდუქტებს:`,
      products: sourceProducts.slice(0, 3)
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
    if (text.startsWith('🤔 ზუსტი დამთხვევა ვერ მოიძებნა')) {
      return { ...result, text: t('🤔 I couldn’t find an exact match, but here are some top picks from our premium catalog:', '🤔 Точное совпадение не найдено, но вот несколько популярных товаров из нашего премиального каталога:') };
    }
    return result;
  };

  const handleSendMessage = async (textToSend) => {
    const queryText = textToSend || inputMessage;
    if (!queryText.trim()) return;

    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    const refreshedProducts = await fetchLiveProducts();

    setTimeout(() => {
      const aiResult = localizeAiReply(generateAiReply(queryText, refreshedProducts), queryText);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResult.text,
        recommendedProducts: aiResult.products
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 400);
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
