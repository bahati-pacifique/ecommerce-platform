/**
 * Listing prices page — client-side hydration.
 *
 * Loads prices, variant, and currencies with axios, then renders the
 * summary cards, table, and mobile cards. Handles toggle, delete, and
 * add-price modal.
 */
(function () {
    'use strict';

    let active;

    const { storeId, variantId, baseUrl } = window.__PRICES__ || {};

    if (!storeId || !variantId) {
        console.error('[prices] missing __PRICES__ config');
        return;
    }

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

    const initPriceModal = document.getElementById('addInitialPriceModal');
    const initialPriceForm = document.getElementById('addInitialPriceForm');
    const modalInitialVariantSku = document.getElementById('modalInitialVariantSku');
    const closeInitialAddPrice = document.getElementById('closeInitialAddPrice');
    const cancelInitialPrice = document.getElementById('cancelInitialPrice');
    const addInitialPriceError = document.getElementById('addInitialPriceError');
    const submitInitialPrice = document.getElementById('submitInitialPrice');
    const initCurrencySel = document.getElementById('initial_currency_id');

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
        return `${formatDateTime(startsAt)} → ${formatDateTime(endsAt)}`;
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
            const res = await axios.get(`/stores/${storeId}/variants/${variantId}/prices`, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
                signal: fetchController.signal,
            });

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

        const hasInitialPrice = prices.some(
            price => price.is_initial === true
        );

        if (!hasInitialPrice) {
            showSnackbar({
                type: 'warning',
                autoClose: false,
                message: `<i data-lucide="triangle-exclamation-point"></i> This Variant has no initial price set`,
                actionText: 'Set price',
                onAction: async () => {
                    //Fire initial price modal
                    openInitialPriceModal();
                }
            });
            lucide?.createIcons();
        }

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
        modalInitialVariantSku.textContent = variant.variant_sku || '';
        $('#salePriceModalTag').text(`(${variant.currency_code})`)

        addBtn.disabled = false;

        if (endsAtCountdownInterval) {
            clearInterval(endsAtCountdownInterval);
            endsAtCountdownInterval = null;
        }
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

        active = Array.isArray(prices) ? prices.find(p => p.is_current) : null;

        if (!active) {
            priceEl.innerHTML = `<span class="text-base font-medium text-slate-400">No active price</span>`;
            saleEl.classList.add('hidden');
            saleEl.innerHTML = '';
            currencyEl.textContent = '—';
            startsEl.textContent = '—';
            endsEl.textContent = '—';
            return;
        }

        const symbol = active.currency_code || active.currency_symbol || 'USD';

        // Sale vs regular: if sale_price is set and < price, use it
        const hasSale = active.sale_price != null && Number(active.sale_price) < Number(active.price);
        const activeAmt = hasSale ? Number(active.sale_price) : Number(active.price);

        priceEl.textContent = formatMoney(activeAmt, symbol);

        currencyEl.textContent = baseCurrency
            ? `${baseCurrency.currency_code} · ${baseCurrency.currency_name}`
            : '—';

        startsEl.textContent = formatDateTime(active.starts_at);
        //endsEl.textContent = active.ends_at ? formatDateTime(active.ends_at) : 'No end date';

        if (active.ends_at) {
            endsEl.textContent = formatDateTime(active.ends_at);

            const countdownEl = document.createElement('div');

            countdownEl.className =
                'mt-1 text-xs font-bold text-brand';

            endsEl.appendChild(countdownEl);

            startPriceCountdown(active.ends_at, countdownEl);
        } else {
            endsEl.textContent = 'No end date';

            if (endsAtCountdownInterval) {
                clearInterval(endsAtCountdownInterval);
                endsAtCountdownInterval = null;
            }
        }

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

    let endsAtCountdownInterval = null;

    function startPriceCountdown(endsAt, container) {
        // Clear any previous countdown
        if (endsAtCountdownInterval) {
            clearInterval(endsAtCountdownInterval);
            endsAtCountdownInterval = null;
        }

        if (!endsAt) return;

        const endTime = new Date(endsAt).getTime();

        if (Number.isNaN(endTime)) {
            container.textContent = 'Invalid expiration date';
            return;
        }

        const updateCountdown = () => {
            const remaining = endTime - Date.now();

            if (remaining <= 0) {
                container.textContent = 'Price period ended';
                clearInterval(endsAtCountdownInterval);
                endsAtCountdownInterval = null;
                return;
            }

            const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((remaining / (1000 * 60)) % 60);
            const seconds = Math.floor((remaining / 1000) % 60);

            const pad = value => String(value).padStart(2, '0');

            container.textContent = days > 0
                ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s remaining`
                : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s remaining`;
        };

        updateCountdown();

        if (endTime > Date.now()) {
            endsAtCountdownInterval = setInterval(updateCountdown, 1000);
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

        initCurrencySel.innerHTML = currencies.map(c => `
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

        lucide?.createIcons();
        tbody.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.toggle-actions-btn');

            if (!toggleBtn) return;

            const currentRow = toggleBtn.closest('tr');
            const actionsRow = currentRow.nextElementSibling;

            if (!actionsRow?.classList.contains('actions-row')) return;

            const isOpen = !actionsRow.classList.contains('hidden');

            tbody.querySelectorAll('.actions-row').forEach(row => {
                row.classList.add('hidden');
            });

            tbody.querySelectorAll('.toggle-actions-btn').forEach(btn => {
                btn.setAttribute('aria-expanded', 'false');
                btn.querySelector('[data-lucide="chevron-down"]')
                    ?.classList.remove('rotate-180');
            });

            if (!isOpen) {
                actionsRow.classList.remove('hidden');
                toggleBtn.setAttribute('aria-expanded', 'true');

                toggleBtn.querySelector('[data-lucide="chevron-down"]')
                    ?.classList.add('rotate-180');
            }
        });
        mobileEl.innerHTML = prices.map(renderMobileCard).join('');
    }


    function renderDesktopRow(p) {
        const activeClass = p.is_current
            ? 'bg-brand-ultralight'
            : 'hover:bg-slate-50';

        const symbol = p.currency_code || p.currency_symbol || 'USD';

        const saleCell = p.sale_price != null
            ? `<p class="font-semibold text-brand">${formatMoney(p.sale_price, symbol)}</p>
           <p class="text-[10px] text-slate-500">−${Math.round((1 - p.sale_price / p.price) * 100)}%</p>`
            : `<span class="text-xs text-slate-400">—</span>`;

        const activeBadge = p.is_current
            ? `<span class="mt-0.5 inline-block rounded-full bg-green-800 px-1.5 py-0.5 text-[9px] font-bold text-white">ACTIVE NOW</span>`
            : '';

        const toggleLabel = p.status === 'active' ? 'Disable' : 'Activate';

        let statusContent = `<span class="block h-3 w-3 rounded-full bg-[#1e90ff] cursor-pointer" title="Initial price"></span>`;

        if (p.is_current) statusContent = `<span class="block h-3 w-3 rounded-full bg-green-800 cursor-pointer" title="Currently active"></span>`;
        if (!p.is_current && !p.is_initial) statusContent = `<span class="block h-3 w-3 rounded-full bg-yellow-500 cursor-pointer" title="Price record"></span>`

        return `
                <tr class="${activeClass}" data-price-id="${p.id}">
                    <td class="px-5 py-3">
                    ${statusContent
            }
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
                        <button type="button"
                            class="${p.is_initial ? 'hidden' : 'inline-flex'} items-center gap-1 rounded-lg border border-slate-300
                                bg-white px-3 py-1.5 text-sm font-semibold text-slate-700
                                shadow-sm hover:bg-slate-50 toggle-actions-btn"
                            aria-expanded="false">

                            <span>Actions</span>
                            <i data-lucide="chevron-down"
                                class="h-4 w-4 transition-transform duration-200"></i>
                        </button>
                    </td>
                </tr>

                <tr class="hidden actions-row" data-for-price="${p.id}">
                    <td colspan="6"
                        class="border-b border-slate-200 bg-slate-50 px-5 py-3">

                        <div class="flex flex-wrap items-center justify-end gap-2">

                            <button type="button"
                                data-action="toggle"
                                data-price-id="${p.id}"
                                class="inline-flex items-center gap-2 rounded-lg border border-slate-300
                                    bg-white px-3 py-2 text-sm font-medium text-slate-700
                                    hover:bg-slate-100">
                                <span>${toggleLabel}</span>
                            </button>

                            <button type="button"
                                data-action="delete"
                                data-price-id="${p.id}"
                                class="inline-flex items-center gap-2 rounded-lg border border-red-200
                                    bg-white px-3 py-2 text-sm font-medium text-red-600
                                    hover:bg-red-50">
                                <span>Delete</span>
                            </button>

                        </div>
                    </td>
                </tr>
            `;
    }


    function renderMobileCard(p) {
        const activeClass = p.is_current ? 'bg-brand-ultralight' : '';
        const symbol = p.currency_code || p.currency_symbol || 'USD';

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

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const priceId = btn.dataset.priceId;
        const action = btn.dataset.action;
        if (!priceId) return;

        if (action === 'toggle') {
            btn.disabled = true;
            try {
                await axios.post(``, null, {
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
            showSnackbar({
                autoClose: false,
                type: 'warning',
                message: 'Dou you to remove this price?',
                actionText: 'Remove',
                onAction: async () => {
                    btn.disabled = true;
                    try {
                        await axios.delete(`/stores/${storeId}/variants/${variantId}/prices/${priceId}`, null, {
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
            })

        }
    });

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

    function openModal() {
        if (!modal) return;
        //form.reset();
        if (active) document.getElementById('price').value = active.price;
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

    function openInitialPriceModal() {
        if (!initPriceModal) return;
        initialPriceForm.reset();
        addInitialPriceError.classList.add('hidden');

        initPriceModal.classList.remove('hidden');
        initPriceModal.classList.add('flex');
        document.body.style.overflow = 'hidden';

    }
    function closeInitialPriceModal() {
        if (!initPriceModal) return;
        addInitialPriceError.classList.add('hidden');
        initPriceModal.classList.add('hidden');
        initPriceModal.classList.remove('flex');
        document.body.style.overflow = '';
    }

    addBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    closeInitialAddPrice?.addEventListener('click', closeInitialPriceModal);
    cancelInitialPrice?.addEventListener('click', closeInitialPriceModal)

    //backdrop?.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) closeModal();
    });

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
            starts_at: toUTC(fd.get('starts_at')),
            ends_at: toUTC(fd.get('ends_at')),
            status: fd.get('status') || 'active',
        };

        try {
            await axios.post(`/stores/${storeId}/variants/${variantId}/price`, payload, {
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

    initialPriceForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!$('#initial_price_value').val()) {
            $('#addInitialPriceError').removeClass('hidden').text('Price must be greater than 0');
            return;
        }

        try {
            submitInitialPrice.disabled = true;
            submitInitialPrice.textContent = 'Setting price...';
            const fd = new FormData(initialPriceForm);
            await axios.post(`/stores/${storeId}/variants/${variantId}/price/initial`, {
                price: fd.get('initial_price'),
                currency_id: fd.get('initial_currency_id'),
            }, {
                withCredentials: true
            });
            closeInitialPriceModal();
            Notification.showNotification({
                type: 'success',
                message: 'Price set successfully'
            });
            await load();
        } catch (error) {
            console.log(error);
            $('#addInitialPriceError').removeClass('hidden').text(error.response?.data?.message || 'Internal Server Error');
        } finally {
            submitInitialPrice.disabled = false;
            submitInitialPrice.textContent = 'Set price';
        }

    })

    retryBtn?.addEventListener('click', load);

    load();
    lucide?.createIcons();

    document.addEventListener('click', (event) => {
        const isToggleBtn = event.target.closest('.toggle-actions-btn');
        const activeDropdown = isToggleBtn ? isToggleBtn.nextElementSibling : null;
        document.querySelectorAll('.actions-dropdown').forEach((dropdown) => {
            if (dropdown !== activeDropdown) {
                dropdown.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
            }
        });
        if (activeDropdown) {
            event.stopPropagation();
            activeDropdown.classList.toggle('opacity-0');
            activeDropdown.classList.toggle('pointer-events-none');
            activeDropdown.classList.toggle('scale-95');
        }
    });

})();