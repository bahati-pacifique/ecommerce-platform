class CategoriesManager {
    constructor(options = {}) {

        this.api = {
            base: `${protocal}api.${domainName}`
        };

        this.root = options.root || document;

        this.page = 1;
        this.limit = 20;
        this.search = '';
        this.view = 'all';

        this.pagination = {
            page: 1,
            limit: 20,
            total: 0,
            total_pages: 1,
            has_next_page: false,
            has_previous_page: false
        };

        this.loaded = false;
        this.loading = false;
        this.categories = [];   // current page only
        this.requests = [];     // all vendor requests (small list)
        this.submitting = false;

        this.els = null;

        this._onSearchInput = this._debounce(async (e) => {
            const v = e.target.value;
            this.els.clearSearch?.classList.toggle('hidden', !v);

            this.loading = true;
            this.els.loading.classList.remove('hidden');
            this.els.error.classList.add('hidden');

            try {
                const response = await axios.get(`${this.api.base}/categories/s`,
                    {
                        params: {
                            key: v
                        }, withCredentials: true
                    });

                const payload = response.data;

                this.loaded = true;
                this.loading = false;

                this.categories = payload.categories;
                this.pagination = {
                    page: payload.pagination?.page ?? this.page,
                    limit: payload.pagination?.limit ?? this.limit,
                    total: payload.pagination?.total ?? payload.data.length,
                    total_pages: payload.pagination?.total_pages ?? 1,
                    has_next_page: !!payload.pagination?.has_next_page,
                    has_previous_page: !!payload.pagination?.has_previous_page
                };

                this.page = this.pagination.page;
                this.limit = this.pagination.limit;

                this.render();

            } catch (error) {
                console.log(error);
                this.els.error.classList.remove('hidden');
                this.els.errorMsg.textContent = this._humanizeError(error);
            } finally {
                this.loading = false;
                this.els.loading.classList.add('hidden');
            }

        }, 500);

        this._onKeydown = (e) => {
            if (e.key === 'Escape' && !this.els.modal.classList.contains('hidden')) {
                this.closeModal();
            }

            if (e.key !== 'Escape') return;
            if (!this.els.modal.classList.contains('hidden')) {
                this.closeModal();
            } else if (!this.els.categoryDetailModal.classList.contains('hidden')) {
                this.closeDetail();
            }
        };

        this._onSidebarClick = () => this.load();
        
    }

    _queryDom() {
        const $ = (s) => this.root.querySelector(s);
        const $$ = (s) => Array.from(this.root.querySelectorAll(s));

        return {
            refreshBtn: $('#categoriesRefreshBtn'),
            requestBtn: $('#requestCategoryBtn'),

            totalCount: $('#catTotalCount'),
            pendingCount: $('#catPendingCount'),
            approvedCount: $('#catApprovedCount'),

            search: $('#categorySearch'),
            clearSearch: $('#clearCategorySearch'),
            viewToggles: $$('.view-toggle'),

            loading: $('#categoriesLoading'),
            error: $('#categoriesError'),
            errorMsg: $('#categoriesErrorMsg'),
            retryBtn: $('#categoriesRetryBtn'),

            empty: $('#categoriesEmpty'),
            emptyMsg: $('#categoriesEmptyMsg'),
            emptyRequestBtn: $('#categoriesEmptyRequestBtn'),

            grid: $('#categoriesGrid'),
            footerHint: $('#categoriesFooterHint'),

            modal: $('#requestModal'),
            requestModalTitle: $('#requestModalTitle'),
            modalForm: $('#requestForm'),
            modalTitle: $('#requestTitle'),
            modalReason: $('#requestReason'),
            modalError: $('#requestError'),
            modalErrorMsg: $('#requestErrorMsg'),
            modalSubmitBtn: $('#submitRequestBtn'),
            closeModalBtn: $('#closeRequestBtn'),
            cancelModalBtn: $('#cancelRequestBtn'),
            dismissOverlay: $('[data-dismiss="request"]'),

            // pagination
            paginationWrap: $('#categoriesPagination'),
            paginationInfo: $('#catPaginationInfo'),
            pageInfo: $('#catPageInfo'),
            prevBtn: $('#catPrevBtn'),
            nextBtn: $('#catNextBtn'),
            limitSelect: $('#catLimitSelect'),

            categoryDetailModal: $('#detailModal'),
            catDetailId: $('#detailId'),
            catDetailUpdated: $('#detailUpdated'),
            catDetailListings: $('#detailListings'),
            catDetailListingsRow: $('#detailListingsRow'),
            catDetailDescription: $('#detailDescription'),
            catDetailRequestSection: $('#detailRequestSection'),
            catDetailTitle: $('#detailTitle'),
            catDetailMeta: $('#detailMeta'),
            closeCatDetailBtn: $('closeDetailBtn'),
            closeCatDetailBtn: $('#closeDetailBtn'),
            catDetailCloseFooterBtn: $('#detailCloseFooterBtn'),

            sidebarLink: document.querySelector('.sidebar-link[data-tab="categories"]')
        };
    }

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

        const e = this.els;

        e.sidebarLink?.addEventListener('click', this._onSidebarClick);
        e.refreshBtn?.addEventListener('click', () => this.load(true));
        e.retryBtn?.addEventListener('click', () => this.load(true));

        e.search?.addEventListener('input', this._onSearchInput);
        e.clearSearch?.addEventListener('click', () => this._clearSearch());

        e.viewToggles.forEach(btn => {
            btn.addEventListener('click', () => this.setView(btn.dataset.view));
        });

        // Pagination
        e.prevBtn?.addEventListener('click', () => {
            if (!this.pagination.has_previous_page) return;
            this.page = Math.max(1, this.page - 1);
            this.load(true);
        });
        e.nextBtn?.addEventListener('click', () => {
            if (!this.pagination.has_next_page) return;
            this.page = this.page + 1;
            this.load(true);
        });

        e.limitSelect?.addEventListener('change', (ev) => {
            this.limit = parseInt(ev.target.value, 10) || 20;
            this.page = 1;
            this.load(true);
        });

        e.requestBtn?.addEventListener('click', () => this.openModal());
        e.emptyRequestBtn?.addEventListener('click', () => this.openModal());

        e.closeModalBtn?.addEventListener('click', () => this.closeModal());
        e.cancelModalBtn?.addEventListener('click', () => this.closeModal());
        e.dismissOverlay?.addEventListener('click', () => this.closeModal());

        document.addEventListener('keydown', this._onKeydown);

        e.modalForm?.addEventListener('submit', (ev) => this.submitRequest(ev));

        // Delegated card click
        e.grid?.addEventListener('click', (ev) => {
            const card = ev.target.closest('[data-category-id]');
            if (!card) return;
            this.openDetail(card.dataset.categoryId);
        });

        // Keyboard activation
        e.grid?.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            const card = ev.target.closest('[data-category-id]');
            if (!card) return;
            ev.preventDefault();
            this.openDetail(card.dataset.categoryId);
        });

        // Detail modal closers
        e.closeCatDetailBtn?.addEventListener('click', () => this.closeDetail());
        e.catDetailCloseFooterBtn?.addEventListener('click', () => this.closeDetail());
        e.catDetailDismiss?.addEventListener('click', () => this.closeDetail());

        // e.catDetailRequestBtn?.addEventListener('click', () => {
        //     const cat = this.activeCategory;
        //     this.closeDetail();
        //     this.openModal();
        //     if (cat) this.els.modalTitle.value = cat.title;
        // });

        e.modalTitle.addEventListener('keyup', (ev) => {
            setTimeout(() => { e.modalReason.value = `I want to list in ${ev.target.value} category`; }, 100);
        });

        this.setView('all');
        this.load(true);
    }

    _resumed(){
        this._wire();
        this.els.modalTitle.placeholder = 'Ex. Consoles';
        this.els.requestModalTitle.textContent = 'Requesting Product Category';
    }

    /**
     * Detach all listeners. Call from SPA route teardown.
     */
    destroy() {
        const e = this.els;
        e.sidebarLink?.removeEventListener('click', this._onSidebarClick);
        e.search?.removeEventListener('input', this._onSearchInput);
        document.removeEventListener('keydown', this._onKeydown);
        // The rest use arrow fns that aren't stored; see note below.
    }

    async load(force = false) {
        if (this.loading) return;
        if (this.loaded && !force) return;

        this.loading = true;
        this.els.loading.classList.remove('hidden');
        this.els.error.classList.add('hidden');

        this.render();

        try {
            // Build query params
            const params = new URLSearchParams({
                page: String(this.page),
                limit: String(this.limit)
            });
            if (this.search) params.set('q', this.search);

            const [catRes, reqRes] = await Promise.allSettled([
                axios.get(
                    `${this.api.base}/categories/p?${params.toString()}`,
                    { withCredentials: true }
                ),
                axios.get(
                    `${this.api.base}/categories/requested`,
                    { withCredentials: true }
                )
            ]);

            // ---------- Categories (required) ----------
            if (catRes.status === 'rejected') throw catRes.reason;

            const payload = catRes.value.data || {};

            // Support both {data, pagination} and legacy {categories} shapes
            if (Array.isArray(payload.data)) {
                this.categories = payload.data;
                this.pagination = {
                    page: payload.pagination?.page ?? this.page,
                    limit: payload.pagination?.limit ?? this.limit,
                    total: payload.pagination?.total ?? payload.data.length,
                    total_pages: payload.pagination?.total_pages ?? 1,
                    has_next_page: !!payload.pagination?.has_next_page,
                    has_previous_page: !!payload.pagination?.has_previous_page
                };
                // Sync local page to what the server actually returned
                this.page = this.pagination.page;
                this.limit = this.pagination.limit;

            } else if (Array.isArray(payload.categories)) {
                // Legacy: server ignored pagination — keep client-side fallback
                this.categories = payload.categories;
                this.pagination = {
                    page: 1, limit: this.limit,
                    total: payload.categories.length,
                    total_pages: 1,
                    has_next_page: false, has_previous_page: false
                };
            } else {
                this.categories = [];
                this.pagination = {
                    page: 1, limit: this.limit, total: 0, total_pages: 0,
                    has_next_page: false, has_previous_page: false
                };
            }

            // ---------- Requests (fail-soft) ----------
            if (reqRes.status === 'fulfilled') {
                const rp = reqRes.value.data || [];
                this.requests = rp.data;
            } else {
                console.warn('[categories] requests fetch failed:', reqRes.reason);
                this.requests = [];
            }

            this.loaded = true;
            this.loading = false;
            this.render();

        } catch (err) {
            console.error('[CategoriesManager.load]', err);
            this.loading = false;
            this.loaded = false;
            this.els.loading.classList.add('hidden');
            this.els.error.classList.remove('hidden');
            this.els.errorMsg.textContent = this._humanizeError(err);
            this.els.paginationWrap?.classList.add('hidden');
            this._refreshIcons();
        }
    }

    render() {
        const e = this.els;

        e.loading.classList.toggle('hidden', !this.loading);

        if (this.loading) {
            e.empty.classList.add('hidden');
            e.grid.innerHTML = '';
            return;
        }

        const list = this.filteredCategories();

        this.updateStats();

        if (list.length === 0) {
            e.grid.innerHTML = '';
            e.empty.classList.remove('hidden');
            e.emptyMsg.textContent = this.search
                ? `No categories match "${this.search}".`
                : this.view === 'mine'
                    ? "You haven't requested any categories yet."
                    : 'No categories are available right now.';
            this._refreshIcons();
            return;
        }

        e.empty.classList.add('hidden');
        e.grid.innerHTML = list.map(cat => this.renderCard(cat)).join('');
        this.renderPagination();
        this._refreshIcons();


    }

    openDetail(categoryId) {
        const cat = this.categories.find(c => String(c.id) === String(categoryId));
        if (!cat) return;

        this.activeCategory = cat;
        this._renderDetail(cat);

        this.els.categoryDetailModal.classList.remove('hidden');
        this.els.categoryDetailModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this._refreshIcons();

        setTimeout(() => this.els.closeCatDetailBtn?.focus(), 50);
    }

    closeDetail() {
        this.els.categoryDetailModal.classList.add('hidden');
        this.els.categoryDetailModal.style.display = 'none';
        document.body.style.overflow = '';
        this.activeCategory = null;
    }

    _renderDetail(cat) {
        const e = this.els;

        e.catDetailTitle.textContent = cat.title || 'Category';
        e.catDetailMeta.textContent = cat.last_updates
            ? `Updated: ${formatDate(cat.last_updates)}`
            : `Category #${cat.id}`;


        const desc = (cat.description || '').trim();
        e.catDetailDescription.textContent = desc || 'No description provided.';
        e.catDetailDescription.classList.toggle('text-gray-400', !desc);
        e.catDetailDescription.classList.toggle('italic', !desc);
        e.catDetailDescription.classList.toggle('text-gray-700', !!desc);

        // ---- Details grid ----
        e.catDetailId.textContent = String(cat.id ?? '—');
        e.catDetailUpdated.textContent = cat.last_updates
            ? new Date(cat.last_updates).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
            : '—';

        if (typeof cat.listings_count === 'number') {
            e.catDetailListingsRow.classList.remove('hidden');
            e.catDetailListings.textContent = cat.listings_count.toLocaleString();
        } else {
            e.catDetailListingsRow.classList.add('hidden');
        }

        this._refreshIcons();
    }

    renderPagination() {
        const wrap = this.els.paginationWrap;
        if (!wrap) return;

        const p = this.pagination;
        const totalPages = Math.max(1, p.total_pages || 1);
        const start = p.total === 0 ? 0 : (p.page - 1) * p.limit + 1;
        const end = Math.min(p.page * p.limit, p.total);

        this.els.paginationInfo.textContent =
            `Showing ${start}–${end} of ${p.total}`;
        this.els.pageInfo.textContent =
            `Page ${p.page} of ${totalPages}`;

        this.els.prevBtn.disabled = !p.has_previous_page;
        this.els.nextBtn.disabled = !p.has_next_page;

        const shouldShow = p.total > p.limit;
        wrap.classList.toggle('hidden', !shouldShow);
    }

    renderCard(cat) {
        const req = this.getRequestForTitle(cat.title);
        const pill = req
            ? `<span class="item-pill ${req.status}">
                    <i data-lucide="${req.status === 'approved' ? 'check' : req.status === 'rejected' ? 'x' : 'clock'}" class="w-3 h-3"></i>
                    ${req.status}
                </span>
                `
            : '';

        return `
                <div class="item-card rounded-xl p-4 flex flex-col gap-2 cursor-pointer" data-category-id="${cat.id}">
                    <div class="flex items-start justify-between gap-2">
                    <div class="flex gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-lg bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
                            <i data-lucide="tag" class="w-4 h-4"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-gray-900 truncate" title="${this._escapeHtml(cat.title)}">
                                ${this._highlight(cat.title)}
                            </p>
                            <p class="text-[11px] text-gray-400">
                                ${cat.last_updates ? ` Updated: ${formatDate(cat.last_updates)}` : ''}
                            </p>
                        </div>
                    </div>
                    ${pill}
                    </div>
                </div>
            `;
    }

    updateStats() {
        this.els.totalCount.textContent = this.categories.length;
        this.els.pendingCount.textContent =
            this.requests.filter(r => r.status === 'requested').length;
        this.els.approvedCount.textContent =
            this.requests.filter(r => r.status === 'active').length;
    }


    setView(v) {
        this.view = v;
        this.els.viewToggles.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === v);
        });

        this.render();
    }

    filteredCategories() {
        let list = this.categories;

        if (this.view === 'mine') {
            list = this.requests;
        }

        return list;
    }

    getRequestForTitle(title) {
        const t = String(title).toLowerCase().trim();
        return this.requests.find(
            r => String(r._title || '').toLowerCase().trim() === t
        );
    }

    openModal() {
        this.els.modal.classList.remove('hidden');
        this.els.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this.els.modalTitle.value = '';
        this.els.modalReason.value = '';
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
            this._setFieldError('_title', 'Please enter a category name.');
            this.els.modalTitle.focus();
            return;
        }
        if (title.length < 2 || title.length > 255) {
            this._setFieldError('_title', 'Category name must be 2–255 characters.');
            return;
        }

        const dup = this.categories.find(
            c => String(c.title).toLowerCase().trim() === title.toLowerCase()
        );
        if (dup) {
            this._setFieldError('_title', `"${dup.title}" already exists. Search for it instead.`);
            return;
        }

        const existingReq = this.getRequestForTitle(title);
        if (existingReq && existingReq.status === 'pending') {
            this._setFieldError('_title', 'You already have a pending request for this category.');
            return;
        }

        this._setSubmitting(true);

        try {
            const res = await axios.post(
                `${this.api.base}/meta/categories/insert`,
                { title: title, reason: reason || null },
                { withCredentials: true }
            );

            if (res.data?.success === false) {
                throw new Error(res.data.message || 'Failed to submit request');
            }

            const request = res.data?.request || res.data?.data || {
                id: `local-${Date.now()}`,
                _title: title,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            this.closeModal();
            this._notify('success', 'Category request submitted. Our team will review it.');
            this.load(true);

        } catch (err) {
            console.error('Error submitting category', err);

            this.els.modalErrorMsg.textContent = err.response?.data?.message || 'Internal Server Error';

            this.els.modalError.classList.remove('hidden');
            this._refreshIcons();
        } finally {
            this._setSubmitting(false);
        }
    }

    _clearSearch() {
        this.els.search.value = '';
        this.els.clearSearch.classList.add('hidden');
        this.search = '';
        this.render();
        this.els.search.focus();
        this.page = 1;
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

    _humanizeError(err) {
        const status = err.response?.status;
        if (status === 401) return "You don't have permission to view categories.";
        if (status === 403) return "You don't have permission to view categories.";
        if (!err.response) return "We couldn't reach the server. Check your connection and try again.";
        return err.response?.data?.message || "We couldn't load categories. Please try again.";
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
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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