// ============================================================
// BRANDS MANAGER
// ============================================================
class BrandsManager {
    constructor(options = {}) {
        this.api = {
            base: `${protocal}api.${domainName}`
        };

        this.root = options.root || document;

        // ---------- pagination / filter state ----------
        this.page = 1;
        this.limit = 20;
        this.search = '';
        this.view = 'all';

        this.submitRequest = this.submitRequest.bind(this);

        this.pagination = {
            page: 1,
            limit: 20,
            total: 0,
            total_pages: 1,
            has_next_page: false,
            has_previous_page: false
        };

        // ---------- data state ----------
        this.loaded = false;
        this.loading = false;
        this.brands = [];       // current page only
        this.requests = [];     // vendor's requested brands (separate fetch, fail-soft)
        this.submitting = false;
        this.activeBrand = null;

        this.els = null;

        // Debounced search → server-side, resets page to 1
        this._onSearchInput = this._debounce(async (e) => {
            const v = e.target.value;
            this.els.clearSearch?.classList.toggle('hidden', !v);

            const next = v.trim();
            if (next === this.search) return;
            this.search = next;
            this.page = 1;

            this.loading = true;
            this.els.loading.classList.remove('hidden');
            this.els.error.classList.add('hidden');

            try {
                const response = await axios.get(`${this.api.base}/brands/s`, {
                    params: { key: this.search, page: this.page, limit: this.limit },
                    withCredentials: true
                });

                const payload = response.data || {};
                this.brands = Array.isArray(payload.brands) ? payload.brands : [];
                this.pagination = this._normalizePagination(payload.pagination, this.brands.length);
                this.page = this.pagination.page;
                this.limit = this.pagination.limit;

                this.loaded = true;
                this.render();
            } catch (error) {
                console.error('[BrandsManager.search]', error);
                this.els.error.classList.remove('hidden');
                this.els.errorMsg.textContent = this._humanizeError(error);
            } finally {
                this.loading = false;
                this.els.loading.classList.add('hidden');
            }
        }, 500);

        this._onKeydown = (e) => {
            if (e.key !== 'Escape') return;
            if (!this.els.modal.classList.contains('hidden')) {
                this.closeModal();
            } else if (!this.els.brandDetailModal.classList.contains('hidden')) {
                this.closeDetail();
            }
        };
    }

    _queryDom() {
        const $ = (s) => this.root.querySelector(s);
        const $$ = (s) => Array.from(this.root.querySelectorAll(s));

        return {
            refreshBtn: $('#brandsRefreshBtn'),
            requestBtn: $('#requestBrandBtn'),

            totalCount: $('#brandTotalCount'),
            pendingCount: $('#brandPendingCount'),
            approvedCount: $('#brandApprovedCount'),

            search: $('#brandSearch'),
            clearSearch: $('#clearBrandSearch'),
            viewToggles: $$('.view-toggle'),

            loading: $('#brandsLoading'),
            error: $('#brandsError'),
            errorMsg: $('#brandsErrorMsg'),
            retryBtn: $('#brandsRetryBtn'),

            empty: $('#brandsEmpty'),
            emptyMsg: $('#brandsEmptyMsg'),
            emptyRequestBtn: $('#brandsEmptyRequestBtn'),

            grid: $('#brandsGrid'),
            footerHint: $('#brandsFooterHint'),

            // request modal
            modal: $('#requestModal'),

            requestFormContainer: $('#requestFormContainer'),

            modalForm: $('#requestForm'),
            requestModalTitle: $('#requestModalTitle'),
            modalTitle: $('#requestTitle'),
            modalReason: $('#requestReason'),
            modalError: $('#requestError'),
            modalErrorMsg: $('#requestErrorMsg'),
            modalSubmitBtn: $('#submitRequestBtn'),
            closeModalBtn: $('#closeRequestBtn'),
            cancelModalBtn: $('#cancelRequestBtn'),
            dismissOverlay: $('[data-dismiss="brand-request"]'),

            // pagination
            paginationWrap: $('#brandsPagination'),
            paginationInfo: $('#brandPaginationInfo'),
            pageInfo: $('#brandPageInfo'),
            prevBtn: $('#brandPrevBtn'),
            nextBtn: $('#brandNextBtn'),
            limitSelect: $('#brandLimitSelect'),

            // detail modal
            brandDetailModal: $('#detailModal'),
            brandDetailTitle: $('#detailTitle'),
            brandDetailMeta: $('#detailMeta'),
            brandDetailLogo: $('#detailLogo'),
            brandDetailWebsite: $('#detailWebsite'),
            brandDetailSlug: $('#detailSlug'),
            brandDetailDescription: $('#detailDescription'),
            brandDetailMetaSection: $('#brandDetailMetaSection'),
            brandDetailMetaList: $('#brandDetailMetaList'),
            brandDetailId: $('#detailId'),
            brandDetailUpdated: $('#detailUpdated'),
            brandDetailListingsRow: $('#detailListingsRow'),
            brandDetailListings: $('#detailListings'),
            brandDetailRequestSection: $('#detailRequestSection'),
            brandDetailRequest: $('#detailRequest'),
            brandDetailRequestBtn: $('#detailRequestBtn'),
            closeBrandDetailBtn: $('#closedetailBtn'),
            brandDetailCloseFooterBtn: $('#detailCloseFooterBtn'),
            brandDetailDismiss: $('[data-dismiss="brand-detail"]'),

            sidebarLink: document.querySelector('.sidebar-link[data-tab="brands"]')
        };
    }

