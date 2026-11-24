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
 assert.ok(header.includes("buildStorefrontElementStyle(visualDesign, targetId, visualEditorViewport)"));
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

test('video 05 product detail keeps gallery, stock, cart and review logic with an in-flow purchase footer',()=>{
 for(const term of ["videoElementStyle('product.detail.purchase')","videoElementStyle('product.detail.variants')","setActiveImage(img)","setSelectedSize(size)","setSelectedColor(colName)","setSelectedCustomVariantId(variant.id)","currentAvailableStock <= 0","hasSizeColorInventory(selectedProduct) && !selectedSizeColorVariant","handleAddReview(e, selectedProduct.id)","handleReviewImageChange","handleCalculateSmartSize","htmlFor=\"gs-video-size-height\"","htmlFor=\"gs-video-size-weight\"","buildStorefrontElementStyle(siteSettings?.visualDesign, targetId, visualEditorViewport)"])assert.ok(store.includes(term),term);
 for(const term of ['flex: 1 1 auto !important; min-height: 0 !important; overflow-y: auto !important','position: relative !important; inset: auto !important; flex: 0 0 auto !important','--gs-video-product-detail-title-fontSize','--gs-video-product-detail-purchase-padding','gs-product-gallery-thumb[aria-pressed="true"]','min-width: 900px'])assert.ok(css.includes(term),term);
});

test('video 06 cart and checkout preserve existing purchase contract and empty-state navigation',()=>{
 const app=read('src/App.jsx');
 for(const term of ["gs-video-continue-shopping","gs-video-cart-item-details","gs-video-applied-coupon","handleAddSavedProduct(savedProd)","handleFindSavedProduct(savedProd)","toggleWishlist(savedProd)","changeCartQuantity(item, Number(item.quantity) + 1)","removeFromCart(item)","onSubmit={handleApplyCoupon}","setAppliedCoupon(null)","calculateCheckoutTotals({","formatPrice(cartTotalGEL)","setIsCheckoutOpen(true)","storefrontThemeStyle={buildStorefrontVisualStyle(siteSettings?.visualDesign)}"])assert.ok(app.includes(term),term);
 for(const term of ["onSubmit={handlePlaceOrder}","disabled={isSubmittingOrder}","readOnly={Boolean(currentUser?.email)}","aria-invalid={checkoutErrorField","style={storefrontThemeStyle}","navigator.clipboard.writeText(code)"])assert.ok(modals.includes(term),term);
 for(const term of ["gs-video-continue-shopping","gs-video-applied-coupon","grid-template-columns: 72px minmax(0,1fr)","gs-checkout-submit-area { position: sticky !important","font-size: 16px !important"])assert.ok(css.includes(term),term);
});

test('video 07 profile and account dialogs retain identity and security handlers',()=>{
 const app=read('src/App.jsx');
 for(const term of ['gs-video-profile-identity','gs-video-profile-email','gs-video-profile-order-list','myOrdersError && myOrders.length > 0','myOrders.map((order)','getOrderStatusClasses(order.status','localizeOrderStatus(order.status','formatPrice(order.totalGEL)','onClick={handleLogout}','currentUser.email || "—"'])assert.ok(app.includes(term),term);
 for(const term of ['gs-video-notifications-title','gs-video-notification-card','onClick={markAllNotificationsAsRead}','onSubmit={handleAuthSubmit}',"setAuthMode('reset-request')",'minLength={authMode'])assert.ok(modals.includes(term),term);
 for(const term of ['gs-video-profile-status[class*="text-emerald-"]','grid-template-columns: minmax(0,1fr) minmax(0,1.6fr) minmax(0,1fr)','gs-video-profile-email','--gs-surface','gs-commerce-dialog--account form input'])assert.ok(css.includes(term),term);
});

test('video 08 preserves assistance actions and restores sticky checkout',()=>{const app=read('src/App.jsx'), image=read('src/components/ImageSearchModal.jsx');for(const term of ['gs-video-assistance-obscured','gs-video-support-open','setIsAiAssistantOpen(true)'])assert.ok(app.includes(term),term);for(const term of ['validateImageFile(file, 5 * 1024 * 1024','handleStartVisualSearch','gs-video-image-search-title','fileInputRef.current?.click()'])assert.ok(image.includes(term),term);for(const term of ['gs-checkout-submit-area { position: sticky !important','scroll-padding-bottom: 116px','gs-video-assistance-obscured','gs-ai-message-text','gs-image-search-notice','gs-product-compare-specs','gs-wardrobe-add-form'])assert.ok(css.includes(term),term);});

test('video 09 footer keeps legal navigation and editor controls and adds existing support entry',()=>{
 const footer=read('src/components/StorefrontFooter.jsx'), app=read('src/App.jsx');
 for(const term of ['footer.termsLink','footer.privacyLink','footer.warrantyLink','footer.copyright','setIsTermsOpen?.(true)',"setActiveTab?.('privacy')",'setIsWarrantyOpen?.(true)','onClick={onOpenSupport}',"activeTab !== 'admin'","siteSettings?.storeName"])assert.ok(footer.includes(term),term);
 assert.ok(app.includes('onOpenSupport={() => { setSupportSubmission(null); setSupportOpen(true); }}'));
 for(const term of ['--gs-video-footer-backgroundColor','--gs-video-footer-termsLink-color','--gs-video-footer-privacyLink-fontSize','--gs-video-footer-warrantyLink-color','--gs-video-footer-copyright-fontSize','gs-video-footer-support','grid-template-columns:repeat(2,minmax(0,1fr))'])assert.ok(css.includes(term),term);
});

test('video 10 explicit editor style tokens preserve viewport selection and do not mutate original styles',async()=>{
 const {buildStorefrontElementStyle,withStorefrontVideoTokens,buildStorefrontVisualStyle}=await import('../src/utils/storefrontVisualDesign.js');
 const design={elementStyles:{'header.storeName':{fontSize:22,textColor:'#123456',paddingX:8}},responsive:{mobile:{elementStyles:{'header.storeName':{fontSize:16,textColor:'#abcdef'}}},tablet:{elementStyles:{'header.storeName':{fontSize:19}}}}};
 const base=buildStorefrontElementStyle(design,'header.storeName','desktop');const mobile=withStorefrontVideoTokens(buildStorefrontElementStyle(design,'header.storeName','mobile'),'header.storeName');const tablet=withStorefrontVideoTokens(buildStorefrontElementStyle(design,'header.storeName','tablet'),'header.storeName');
 assert.equal(base.fontSize,'22px');assert.equal(base['--gs-video-explicit-fontSize'],undefined);assert.equal(mobile['--gs-video-header-storeName-fontSize'],'16px');assert.equal(mobile['--gs-video-explicit-color'],'#abcdef');assert.equal(mobile['--gs-video-explicit-paddingLeft'],'8px');assert.equal(tablet['--gs-video-explicit-fontSize'],'19px');assert.equal(tablet['--gs-video-explicit-color'],'#123456');assert.equal(withStorefrontVideoTokens({},'header.storeName')['--gs-video-explicit-fontSize'],undefined);
 assert.equal(buildStorefrontVisualStyle({sections:{hero:false}},'desktop')['--gs-show-hero'],'none');
 const editor=read('src/components/StorefrontVisualEditor.jsx');assert.equal(editor.split('visualEditorViewport={previewMode}').length-1,3);assert.ok(css.includes('.gs-visual-preview-frame.geostore-fashion-store'));assert.ok(css.includes('[style*="--gs-video-explicit-color:"]'));
});
