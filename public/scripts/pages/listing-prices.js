/**
 * Listing prices page — client-side hydration.
 *
 * Loads prices, variant, and currencies with axios, then renders the
 * summary cards, table, and mobile cards. Handles toggle, delete, and
 * add-price modal.
 */
(function () {
    'use strict';

    const { storeId, listingId, variantId, baseUrl } = window.__PRICES__ || {};

    if (!storeId || !listingId || !variantId) {
        console.error('[prices] missing __PRICES__ config');
        return;
    }

    const API_BASE = `/stores/${storeId}/listings/${listingId}/variants/${variantId}/prices`;

    // ─── CDN helper ──────────────────────────────────────
    const CDN = 'https://cdn.cococe.rw/';

    function imageUrl(storageKey) {
        if (!storageKey) return null;
        if (/^https?:\/\//i.test(storageKey)) return storageKey;
        return CDN + storageKey.replace(/^\/+/, '');
    }

    // ─── DOM refs ────────────────────────────────────────
    const elLoading = document.getElementById('pricesLoading');
    const elContent = document.getElementById('pricesContent');
    const elError = document.getElementById('pricesError');
    const elErrorMsg = document.getElementById('pricesErrorMsg');
    const retryBtn = document.getElementById('pricesRetry');

    const addBtn = document.getElementById('openAddPrice');
    const modal = document.getElementById('addPriceModal');
    const modalSku = document.getElementById('modalVariantSku');
    const backdrop = document.getElementById('addPriceBackdrop');
    const closeBtn = document.getElementById('closeAddPrice');
    const cancelBtn = document.getElementById('cancelAddPrice');
    const form = document.getElementById('addPriceForm');
    const submitBtn = document.getElementById('submitAddPrice');
    const submitText = document.getElementById('submitAddPriceText');
    const formError = document.getElementById('addPriceError');
    const currencySel = document.getElementById('currency_id');

    // ─── State ───────────────────────────────────────────
    let data = { variant: null, prices: [], current: null, currencies: [] };
    let fetchController = null;

    // ─── Helpers ─────────────────────────────────────────
    function formatMoney(amount, symbol = 'RWF') {
        if (amount == null) return '—';
        const n = Number(amount);
        const formatted = new Intl.NumberFormat('en-RW', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0,
        }).format(n);
        return `${formatted} ${symbol}`;
    }
    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
        });
    }
    function formatDateTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }
    function periodLabel(startsAt, endsAt) {
        if (!startsAt && !endsAt) return 'No period set';
        if (!endsAt) return `From ${formatDate(startsAt)}`;
        return `${formatDate(startsAt)} → ${formatDate(endsAt)}`;
    }
    function statusTone(status) {
        return {
            active: 'bg-emerald-50 text-emerald-700',
            inactive: 'bg-slate-100 text-slate-600',
            draft: 'bg-amber-50 text-amber-700',
            archived: 'bg-slate-100 text-slate-500',
        }[status] || 'bg-slate-100 text-slate-600';
    }
    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s ?? '';
        return d.innerHTML;
    }

    // ─── State toggling ──────────────────────────────────
    function showLoading() {
        elLoading.classList.remove('hidden');
        elContent.classList.add('hidden', 'opacity-0');
        elError.classList.add('hidden');
    }
    function showContent() {
        elLoading.classList.add('hidden');
        elError.classList.add('hidden');
        elContent.classList.remove('hidden');
        requestAnimationFrame(() => elContent.classList.remove('opacity-0'));
    }
    function showError(msg) {
        elLoading.classList.add('hidden');
        elContent.classList.add('hidden', 'opacity-0');
        elError.classList.remove('hidden');
        elErrorMsg.textContent = msg || 'Something went wrong.';
    }

    // ─── Fetch ───────────────────────────────────────────
    async function load() {
        if (fetchController) fetchController.abort();
        fetchController = new AbortController();

        showLoading();

        try {
            const res = await axios.get(API_BASE, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
                signal: fetchController.signal,
            });

            // Handle both { data: {...} } and flat { ... }
            const payload = res.data?.data ?? res.data;
            if (!payload || !payload.variant) {
                throw new Error('Malformed response: no variant');
            }

            
            data = {
                variant: payload.variant,
                prices: Array.isArray(payload.prices) ? payload.prices : [],
                currency: payload.base_currency,
            };

            hydrate();
            showContent();
        } catch (err) {
            if (axios.isCancel(err)) return;
            console.error('[prices] failed:', err);
            showError(
                err.response?.data?.message ||
                err.message ||
                'Could not load prices.'
            );
        }
    }

    // ─── Hydrate ─────────────────────────────────────────
    function hydrate() {
        const { variant, prices, currency } = data;

        document.getElementById('variantSku').textContent = variant.variant_sku || '—';
        document.getElementById('variantTitle').textContent =
            variant.variant_title || variant.listing_title || 'Untitled variant';

        const variantImage = document.getElementById('variantImage');
        if (variantImage) {
            if (variant.variant_image) {
                variantImage.src = imageUrl(variant.variant_image);
                variantImage.alt = variant.variant_sku || '';
                variantImage.classList.remove('hidden');
            } else {
                variantImage.classList.add('hidden');
            }
        }

        modalSku.textContent = variant.variant_sku || 'variant';
        $('#salePriceModalTag').text(`(${variant.currency_code})`)

        addBtn.disabled = false;

        renderSummary(prices, currency);
        renderCurrencyOptions([currency]);
        renderPrices(prices);
    }

    function renderSummary(prices, baseCurrency) {
        const priceEl = document.getElementById('currentPriceValue');
        const saleEl = document.getElementById('currentSaleBadge');
        const currencyEl = document.getElementById('currentCurrency');
        const startsEl = document.getElementById('currentStartsAt');
        const endsEl = document.getElementById('currentEndsAt');

        const active = Array.isArray(prices) ? prices.find(p => p.is_current) : null;

        if (!active) {
            priceEl.innerHTML = `<span class="text-base font-medium text-slate-400">No active price</span>`;
            saleEl.classList.add('hidden');
            saleEl.innerHTML = '';
            currencyEl.textContent = '—';
            startsEl.textContent = '—';
            endsEl.textContent = '—';
            return;
        }

        const symbol = active.currency_symbol || active.currency_code || 'RWF';

        // Sale vs regular: if sale_price is set and < price, use it
        const hasSale = active.sale_price != null && Number(active.sale_price) < Number(active.price);
        const activeAmt = hasSale ? Number(active.sale_price) : Number(active.price);

        priceEl.textContent = formatMoney(activeAmt, symbol);

        currencyEl.textContent = baseCurrency
            ? `${baseCurrency.currency_code} · ${baseCurrency.currency_name}`
            : '—';

        startsEl.textContent = formatDateTime(active.starts_at);
        endsEl.textContent = active.ends_at ? formatDateTime(active.ends_at) : 'No end date';

        if (hasSale) {
            saleEl.classList.remove('hidden');
            saleEl.innerHTML = `
                <span class="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">SALE</span>
                <span class="text-slate-400 line-through">${formatMoney(active.price, symbol)}</span>
            `;
        } else {
            saleEl.classList.add('hidden');
            saleEl.innerHTML = '';
        }
    }

    function renderCurrencyOptions(currencies) {
        if (!currencySel) return;

        if (!currencies || !currencies.length) {
            console.log('DUMP')
            currencySel.innerHTML = '<option value="">No currencies available</option>';
            currencySel.disabled = true;
            return;
        }

        currencySel.disabled = false;
        
        currencySel.innerHTML = currencies.map(c => `
            <option value="${c.currency_id}">${escapeHtml(c.currency_code)} — ${escapeHtml(c.currency_name)}</option>
        `).join('');
    }

    function renderPrices(prices) {
        const countEl = document.getElementById('pricesCount');
        countEl.textContent = `${prices.length} price${prices.length === 1 ? '' : 's'} recorded`;

        const emptyEl = document.getElementById('pricesEmpty');
        const tableEl = document.getElementById('pricesTableWrap');
        const mobileEl = document.getElementById('pricesMobileList');

        if (!prices.length) {
            emptyEl.classList.remove('hidden');
            tableEl.classList.add('hidden');
            mobileEl.innerHTML = '';
            return;
        }

        emptyEl.classList.add('hidden');
        tableEl.classList.remove('hidden');
        tableEl.classList.add('lg:block');

        const tbody = document.getElementById('pricesTableBody');
        tbody.innerHTML = prices.map(renderDesktopRow).join('');

        mobileEl.innerHTML = prices.map(renderMobileCard).join('');
    }

    function renderDesktopRow(p) {
        const activeClass = p.is_current ? 'bg-brand-ultralight' : 'hover:bg-slate-50';
        const symbol = p.currency_symbol || p.currency_code || 'RWF';

        const saleCell = p.sale_price != null
            ? `<p class="font-semibold text-brand">${formatMoney(p.sale_price, symbol)}</p>
               <p class="text-[10px] text-slate-500">−${Math.round((1 - p.sale_price / p.price) * 100)}%</p>`
            : `<span class="text-xs text-slate-400">—</span>`;

        const activeBadge = p.is_current
            ? `<span class="mt-0.5 inline-block rounded-full bg-green-800 px-1.5 py-0.5 text-[9px] font-bold text-white">ACTIVE NOW</span>`
            : '';

        const toggleLabel = p.status === 'active' ? 'Disable' : 'Activate';
        const toggleClass = p.status === 'active'
            ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            : 'border-brand bg-brand text-white hover:bg-brand-dark';

        return `
            <tr class="${activeClass}" data-price-id="${p.id}">
                <td class="px-5 py-3">
                    ${p.is_current ? `<span class="block h-2 w-2 rounded-full bg-green-800" title="Currently active"></span>` : ''}
                </td>
                
                <td class="px-5 py-3">
                    <p class="font-semibold text-slate-900">${formatMoney(p.price, symbol)}</p>
                </td>
                <td class="px-5 py-3">${saleCell}</td>
                <td class="px-5 py-3">
                    <p class="text-xs text-slate-700">${periodLabel(p.starts_at, p.ends_at)}</p>
                    ${activeBadge}
                </td>
                <td class="px-5 py-3">
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusTone(p.status)}">
                        ${escapeHtml(p.status)}
                    </span>
                </td>
                <td class="px-5 py-3 text-right">
                    <div class="flex justify-end gap-1.5">
                        <button type="button"
                                data-action="toggle"
                                data-price-id="${p.id}"
                                class="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${toggleClass}">
                            ${toggleLabel}
                        </button>
                        <button type="button"
                                data-action="delete"
                                data-price-id="${p.id}"
                                class="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>`;
    }

    function renderMobileCard(p) {
        const activeClass = p.is_current ? 'bg-brand-ultralight' : '';
        const symbol = p.currency_symbol || p.currency_code || 'RWF';

        const saleLine = p.sale_price != null
            ? `<p class="mt-0.5 text-sm font-semibold text-brand">
                   Sale: ${formatMoney(p.sale_price, symbol)}
                   <span class="text-[10px] text-slate-500">(−${Math.round((1 - p.sale_price / p.price) * 100)}%)</span>
               </p>`
            : '';

        const toggleLabel = p.status === 'active' ? 'Disable' : 'Activate';
        const toggleClass = p.status === 'active'
            ? 'border-slate-200 bg-white text-slate-700'
            : 'border-brand bg-brand text-white';

        return `
            <div class="p-4 ${activeClass}" data-price-id="${p.id}">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <div class="flex items-baseline gap-2">
                            <p class="text-lg font-extrabold text-slate-950">
                                ${formatMoney(p.price, symbol)}
                            </p>
                            <span class="font-mono text-[10px] font-semibold text-slate-500">
                                ${escapeHtml(p.currency_code)}
                            </span>
                        </div>
                        ${saleLine}
                    </div>
                    <div class="flex shrink-0 flex-col items-end gap-1">
                        <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusTone(p.status)}">
                            ${escapeHtml(p.status)}
                        </span>
                        ${p.is_current ? `<span class="rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">ACTIVE</span>` : ''}
                    </div>
                </div>

                <p class="mt-2 text-xs text-slate-600">
                    ${periodLabel(p.starts_at, p.ends_at)}
                </p>

                <div class="mt-3 flex gap-2">
                    <button type="button"
                            data-action="toggle"
                            data-price-id="${p.id}"
                            class="flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${toggleClass}">
                        ${toggleLabel}
                    </button>
                    <button type="button"
                            data-action="delete"
                            data-price-id="${p.id}"
                            class="flex-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">
                        Delete
                    </button>
                </div>
            </div>`;
    }

    // ─── Delegated actions ───────────────────────────────
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const priceId = btn.dataset.priceId;
        const action = btn.dataset.action;
        if (!priceId) return;

        if (action === 'toggle') {
            btn.disabled = true;
            try {
                await axios.post(`${API_BASE}/${priceId}/toggle`, null, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });
                await load();
            } catch (err) {
                console.error('[toggle] failed:', err);
                btn.disabled = false;
                flashError(err.response?.data?.message || 'Could not update price status.');
            }
        }

        if (action === 'delete') {
            if (!confirm('Delete this price? This cannot be undone.')) return;
            btn.disabled = true;
            try {
                await axios.post(`${API_BASE}/${priceId}/delete`, null, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });
                await load();
            } catch (err) {
                console.error('[delete] failed:', err);
                btn.disabled = false;
                flashError(err.response?.data?.message || 'Could not delete price.');
            }
        }
    });

    // Empty-state "Add first price" delegates to the same modal
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-open-add-price]');
        if (btn) openModal();
    });

    function flashError(msg) {
        if (window.Notification?.showNotification) {
            window.Notification.showNotification({ type: 'error', message: msg });
        } else {
            alert(msg);
        }
    }

    // ─── Add price modal ─────────────────────────────────
    function openModal() {
        if (!modal) return;
        form.reset();
        formError.classList.add('hidden');
        clearFieldErrors();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        setTimeout(() => currencySel.focus(), 50);
    }
    function closeModal() {
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }

    addBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeModal();
    });

    // ─── Validation ──────────────────────────────────────
    function clearFieldErrors() {
        form.querySelectorAll('[data-error-for]').forEach(el => {
            el.textContent = '';
            el.classList.add('hidden');
        });
    }
    function setFieldError(field, msg) {
        const el = form.querySelector(`[data-error-for="${field}"]`);
        if (el) {
            el.textContent = msg;
            el.classList.remove('hidden');
        }
    }

    function validate() {
        clearFieldErrors();
        let ok = true;

        const price = Number(document.getElementById('price').value);
        if (!Number.isFinite(price) || price < 0) {
            setFieldError('price', 'Price must be a positive number.');
            ok = false;
        }

        const saleRaw = document.getElementById('sale_price').value;
        if (saleRaw !== '') {
            const sale = Number(saleRaw);
            if (!Number.isFinite(sale) || sale < 0) {
                setFieldError('sale_price', 'Sale price must be positive.');
                ok = false;
            } else if (sale > price) {
                setFieldError('sale_price', 'Sale price cannot exceed price.');
                ok = false;
            }
        }

        const startsRaw = document.getElementById('starts_at').value;
        const endsRaw = document.getElementById('ends_at').value;
        if (startsRaw && endsRaw && new Date(endsRaw) <= new Date(startsRaw)) {
            setFieldError('ends_at', 'End date must be after start date.');
            ok = false;
        }

        return ok;
    }

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate()) return;

        submitBtn.disabled = true;
        submitText.textContent = 'Adding…';
        formError.classList.add('hidden');

        const fd = new FormData(form);
        const payload = {
            currency_id: fd.get('currency_id'),
            price: fd.get('price'),
            sale_price: fd.get('sale_price') || null,
            starts_at: fd.get('starts_at') || null,
            ends_at: fd.get('ends_at') || null,
            status: fd.get('status') || 'active',
        };

        try {
            await axios.post(API_BASE, payload, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
            });

            closeModal();
            await load();
        } catch (err) {
            const errs = err.response?.data?.errors;
            if (errs) Object.entries(errs).forEach(([k, v]) => setFieldError(k, v));
            formError.textContent = err.response?.data?.message || 'Could not add price.';
            formError.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitText.textContent = 'Add price';
        }
    });

    retryBtn?.addEventListener('click', load);

    load();
    lucide?.createIcons();
})();