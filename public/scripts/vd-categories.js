class CategoriesManager {
    constructor(options = {}) {

        this.api = {
            base: `${protocal}api.${domainName}`
        };

        console.log(this.api)

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

        this.els = this._queryDom();

        // Bound, debounced search → resets to page 1
        this._onSearchInput = this._debounce((e) => {
            const v = e.target.value;
            this.els.clearSearch?.classList.toggle('hidden', !v);
            const next = v.trim();
            if (next === this.search) return;
            this.search = next;
            this.page = 1;             // reset pagination on new search
            this.load(true);
        }, 300);

        this._onKeydown = (e) => {
            if (e.key === 'Escape' && !this.els.modal.classList.contains('hidden')) {
                this.closeModal();
            }
        };

        this._onSidebarClick = () => this.load();

        this._wire();
        this.load();
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

            modal: $('#requestCategoryModal'),
            modalForm: $('#requestCategoryForm'),
            modalTitle: $('#requestCategoryTitle'),
            modalReason: $('#requestCategoryReason'),
            modalError: $('#requestCategoryError'),
            modalErrorMsg: $('#requestCategoryErrorMsg'),
            modalSubmitBtn: $('#submitRequestCategoryBtn'),
            closeModalBtn: $('#closeRequestCategoryBtn'),
            cancelModalBtn: $('#cancelRequestCategoryBtn'),
            dismissOverlay: $('[data-dismiss="request"]'),

            // pagination
            paginationWrap: $('#categoriesPagination'),
            paginationInfo: $('#catPaginationInfo'),
            pageInfo: $('#catPageInfo'),
            prevBtn: $('#catPrevBtn'),
            nextBtn: $('#catNextBtn'),
            limitSelect: $('#catLimitSelect'),

            sidebarLink: document.querySelector('.sidebar-link[data-tab="categories"]')
        };
    }

    _wire() {
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
                    `${this.api.base}/business/vendor/categories/requests`,
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
                const rp = reqRes.value.data || {};
                this.requests = Array.isArray(rp.requests) ? rp.requests
                    : Array.isArray(rp.data) ? rp.data
                        : Array.isArray(rp) ? rp
                            : [];
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
            ? `<span class="cat-pill ${req.status}">
           <i data-lucide="${req.status === 'approved' ? 'check' : req.status === 'rejected' ? 'x' : 'clock'}" class="w-3 h-3"></i>
           ${req.status}
         </span>`
            : '';

        return `
      <div class="category-card rounded-xl p-4 flex flex-col gap-2" data-category-id="${cat.id}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
              <i data-lucide="tag" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate" title="${this._escapeHtml(cat.title)}">
                ${this._highlight(cat.title)}
              </p>
              <p class="text-[11px] text-gray-400">
                ID ${cat.id}${cat.last_updates ? ` · updated ${this._formatDate(cat.last_updates)}` : ''}
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
            this.requests.filter(r => r.status === 'pending').length;
        this.els.approvedCount.textContent =
            this.requests.filter(r => r.status === 'approved').length;
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

    filteredCategories() {
        let list = this.categories;

        if (this.view === 'mine') {
            const titles = new Set(
                this.requests.map(r => String(r.category_title || '').toLowerCase().trim())
            );
            list = list.filter(c => titles.has(String(c.title).toLowerCase().trim()));
        }

        if (this.search) {
            const re = new RegExp(this._escapeRegex(this.search), 'i');
            list = list.filter(c => re.test(c.title));
        }

        return list;
    }

    getRequestForTitle(title) {
        const t = String(title).toLowerCase().trim();
        return this.requests.find(
            r => String(r.category_title || '').toLowerCase().trim() === t
        );
    }

    // ==========================================================
    // Modal
    // ==========================================================
    openModal() {
        this.els.modal.classList.remove('hidden');
        this.els.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this.els.modalTitle.value = '';
        this.els.modalReason.value = '';
        this.els.modalError.classList.add('hidden');
        this._setFieldError('category_title', '');
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

        this._setFieldError('category_title', '');
        this.els.modalError.classList.add('hidden');

        const title = this.els.modalTitle.value.trim();
        const reason = this.els.modalReason.value.trim();

        if (!title) {
            this._setFieldError('category_title', 'Please enter a category name.');
            this.els.modalTitle.focus();
            return;
        }
        if (title.length < 2 || title.length > 255) {
            this._setFieldError('category_title', 'Category name must be 2–255 characters.');
            return;
        }

        const dup = this.categories.find(
            c => String(c.title).toLowerCase().trim() === title.toLowerCase()
        );
        if (dup) {
            this._setFieldError('category_title', `"${dup.title}" already exists. Search for it instead.`);
            return;
        }

        const existingReq = this.getRequestForTitle(title);
        if (existingReq && existingReq.status === 'pending') {
            this._setFieldError('category_title', 'You already have a pending request for this category.');
            return;
        }

        this._setSubmitting(true);

        try {
            const res = await axios.post(
                `${this.api.base}/business/vendor/categories/requests`,
                { category_title: title, reason: reason || null },
                { withCredentials: true }
            );

            if (res.data?.success === false) {
                throw new Error(res.data.message || 'Failed to submit request');
            }

            const request = res.data?.request || res.data?.data || {
                id: `local-${Date.now()}`,
                category_title: title,
                status: 'pending',
                created_at: new Date().toISOString()
            };

            this.requests.unshift(request);
            this.closeModal();
            this._notify('success', 'Category request submitted. Our team will review it.');
            this.render();

        } catch (err) {
            console.error('[CategoriesManager.submitRequest]', err);
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.response?.data?.error;

            this.els.modalErrorMsg.textContent =
                status === 409 ? 'A request for this category already exists.'
                    : status === 422 && msg ? msg
                        : status === 403 ? "You don't have permission to request categories."
                            : !err.response ? "We couldn't submit your request. Check your connection and try again."
                                : "We couldn't submit your request. Please try again.";

            this.els.modalError.classList.remove('hidden');
            this._refreshIcons();
        } finally {
            this._setSubmitting(false);
        }
    }

    // ==========================================================
    // Private helpers
    // ==========================================================
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
        btn.querySelector('.btn-label').classList.toggle('hidden', on);
        const loading = btn.querySelector('.btn-loading');
        loading.classList.toggle('hidden', !on);
        loading.classList.toggle('inline-flex', on);
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
        return this._escapeHtml(text).replace(re, '<span class="cat-highlight">$1</span>');
    }

    _formatDate(d) {
        if (!d) return '';
        const dt = new Date(d);
        const diff = Math.floor((Date.now() - dt.getTime()) / 86400000);
        if (diff === 0) return 'today';
        if (diff === 1) return 'yesterday';
        if (diff < 30) return `${diff}d ago`;
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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