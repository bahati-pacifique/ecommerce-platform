/**
 * Listing prices page — client-side hydration.
 *
 * Loads prices, variant, and currencies with axios, then renders the
 * summary cards, table, mobile cards, and pagination.
 *
 * Supports: add price, edit period, toggle status, delete.
 */
(function () {
    'use strict';

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
    const cancelBtn  = document.getElementById('cancelAddPrice');
    const form = document.getElementById('addPriceForm');
    const submitBtn  = document.getElementById('submitAddPrice');
    const submitText = document.getElementById('submitAddPriceText');
    const formError  = document.getElementById('addPriceError');
    const currencySel = document.getElementById('currency_id');

    const initPriceModal = document.getElementById('addInitialPriceModal');
    const initialPriceForm = document.getElementById('addInitialPriceForm');
    const modalInitialVariantSku = document.getElementById('modalInitialVariantSku');
    const closeInitialAddPrice = document.getElementById('closeInitialAddPrice');
    const cancelInitialPrice = document.getElementById('cancelInitialPrice');
    const addInitialPriceError = document.getElementById('addInitialPriceError');
    const submitInitialPrice = document.getElementById('submitInitialPrice');
    const initCurrencySel = document.getElementById('initial_currency_id');

    const editPriceModal = document.getElementById('editPriceModal');
    const editPriceBackdrop = document.getElementById('editPriceBackdrop');
    const closeEditPrice = document.getElementById('closeEditPrice');
    const cancelEditPrice = document.getElementById('cancelEditPrice');
    const editPriceForm = document.getElementById('editPriceForm');
    const editPriceError = document.getElementById('editPriceError');
    const editPriceSku = document.getElementById('editPriceSku');
    const editPriceValue = document.getElementById('editPriceValue');
    const editStartsInput = document.getElementById('edit_starts_at');
    const editEndsInput = document.getElementById('edit_ends_at');
    const submitEditPrice = document.getElementById('submitEditPrice');
    const submitEditPriceText = document.getElementById('submitEditPriceText');

    const pageLimitSelect = document.getElementById('pageLimitSelect');


    let active, initial;
    let currentPage = 1;
    let pageLimit = Number(pageLimitSelect.value) || 10;

    let data = {
        variant: null,
        prices: [],
        currency: null,
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    };
    let fetchController = null;
    let endsAtCountdownInterval = null;
    let editingPriceId = null;

    // ─── Format helpers ──────────────────────────────────
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
            deleted: 'bg-rose-100 text-rose-500',
        }[status] || 'bg-slate-100 text-slate-600';
    }
    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s ?? '';
        return d.innerHTML;
    }
    function toUTC(local) {
        if (!local) return null;
        const d = new Date(local);
        return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    function isoToLocal(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // ─── Row-kind helpers ────────────────────────────────
    function isBasePriceRow(p) {
        return p.is_initial === true || p.is_current_base_price === true;
    }
    function isPromotionRow(p) {
        return p.price == null && p.sale_price != null;
    }
    function isActiveNow(p) {
        return p.is_current_base_price === true || p.is_current_promotion === true;
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
    async function load(page = currentPage) {
        if (fetchController) fetchController.abort();
        fetchController = new AbortController();

        currentPage = page;
        showLoading();

        try {
            const res = await axios.get(`/stores/${storeId}/variants/${variantId}/prices`, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
                params: { page, limit: pageLimit },
                signal: fetchController.signal,
            });

            const payload = res.data?.data ?? res.data;

            if (!payload || !payload.variant) {
                throw new Error('Malformed response: no variant');
            }

            data = {
                variant:  payload.variant,
                prices:   Array.isArray(payload.prices) ? payload.prices : [],
                currency: payload.base_currency || null,
                pagination: payload.pagination || {
                    page, limit: pageLimit, total: 0, totalPages: 1,
                    hasNextPage: false, hasPreviousPage: false,
                },
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

        const sorted = [...prices].sort((a, b) => {
            const rank = (p) => {
                if (isBasePriceRow(p)) return 2;
                if (isActiveNow(p))    return 0;
                return 1;
            };
            const aRank = rank(a), bRank = rank(b);
            if (aRank !== bRank) return aRank - bRank;

            // Within rank 1: next-scheduled first (starts_at ASC)
            // Within rank 0: only one exists
            const aStart = a.starts_at ? new Date(a.starts_at).getTime() : 0;
            const bStart = b.starts_at ? new Date(b.starts_at).getTime() : 0;
            if (aRank === 0) return bStart - aStart;
            return aStart - bStart;
        });

        const hasInitialPrice = prices.some(p => p.is_initial === true);

        if (!hasInitialPrice && (currentPage === 1 || currentPage === 0) ) {
            showSnackbar({
                type: 'warning',
                autoClose: false,
                message: `<i data-lucide="triangle-exclamation-point"></i> This variant has no initial price set`,
                actionText: 'Set price',
                onAction: async () => openInitialPriceModal(),
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
        const tag = document.getElementById('salePriceModalTag');
        if (tag) tag.textContent = `(${currency?.currency_code || 'RWF'})`;

        addBtn.disabled = false;

        if (endsAtCountdownInterval) {
            clearInterval(endsAtCountdownInterval);
            endsAtCountdownInterval = null;
        }

        if (currentPage === 1) renderSummary(prices, currency);
        renderCurrencyOptions([currency].filter(Boolean));
        renderPrices(sorted);
        renderPagination();
    }

    // ─── Summary cards ───────────────────────────────────
    function renderSummary(prices, baseCurrency) {
        const priceEl = document.getElementById('currentPriceValue');
        const saleEl = document.getElementById('currentSaleBadge');
        const currencyEl = document.getElementById('currentCurrency');
        const startsEl = document.getElementById('currentStartsAt');
        const endsEl = document.getElementById('currentEndsAt');

        const baseRow  = prices.find(p => p.is_initial === true || p.is_current_base_price === true);
        const promoRow = prices.find(p => p.is_current_promotion === true);

        initial = baseRow || null;
        active  = promoRow || baseRow || null;

        if (!active) {
            priceEl.innerHTML = `<span class="text-base font-medium text-slate-400">No price set</span>`;
            saleEl.classList.add('hidden');
            saleEl.innerHTML = '';
            currencyEl.textContent = baseCurrency
                ? `${baseCurrency.currency_code} · ${baseCurrency.currency_name}`
                : '—';
            startsEl.textContent = '—';
            endsEl.textContent = '—';
            return;
        }

        const symbol = active.currency_symbol || active.currency_code || 'RWF';

        const effectivePrice = promoRow
            ? Number(promoRow.current_price ?? promoRow.sale_price)
            : Number(baseRow?.current_price ?? baseRow?.price);

        priceEl.textContent = formatMoney(effectivePrice, symbol);

        currencyEl.textContent = baseCurrency
            ? `${baseCurrency.currency_code} · ${baseCurrency.currency_name}`
            : '—';

        const whenRow = promoRow || baseRow;
        startsEl.textContent = formatDateTime(whenRow?.starts_at);
        endsEl.innerHTML = '';

        if (whenRow?.ends_at) {
            endsEl.textContent = formatDateTime(whenRow.ends_at);
            const countdownEl = document.createElement('div');
            countdownEl.className = 'mt-1 text-xs font-bold text-brand';
            endsEl.appendChild(countdownEl);
            startPriceCountdown(whenRow.ends_at, countdownEl);
        } else {
            endsEl.textContent = 'No end date';
        }

        if (promoRow) {
            const basePriceValue = Number(baseRow?.price || baseRow?.current_price || 0);
            saleEl.classList.remove('hidden');
            saleEl.innerHTML = `
                <span class="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">PROMO</span>
                <span class="text-slate-400 line-through">${formatMoney(basePriceValue, symbol)}</span>
            `;
        } else {
            saleEl.classList.add('hidden');
            saleEl.innerHTML = '';
        }
    }

    function startPriceCountdown(endsAt, container) {
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

        const update = () => {
            const remaining = endTime - Date.now();
            if (remaining <= 0) {
                container.textContent = 'Price period ended';
                clearInterval(endsAtCountdownInterval);
                endsAtCountdownInterval = null;
                return;
            }
            const days    = Math.floor(remaining / (1000 * 60 * 60 * 24));
            const hours   = Math.floor((remaining / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((remaining / (1000 * 60)) % 60);
            const seconds = Math.floor((remaining / 1000) % 60);
            const pad = v => String(v).padStart(2, '0');
            container.textContent = days > 0
                ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s remaining`
                : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s remaining`;
        };

        update();
        if (endTime > Date.now()) {
            endsAtCountdownInterval = setInterval(update, 1000);
        }
    }

    // ─── Currency dropdown ───────────────────────────────
    function renderCurrencyOptions(currencies) {
        if (!currencySel) return;
        if (!currencies || !currencies.length) {
            currencySel.innerHTML = '<option value="">No currencies available</option>';
            currencySel.disabled = true;
            return;
        }
        currencySel.disabled = false;
        const opts = currencies.map(c => `
            <option value="${c.currency_id}">${escapeHtml(c.currency_code)} — ${escapeHtml(c.currency_name)}</option>
        `).join('');
        currencySel.innerHTML = opts;
        if (initCurrencySel) initCurrencySel.innerHTML = opts;
    }

    // ─── Table + cards ───────────────────────────────────
    function renderPrices(prices) {
        const countEl = document.getElementById('pricesCount');
        countEl.textContent = `${prices.length} ${prices.length === 1 ? 'entry' : 'entries'} recorded`;

        const emptyEl  = document.getElementById('pricesEmpty');
        const tableEl  = document.getElementById('pricesTableWrap');
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

        if (!tbody.dataset.bound) {
            tbody.dataset.bound = 'true';
            tbody.addEventListener('click', (e) => {
                const toggleBtn = e.target.closest('.toggle-actions-btn');
                if (!toggleBtn) return;

                const currentRow = toggleBtn.closest('tr');
                const actionsRow = currentRow.nextElementSibling;
                if (!actionsRow?.classList.contains('actions-row')) return;

                const isOpen = !actionsRow.classList.contains('hidden');

                tbody.querySelectorAll('.actions-row').forEach(row => row.classList.add('hidden'));
                tbody.querySelectorAll('.toggle-actions-btn').forEach(btn => {
                    btn.setAttribute('aria-expanded', 'false');
                    btn.querySelector('[data-lucide="chevron-down"]')?.classList.remove('rotate-180');
                });

                if (!isOpen) {
                    actionsRow.classList.remove('hidden');
                    toggleBtn.setAttribute('aria-expanded', 'true');
                    toggleBtn.querySelector('[data-lucide="chevron-down"]')?.classList.add('rotate-180');
                }
            });
        }

        mobileEl.innerHTML = prices.map(renderMobileCard).join('');
    }

    function renderDesktopRow(p) {
        const baseRow   = isBasePriceRow(p);
        const promo     = isPromotionRow(p);
        const activeNow = isActiveNow(p);
        const symbol    = p.currency_symbol || p.currency_code || 'RWF';

        const rowClass = activeNow ? 'bg-brand-ultralight' : 'hover:bg-slate-50';

        let priceCell;
        if (baseRow) {
            priceCell = `<p class="font-semibold text-slate-900">${formatMoney(p.price, symbol)}</p>
                         <p class="text-[10px] text-slate-500">Base price</p>`;
        } else if (promo) {
            priceCell = `<p class="font-semibold text-brand">${formatMoney(p.sale_price, symbol)}</p>
                         <p class="text-[10px] text-slate-500">Sale price</p>`;
        } else {
            priceCell = `<span class="text-xs text-slate-400">—</span>`;
        }

        let discountCell = `<span class="text-xs text-slate-400">—</span>`;
        if (promo && p.discount_percentage > 0) {
            discountCell = `<span class="font-semibold text-brand">−${p.discount_percentage}%</span>`;
        }

        let dotColor = 'bg-slate-400';
        let dotTitle = 'Scheduled';
        if (p.is_initial === true)           { dotColor = 'bg-blue-500';   dotTitle = 'Initial price'; }
        if (activeNow && baseRow)            { dotColor = 'bg-emerald-600'; dotTitle = 'Active base price'; }
        if (activeNow && promo)              { dotColor = 'bg-amber-500';   dotTitle = 'Active promotion'; }
        if (!activeNow && promo)             { dotColor = 'bg-slate-400';   dotTitle = 'Scheduled or expired'; }

        const activeBadge = activeNow
            ? `<span class="mt-0.5 inline-block rounded-full ${promo ? 'bg-amber-500' : 'bg-emerald-700'} px-1.5 py-0.5 text-[9px] font-bold text-white">
                   ${promo ? 'PROMO NOW' : 'BASE NOW'}
               </span>`
            : '';

        const nextBadge = p.is_next
            ? `<span class="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#808000] px-1.5 py-0.5 text-[11px] font-bold text-white">Next sale</span>`
            : '';

        const toggleLabel = p.status === 'active' ? 'Disable' : 'Activate';
        const isImmutable = p.is_initial === true;

        return `
            <tr class="${rowClass}" data-price-id="${p.id}">
                <td class="px-5 py-3">
                    <span class="block h-3 w-3 rounded-full ${dotColor}" title="${escapeHtml(dotTitle)}"></span>
                </td>
                <td class="px-5 py-3">${priceCell}</td>
                <td class="px-5 py-3">${discountCell}</td>
                <td class="px-5 py-3">
                    <p class="text-xs text-slate-700">${periodLabel(p.starts_at, p.ends_at)}</p>
                    ${activeBadge}
                    ${nextBadge}
                </td>
                <td class="px-5 py-3">
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusTone(p.status)}">
                        ${escapeHtml(p.status)}
                    </span>
                </td>
                <td class="px-5 py-3">
                    <div class="flex flex-col gap-0.5 text-[10px] text-slate-500">
                        <span>${formatDateTime(p.created_at)}</span>
                        <span>${p.updated_at ? formatDateTime(p.updated_at) : '—'}</span>
                    </div>
                </td>
                <td class="px-5 py-3 text-right">
                    <button type="button"
                        class="${isImmutable ? 'hidden' : 'inline-flex'} items-center gap-1 rounded-lg border border-slate-300
                            bg-white px-3 py-1.5 text-sm font-semibold text-slate-700
                            shadow-sm hover:bg-slate-50 toggle-actions-btn"
                        aria-expanded="false">
                        <span>Actions</span>
                        <i data-lucide="chevron-down" class="h-4 w-4 transition-transform duration-200"></i>
                    </button>
                </td>
            </tr>
            <tr class="hidden actions-row" data-for-price="${p.id}">
                <td colspan="7" class="border-b border-slate-200 bg-slate-50 px-5 py-3">
                    <div class="flex flex-wrap items-center justify-end gap-2">

                        <button type="button"
                            data-action="edit"
                            data-price-id="${p.id}"
                            class="inline-flex items-center gap-2 rounded-lg border border-slate-300
                                bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                            <i data-lucide="pencil" class="h-3.5 w-3.5"></i>
                            <span>Edit period</span>
                        </button>

                        <button type="button"
                            data-action="toggle"
                            data-price-id="${p.id}"
                            data-status="${p.status}"
                            class="inline-flex items-center gap-2 rounded-lg border border-slate-300
                                bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                            <span>${toggleLabel}</span>
                        </button>

                        <button type="button"
                            data-action="delete"
                            data-price-id="${p.id}"
                            class="${p.status !== 'deleted' ? 'inline-flex' : 'hidden'} items-center gap-2 rounded-lg border border-red-200
                                bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                            <span>Remove</span>
                        </button>
                    </div>
                </td>
            </tr>`;
    }

    function renderMobileCard(p) {
        const baseRow   = isBasePriceRow(p);
        const promo     = isPromotionRow(p);
        const activeNow = isActiveNow(p);
        const symbol    = p.currency_symbol || p.currency_code || 'RWF';

        const cardClass = activeNow ? 'bg-brand-ultralight' : '';

        const priceLine = baseRow
            ? `<div class="flex items-baseline gap-2">
                   <p class="text-lg font-extrabold text-slate-950">${formatMoney(p.price, symbol)}</p>
                   <span class="text-[10px] font-semibold text-slate-500">BASE</span>
               </div>`
            : `<div class="flex items-baseline gap-2">
                   <p class="text-lg font-extrabold text-brand">${formatMoney(p.sale_price, symbol)}</p>
                   <span class="text-[10px] font-semibold text-slate-500">PROMO</span>
                   ${p.discount_percentage > 0
                       ? `<span class="text-[10px] font-bold text-brand">−${p.discount_percentage}%</span>`
                       : ''}
               </div>`;

        const badge = activeNow
            ? `<span class="rounded-full ${promo ? 'bg-amber-500' : 'bg-emerald-700'} px-1.5 py-0.5 text-[9px] font-bold text-white">
                   ${promo ? 'PROMO NOW' : 'BASE NOW'}
               </span>`
            : '';

        const nextBadge = p.is_next
            ? `<span class="rounded-full bg-[#808000] px-1.5 py-0.5 text-[9px] font-bold text-white">NEXT</span>`
            : '';

        const toggleLabel = p.status === 'active' ? 'Disable' : 'Activate';
        const toggleClass = p.status === 'active'
            ? 'border-slate-200 bg-white text-slate-700'
            : 'border-brand bg-brand text-white';
        const isImmutable = p.is_initial === true;

        return `
            <div class="p-4 ${cardClass}" data-price-id="${p.id}">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">${priceLine}</div>
                    <div class="flex shrink-0 flex-col items-end gap-1">
                        <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusTone(p.status)}">
                            ${escapeHtml(p.status)}
                        </span>
                        ${badge}
                        ${nextBadge}
                    </div>
                </div>

                <p class="mt-2 text-xs text-slate-600">
                    ${periodLabel(p.starts_at, p.ends_at)}
                </p>

                ${isImmutable ? '' : `
                    <div class="mt-3 flex gap-2">
                        <button type="button"
                                data-action="edit"
                                data-price-id="${p.id}"
                                class="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                            Edit period
                        </button>
                        <button type="button"
                                data-action="toggle"
                                data-price-id="${p.id}"
                                data-status="${p.status}"
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
                `}
            </div>`;
    }

    // ─── Pagination ──────────────────────────────────────
    function renderPagination() {
        const wrap = document.getElementById('pricesPagination');
        if (!wrap) return;

        const { page, totalPages, total, limit, hasNextPage, hasPreviousPage } = data.pagination;

        if (totalPages <= 1) {
            wrap.classList.add('hidden');
            wrap.innerHTML = '';
            return;
        }

        wrap.classList.remove('hidden');

        const from = (page - 1) * limit + 1;
        const to   = Math.min(page * limit, total);

        wrap.innerHTML = `
            <div class="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p class="text-xs text-slate-500">
                    Showing <span class="font-semibold text-slate-700">${from}–${to}</span>
                    of <span class="font-semibold text-slate-700">${total}</span>
                </p>
                <div class="flex items-center gap-1">
                    <button type="button"
                            data-page="prev"
                            ${!hasPreviousPage ? 'disabled' : ''}
                            class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                        Previous
                    </button>

                    <span class="mx-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        ${page} / ${totalPages}
                    </span>

                    <button type="button"
                            data-page="next"
                            ${!hasNextPage ? 'disabled' : ''}
                            class="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                        Next
                    </button>
                </div>
            </div>
        `;

        if (!wrap.dataset.bound) {
            wrap.dataset.bound = 'true';
            wrap.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-page]');
                if (!btn || btn.disabled) return;
                const dir = btn.dataset.page;
                const { page, hasNextPage, hasPreviousPage } = data.pagination;
                if (dir === 'prev' && hasPreviousPage) load(page - 1);
                if (dir === 'next' && hasNextPage)     load(page + 1);
            });
        }
    }

    // ─── Delegated actions ───────────────────────────────
    const statusMap = {
        active:   { message: 'Do you want to disable this price?',  action: 'Disable', adj: 'Disabling...' },
        disabled: { message: 'Do you want to activate this price?', action: 'Activate', adj: 'Activating...' },
        deleted: { message: 'Do you want to activate this price?', action: 'Activate', adj: 'Activating...' },
        inactive: { message: 'Do you want to activate this price?', action: 'Activate', adj: 'Activating...' },
    };

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const priceId = btn.dataset.priceId;
        const action  = btn.dataset.action;
        if (!priceId) return;

        // ── Edit ─────────────────────────────────────────
        if (action === 'edit') {
            const price = data.prices.find(p => p.id === priceId);
            if (!price) {
                flashError('Price not found.');
                return;
            }
            openEditModal(price);
            return;
        }

        // ── Toggle status ────────────────────────────────
        if (action === 'toggle') {
            const currentStatus = btn.dataset.status;
            const conf = statusMap[currentStatus] || {
                message: 'Update this price?',
                action:  'Confirm',
                adj: 'Processing...'
            };

            showSnackbar({
                autoClose: false,
                type: 'warning',
                message: conf.message,
                actionText: conf.action,
                onAction: async () => {
                    btn.disabled = true;
                    btn.textContent = conf.adj;
                    try {
                        await axios.patch(
                            `/stores/${storeId}/variants/${variantId}/prices/${priceId}/s`,
                            null,
                            { withCredentials: true, headers: { Accept: 'application/json' } }
                        );
                        await load();
                    } catch (err) {
                        console.error('[toggle] failed:', err);
                        btn.disabled = false;
                        btn.textContent = conf.action;
                        flashError(err.response?.data?.message || 'Could not update price status.');
                    }
                },
            });
            return;
        }

        // ── Delete ───────────────────────────────────────
        if (action === 'delete') {
            showSnackbar({
                autoClose: false,
                type: 'warning',
                message: 'Do you want to remove this price entry?',
                actionText: 'Remove',
                onAction: async () => {
                    btn.disabled = true;
                    btn.textContent = 'Removing...';
                    try {
                        await axios.delete(
                            `/stores/${storeId}/variants/${variantId}/prices/${priceId}`,
                            { withCredentials: true, headers: { Accept: 'application/json' } }
                        );
                        // If this was the last item on the page and we're past page 1, go back one
                        if (data.prices.length === 1 && currentPage > 1) {
                            currentPage--;
                        }
                        await load(currentPage);
                    } catch (err) {
                        console.error('[delete] failed:', err);
                        btn.disabled = false;
                        btn.textContent = 'Remove'
                        flashError(err.response?.data?.message || 'Could not delete price.');
                    }
                },
            });
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

    // ─── Edit price modal ────────────────────────────────
    function openEditModal(price) {
        if (!editPriceModal || !price) return;

        editingPriceId = price.id;

        editPriceSku.textContent = data.variant?.variant_sku || 'variant';

        const symbol = price.currency_symbol || price.currency_code || 'RWF';
        const displayPrice = price.price != null ? price.price : price.sale_price;
        editPriceValue.textContent = formatMoney(displayPrice, symbol) +
            (price.is_initial ? ' (base price)' : ' (promotion)');

        editStartsInput.value = isoToLocal(price.starts_at);
        editEndsInput.value   = isoToLocal(price.ends_at);

        editPriceError.classList.add('hidden');
        editPriceError.textContent = '';
        clearEditErrors();

        editPriceModal.classList.remove('hidden');
        editPriceModal.classList.add('flex');
        document.body.style.overflow = 'hidden';

        setTimeout(() => editStartsInput.focus(), 50);
    }
    function closeEditModal() {
        if (!editPriceModal) return;
        editPriceModal.classList.add('hidden');
        editPriceModal.classList.remove('flex');
        document.body.style.overflow = '';
        editingPriceId = null;
    }

    function clearEditErrors() {
        editPriceForm.querySelectorAll('[data-edit-error-for]').forEach(el => {
            el.textContent = '';
            el.classList.add('hidden');
        });
    }
    function setEditFieldError(field, msg) {
        const el = editPriceForm.querySelector(`[data-edit-error-for="${field}"]`);
        if (el) {
            el.textContent = msg;
            el.classList.remove('hidden');
        }
    }

    // ─── Modal wiring ────────────────────────────────────
    addBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    closeInitialAddPrice?.addEventListener('click', closeInitialPriceModal);
    cancelInitialPrice?.addEventListener('click', closeInitialPriceModal);
    closeEditPrice?.addEventListener('click', closeEditModal);
    cancelEditPrice?.addEventListener('click', closeEditModal);
    editPriceBackdrop?.addEventListener('click', closeEditModal);

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (modal && !modal.classList.contains('hidden'))                     closeModal();
        if (initPriceModal && !initPriceModal.classList.contains('hidden'))   closeInitialPriceModal();
        if (editPriceModal && !editPriceModal.classList.contains('hidden'))   closeEditModal();
    });

    // ─── Field errors (add price form) ───────────────────
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

        const saleRaw = document.getElementById('sale_price').value;
        if (!saleRaw) {
            setFieldError('sale_price', 'A valid price greater than 0 is required.');
            return false;
        }

        const sale = Number(saleRaw);
        const basePrice = Number(initial?.price || initial?.current_price || 0);

        if (!Number.isFinite(sale) || sale <= 0) {
            setFieldError('sale_price', 'Sale price must be positive.');
            ok = false;
        } else if (basePrice > 0 && sale > basePrice) {
            setFieldError('sale_price', `Sale price cannot exceed base price (${formatMoney(basePrice, initial?.currency_symbol || 'RWF')}).`);
            ok = false;
        }

        const startsRaw = document.getElementById('starts_at').value;
        if (!startsRaw) {
            setFieldError('starts_at', 'Start date is required.');
            ok = false;
        }

        const endsRaw = document.getElementById('ends_at').value;
        if (startsRaw && endsRaw && new Date(endsRaw) <= new Date(startsRaw)) {
            setFieldError('ends_at', 'End date must be after start date.');
            ok = false;
        }

        return ok;
    }

    // ─── Add price submit ────────────────────────────────
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate()) return;

        submitBtn.disabled = true;
        submitText.textContent = 'Adding…';
        formError.classList.add('hidden');

        const fd = new FormData(form);
        const payload = {
            currency_id: fd.get('currency_id'),
            price:       null,
            sale_price:  fd.get('sale_price'),
            starts_at:   toUTC(fd.get('starts_at')),
            ends_at:     toUTC(fd.get('ends_at')),
            status:      fd.get('status') || 'active',
        };

        try {
            await axios.post(
                `/stores/${storeId}/variants/${variantId}/price`,
                payload,
                { withCredentials: true, headers: { Accept: 'application/json' } }
            );
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

    // ─── Edit period submit ──────────────────────────────
    editPriceForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!editingPriceId) return;

        clearEditErrors();

        const startsVal = editStartsInput.value;
        const endsVal   = editEndsInput.value;

        if (startsVal && endsVal && new Date(endsVal) <= new Date(startsVal)) {
            setEditFieldError('ends_at', 'End date must be after start date.');
            return;
        }

        submitEditPrice.disabled = true;
        submitEditPriceText.textContent = 'Saving…';
        editPriceError.classList.add('hidden');

        try {
            await axios.patch(
                `/stores/${storeId}/variants/${variantId}/prices/${editingPriceId}/p`,
                {
                    starts_at: startsVal ? new Date(startsVal).toISOString() : null,
                    ends_at:   endsVal   ? new Date(endsVal).toISOString()   : null,
                },
                { withCredentials: true, headers: { Accept: 'application/json' } }
            );

            closeEditModal();
            await load();
        } catch (err) {
            const errs = err.response?.data?.errors;
            if (errs) Object.entries(errs).forEach(([k, v]) => setEditFieldError(k, v));
            editPriceError.textContent = err.response?.data?.message || 'Could not update price.';
            editPriceError.classList.remove('hidden');
        } finally {
            submitEditPrice.disabled = false;
            submitEditPriceText.textContent = 'Save changes';
        }
    });

    // ─── Initial price submit ────────────────────────────
    initialPriceForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const priceVal = document.getElementById('initial_price_value').value;
        if (!priceVal || Number(priceVal) <= 0) {
            addInitialPriceError.classList.remove('hidden');
            addInitialPriceError.textContent = 'Price must be greater than 0.';
            return;
        }

        try {
            submitInitialPrice.disabled = true;
            submitInitialPrice.textContent = 'Setting price…';
            const fd = new FormData(initialPriceForm);
            await axios.post(
                `/stores/${storeId}/variants/${variantId}/price/initial`,
                {
                    price:       fd.get('initial_price'),
                    currency_id: fd.get('initial_currency_id'),
                },
                { withCredentials: true, headers: { Accept: 'application/json' } }
            );
            closeInitialPriceModal();
            Notification.showNotification({ type: 'success', message: 'Price set successfully' });
            await load();
        } catch (error) {
            console.error(error);
            addInitialPriceError.classList.remove('hidden');
            addInitialPriceError.textContent = error.response?.data?.message || 'Internal Server Error';
        } finally {
            submitInitialPrice.disabled = false;
            submitInitialPrice.textContent = 'Set price';
        }
    });

    retryBtn?.addEventListener('click', () => load(currentPage));

    pageLimitSelect?.addEventListener('change', ()=>{
        currentPage = 1;
        pageLimit = Number(pageLimitSelect.value);
        load(currentPage);
    });

    load(1);
    lucide?.createIcons();
})();