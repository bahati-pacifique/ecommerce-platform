(function () {
    'use strict';

    const { storeId, listingId, baseUrl } = window.__LISTING__ || {};
    if (!storeId || !listingId) {
        console.error('[listing-show] missing __LISTING__ config');
        return;
    }

    const elLoading = document.getElementById('listingLoading');
    const elContent = document.getElementById('listingContent');
    const elError = document.getElementById('listingError');
    const elErrorMsg = document.getElementById('listingErrorMsg');
    const retryBtn = document.getElementById('listingRetry');

    function showLoading() {
        elLoading.classList.remove('hidden');
        elContent.classList.add('hidden');
        elError.classList.add('hidden');
    }
    function showContent() {
        elLoading.classList.add('hidden');
        elError.classList.add('hidden');

        // Reveal content with a fade-in
        elContent.classList.remove('hidden');
        elContent.classList.add('opacity-0');
        void elContent.offsetWidth;      // force reflow
        elContent.classList.remove('opacity-0');
        elContent.classList.add('opacity-100');
    }
    function showError(msg) {
        elLoading.classList.add('hidden');
        elContent.classList.add('hidden');
        elError.classList.remove('hidden');
        elErrorMsg.textContent = msg || 'Something went wrong.';
    }

    const CDN = 'https://cdn.cococe.rw/';

    function imageUrl(storageKey) {
        if (!storageKey) return null;
        if (/^https?:\/\//i.test(storageKey)) return storageKey;
        return CDN + storageKey.replace(/^\/+/, '');
    }

    function formatMoney(amount) {
        if (amount == null) return '';
        return new Intl.NumberFormat('en-RW', {
            style: 'currency',
            currency: 'RWF',
            maximumFractionDigits: 0,
        }).format(Number(amount));
    }

    function stockLabel(inv) {
        if (!inv) return { label: 'Unknown', tone: 'slate' };
        switch (inv.availability_status) {
            case 'in_stock': return { label: 'In stock', tone: 'emerald' };
            case 'low_stock': return { label: `Only ${inv.available_quantity} left`, tone: 'amber' };
            case 'out_of_stock': return { label: 'Out of stock', tone: 'rose' };
            case 'untracked': return { label: 'Untracked', tone: 'slate' };
            default: return { label: 'Unknown', tone: 'slate' };
        }
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text ?? '';
    }
    function setHTML(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html ?? '';
    }
    function toggle(id, show) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('hidden', !show);
    }
    function escapeAttr(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function loadListing() {
        showLoading();

        try {
            const res = await axios.get(
                `/stores/${storeId}/listings/${listingId}`,
                { withCredentials: true, headers: { Accept: 'application/json' } }
            );

            const data = res.data?.data ?? res.data?.result ?? res.data;
            if (!data || !data.id) throw new Error('Empty or malformed response');

            hydrate(data);
            showContent();
            document.title = `${data.title} — COCOCE`;
        } catch (err) {
            console.error('[listing-show] failed:', err);
            const msg =
                err.response?.data?.message ||
                err.message ||
                'Could not load this listing.';
            showError(msg);
        }
    }

    function hydrate(data) {

        const variants = (data.variants || []).map(v => ({
            id: v.id,
            sku: v.sku,
            price: Number(v.price),
            priceLabel: formatMoney(v.price),
            salePrice: v.sale_price != null ? Number(v.sale_price) : null,
            salePriceLabel: v.sale_price != null ? formatMoney(v.sale_price) : null,
            isOnSale: !!v.is_on_sale,
            currentPrice: Number(v.current_price ?? v.price),
            currentPriceLabel: formatMoney(v.current_price ?? v.price),
            imageUrl: imageUrl(v.image_url),
            attributes: v.attributes || [],
            inventory: v.inventory || null,
            stock: stockLabel(v.inventory),
        }));

        const variantImages = variants
            .filter(v => v.imageUrl)
            .map(v => ({ url: v.imageUrl, source: 'variant', variantId: v.id }));

        const productImages = (data.product_media || [])
            .filter(m => m.media_type === 'image' && m.storage_key)
            .map(m => ({ url: imageUrl(m.storage_key), source: 'product' }));

        const seen = new Set();
        const gallery = [...variantImages, ...productImages].filter(img => {
            if (seen.has(img.url)) return false;
            seen.add(img.url);
            return true;
        });

        const videoKey = data.listing_video_storage_key || null;
        const videoUrl = videoKey ? imageUrl(videoKey) : null;

        setText('listingTitle', data.title);
        if (data.product_title && data.product_title !== data.title) {
            toggle('listingProductTitle', true);
            setText('listingProductTitle', data.product_title);
        }

        const bcCat = document.getElementById('breadcrumbCategory');
        if (bcCat) {
            bcCat.textContent = data.category || 'Products';
            bcCat.href = `/category/${(data.category || '').toLowerCase()}`;
        }
        const bcBrand = document.getElementById('breadcrumbBrand');
        if (bcBrand) {
            bcBrand.textContent = data.brand || 'Brand';
            bcBrand.href = `/brand/${(data.brand || '').toLowerCase()}`;
        }
        setText('breadcrumbTitle', data.title);

        const brandLogo = document.getElementById('brandLogo');
        if (brandLogo && data.brand_logo_url) {
            brandLogo.src = imageUrl(data.brand_logo_url);
            brandLogo.alt = data.brand || '';
            brandLogo.classList.remove('hidden');
        }
        setText('brandName', data.brand || 'Generic');
        if (data.family) {
            toggle('brandSep', true);
            toggle('familyName', true);
            setText('familyName', data.family);
        }

        const mainImg = document.getElementById('galleryMainImg');
        const thumbsEl = document.getElementById('galleryThumbs');

        thumbsEl.innerHTML = '';

        if (gallery.length) {
            mainImg.src = gallery[0].url;
            mainImg.alt = data.title;
        }

        if (videoUrl) {
            const videoThumb = document.createElement('button');
            videoThumb.type = 'button';
            videoThumb.dataset.thumb = 'video';
            videoThumb.className =
                'relative flex h-16 w-16 shrink-0 snap-start items-center justify-center rounded-lg border-2 border-slate-200 bg-slate-900 text-white transition hover:border-brand sm:h-20 sm:w-20';
            videoThumb.innerHTML = `
                <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 4.2A1 1 0 0 0 5 5.1v9.8a1 1 0 0 0 1.3.9l9.4-4.9a1 1 0 0 0 0-1.8L6.3 4.2Z"/>
                </svg>
                <span class="absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[8px] font-bold">HD</span>
            `;
            thumbsEl.appendChild(videoThumb);
        }

        gallery.forEach((img, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.thumb = String(i);
            btn.dataset.variantId = img.variantId || '';
            btn.className =
                `relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-lg border-2 bg-slate-100 transition sm:h-20 sm:w-20 ` +
                (i === 0 ? 'border-brand' : 'border-transparent hover:border-slate-300');
            btn.innerHTML = `<img src="${img.url}" alt="" class="h-full w-full object-cover" loading="lazy">`;
            thumbsEl.appendChild(btn);
        });

        const videoEl = document.getElementById('listingVideo');
        const videoSrc = document.getElementById('listingVideoSource');
        const videoBadge = document.getElementById('videoOpenBadge');

        if (videoUrl && videoEl && videoSrc) {
            videoSrc.src = videoUrl;
            if (gallery[0]?.url) videoEl.poster = gallery[0].url;
            videoEl.load();
            videoBadge?.classList.remove('hidden');

            videoEl.addEventListener('error', () => {
                console.warn('[listing] video failed to load:', videoUrl);
                videoBadge?.classList.add('hidden');
                thumbsEl.querySelector('[data-thumb="video"]')?.remove();
            }, { once: true });
        } else {
            videoBadge?.classList.add('hidden');
            thumbsEl.querySelector('[data-thumb="video"]')?.remove();
        }

        const defaultVariant = variants[0];
        if (defaultVariant) {
            setText('priceMain', defaultVariant.currentPriceLabel);
            if (defaultVariant.isOnSale && defaultVariant.salePriceLabel) {
                toggle('priceOriginal', true);
                toggle('saleBadge', true);
                setText('priceOriginal', defaultVariant.priceLabel);
            } else {
                toggle('priceOriginal', false);
                toggle('saleBadge', false);
            }
            applyStockTone(defaultVariant.stock);
            setText('stockText', defaultVariant.stock.label);
        } else {
            setText('priceMain', '—');
            setText('stockText', 'Not available');
        }

        if (variants.length) {
            toggle('variantSection', true);
            setText('variantCount', `${variants.length} option${variants.length === 1 ? '' : 's'}`);

            const list = document.getElementById('variantList');
            list.innerHTML = '';

            variants.forEach((v, idx) => {
                const label = document.createElement('label');
                label.className = 'group relative w-[170px] shrink-0 snap-start cursor-pointer sm:w-auto';
                label.innerHTML = `
                    <input type="radio" name="variant" value="${v.id}"
                           data-variant-radio data-variant-index="${idx}"
                           class="peer sr-only" ${idx === 0 ? 'checked' : ''}>
                    <span class="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white p-2 transition
                                 peer-checked:border-brand peer-checked:bg-brand-ultralight hover:border-slate-300">
                        ${v.imageUrl
                        ? `<img src="${v.imageUrl}" alt="" class="h-10 w-10 shrink-0 rounded object-cover" loading="lazy">`
                        : `<div class="h-10 w-10 shrink-0 rounded bg-slate-100"></div>`}
                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-xs font-semibold text-slate-900">
                                ${escapeAttr(v.attributes.map(a => a.value).join(' / ') || v.sku)}
                            </span>
                            <span class="block truncate text-[11px] text-slate-500">${escapeAttr(v.currentPriceLabel)}</span>
                        </span>
                        ${v.stock.tone === 'rose'
                        ? `<span class="shrink-0 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">OOS</span>`
                        : ''}
                    </span>`;
                list.appendChild(label);

                label.querySelector('input').addEventListener('change', (e) => {
                    if (!e.target.checked) return;
                    onVariantChange(v, gallery, mainImg, thumbsEl);
                });
            });
        }

        setHTML('listingDescription', data.description || '');
        if (data.product_description) {
            toggle('productDescriptionWrap', true);
            setHTML('productDescription', data.product_description);
        }

        if (productImages.length) {
            toggle('productGallerySection', true);
            const grid = document.getElementById('productGalleryGrid');
            grid.innerHTML = '';
            productImages.forEach(img => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.dataset.thumbOpen = img.url;
                btn.className = 'group overflow-hidden rounded-lg bg-slate-100';
                btn.innerHTML = `
                    <img src="${img.url}" alt=""
                         class="aspect-square w-full object-contain transition duration-200 group-hover:scale-105"
                         loading="lazy">`;
                btn.addEventListener('click', () => {
                    const idx = gallery.findIndex(g => g.url === img.url);
                    if (idx >= 0) {
                        mainImg.src = gallery[idx].url;
                        highlightThumb(thumbsEl, idx);
                        document.querySelector('[data-component="listing-gallery"]')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                grid.appendChild(btn);
            });
        }

        const specs = document.getElementById('specsList');
        const attrMap = new Map();
        for (const v of variants) {
            for (const a of v.attributes) {
                if (!attrMap.has(a.name)) attrMap.set(a.name, new Set());
                attrMap.get(a.name).add(a.value);
            }
        }

        let specsHtml = '';
        if (data.brand) specsHtml += specRow('Brand', data.brand);
        if (data.family) specsHtml += specRow('Family', data.family);
        if (data.category) specsHtml += specRow('Category', data.category);
        attrMap.forEach((values, name) => {
            specsHtml += specRow(name, Array.from(values).join(' / '));
        });
        if (variants[0]?.sku) specsHtml += specRow('SKU', variants[0].sku);
        specs.innerHTML = specsHtml;

        const vendorName = data.vendor_name || 'COCOCE Vendor';
        setText('vendorName', vendorName);
        document.getElementById('storeVisitLink').href = `${__APP__.protocal}${__APP__.domainName}/store/${data.store_id}`;
        document.getElementById('storeSocialNetwork').href = data.store_meta.instagram || data.store_meta.tiktok || data.store_meta.facebook;
        document.getElementById('storeSocialNetwork').innerText = 'Store social network'
        
        setText('vendorStatus', data.vendor_verification);
        setText('storeRating', data.store_rating);
        
        setText('vendorInitial', vendorName.charAt(0).toUpperCase());

        updateJsonLd(data, variants, gallery);

        initGalleryInteractions(gallery, mainImg, thumbsEl);
        initLightbox(gallery, mainImg);
    }

    function specRow(label, value) {
        return `
            <div class="flex justify-between gap-3 py-2">
                <dt class="text-slate-500">${escapeAttr(label)}</dt>
                <dd class="text-right font-medium text-slate-900">${escapeAttr(String(value))}</dd>
            </div>`;
    }

    function applyStockTone(stock) {
        const badge = document.getElementById('stockBadge');
        const dot = document.getElementById('stockDot');
        if (!badge || !dot) return;

        const tones = {
            emerald: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-600' },
            amber: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-600' },
            rose: { bg: 'bg-rose-50 text-rose-700', dot: 'bg-rose-600' },
            slate: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
        };

        badge.className = 'mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold';
        Object.values(tones).forEach(t => badge.classList.remove(...t.bg.split(' ')));
        Object.values(tones).forEach(t => dot.classList.remove(t.dot));

        const t = tones[stock.tone] || tones.slate;
        badge.classList.add(...t.bg.split(' '));
        dot.classList.add(t.dot);
    }

    function onVariantChange(variant, gallery, mainImg, thumbsEl) {
        setText('priceMain', variant.currentPriceLabel);
        if (variant.isOnSale && variant.salePriceLabel) {
            toggle('priceOriginal', true);
            toggle('saleBadge', true);
            setText('priceOriginal', variant.priceLabel);
        } else {
            toggle('priceOriginal', false);
            toggle('saleBadge', false);
        }

        applyStockTone(variant.stock);
        setText('stockText', variant.stock.label);

        if (variant.imageUrl) {
            const idx = gallery.findIndex(g => g.url === variant.imageUrl);
            if (idx >= 0) {
                mainImg.src = gallery[idx].url;
                highlightThumb(thumbsEl, idx);
            }
        }

        const oos = variant.stock.tone === 'rose';
        ['addToCartBtn', 'buyNowBtn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = oos;
        });
    }

    function highlightThumb(thumbsEl, activeIdx) {
        thumbsEl.querySelectorAll('[data-thumb]').forEach(t => {
            if (t.dataset.thumb === 'video') return;
            const isActive = Number(t.dataset.thumb) === activeIdx;
            t.classList.toggle('border-brand', isActive);
            t.classList.toggle('border-transparent', !isActive);
        });
    }

    let galleryBound = false;
    function initGalleryInteractions(gallery, mainImg, thumbsEl) {
        if (galleryBound) return;
        galleryBound = true;

        const mainWrap = document.getElementById('galleryMain');
        const videoModal = document.getElementById('videoModal');
        const qty = document.getElementById('qty');

        // Hover zoom (desktop only)
        const isTouch = window.matchMedia('(hover: none)').matches;
        if (!isTouch) {
            mainWrap.addEventListener('mouseenter', () => {
                mainImg.style.transformOrigin = 'center center';
                mainImg.style.transform = 'scale(2)';
            });
            mainWrap.addEventListener('mousemove', (e) => {
                const rect = mainWrap.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                mainImg.style.transformOrigin = `${x}% ${y}%`;
            });
            mainWrap.addEventListener('mouseleave', () => {
                mainImg.style.transform = '';
                mainImg.style.transformOrigin = 'center center';
            });
        }

        // Thumbnail clicks
        thumbsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-thumb]');
            if (!btn) return;

            if (btn.dataset.thumb === 'video') {
                openVideo();
                return;
            }

            const idx = Number(btn.dataset.thumb);
            if (!Number.isFinite(idx) || !gallery[idx]) return;
            mainImg.src = gallery[idx].url;
            highlightThumb(thumbsEl, idx);
        });

        // Video modal
        function openVideo() {
            videoModal?.classList.remove('hidden');
            videoModal?.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }
        function closeVideo() {
            videoModal?.classList.add('hidden');
            videoModal?.classList.remove('flex');
            document.body.style.overflow = '';
            const v = document.getElementById('listingVideo');
            if (v) {
                v.pause();
                v.currentTime = 0;
            }
        }

        document.querySelectorAll('[data-open-video]').forEach(b => b.addEventListener('click', openVideo));
        document.querySelectorAll('[data-close-video]').forEach(b => b.addEventListener('click', closeVideo));
        videoModal?.addEventListener('click', (e) => { if (e.target === videoModal) closeVideo(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !videoModal?.classList.contains('hidden')) closeVideo();
        });

        // Quantity stepper
        document.querySelectorAll('[data-qty]').forEach(b => {
            b.addEventListener('click', () => {
                if (!qty) return;
                const cur = Number(qty.value) || 1;
                const next = b.dataset.qty === '+' ? cur + 1 : cur - 1;
                qty.value = Math.min(99, Math.max(1, next));
            });
        });
    }

    let lightboxBound = false;
    function initLightbox(gallery, mainImg) {
        if (lightboxBound) return;
        lightboxBound = true;

        const lightbox = document.getElementById('imageLightbox');
        const strip = document.getElementById('lightboxStrip');
        const counter = document.getElementById('lightboxCounter');
        const closeBtn = document.getElementById('lightboxClose');
        const prevBtn = document.getElementById('lightboxPrev');
        const nextBtn = document.getElementById('lightboxNext');
        const mainWrap = document.getElementById('galleryMain');

        if (!lightbox || !strip || !mainWrap) return;

        let currentIndex = 0;

        function buildSlides() {
            strip.innerHTML = gallery.map(img => `
                <div class="flex h-full w-full shrink-0 snap-center items-center justify-center p-4">
                    <img src="${img.url}" alt=""
                         class="max-h-full max-w-full object-contain"
                         loading="lazy">
                </div>
            `).join('');
        }

        function updateCounter() {
            if (counter) counter.textContent = `${currentIndex + 1} / ${gallery.length}`;
        }

        function open(index) {
            if (!gallery.length) return;

            currentIndex = Math.max(0, Math.min(gallery.length - 1, index));
            buildSlides();

            requestAnimationFrame(() => {
                strip.scrollLeft = currentIndex * strip.clientWidth;
                updateCounter();
            });

            lightbox.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            setTimeout(() => closeBtn?.focus(), 50);
        }

        function close() {
            lightbox.classList.add('hidden');
            document.body.style.overflow = '';
        }

        function goTo(idx) {
            currentIndex = Math.max(0, Math.min(gallery.length - 1, idx));
            strip.scrollTo({ left: currentIndex * strip.clientWidth, behavior: 'smooth' });
            updateCounter();
        }

        // Open from main image
        mainWrap.addEventListener('click', (e) => {
            if (e.target.closest('[data-open-video]')) return;
            const idx = gallery.findIndex(g => g.url === mainImg.src);
            open(idx >= 0 ? idx : 0);
        });

        mainWrap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const idx = gallery.findIndex(g => g.url === mainImg.src);
                open(idx >= 0 ? idx : 0);
            }
        });

        closeBtn?.addEventListener('click', close);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) close();
        });

        document.addEventListener('keydown', (e) => {
            if (lightbox.classList.contains('hidden')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowRight') goTo(currentIndex + 1);
            if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
        });

        prevBtn?.addEventListener('click', () => goTo(currentIndex - 1));
        nextBtn?.addEventListener('click', () => goTo(currentIndex + 1));

        strip.addEventListener('scroll', () => {
            if (!strip.clientWidth) return;
            const i = Math.round(strip.scrollLeft / strip.clientWidth);
            if (i !== currentIndex && i >= 0 && i < gallery.length) {
                currentIndex = i;
                updateCounter();
            }
        });
    }

    function updateJsonLd(data, variants, gallery) {
        const el = document.getElementById('listingJsonLd');
        if (!el) return;

        const schema = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: data.title,
            description: (data.description || '').slice(0, 500),
            image: gallery.slice(0, 5).map(g => g.url),
            brand: { '@type': 'Brand', name: data.brand || 'COCOCE' },
            sku: variants[0]?.sku || '',
        };

        if (variants.length === 1) {
            schema.offers = {
                '@type': 'Offer',
                priceCurrency: 'RWF',
                price: String(variants[0].currentPrice),
                availability:
                    variants[0].stock.tone === 'rose' ? 'https://schema.org/OutOfStock' :
                        variants[0].stock.tone === 'amber' ? 'https://schema.org/LimitedAvailability' :
                            'https://schema.org/InStock',
            };
        } else if (variants.length > 1) {
            const prices = variants.map(v => v.currentPrice);
            schema.offers = {
                '@type': 'AggregateOffer',
                priceCurrency: 'RWF',
                lowPrice: String(Math.min(...prices)),
                highPrice: String(Math.max(...prices)),
                offerCount: variants.length,
            };
        }

        el.textContent = JSON.stringify(schema);
    }

    retryBtn?.addEventListener('click', loadListing);

    loadListing();
    lucide?.createIcons();
})();