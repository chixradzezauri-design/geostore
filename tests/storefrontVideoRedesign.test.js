import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/storefrontVideoRedesign.css'),store=read('src/components/StoreView.jsx'),modals=read('src/components/Modals.jsx');
test('video 01 keeps size tools separate from size grid and existing actions',()=>{
 for(const term of ['gs-video-size-heading','gs-video-size-tools','setIsSmartSizeModalOpen(true)','setIsSizeGuideOpen(true)','setSelectedSize(size)','aria-pressed={selectedSize === size}'])assert.ok(store.includes(term),term);
 assert.ok(css.includes('flex: 1 1 120px !important'));
 assert.ok(css.includes('writing-mode: horizontal-tb !important'));
});
test('video 01 removes flash image blending and preserves click handlers and tracking lookup',()=>{
 assert.ok(store.includes('gs-video-flash-image'));
 assert.ok(store.includes('handleOpenProduct(prod, event.currentTarget)'));
 assert.ok(css.includes('mix-blend-mode: normal !important'));
 for(const term of ['aria-labelledby="gs-video-tracker-title"','onSubmit={handleSearchOrder}','lookupOrderForTracking(cleanId, cleanPhone)','setSearchOrderPhone(e.target.value)'])assert.ok(modals.includes(term),term);
 assert.ok(css.includes('var(--gs-ink, #302820)'));
 assert.ok(css.includes('var(--gs-button-text, #fffaf3)'));
});
test('storefront video overrides load after prior layers; previews disabled only on working branches',()=>{
 const main=read('src/main.jsx');assert.ok(main.indexOf("import './storefrontVideoRedesign.css'")>main.indexOf("import './videoAuditMobileAdmin.css'"));
 assert.ok(css.includes('.geostore-shell.geostore-fashion-store'));
 const cfg=JSON.parse(read('vercel.json'));assert.equal(cfg.git.deploymentEnabled['internal-storefront-video-redesign-2026-11-24'],false);assert.notEqual(cfg.git.deploymentEnabled.main,false);
});

test('video 02 menu remains complete, compact and respects existing editor targets',()=>{
 const header=read('src/components/Header.jsx');
 for(const term of ["goTo('profile')","goTo('cart')","goTo('wishlist')","goTo('admin')","runAction(setIsTrackerOpen)","runAction(setIsNotificationsOpen)","runAction(setIsComparisonOpen)","runAction(setIsAiAssistantOpen)","goTo('wardrobe')","runAction(setSupportOpen)","runAction(setIsTermsOpen)","runAction(setIsWarrantyOpen)","handleInstallClick(); closeMenu();","setSelectedCategory(name)","setSearchQuery?.('')","runAction(setIsImageSearchOpen)","handleLangChange(lang)","aria-expanded={menuOpen}","menuToggleRef.current?.focus()","gs-video-menu-primary","gs-video-menu-services"])assert.ok(header.includes(term),term);
 assert.equal(header.split("goTo('profile')").length-1,1);
 assert.ok(header.includes("buildStorefrontElementStyle(visualDesign, targetId)"));
 for(const term of ['--gs-video-header-menu-padding','--gs-video-header-search-input-fontSize','--gs-video-header-storeName-fontSize','grid-template-columns: repeat(2,minmax(0,1fr))','max-width: 359px','min-block-size: 44px !important'])assert.ok(css.includes(term),term);
});

test('video 03 hero and offers preserve configured editor hooks and business operations',()=>{
 for(const term of ["videoElementStyle('hero.title')","videoElementStyle('hero.button')","videoElementStyle('flashSale.title')","gs-video-collections","gs-video-catalog-anchor","scrollIntoView","prefers-reduced-motion: reduce","getActiveFlashSaleProducts(activeProducts, flashSaleClock)","getEarliestFlashSaleEnd(flashSaleProducts)","getFlashSaleCountdown(flashSaleEndAt, flashSaleClock)","getProductAvailableStock(prod) <= 0","addToCart(prod)","rel=\"noopener noreferrer\"","renderCustomSections('after-hero')","renderCustomSections('after-flash-sale')"])assert.ok(store.includes(term),term);
 for(const term of ['--gs-video-hero-title-fontSize','--gs-video-flashSale-title-color','--gs-hero-text','--gs-card-radius','--gs-button-bg','font-variant-numeric: tabular-nums','gs-video-flash-add','scroll-margin-top: 150px'])assert.ok(css.includes(term),term);
 assert.ok(!css.includes('--gs-show-hero,'));
});

test('video 04 catalog preserves filters, category state and product actions',()=>{
 for(const term of ["videoElementStyle('category.card')","videoElementStyle('filters.input')","videoElementStyle('product.title')","setSelectedCategory(catName)","setSelectedSubCategory(sub.name)","setMinPrice(e.target.value","setMaxPrice(e.target.value","setSortBy(e.target.value)","resetCatalogFilters","toggleWishlist(prod)","toggleComparison(prod)","handleProductReorder(event.dataTransfer","getProductStartingPrice(prod)","handleProductPageChange(page)"])assert.ok(store.includes(term),term);
 for(const term of ['--gs-video-category-title-fontSize','--gs-video-filters-input-color','--gs-video-product-button-color','grid-template-columns: minmax(0,1fr) 12px minmax(0,1fr)','font-variant-numeric: tabular-nums','gs-catalog-comparison-toggle','min-height: 44px !important'])assert.ok(css.includes(term),term);
});