    _resumed() {
        this._wire();
        this.els.modalTitle.placeholder = 'Ex. Samsung';
        this.els.requestModalTitle.textContent = 'Requesting Product Brand';
    }

    // ==========================================================
    // Wiring
    // ==========================================================
    _wire() {

        $('#requestFormContainer').empty();
        //Attach dynamic form
        $('#requestFormContainer').html(`
            <form id="requestForm" class="p-6 space-y-4" novalidate>
              <div class="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-start gap-2.5">
                <i data-lucide="info" class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"></i>
                <p class="text-xs text-blue-800 leading-relaxed">
                  Requests are reviewed by the COCOCE team. You'll be notified once approved.
                </p>
              </div>

              <div class="field" data-field="_title">
                <label for="requestTitle" class="block text-sm font-medium text-gray-700 mb-1.5">
                  Name <span class="text-brand">*</span>
                </label>
                <input id="requestTitle" name="_title" type="text" maxlength="255" autocomplete="off" placeholder="e.g. Smartwatches" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10">
                <p class="field-msg hidden mt-1.5 text-xs text-red-600"></p>
              </div>

              <div class="field" data-field="reason">
                <label for="requestReason" class="block text-sm font-medium text-gray-700 mb-1.5">
                  Why do you need it? <span class="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea id="requestReason" name="reason" rows="3" placeholder="Describe the products you'd list under this category..." class="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 resize-y min-h-[80px]"></textarea>
              </div>

              <!-- Inline submit error -->
              <div id="requestError" class="hidden rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                <i data-lucide="alert-circle" class="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"></i>
                <p id="requestErrorMsg" class="text-xs text-red-700"></p>
              </div>

              <div class="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button type="button" id="cancelRequestBtn" class="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" id="submitRequestBtn" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition disabled:opacity-60 disabled:cursor-not-allowed">
                  Submit Request
                </button>
              </div>
            </form>
        `);

        this.els = this._queryDom();

        this.els.sidebarLink?.addEventListener('click', this._onSidebarClick);
        this.els.refreshBtn?.addEventListener('click', () => this.load(true));
        this.els.retryBtn?.addEventListener('click', () => this.load(true));

        this.els.search?.addEventListener('input', this._onSearchInput);
        this.els.clearSearch?.addEventListener('click', () => this._clearSearch());

        this.els.viewToggles.forEach(btn => {
            btn.addEventListener('click', () => this.setView(btn.dataset.view));
        });

        // Pagination
        this.els.prevBtn?.addEventListener('click', () => {
            if (!this.pagination.has_previous_page) return;
            this.page = Math.max(1, this.page - 1);
            this.load(true);
        });
        this.els.nextBtn?.addEventListener('click', () => {
            if (!this.pagination.has_next_page) return;
            this.page = this.page + 1;
            this.load(true);
        });
        this.els.limitSelect?.addEventListener('change', (ev) => {
            this.limit = parseInt(ev.target.value, 10) || 20;
            this.page = 1;
            this.load(true);
        });

        // Request modal openers
        this.els.requestBtn?.addEventListener('click', () => this.openModal());
        this.els.emptyRequestBtn?.addEventListener('click', () => this.openModal());

        // Request modal closers
        this.els.closeModalBtn?.addEventListener('click', () => this.closeModal());
        this.els.cancelModalBtn?.addEventListener('click', () => this.closeModal());
        this.els.dismissOverlay?.addEventListener('click', () => this.closeModal());

        document.addEventListener('keydown', this._onKeydown);
        this.els.modalForm?.removeEventListener('submit', this.submitRequest);
        this.els.modalForm?.addEventListener('submit', (ev) => this.submitRequest(ev));

        // Delegated card click → detail modal
        this.els.grid?.addEventListener('click', (ev) => {
            const card = ev.target.closest('[data-brand-id]');
            if (!card) return;
            this.openDetail(card.dataset.brandId);
        });

        // Keyboard activation
        this.els.grid?.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            const card = ev.target.closest('[data-brand-id]');
            if (!card) return;
            ev.preventDefault();
            this.openDetail(card.dataset.brandId);
        });

        // Detail modal closers
        this.els.closeBrandDetailBtn?.addEventListener('click', () => this.closeDetail());
        this.els.brandDetailCloseFooterBtn?.addEventListener('click', () => this.closeDetail());
        this.els.brandDetailDismiss?.addEventListener('click', () => this.closeDetail());

        // Detail → "Request this brand" CTA
        this.els.brandDetailRequestBtn?.addEventListener('click', () => {
            const brand = this.activeBrand;
            this.closeDetail();
            this.openModal();
            if (brand) {
                this.els.modalTitle.value = brand.title || '';
                this.els.modalReason.value = `I want to list products under ${brand.title || ''}`;
            }
        });

        // Prefill reason as user types the brand name (respect manual edits)
        this.els.modalTitle?.addEventListener('keyup', (ev) => {
            setTimeout(() => {
                if (!this.els.modalReason.dataset.touched) {
                    this.els.modalReason.value = ev.target.value ? `I want to list ${ev.target.value}` : '';
                }
            }, 100);
        });
        this.els.modalReason?.addEventListener('input', () => {
            this.els.modalReason.dataset.touched = '1';
        });

        this._onSidebarClick = () => this.load();
        this.setView('all');
        this.load(true);
    }

    destroy() {
        const e = this.els;
        e.sidebarLink?.removeEventListener('click', this._onSidebarClick);
        e.search?.removeEventListener('input', this._onSearchInput);
        document.removeEventListener('keydown', this._onKeydown);
    }

    // ==========================================================
    // Load
    // ==========================================================
    async load(force = false) {
        if (this.loading) return;
        if (this.loaded && !force) return;

        this.loading = true;
        this.els.loading.classList.remove('hidden');
        this.els.error.classList.add('hidden');
        this.render();

        try {
            const params = new URLSearchParams({
                page: String(this.page),
                limit: String(this.limit)
            });
            if (this.search) params.set('q', this.search);

            const [brandRes, reqRes] = await Promise.allSettled([
                axios.get(
                    `${this.api.base}/brands/all?${params.toString()}`,
                    { withCredentials: true }
                ),
                axios.get(
                    `${this.api.base}/brands/requested`,
                    { withCredentials: true }
                )
            ]);

            // ---------- Brands (required) ----------
            if (brandRes.status === 'rejected') throw brandRes.reason;

            const payload = brandRes.value.data || {};

            if (Array.isArray(payload.brands)) {
                this.brands = payload.brands;
                this.pagination = this._normalizePagination(payload.pagination, payload.brands.length);
                this.page = this.pagination.page;
                this.limit = this.pagination.limit;
            } else if (Array.isArray(payload.data)) {
                this.brands = payload.data;
                this.pagination = this._normalizePagination(payload.pagination, payload.data.length);
                this.page = this.pagination.page;
                this.limit = this.pagination.limit;
            } else {
                this.brands = [];
                this.pagination = this._normalizePagination(null, 0);
            }

            // ---------- Requests (fail-soft) ----------
            if (reqRes.status === 'fulfilled') {
                const rp = reqRes.value.data || {};
                this.requests = Array.isArray(rp.data) ? rp.data
                    : Array.isArray(rp.brands) ? rp.brands
                        : Array.isArray(rp.requests) ? rp.requests
                            : Array.isArray(rp) ? rp
                                : [];
            } else {
                console.warn('[BrandsManager] requests fetch failed:', reqRes.reason);
                this.requests = [];
            }

            this.loaded = true;
            this.loading = false;
            this.render();

        } catch (err) {
            console.error('[BrandsManager.load]', err);
            this.loading = false;
            this.loaded = false;
            this.els.loading.classList.add('hidden');
            this.els.error.classList.remove('hidden');
            this.els.errorMsg.textContent = this._humanizeError(err);
            this.els.paginationWrap?.classList.add('hidden');
            this._refreshIcons();
        }
    }

    // ==========================================================
    // Render
    // ==========================================================
    render() {
        const e = this.els;

        e.loading.classList.toggle('hidden', !this.loading);
        if (this.loading) {
            e.empty.classList.add('hidden');
            e.grid.innerHTML = '';
            return;
        }

        const list = this.filteredBrands();
        this.updateStats();

        if (list.length === 0) {
            e.grid.innerHTML = '';
            e.empty.classList.remove('hidden');
            e.emptyMsg.textContent = this.search
                ? `No brands match "${this.search}".`
                : this.view === 'mine'
                    ? "You haven't requested any brands yet."
                    : 'No brands are available right now.';
            e.paginationWrap?.classList.add('hidden');
            this._refreshIcons();
            return;
        }

        e.empty.classList.add('hidden');
        e.grid.innerHTML = list.map(b => this.renderCard(b)).join('');
        this.renderPagination();
        this._refreshIcons();
    }

    renderCard(brand) {
        // Request pill: prefer an explicit match in `this.requests`, else
        // fall back to the brand's own request metadata.
        const req = this.getRequestForTitle(brand.title);
        const requestStatus = req?.status
            || (brand.requested_by ? brand.status : null);

        const pill = requestStatus
            ? `<span class="item-pill ${this._requestPillClass(requestStatus)}">
           <i data-lucide="${this._requestIcon(requestStatus)}" class="w-3 h-3"></i>
           ${this._requestLabel(requestStatus)}
         </span>`
            : '';

        const logo = brand.logo_url
            ? `<img src="${this._escapeHtml(brand.logo_url)}"
              alt="${this._escapeHtml(brand.title)} logo"
              class="w-9 h-9 rounded-lg border border-gray-100 bg-white object-contain p-1 flex-shrink-0"
              loading="lazy"
              data-brand-logo-fallback="1">`
            : `<div class="w-9 h-9 rounded-lg bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
           <i data-lucide="tags" class="w-4 h-4"></i>
         </div>`;

        const domain = brand.website ? this._prettyDomain(brand.website) : '';
        const stamp = brand.updated_at || brand.created_at;

        return `
      <div class="item-card rounded-xl p-4 flex flex-col gap-2 cursor-pointer"
           data-brand-id="${brand.id}"
           role="button"
           tabindex="0"
           aria-label="View details for ${this._escapeHtml(brand.title)}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex gap-2.5 min-w-0">
            ${logo}
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate" title="${this._escapeHtml(brand.title)}">
                ${this._highlight(brand.title)}
              </p>
              ${domain ? `<p class="text-[11px] text-gray-500 truncate">${this._escapeHtml(domain)}</p>` : ''}
              <p class="text-[11px] text-gray-400">
                ${stamp ? `Updated: ${formatDate(stamp)}` : ''}
              </p>
            </div>
          </div>
          ${pill}
        </div>
      </div>
    `;
    }

    renderPagination() {
        const wrap = this.els.paginationWrap;
        if (!wrap) return;

        const p = this.pagination;
        const totalPages = Math.max(1, p.total_pages || 1);
        const start = p.total === 0 ? 0 : (p.page - 1) * p.limit + 1;
        const end = Math.min(p.page * p.limit, p.total);

        this.els.paginationInfo.textContent = `Showing ${start}–${end} of ${p.total}`;
        this.els.pageInfo.textContent = `Page ${p.page} of ${totalPages}`;

        this.els.prevBtn.disabled = !p.has_previous_page;
        this.els.nextBtn.disabled = !p.has_next_page;

        const shouldShow = p.total > p.limit;
        wrap.classList.toggle('hidden', !shouldShow);
    }

    updateStats() {
        this.els.totalCount.textContent = this.pagination.total ?? this.brands.length;

        this.els.pendingCount.textContent =
            this.requests.filter(r => r.status === 'requested').length;

        this.els.approvedCount.textContent =
            this.requests.filter(r => r.status === 'active').length;
    }

    // ==========================================================
    // Filtering
    // ==========================================================
    setView(v) {
        this.view = v;
        this.els.viewToggles.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === v);
        });
        this.render();
    }

    filteredBrands() {
        // Server already paginates; only the "mine" view filters client-side.
        if (this.view !== 'mine') return this.brands;
        return this.requests;
    }

    getRequestForTitle(title) {
        const t = String(title || '').toLowerCase().trim();
        if (!t) return null;
        return this.requests.find(
            r => String(r.title ?? r._title ?? '').toLowerCase().trim() === t
        );
    }

    // ==========================================================
    // Detail modal
    // ==========================================================
    openDetail(brandId) {
        // Look in both lists — "mine" view may show request-only rows.
        const brand = this.brands.find(b => String(b.id) === String(brandId))
            || this.requests.find(b => String(b.id) === String(brandId));
        if (!brand) return;

        this.activeBrand = brand;
        this._renderDetail(brand);

        this.els.brandDetailModal.classList.remove('hidden');
        this.els.brandDetailModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this._refreshIcons();

        setTimeout(() => this.els.closeBrandDetailBtn?.focus(), 50);
    }

    closeDetail() {
        this.els.brandDetailModal.classList.add('hidden');
        this.els.brandDetailModal.style.display = 'none';
        document.body.style.overflow = '';
        this.activeBrand = null;
    }

    _renderDetail(brand) {
        const e = this.els;

        // ---------- Title + meta line ----------
        e.brandDetailTitle.textContent = brand.title || 'Brand';
        e.brandDetailMeta.textContent = brand.updated_at
            ? `Updated ${formatDate(brand.updated_at)}`
            : brand.created_at
                ? `Added ${formatDate(brand.created_at)}`
                : `Brand #${brand.id}`;

        // ---------- Logo ----------
        if (e.brandDetailLogo) {
            if (brand.logo_url) {
                e.brandDetailLogo.src = brand.logo_url;
                e.brandDetailLogo.alt = `${brand.title} logo`;
                e.brandDetailLogo.style.display = '';
                e.brandDetailLogo.onerror = () => { e.brandDetailLogo.style.display = 'none'; };
            } else {
                e.brandDetailLogo.style.display = 'none';
            }
        }

        // ---------- Website + slug ----------
        if (e.brandDetailWebsite) {
            if (brand.website) {
                e.brandDetailWebsite.textContent = this._prettyDomain(brand.website);
                e.brandDetailWebsite.href = brand.website;
                e.brandDetailWebsite.style.display = '';
            } else {
                e.brandDetailWebsite.textContent = '';
                e.brandDetailWebsite.removeAttribute('href');
                e.brandDetailWebsite.style.display = 'none';
            }
        }
        if (e.brandDetailSlug) {
            e.brandDetailSlug.textContent = brand.slug ? `/${brand.slug}` : '';
        }

        // ---------- Description ----------
        const desc = (brand.description || '').trim();
        e.brandDetailDescription.textContent = desc || 'No description provided.';
        e.brandDetailDescription.classList.toggle('text-gray-400', !desc);
        e.brandDetailDescription.classList.toggle('italic', !desc);
        e.brandDetailDescription.classList.toggle('text-gray-700', !!desc);

        // ---------- Meta key/value ----------
        const meta = brand.meta && typeof brand.meta === 'object' ? brand.meta : null;
        const metaKeys = meta ? Object.keys(meta) : [];
        if (metaKeys.length > 0 && e.brandDetailMetaList) {
            e.brandDetailMetaSection?.classList.remove('hidden');
            e.brandDetailMetaList.innerHTML = metaKeys.map(k => `
        <div class="flex items-start justify-between gap-4 px-4 py-2.5">
          <dt class="text-xs text-gray-500 flex-shrink-0">${this._escapeHtml(k)}</dt>
          <dd class="text-xs text-gray-800 text-right break-words">
            ${this._escapeHtml(String(meta[k] ?? '—'))}
          </dd>
        </div>
      `).join('');
        } else {
            e.brandDetailMetaSection?.classList.add('hidden');
        }

        // ---------- Details grid ----------
        e.brandDetailId.textContent = String(brand.id ?? '—');
        const stamp = brand.updated_at || brand.created_at;
        e.brandDetailUpdated.textContent = stamp
            ? new Date(stamp).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
            : '—';

        if (typeof brand.listings_count === 'number') {
            e.brandDetailListingsRow?.classList.remove('hidden');
            if (e.brandDetailListings) {
                e.brandDetailListings.textContent = brand.listings_count.toLocaleString();
            }
        } else {
            e.brandDetailListingsRow?.classList.add('hidden');
        }

        // ---------- Request audit trail ----------
        const hasRequestMeta =
            brand.requested_by || brand.requested_at || brand.requested_reason ||
            brand.verified_by || brand.verified_at || brand.denied_reason;

        if (hasRequestMeta) {
            e.brandDetailRequestSection?.classList.remove('hidden');

            const rows = [];
            if (brand.status) rows.push(['Status', this._requestLabel(brand.status)]);
            if (brand.requested_at) rows.push(['Requested', this._fmtDateTime(brand.requested_at)]);
            if (brand.requested_by) rows.push(['Requested by', brand.requested_by]);
            if (brand.requested_reason) rows.push(['Reason', brand.requested_reason]);
            if (brand.verified_at) rows.push(['Verified', this._fmtDateTime(brand.verified_at)]);
            if (brand.verified_by) rows.push(['Verified by', brand.verified_by]);
            if (brand.denied_reason) rows.push(['Denied reason', brand.denied_reason]);

            if (e.brandDetailRequest) {
                e.brandDetailRequest.className =
                    `req-panel-${this._requestPillClass(brand.status)} rounded-xl border p-3.5 space-y-2 text-xs`;
                e.brandDetailRequest.innerHTML = rows.map(([k, v]) => `
          <div class="flex items-start justify-between gap-4">
            <span class="opacity-80 flex-shrink-0">${this._escapeHtml(k)}</span>
            <span class="font-medium text-right break-words">${this._escapeHtml(String(v))}</span>
          </div>
        `).join('');
            }
        } else {
            e.brandDetailRequestSection?.classList.add('hidden');
        }

        // ---------- Footer CTA ----------
        // Hide "Request this brand" if the brand is already approved system-wide,
        // or if this vendor already has a request in flight / rejected.
        const isApprovedSystem = brand.status === 'active' && !brand.requested_by;
        const vendorRequested = !!brand.requested_by;
        const canRequest = !isApprovedSystem && !vendorRequested;
        e.brandDetailRequestBtn?.classList.toggle('hidden', !canRequest);

        this._refreshIcons();
    }

    // ==========================================================
    // Request modal
    // ==========================================================
    openModal() {
        this.els.modal.classList.remove('hidden');
        this.els.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this.els.modalTitle.value = '';
        this.els.modalReason.value = '';
        delete this.els.modalReason.dataset.touched;
        this.els.modalError.classList.add('hidden');
        this._setFieldError('_title', '');
        this._refreshIcons();
        setTimeout(() => this.els.modalTitle.focus(), 50);
    }

    closeModal() {
        this.els.modal.classList.add('hidden');
        this.els.modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    async submitRequest(ev) {
        ev.preventDefault();
        if (this.submitting) return;

        this._setFieldError('_title', '');
        this.els.modalError.classList.add('hidden');

        const title = this.els.modalTitle.value.trim();
        const reason = this.els.modalReason.value.trim();

        if (!title) {
            this._setFieldError('_title', 'Please enter a brand name.');
            this.els.modalTitle.focus();
            return;
        }
        if (title.length < 2 || title.length > 255) {
            this._setFieldError('_title', 'Brand name must be 2–255 characters.');
            return;
        }

        const dup = this.brands.find(
            b => String(b.title).toLowerCase().trim() === title.toLowerCase()
        );
        if (dup) {
            this._setFieldError('_title', `"${dup.title}" already exists. Search for it instead.`);
            return;
        }

        const existingReq = this.getRequestForTitle(title);
        if (existingReq && existingReq.status === 'requested') {
            this._setFieldError('_title', 'You already have a pending request for this brand.');
            return;
        }

        this._setSubmitting(true);

        try {
            const res = await axios.post(
                `${this.api.base}/meta/brands/insert`,
                { title: title, req_reason: reason || null },
                { withCredentials: true }
            );

            if (res.data?.success === false) {
                throw new Error(res.data.message || 'Failed to submit request');
            }

            const request = res.data?.request || res.data?.data || {
                id: `local-${Date.now()}`,
                title: title,
                slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                status: 'requested',
                requested_reason: reason || null,
                requested_by: (window.__APP__?.vendorId) || 'me',
                requested_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            // this.requests.unshift(request);
            this.closeModal();
            this._notify('success', 'Brand request submitted. Our team will review it.');
            this.load();

        } catch (err) {
            console.error('[BrandsManager.submitRequest]', err);
            this.els.modalErrorMsg.textContent =
                err.response?.data?.message || 'Internal Server Error';
            this.els.modalError.classList.remove('hidden');
            this._refreshIcons();
        } finally {
            this._setSubmitting(false);
        }
    }

    // ==========================================================
    // Helpers
    // ==========================================================
    _clearSearch() {
        this.els.search.value = '';
        this.els.clearSearch.classList.add('hidden');
        this.search = '';
        this.page = 1;
        this.render();
        this.els.search.focus();
        this.load(true);
    }

    _setFieldError(name, message) {
        const wrap = this.root.querySelector(`[data-field="${name}"]`);
        if (!wrap) return;
        const msg = wrap.querySelector('.field-msg');
        if (message) {
            wrap.classList.add('field-error');
            if (msg) { msg.classList.remove('hidden'); msg.textContent = message; }
        } else {
            wrap.classList.remove('field-error');
            if (msg) msg.classList.add('hidden');
        }
    }

    _setSubmitting(on) {
        this.submitting = on;
        const btn = this.els.modalSubmitBtn;
        btn.disabled = on;
        if (on) btn.textContent = 'Submitting...';
        else btn.textContent = 'Submit'
    }

    /**
     * Accepts both families-style (snake_case) and brands-style (camelCase)
     * pagination objects and returns a normalized shape.
     */
    _normalizePagination(p, fallbackTotal = 0) {
        p = p || {};
        const page = p.page ?? 1;
        const limit = p.limit ?? this.limit;
        const total = p.total ?? p.counts ?? fallbackTotal;
        const totalPages = p.total_pages ?? p.totalPages ?? 1;
        const hasNext = p.has_next_page ?? p.hasNextPage ?? false;
        const hasPrev = p.has_previous_page ?? p.hasPrevPage ?? false;

        return {
            page,
            limit,
            total,
            total_pages: totalPages,
            has_next_page: !!hasNext,
            has_previous_page: !!hasPrev
        };
    }

    _requestIcon(status) {
        switch (status) {
            case 'active': return 'check';
            case 'requested': return 'clock';
            case 'rejected': return 'x';
            default: return 'clock';
        }
    }

    _requestLabel(status) {
        switch (status) {
            case 'active': return 'Approved';
            case 'requested': return 'Pending';
            case 'rejected': return 'Rejected';
            case 'inactive': return 'Inactive';
            default: return status ? String(status) : 'Pending';
        }
    }

    _requestPillClass(status) {
        switch (status) {
            case 'active': return 'approved';
            case 'requested': return 'pending';
            case 'rejected': return 'rejected';
            default: return 'pending';
        }
    }

    _prettyDomain(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, '');
        } catch {
            return String(url || '');
        }
    }

    _fmtDateTime(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return String(iso);
        }
    }

    _humanizeError(err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) return "You don't have permission to view brands.";
        if (!err.response) return "We couldn't reach the server. Check your connection and try again.";
        return err.response?.data?.message || "We couldn't load brands. Please try again.";
    }

    _debounce(fn, ms) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    _escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
        );
    }

    _escapeRegex(s) {
        return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    _highlight(text) {
        if (!this.search) return this._escapeHtml(text);
        const re = new RegExp(`(${this._escapeRegex(this.search)})`, 'gi');
        return this._escapeHtml(text).replace(re, '<span class="item-highlight">$1</span>');
    }

    _refreshIcons() {
        window.lucide?.createIcons?.();
    }

    _notify(type, message) {
        if (window.Notification?.showNotification) {
            window.Notification.showNotification({ type, message });
        } else {
            console[type === 'error' ? 'error' : 'log'](`[${type}] ${message}`);
        }
    }
}