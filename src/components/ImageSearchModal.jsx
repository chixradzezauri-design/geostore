import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Sparkles, ShoppingBag, AlertCircle, RefreshCw } from 'lucide-react';

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  if (/^https?:/i.test(src)) image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('ფოტოს ჩატვირთვა ვერ მოხერხდა.'));
  image.src = src;
});

const createColorHistogram = async (src) => {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('ბრაუზერის ვიზუალური ძიება მიუწვდომელია.');
  context.drawImage(image, 0, 0, 32, 32);
  const pixels = context.getImageData(0, 0, 32, 32).data;
  const histogram = new Array(24).fill(0);
  const totals = [0, 0, 0];

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 48) continue;
    const channels = [pixels[i], pixels[i + 1], pixels[i + 2]];
    channels.forEach((value, channel) => {
      const bin = Math.min(7, Math.floor(value / 32));
      histogram[channel * 8 + bin] += 1;
      totals[channel] += 1;
    });
  }

  for (let channel = 0; channel < 3; channel += 1) {
    const total = totals[channel] || 1;
    for (let bin = 0; bin < 8; bin += 1) {
      histogram[channel * 8 + bin] /= total;
    }
  }
  return histogram;
};

const compareHistograms = (first, second) => {
  // Bhattacharyya coefficient: 1 means similar colour distribution, 0 means dissimilar.
  let score = 0;
  for (let i = 0; i < first.length; i += 1) {
    score += Math.sqrt(first[i] * second[i]);
  }
  return score / 3;
};

export default function ImageSearchModal({
  isImageSearchOpen,
  setIsImageSearchOpen,
  products = [],
  addToCart,
  formatPrice
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const fileInputRef = useRef(null);

  if (!isImageSearchOpen) return null;

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSearchError('აირჩიეთ JPEG, PNG ან WebP ფორმატის ფოტო.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSearchError('ფოტოს ზომა არ უნდა აღემატებოდეს 5MB-ს.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(typeof reader.result === 'string' ? reader.result : null);
      setSearchResults(null);
      setSearchError('');
    };
    reader.onerror = () => setSearchError('ფოტოს წაკითხვა ვერ მოხერხდა. სცადეთ სხვა ფაილი.');
    reader.readAsDataURL(file);
  };

  const handleStartVisualSearch = async () => {
    if (!selectedImage || isSearching) return;
    setIsSearching(true);
    setSearchError('');
    setSearchResults(null);

    try {
      const targetHistogram = await createColorHistogram(selectedImage);
      const candidates = (Array.isArray(products) ? products : [])
        .filter((product) => product?.image && Number(product.stock ?? 1) > 0)
        .slice(0, 80);

      const scored = await Promise.all(candidates.map(async (product) => {
        try {
          const histogram = await createColorHistogram(product.image);
          return { product, score: compareHistograms(targetHistogram, histogram) };
        } catch {
          return null;
        }
      }));

      const matches = scored
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((item) => item.product);

      setSearchResults(matches);
      if (candidates.length === 0) {
        setSearchError('კატალოგში ჯერ არ არის ფოტოიანი, მარაგში არსებული პროდუქტი.');
      } else if (matches.length === 0) {
        setSearchError('კატალოგის ფოტოები ვერ შედარდა. სცადეთ სხვა ფოტო ან ჩვეულებრივი ძიება.');
      }
    } catch (error) {
      setSearchError(error?.message || 'ფოტოს დამუშავება ვერ მოხერხდა. სცადეთ სხვა ფოტო.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSearchResults(null);
    setSearchError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="gs-image-search-overlay fixed inset-0 z-[10020] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <section className="gs-image-search-dialog w-full max-w-lg max-h-[90dvh] overflow-y-auto relative" role="dialog" aria-modal="true" aria-labelledby="gs-image-search-title">
        <header className="gs-image-search-header flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="gs-image-search-icon"><Camera className="w-5 h-5" /></span>
            <div className="min-w-0">
              <h3 id="gs-image-search-title">ფოტოთი ძიება</h3>
              <p>შეადარე ფოტოს ფერები კატალოგის პროდუქტებს</p>
            </div>
          </div>
          <button type="button" onClick={() => setIsImageSearchOpen(false)} className="gs-image-search-close" aria-label="დახურვა">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="gs-image-search-body">
          {!selectedImage ? (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="gs-image-search-upload">
              <span className="gs-image-search-upload-icon"><Upload className="w-6 h-6" /></span>
              <strong>ატვირთე პროდუქტის ფოტო</strong>
              <small>JPEG, PNG ან WebP · მაქსიმუმ 5MB</small>
            </button>
          ) : (
            <div className="gs-image-search-preview">
              <img src={selectedImage} alt="ატვირთული ფოტოს წინასწარი ნახვა" />
              <button type="button" onClick={handleReset} className="gs-image-search-change">
                <RefreshCw className="w-3.5 h-3.5" /> შეცვლა
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
            aria-label="აირჩიეთ ფოტო"
          />

          {searchError && (
            <p className="gs-image-search-error" role="status"><AlertCircle className="w-4 h-4 shrink-0" />{searchError}</p>
          )}

          {selectedImage && !searchResults && !isSearching && (
            <button type="button" onClick={handleStartVisualSearch} className="gs-image-search-submit">
              <Sparkles className="w-4 h-4" /> მსგავსი პროდუქტების მოძებნა
            </button>
          )}

          {isSearching && (
            <div className="gs-image-search-loading" role="status">
              <span className="gs-image-search-spinner" />
              <p>ფოტოების შედარება მიმდინარეობს…</p>
            </div>
          )}

          {searchResults && (
            <div className="gs-image-search-results">
              <h4><Sparkles className="w-4 h-4" /> ვიზუალურად მსგავსი პროდუქტები</h4>
              <p className="gs-image-search-note">შედარება სრულდება მოწყობილობაზე ფოტოების ფერთა განაწილებით; ეს არ არის AI ობიექტების ამოცნობა.</p>
              {searchResults.length === 0 ? (
                <div className="gs-image-search-empty"><AlertCircle className="w-5 h-5" /><p>მსგავსი პროდუქტი ვერ მოიძებნა.</p></div>
              ) : (
                <div className="gs-image-search-list">
                  {searchResults.map((product) => (
                    <article key={product.id} className="gs-image-search-result">
                      <img src={product.image} alt={product.name || ''} loading="lazy" decoding="async" />
                      <div className="gs-image-search-result-info">
                        <strong>{product.name}</strong>
                        <span>{formatPrice(product.priceGEL)}</span>
                        <small>მარაგშია: {product.stock ?? 0} ც.</small>
                      </div>
                      <button type="button" onClick={() => { addToCart(product); setIsImageSearchOpen(false); }}>
                        <ShoppingBag className="w-4 h-4" /> დამატება
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
