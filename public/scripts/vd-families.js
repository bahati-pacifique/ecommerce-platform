class FamiliesManager {
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
        this.families = [];   // current page only
        this.requests = [];     // all vendor requests (small list)
        this.submitting = false;

        this.els = null;

        // Bound, debounced search → resets to page 1
        this._onSearchInput = this._debounce(async (e) => {
            const v = e.target.value;
            this.els.clearSearch?.classList.toggle('hidden', !v);

            this.loading = true;
            this.els.loading.classList.remove('hidden');
            this.els.error.classList.add('hidden');

            try {
                const response = await axios.get(`${this.api.base}/families/s`,
                    {
                        params: {
                            key: v
                        }, withCredentials: true
                    });

                const payload = response.data;

                this.loaded = true;
                this.loading = false;

                this.families = payload.families;
                console.log(this.families)

                this.pagination = {
                    page: payload.pagination?.page ?? this.page,
                    limit: payload.pagination?.limit ?? this.limit,
                    total: payload.pagination?.total ?? payload.families.length,
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
            } else if (!this.els.familyDetailModal.classList.contains('hidden')) {
                this.closeDetail();
            }
        };

        this._onSidebarClick = () => this.load();
        
    }

    _queryDom() {
        const $ = (s) => this.root.querySelector(s);
        const $$ = (s) => Array.from(this.root.querySelectorAll(s));

        return {
            refreshBtn: $('#familiesRefreshBtn'),
            requestBtn: $('#requestFamilyBtn'),

            totalCount: $('#famTotalCount'),
            pendingCount: $('#famPendingCount'),
            approvedCount: $('#famApprovedCount'),

            search: $('#familySearch'),
            clearSearch: $('#clearFamilySearch'),
            viewToggles: $$('.view-toggle'),

            loading: $('#familiesLoading'),
            error: $('#familiesError'),
            errorMsg: $('#familiesErrorMsg'),
            retryBtn: $('#familiesRetryBtn'),

            empty: $('#familiesEmpty'),
            emptyMsg: $('#familiesEmptyMsg'),
            emptyRequestBtn: $('#familiesEmptyRequestBtn'),

            grid: $('#familiesGrid'),
            footerHint: $('#familiesFooterHint'),

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
            paginationWrap: $('#familiesPagination'),
            paginationInfo: $('#famPaginationInfo'),
            pageInfo: $('#famPageInfo'),
            prevBtn: $('#famPrevBtn'),
            nextBtn: $('#famNextBtn'),
            limitSelect: $('#famLimitSelect'),

            familyDetailModal: $('#detailModal'),
            famDetailId: $('#detailId'),
            famDetailUpdated: $('#detailUpdated'),
            famDetailListings: $('#detailListings'),
            famDetailListingsRow: $('#detailListingsRow'),
            famDetailDescription: $('#detailDescription'),
            famDetailRequestSection: $('#detailRequestSection'),
            famDetailTitle: $('#detailTitle'),
            famDetailMeta: $('#detailMeta'),
            closeFamDetailBtn: $('closeDetailBtn'),
            closeFamDetailBtn: $('#closeDetailBtn'),
            famDetailCloseFooterBtn: $('#detailCloseFooterBtn'),

            sidebarLink: document.querySelector('.sidebar-link[data-tab="families"]')
        };
    }

    _resumed(){
        this._wire();
        this.els.modalTitle.placeholder = 'Ex. Dell Latitude';
        this.els.requestModalTitle.textContent = 'Requesting Product Family';
    }

    _wire() {

        $('#requestFormContainer').empty();
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
            const card = ev.target.closest('[data-family-id]');
            if (!card) return;
            this.openDetail(card.dataset.familyId);
        });

        // Keyboard activation
        e.grid?.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            const card = ev.target.closest('[data-family-id]');
            if (!card) return;
            ev.preventDefault();
            this.openDetail(card.dataset.familyId);
        });

        // Detail modal closers
        e.closeFamDetailBtn?.addEventListener('click', () => this.closeDetail());
        e.famDetailCloseFooterBtn?.addEventListener('click', () => this.closeDetail());
        e.famDetailDismiss?.addEventListener('click', () => this.closeDetail());

        e.modalTitle.addEventListener('keyup', (ev) => {
            setTimeout(() => { e.modalReason.value = `I want to list ${ev.target.value}`; }, 100);
        });

        this.setView('all');
        this.load();
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

            const [famRes, reqRes] = await Promise.allSettled([
                axios.get(
                    `${this.api.base}/families/active`,
                    { withCredentials: true }
                ),
                axios.get(
                    `${this.api.base}/families/r/requested`,
                    { withCredentials: true }
                )
            ]);

            // ---------- Categories (required) ----------
            if (famRes.status === 'rejected') throw famRes.reason;

            const payload = famRes.value.data || {};

            // Support both {data, pagination} and legacy shapes
            if (Array.isArray(payload.families)) {
                this.families = payload.families;
                this.pagination = {
                    page: payload.pagination?.page ?? this.page,
                    limit: payload.pagination?.limit ?? this.limit,
                    total: payload.pagination?.total ?? payload.families.length,
                    total_pages: payload.pagination?.total_pages ?? 1,
                    has_next_page: !!payload.pagination?.has_next_page,
                    has_previous_page: !!payload.pagination?.has_previous_page
                };
                // Sync local page to what the server actually returned
                this.page = this.pagination.page;
                this.limit = this.pagination.limit;

            } else if (Array.isArray(payload.families)) {
                // Legacy: server ignored pagination — keep client-side fallback
                this.families = payload.families;
                this.pagination = {
                    page: 1, limit: this.limit,
                    total: payload.categories.length,
                    total_pages: 1,
                    has_next_page: false, has_previous_page: false
                };
            } else {
                this.families = [];
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
        e.grid.innerHTML = list.map(fam => this.renderCard(fam)).join('');
        this.renderPagination();
        this._refreshIcons();


    }

    openDetail(famId) {
        const fam = this.families.find(f => String(f.id) === String(famId));
        if (!fam) return;

        this.activeFamily = fam;
        this._renderDetail(fam);

        this.els.familyDetailModal.classList.remove('hidden');
        this.els.familyDetailModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this._refreshIcons();

        setTimeout(() => this.els.closeFamDetailBtn?.focus(), 50);
    }

    closeDetail() {
        this.els.familyDetailModal.classList.add('hidden');
        this.els.familyDetailModal.style.display = 'none';
        document.body.style.overflow = '';
        this.activeFamily = null;
    }

    _renderDetail(fam) {
        const e = this.els;


        e.famDetailTitle.textContent = fam.title || 'Family';
        e.famDetailMeta.textContent = fam.last_updates
            ? `Updated: ${formatDate(fam.last_updates)}`
            : `Family #${fam.id}`;


        const desc = (fam.description || '').trim();
        e.famDetailDescription.textContent = desc || 'No description provided.';
        e.famDetailDescription.classList.toggle('text-gray-400', !desc);
        e.famDetailDescription.classList.toggle('italic', !desc);
        e.famDetailDescription.classList.toggle('text-gray-700', !!desc);

        // ---- Details grid ----
        e.famDetailId.textContent = String(fam.id ?? '—');
        e.famDetailUpdated.textContent = fam.last_updates
            ? new Date(fam.last_updates).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
            : '—';

        if (typeof fam.listings_count === 'number') {
            e.famDetailListingsRow.classList.remove('hidden');
            e.famDetailListings.textContent = fam.listings_count.toLocaleString();
        } else {
            e.famDetailListingsRow.classList.add('hidden');
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

    renderCard(fam) {
        const req = this.getRequestForTitle(fam.title);
        const pill = req
            ? `<span class="item-pill ${req.status}">
                    <i data-lucide="${req.status === 'approved' ? 'check' : req.status === 'rejected' ? 'x' : 'clock'}" class="w-3 h-3"></i>
                    ${req.status}
                </span>
                `
            : '';

        return `
                <div class="item-card rounded-xl p-4 flex flex-col gap-2 cursor-pointer" data-family-id="${fam.id}">
                    <div class="flex items-start justify-between gap-2">
                    <div class="flex gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-lg bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
                            <i data-lucide="tag" class="w-4 h-4"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="text-sm font-semibold text-gray-900 truncate" title="${this._escapeHtml(fam.title)}">
                                ${this._highlight(fam.title)}
                            </p>
                            <p class="text-[11px] text-gray-500">
                                ${fam.category_title || '— No category mapped —'}
                            </p>
                            <p class="text-[11px] text-gray-400">
                                ${fam.last_updates ? `Updated: ${formatDate(fam.last_updates)}` : ''}
                            </p>
                        </div>
                    </div>
                    ${pill}
                    </div>
                </div>
            `;
    }

    updateStats() {
        this.els.totalCount.textContent = this.families.length;
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
        let list = this.families;

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
            this._setFieldError('_title', 'Please enter a name.');
            this.els.modalTitle.focus();
            return;
        }
        if (title.length < 2 || title.length > 255) {
            this._setFieldError('_title', 'Name must be 2–255 characters.');
            return;
        }

        const dup = this.families.find(
            c => String(c.title).toLowerCase().trim() === title.toLowerCase()
        );
        if (dup) {
            this._setFieldError('_title', `"${dup.title}" already exists. Search for it instead.`);
            return;
        }

        const existingReq = this.getRequestForTitle(title);
        if (existingReq && existingReq.status === 'pending') {
            this._setFieldError('_title', 'You already have a pending request for this family.');
            return;
        }

        this._setSubmitting(true);

        try {
            const res = await axios.post(
                `${this.api.base}/meta/families/insert`,
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

            //this.requests.unshift(request);
            this.closeModal();
            this._notify('success', 'Family request submitted. Our team will review it.');
            
            // this.render();
            this.load(false);

        } catch (err) {
            console.error('Error submitting family:', err);

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