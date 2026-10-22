import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Search, Menu, X, Plus, Minus, Trash2, 
  ShieldCheck, Truck, RefreshCw, Phone, Lock, CheckCircle, 
  Edit3, ArrowRight, Star, SlidersHorizontal, Package, CreditCard, ExternalLink
} from 'lucide-react';

// საწყისი პროდუქტების სია (სრულად ქართულად)
const INITIAL_PRODUCTS = [
  {
    id: 1,
    name: "Apple iPhone 15 Pro Max 256GB",
    category: "ელექტრონიკა",
    price: 4599,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80",
    description: "ტიტანის კორპუსი, A17 Pro ჩიპი, ყველაზე ძლიერი კამერა აიფონის ისტორიაში. გარანტია 1 წელი.",
    stock: 12
  },
  {
    id: 2,
    name: "პრემიუმ ტყავის კეტები",
    category: "ტანსაცმელი და ფეხსაცმელი",
    price: 280,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80",
    description: "100% ნატურალური ტყავი, კომფორტული ძირი და თანამედროვე დიზაინი ყოველდღიურობისთვის.",
    stock: 25
  },
  {
    id: 3,
    name: "უსადენო ყურსასმენი ANC Pro",
    category: "ელექტრონიკა",
    price: 350,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    description: "აქტიური ხმაურის ჩახშობა (ANC), 30 საათიანი მუშაობა ერთჯერადი დატენვით.",
    stock: 8
  },
  {
    id: 4,
    name: "მინიმალისტური ყავის აპარატი",
    category: "სახლის ნივთები",
    price: 620,
    image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600&auto=format&fit=crop&q=80",
    description: "მოამზადეთ იდეალური ესპრესო და კაპუჩინო სახლის პირობებში მარტივად.",
    stock: 5
  },
  {
    id: 5,
    name: "ორგანული სახის მოვლის ნაკრები",
    category: "სილამაზე და მოვლა",
    price: 145,
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
    description: "ბუნებრივი ინგრედიენტები ყველა ტიპის კანისთვის. ღრმა დატენიანება და კვება.",
    stock: 19
  },
  {
    id: 6,
    name: "სპორტული ზურგჩანთა Urban",
    category: "აქსესუარები",
    price: 110,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    description: "წყალგაუმტარი მასალა, ლეპტოპის ცალკე განყოფილება და ergonomic დიზაინი.",
    stock: 30
  }
];

const CATEGORIES = [
  "ყველა",
  "ელექტრონიკა",
  "ტანსაცმელი და ფეხსაცმელი",
  "სახლის ნივთები",
  "სილამაზე და მოვლა",
  "აქსესუარები",
  "სპორტი",
  "სხვა პროდუქტები"
];

export default function App() {
  const

  
