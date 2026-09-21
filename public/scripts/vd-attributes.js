class AttributesManager {
    constructor(options = {}) {
        this.api = {
            base: `${protocal}api.${domainName}`
        };

        this.root = options.root || document;

        // ---------- list state ----------
        this.page = 1;
        this.limit = 20;
        this.search = '';
        this.view = 'all';

        this.pagination = {
            page: 1, limit: 20, total: 0, total_pages: 1,
            has_next_page: false, has_previous_page: false
        };

        this.loaded = false;
        this.loading = false;
        this.attributes = [];
        this.requests = [];   // vendor's requested attributes

        // ---------- modal / submit state ----------
        this.submitting = false;
        this.addingValue = false;
        this.savingEdit = false;

        this.activeAttribute = null;   // attribute open in the detail modal
        this.editingValue = null;      // value currently being edited

        // Values cache, keyed by String(attributeId)
        this.valuesCache = { meta: {} };

        this.els = this._queryDom();

        // Debounced server-side search
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
                const response = await axios.get(`${this.api.base}/attributes/s`, {
                    params: { key: this.search, page: this.page, limit: this.limit },
                    withCredentials: true
                });

                const payload = response.data || {};
                this.attributes = Array.isArray(payload.attributes) ? payload.attributes : [];
                this.pagination = this._normalizePagination(payload.pagination, this.attributes.length);
                this.page = this.pagination.page;
                this.limit = this.pagination.limit;

                this.loaded = true;
                this.render();
            } catch (error) {
                console.error('[AttributesManager.search]', error);
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
            } else if (!this.els.detailModal.classList.contains('hidden')) {
                if (this.editingValue) this.closeEditValue();
                else this.closeDetail();
            }
        };

        this._onSidebarClick = () => this.load();

        this.setView('all');
        this._wire();
        this.load();
    }

    // ============================ DOM MAPPING ==============================
    _queryDom() {
        const $ = (s) => this.root.querySelector(s);
        const $$ = (s) => Array.from(this.root.querySelectorAll(s));

        return {
            // list
            refreshBtn: $('#attributesRefreshBtn'),
            requestBtn: $('#requestAttributeBtn'),

            totalCount: $('#attrTotalCount'),
            pendingCount: $('#attrPendingCount'),
            approvedCount: $('#attrApprovedCount'),

            search: $('#attributeSearch'),
            clearSearch: $('#clearAttributeSearch'),
            viewToggles: $$('.view-toggle'),

            loading: $('#attributesLoading'),
            error: $('#attributesError'),
            errorMsg: $('#attributesErrorMsg'),
            retryBtn: $('#attributesRetryBtn'),

            empty: $('#attributesEmpty'),
            emptyMsg: $('#attributesEmptyMsg'),
            emptyRequestBtn: $('#attributesEmptyRequestBtn'),

            grid: $('#attributesGrid'),
            footerHint: $('#attributesFooterHint'),

            // pagination
            paginationWrap: $('#attributesPagination'),
            paginationInfo: $('#attrPaginationInfo'),
            pageInfo: $('#attrPageInfo'),
            prevBtn: $('#attrPrevBtn'),
            nextBtn: $('#attrNextBtn'),
            limitSelect: $('#attrLimitSelect'),

            // request modal
            modal: $('#requestAttributeModal'),
            modalForm: $('#requestAttributeForm'),
            modalTitle: $('#requestAttributeTitle'),
            modalReason: $('#requestAttributeReason'),
            modalError: $('#requestAttributeError'),
            modalErrorMsg: $('#requestAttributeErrorMsg'),
            modalSubmitBtn: $('#submitRequestAttributeBtn'),
            closeModalBtn: $('#closeRequestAttributeBtn'),
            cancelModalBtn: $('#cancelRequestAttributeBtn'),
            dismissOverlay: $('[data-dismiss="attribute-request"]'),

            // detail modal
            detailModal: $('#attributeDetailModal'),
            detailTitle: $('#attrDetailTitle'),
            detailMeta: $('#attrDetailMeta'),
            detailDescription: $('#attrDetailDescription'),
            detailId: $('#attrDetailId'),
            detailValueCount: $('#attrDetailValueCount'),
            detailUpdated: $('#attrDetailUpdated'),
            detailRequestSection: $('#attrDetailRequestSection'),
            detailRequest: $('#attrDetailRequest'),
            detailRequestBtn: $('#attrDetailRequestBtn'),
            closeDetailBtn: $('#closeAttributeDetailBtn'),
            detailCloseFooterBtn: $('#attrDetailCloseFooterBtn'),
            detailDismiss: $('[data-dismiss="attribute-detail"]'),

            // values
            valuesCount: $('#attrValuesCount'),
            valuesLoading: $('#attrValuesLoading'),
            valuesEmpty: $('#attrValuesEmpty'),
            valuesList: $('#attrValuesList'),

            // create-value form
            toggleAddValueBtn: $('#toggleAddValueBtn'),
            addValueForm: $('#addValueForm'),
            attributeValueForm: $('#attributeValueForm'),
            newAttributeValue: $('#newAttributeValue'),
            saveAttributeValueBtn: $('#saveAttributeValueBtn'),
            cancelAddValueBtn: $('#cancelAddValueBtn'),
            addValueError: $('#addValueError'),

            // create-value meta pairs
            metaPairsSection: $('#metaPairsSection'),
            metaPairsList: $('#metaPairsList'),
            addMetaPairBtn: $('#addMetaPairBtn'),

            // edit-value panel
            editValuePanel: $('#editValuePanel'),
            editValueForm: $('#editValueForm'),
            editValueInput: $('#editValueInput'),
            editValueOriginal: $('#editValueOriginal'),
            saveEditValueBtn: $('#saveEditValueBtn'),
            cancelEditValueBtn: $('#cancelEditValueBtn'),
            cancelEditValueBtnFooter: $('#cancelEditValueBtnFooter'),
            editValueError: $('#editValueError'),

            // edit-value meta pairs
            editMetaPairsSection: $('#editMetaPairsSection'),
            editMetaPairsList: $('#editMetaPairsList'),
            addEditMetaPairBtn: $('#addEditMetaPairBtn'),

            sidebarLink: document.querySelector('.sidebar-link[data-tab="attributes"]')
        };
    }

    // ==========================================================
    // Wiring & events
    // ==========================================================
    _wire() {
        const e = this.els;

        // List controls
        e.sidebarLink?.addEventListener('click', this._onSidebarClick);
        e.refreshBtn?.addEventListener('click', () => this.load(true));
        e.retryBtn?.addEventListener('click', () => this.load(true));
        e.search?.addEventListener('input', this._onSearchInput);
        e.clearSearch?.addEventListener('click', () => this._clearSearch());

        e.viewToggles.forEach(btn => {
            btn.addEventListener('click', () => this.setView(btn.dataset.view));
        });

        e.prevBtn?.addEventListener('click', () => {
            if (!this.pagination.has_previous_page) return;
            this.page = Math.max(1, this.page - 1);
            this.load(true);
        });
        e.nextBtn?.addEventListener('click', () => {
            if (!this.pagination.has_next_page) return;
            this.page += 1;
            this.load(true);
        });
        e.limitSelect?.addEventListener('change', (ev) => {
            this.limit = parseInt(ev.target.value, 10) || 20;
            this.page = 1;
            this.load(true);
        });

        // Request modal
        e.requestBtn?.addEventListener('click', () => this.openModal());
        e.emptyRequestBtn?.addEventListener('click', () => this.openModal());
        e.closeModalBtn?.addEventListener('click', () => this.closeModal());
        e.cancelModalBtn?.addEventListener('click', () => this.closeModal());
        e.dismissOverlay?.addEventListener('click', () => this.closeModal());
        e.modalForm?.addEventListener('submit', (ev) => this.submitRequest(ev));

        document.addEventListener('keydown', this._onKeydown);

        // Card delegation detail
        e.grid?.addEventListener('click', (ev) => {
            const card = ev.target.closest('[data-attribute-id]');
            if (!card) return;
            this.openDetail(card.dataset.attributeId);
        });
        e.grid?.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            const card = ev.target.closest('[data-attribute-id]');
            if (!card) return;
            ev.preventDefault();
            this.openDetail(card.dataset.attributeId);
        });

        // Detail closers
        e.closeDetailBtn?.addEventListener('click', () => this.closeDetail());
        e.detailCloseFooterBtn?.addEventListener('click', () => this.closeDetail());
        e.detailDismiss?.addEventListener('click', () => this.closeDetail());

        // Detail request
        e.detailRequestBtn?.addEventListener('click', () => {
            const attr = this.activeAttribute;
            this.closeDetail();
            this.openModal();
            if (attr) {
                e.modalTitle.value = attr.title || '';
                e.modalReason.value = `I want to use ${attr.title || 'this attribute'} for product listings.`;
            }
        });

        // Prefill reason while typing title (respect manual edits)
        e.modalTitle?.addEventListener('keyup', (ev) => {
            setTimeout(() => {
                if (!e.modalReason.dataset.touched) {
                    e.modalReason.value = ev.target.value
                        ? `I want to use ${ev.target.value} for product listings.`
                        : '';
                }
            }, 100);
        });
        e.modalReason?.addEventListener('input', () => {
            e.modalReason.dataset.touched = '1';
        });

        // Create-value form
        e.toggleAddValueBtn?.addEventListener('click', () => this.toggleAddValueForm());
        e.cancelAddValueBtn?.addEventListener('click', () => this.hideAddValueForm());
        e.attributeValueForm?.addEventListener('submit', (ev) => this.submitValue(ev));

        // Create-value meta pairs
        e.addMetaPairBtn?.addEventListener('click', () => this._addMetaPairRow(e.metaPairsList));
        e.metaPairsList?.addEventListener('click', (ev) => {
            const btn = ev.target.closest('[data-remove-meta-pair]');
            if (!btn) return;
            this._removeMetaPairRow(btn.closest('[data-meta-pair]'), e.metaPairsList);
        });

        // Chips: edit / delete (delete takes precedence)
        e.valuesList?.addEventListener('click', (ev) => {
            const delBtn = ev.target.closest('[data-delete-value-id]');
            if (delBtn) {
                ev.stopPropagation();
                this.deleteValue(delBtn.dataset.deleteValueId);
                return;
            }
            const chip = ev.target.closest('[data-edit-value-id]');
            if (!chip) return;
            this.openEditValue(chip.dataset.editValueId);
        });
        e.valuesList?.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            const chip = ev.target.closest('[data-edit-value-id]');
            if (!chip) return;
            ev.preventDefault();
            this.openEditValue(chip.dataset.editValueId);
        });

        // Edit-value panel
        e.editValueForm?.addEventListener('submit', (ev) => this.submitEditValue(ev));
        e.cancelEditValueBtn?.addEventListener('click', () => this.closeEditValue());
        e.cancelEditValueBtnFooter?.addEventListener('click', () => this.closeEditValue());

        // Edit-value meta pairs
        e.addEditMetaPairBtn?.addEventListener('click', () => this._addMetaPairRow(e.editMetaPairsList));
        e.editMetaPairsList?.addEventListener('click', (ev) => {
            const btn = ev.target.closest('[data-remove-meta-pair]');
            if (!btn) return;
            this._removeMetaPairRow(btn.closest('[data-meta-pair]'), e.editMetaPairsList);
        });
    }

    destroy() {
        const e = this.els;
        e.sidebarLink?.removeEventListener('click', this._onSidebarClick);
        e.search?.removeEventListener('input', this._onSearchInput);
        document.removeEventListener('keydown', this._onKeydown);
    }

    // ==========================================================
    // List — load + render
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

            const [attrRes, reqRes] = await Promise.allSettled([
                axios.get(
                    `${this.api.base}/attributes/active?${params.toString()}`,
                    { withCredentials: true }
                ),
                axios.get(
                    `${this.api.base}/attributes/requested`,
                    { withCredentials: true }
                )
            ]);

            if (attrRes.status === 'rejected') throw attrRes.reason;

            const payload = attrRes.value.data || {};
            if (Array.isArray(payload.attributes)) {
                this.attributes = payload.attributes;
                this.pagination = this._normalizePagination(payload.pagination, payload.attributes.length);
            } else if (Array.isArray(payload.data)) {
                this.attributes = payload.data;
                this.pagination = this._normalizePagination(payload.pagination, payload.data.length);
            } else {
                this.attributes = [];
                this.pagination = this._normalizePagination(null, 0);
            }
            this.page = this.pagination.page;
            this.limit = this.pagination.limit;

            if (reqRes.status === 'fulfilled') {
                const rp = reqRes.value.data || {};

                this.requests = Array.isArray(rp.data) ? rp.data
                    : Array.isArray(rp.attributes) ? rp.attributes
                        : Array.isArray(rp.requests) ? rp.requests
                            : Array.isArray(rp) ? rp
                                : [];
            } else {
                console.warn('[AttributesManager] requests fetch failed:', reqRes.reason);
                this.requests = [];
            }

            this.loaded = true;
            this.loading = false;
            this.render();

        } catch (err) {
            console.error('[AttributesManager.load]', err);
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

        const list = this.filteredAttributes();
        this.updateStats();

        if (list.length === 0) {
            e.grid.innerHTML = '';
            e.empty.classList.remove('hidden');
            e.emptyMsg.textContent = this.search
                ? `No attributes match "${this.search}".`
                : this.view === 'mine'
                    ? "You haven't requested any attributes yet."
                    : 'No attributes are available right now.';
            e.paginationWrap?.classList.add('hidden');
            this._refreshIcons();
            return;
        }

        e.empty.classList.add('hidden');
        e.grid.innerHTML = list.map(a => this.renderCard(a)).join('');
        this.renderPagination();
        this._refreshIcons();
    }

    renderCard(attr) {
        const req = this.getRequestForTitle(attr.title);
        const requestStatus = req?.status || (attr.requested_by ? attr.status : null);

        const pill = requestStatus
            ? `<span class="item-pill ${this._requestPillClass(requestStatus)}">
                <i data-lucide="${this._requestIcon(requestStatus)}" class="w-3 h-3"></i>
                ${this._requestLabel(requestStatus)}
              </span>`
            : '';

        const stamp = attr.last_updates || attr.updated_at || attr.created_at;

        return `
                <div class="item-card rounded-xl p-4 flex flex-col gap-2 cursor-pointer"
                    data-attribute-id="${attr.id}"
                    role="button"
                    tabindex="0"
                    aria-label="View details for ${this._escapeHtml(attr.title)}">
                    <div class="flex items-start justify-between gap-2">
                    <div class="flex gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-lg bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
                        <i data-lucide="list-checks" class="w-4 h-4"></i>
                        </div>
                        <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 truncate" title="${this._escapeHtml(attr.title)}">
                            ${this._highlight(attr.title)}
                        </p>
                        <p class="text-[11px] text-gray-500 truncate">
                            ${this._escapeHtml(this._truncate(attr.description || '', 60)) || '—'}
                        </p>
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

        wrap.classList.toggle('hidden', !(p.total > p.limit));
    }

    updateStats() {
        this.els.totalCount.textContent = this.pagination.total ?? this.attributes.length;
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

    filteredAttributes() {
        if (this.view !== 'mine') return this.attributes;
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
    async openDetail(attributeId) {
        const attr = this.attributes.find(a => String(a.id) === String(attributeId))
            || this.requests.find(a => String(a.id) === String(attributeId));
        if (!attr) return;

        this.activeAttribute = attr;
        this.editingValue = null;

        this._renderDetail(attr);

        this.els.detailModal.classList.remove('hidden');
        this.els.detailModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        this._refreshIcons();

        setTimeout(() => this.els.closeDetailBtn?.focus(), 50);

        await this.loadValues(attr.id);
    }

    closeDetail() {
        // Tear down the edit panel first
        this.editingValue = null;
        this.els.editValuePanel?.classList.add('hidden');
        this.els.editValueForm?.reset();
        if (this.els.editMetaPairsList) this.els.editMetaPairsList.innerHTML = '';
        this.els.editValueError?.classList.add('hidden');

        this.els.detailModal.classList.add('hidden');
        this.els.detailModal.style.display = 'none';
        document.body.style.overflow = '';
        this.activeAttribute = null;
        this.hideAddValueForm();
        this.els.valuesList.innerHTML = '';
    }

    _renderDetail(attr) {
        const e = this.els;

        e.detailTitle.textContent = attr.title || 'Attribute';
        e.detailMeta.textContent = attr.updated_at
            ? `Updated ${formatDate(attr.updated_at)}`
            : attr.created_at
                ? `Added ${formatDate(attr.created_at)}`
                : `Attribute #${attr.id}`;

        const desc = (attr.description || '').trim();
        e.detailDescription.textContent = desc || 'No description provided.';
        e.detailDescription.classList.toggle('text-gray-400', !desc);
        e.detailDescription.classList.toggle('italic', !desc);
        e.detailDescription.classList.toggle('text-gray-700', !!desc);

        e.detailId.textContent = String(attr.id ?? '—');

        const stamp = attr.last_updates || attr.created_at || attr.updated_at;
        e.detailUpdated.textContent = stamp
            ? new Date(stamp).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
            : '—';

        // Request audit trail
        const hasRequestMeta =
            attr.requested_by || attr.requested_at || attr.requested_reason ||
            attr.verified_by || attr.verified_at || attr.denied_reason;

        if (hasRequestMeta) {
            e.detailRequestSection.classList.remove('hidden');
            const rows = [];
            if (attr.status) rows.push(['Status', this._requestLabel(attr.status)]);
            if (attr.requested_at) rows.push(['Requested', this._fmtDateTime(attr.requested_at)]);
            if (attr.requested_by) rows.push(['Requested by', attr.requester || '']);
            if (attr.requested_reason) rows.push(['Reason', attr.requested_reason]);
            if (attr.verified_at) rows.push(['Verified', this._fmtDateTime(attr.verified_at)]);
            if (attr.verified_by) rows.push(['Verified by', attr.verified_by]);
            if (attr.denied_reason) rows.push(['Denied reason', attr.denied_reason]);

            e.detailRequest.className =
                `req-panel-${this._requestPillClass(attr.status)} rounded-xl border p-3.5 space-y-2 text-xs`;
            e.detailRequest.innerHTML = rows.map(([k, v]) => `
        <div class="flex items-start justify-between gap-4">
          <span class="opacity-80 flex-shrink-0">${this._escapeHtml(k)}</span>
          <span class="font-medium text-right break-words">${this._escapeHtml(String(v))}</span>
        </div>
      `).join('');
        } else {
            e.detailRequestSection.classList.add('hidden');
        }

        const isApprovedSystem = attr.status === 'active' && !attr.requested_by;
        const vendorRequested = !!attr.requested_by;
        const canRequest = !isApprovedSystem && !vendorRequested;
        e.detailRequestBtn?.classList.toggle('hidden', !canRequest);

        e.detailValueCount.textContent = '—';
        e.valuesCount.textContent = '—';

        // Reset the create form so it starts empty for this attribute
        this.hideAddValueForm();

        this._refreshIcons();
    }

    // ==========================================================
    // Values — load + render
    // ==========================================================
    async loadValues(attributeId, { append = false } = {}) {
        const e = this.els;
        const key = String(attributeId);

        const cached = this.valuesCache[key];

        if (cached && !append) {
            this._renderValues(key, cached);
            return;
        }

        const meta = this.valuesCache.meta?.[key];
        const nextPage = append ? (meta?.loadedPages || 1) + 1 : 1;

        e.valuesLoading.classList.remove('hidden');
        e.valuesEmpty.classList.add('hidden');
        if (!append) {
            e.valuesList.innerHTML = '';
            e.detailValueCount.textContent = '—';
            e.valuesCount.textContent = '—';
        }

        try {
            const res = await axios.get(
                `${this.api.base}/attributes/values/${attributeId}`,
                { params: { page: nextPage, limit: 10 }, withCredentials: true }
            );

            const payload = res.data || {};
            const batch = Array.isArray(payload.attributeValues) ? payload.attributeValues
                : Array.isArray(payload.values) ? payload.values
                    : Array.isArray(payload.data) ? payload.data
                        : [];

            const pagination = this._normalizePagination(payload.pagination, batch.length);

            let list = append && cached ? cached.concat(batch) : batch;
            const seen = new Set();
            list = list.filter(v => {
                const id = String(v.id);
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
            });

            this.valuesCache[key] = list;
            this.valuesCache.meta[key] = {
                hasNextPage: pagination.has_next_page,
                totalPages: pagination.total_pages,
                total: pagination.total,
                limit: pagination.limit,
                loadedPages: nextPage
            };

            this._renderValues(key, list);
        } catch (err) {
            console.error('[AttributesManager.loadValues]', err);
            e.valuesEmpty.classList.remove('hidden');
            e.valuesList.innerHTML = '';
            e.addValueError.textContent = this._humanizeError(err);
            e.addValueError.classList.remove('hidden');
        } finally {
            e.valuesLoading.classList.add('hidden');
        }
    }

    _renderValues(attributeId, values) {
        const e = this.els;
        const key = String(attributeId);
        const meta = this.valuesCache.meta?.[key] || {};

        e.detailValueCount.textContent = (meta.total ?? values.length).toLocaleString();
        e.valuesCount.textContent =
            `(${values.length}${meta.total && meta.total > values.length ? ` of ${meta.total}` : ''})`;

        if (values.length === 0) {
            e.valuesList.innerHTML = '';
            e.valuesEmpty.classList.remove('hidden');
            this._refreshIcons();
            return;
        }

        e.valuesEmpty.classList.add('hidden');

        e.valuesList.innerHTML = values
            .slice()
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
            .map(v => this._renderValueChip(v))
            .join('');

        if (meta.hasNextPage) {
            e.valuesList.insertAdjacentHTML(
                'beforeend',
                `<li>
                    <button type="button" id="loadMoreValuesBtn"
                        class="text-xs font-semibold text-brand hover:text-brand-dark transition px-2.5 py-1 rounded-full border border-brand/30 hover:border-brand/60">
                        Load more
                    </button>
                </li>`
            );
            document.getElementById('loadMoreValuesBtn')?.addEventListener('click', (ev) => {
                const btn = ev.currentTarget;
                btn.disabled = true;
                btn.textContent = 'Loading...';
                this.loadValues(key, { append: true });
            });
        }

        this._refreshIcons();
    }

    _renderValueChip(value) {

        const meta = value.meta && typeof value.meta === 'object' ? value.meta : {};

        const code = typeof meta.code === 'string' ? meta.code.trim() : '';
        const NAMED_COLORS = new Set([
            'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown',
            'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy', 'teal', 'olive', 'maroon',
            'silver', 'gold', 'beige', 'ivory', 'coral'
        ]);
        const isColorCode = /^#([0-9a-f]{3,8})$/i.test(code)
            || /^(rgb|hsl)a?\(/i.test(code)
            || NAMED_COLORS.has(code.toLowerCase());

        const swatch = isColorCode
            ? `<span class="inline-block w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0"
               style="background:${this._escapeHtml(code)}"
               title="${this._escapeHtml(code)}"></span>`
            : '';

        const extraKeys = Object.keys(meta).filter(k => k !== 'code');
        const tooltipParts = [];
        if (code && !isColorCode) tooltipParts.push(`code: ${code}`);
        for (const k of extraKeys) {
            const v = meta[k];
            if (v == null || v === '') continue;
            tooltipParts.push(`${k}: ${String(v).replace(/\s+/g, ' ').slice(0, 120)}`);
        }
        const tooltip = tooltipParts.length
            ? ` title="${this._escapeHtml(tooltipParts.join(' • '))}"`
            : '';

        const hasMeta = tooltipParts.length > 0;
        const metaDot = hasMeta
            ? `<span class="w-1.5 h-1.5 rounded-full bg-brand/70 ml-0.5" aria-hidden="true"></span>`
            : '';

        const canDelete = this._canDeleteValue(value);
        const isEditing = this.editingValue
            && String(this.editingValue.id) === String(value.id);

        return `
        <li class="attr-value-chip ${isEditing ? 'ring-2 ring-brand' : ''}" data-value-id="${value.id}"
            data-edit-value-id="${value.id}"
            role="button"
            tabindex="0"
            ${tooltip}
            aria-label="Edit value ${this._escapeHtml(value.value)}">
            ${swatch}
            <span>${this._escapeHtml(value.value)}</span>
            ${metaDot}
            ${canDelete ? `
            <button type="button" data-delete-value-id="${value.id}" title="Remove value">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
            ` : ''}
        </li>
    `;
    }

    _canDeleteValue(value) {
        const me = window.__APP__?.vendorId;
        if (!me) return false;
        return value.created_by && String(value.created_by) === String(me);
    }

    // ==========================================================
    // Create value
    // ==========================================================
    toggleAddValueForm() {
        const form = this.els.addValueForm;
        if (form.classList.contains('hidden')) {
            form.classList.remove('hidden');
            this.els.newAttributeValue.value = '';
            this._renderMetaPairs(this.els.metaPairsList, {});
            this.els.addValueError.classList.add('hidden');
            this._setFieldError('_value', '');
            setTimeout(() => this.els.newAttributeValue.focus(), 30);
        } else {
            this.hideAddValueForm();
        }
    }

    hideAddValueForm() {
        this.els.addValueForm.classList.add('hidden');
        this.els.newAttributeValue.value = '';
        if (this.els.metaPairsList) this.els.metaPairsList.innerHTML = '';
        this.els.addValueError.classList.add('hidden');
        this._setFieldError('_value', '');
        this.els.metaPairsList?.parentElement
            ?.querySelectorAll('.pair-error')
            ?.forEach(el => el.remove());
    }

    async submitValue(ev) {
        ev.preventDefault();
        if (this.addingValue) return;

        const attr = this.activeAttribute;
        console.log(attr)
        if (!attr) return;

        this._setFieldError('_value', '');
        this.els.addValueError.classList.add('hidden');
        this.els.metaPairsList?.parentElement
            ?.querySelectorAll('.pair-error')
            ?.forEach(el => el.remove());

        const raw = this.els.newAttributeValue.value.trim();

        if (!raw) {
            this._setFieldError('_value', 'Please enter a value.');
            this.els.newAttributeValue.focus();
            return;
        }
        if (raw.length > 255) {
            this._setFieldError('_value', 'Value must be 255 characters or fewer.');
            return;
        }

        const { meta, errors } = this._collectMetaPairs(this.els.metaPairsList);
        if (errors.length > 0) {
            this._showMetaPairsErrors(errors, this.els.metaPairsList);
            return;
        }

        const existing = this.valuesCache[String(attr.id)] || [];
        if (existing.some(v => String(v.value).toLowerCase() === raw.toLowerCase())) {
            this._setFieldError('_value', `"${raw}" already exists for this attribute.`);
            return;
        }

        this.addingValue = true;
        const saveBtn = this.els.saveAttributeValueBtn;
        saveBtn.disabled = true;
        saveBtn.querySelector('.btn-label').textContent = 'Adding...';

        try {
            //{attribute_id, value, display_order, meta}

            const res = await axios.post(
                `${this.api.base}/meta/attributes-values/insert/${attr.id}`,
                { value: raw, meta },
                { withCredentials: true }
            );

            if (res.data?.success === false) {
                throw new Error(res.data.message || 'Failed to add value');
            }

            const created = res.data;

            const key = String(attr.id);
            const list = this.valuesCache[key] || [];
            list.push(created);
            this.valuesCache[key] = list;

            if (this.valuesCache.meta?.[key]) {
                const m = this.valuesCache.meta[key];
                this.valuesCache.meta[key] = { ...m, total: (m.total || list.length - 1) + 1 };
            }

            this._renderValues(key, list);

            this.els.newAttributeValue.value = '';
            this._renderMetaPairs(this.els.metaPairsList, {});
            this.els.newAttributeValue.focus();

            this._notify('success', `"${raw}" added.`);

        } catch (err) {
            console.error('[AttributesManager.submitValue]', err);
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.response?.data?.error;
            this.els.addValueError.textContent =
                status === 409 ? 'This value already exists for this attribute.' :
                    status === 422 && msg ? msg :
                        status === 403 ? "You don't have permission to add values." :
                            !err.response ? "We couldn't reach the server. Check your connection and try again." :
                                "We couldn't add this value. Please try again.";
            this.els.addValueError.classList.remove('hidden');
        } finally {
            this.addingValue = false;
            saveBtn.disabled = false;
            saveBtn.querySelector('.btn-label').textContent = 'Add';
        }
    }

    openEditValue(valueId) {

        const attr = this.activeAttribute;
        if (!attr) return;

        const key = String(attr.id);
        const list = this.valuesCache[key] || [];
        const value = list.find(v => String(v.id) === String(valueId));
        if (!value) return;

        this.editingValue = value;

        this.els.editValueInput.value = value.value || '';
        this.els.editValueOriginal.textContent = `· ${value.value || ''}`;

        this._renderMetaPairs(this.els.editMetaPairsList, value.meta || {});

        this.els.editValuePanel.classList.remove('hidden');
        this.els.editValueError.classList.add('hidden');
        this._setFieldError('_editValue', '');
        this.els.editMetaPairsList?.parentElement
            ?.querySelectorAll('.pair-error')
            ?.forEach(el => el.remove());

        // Highlight the edited chip
        this._renderValues(key, list);

        setTimeout(() => this.els.editValueInput.focus(), 50);
        this._refreshIcons();
    }

    closeEditValue() {
        const attr = this.activeAttribute;

        this.editingValue = null;
        this.els.editValuePanel.classList.add('hidden');
        this.els.editValueForm.reset();
        if (this.els.editMetaPairsList) this.els.editMetaPairsList.innerHTML = '';
        this.els.editValueError.classList.add('hidden');
        this._setFieldError('_editValue', '');
        this.els.editMetaPairsList?.parentElement
            ?.querySelectorAll('.pair-error')
            ?.forEach(el => el.remove());

        if (attr) {
            const key = String(attr.id);
            this._renderValues(key, this.valuesCache[key] || []);
        }
    }

    async submitEditValue(ev) {
        ev.preventDefault();
        if (this.savingEdit) return;

        const attr = this.activeAttribute;
        const value = this.editingValue;
        if (!attr || !value) return;

        this._setFieldError('_editValue', '');
        this.els.editValueError.classList.add('hidden');
        this.els.editMetaPairsList?.parentElement
            ?.querySelectorAll('.pair-error')
            ?.forEach(el => el.remove());

        const raw = this.els.editValueInput.value.trim();

        if (!raw) {
            this._setFieldError('_editValue', 'Please enter a value.');
            this.els.editValueInput.focus();
            return;
        }
        if (raw.length > 255) {
            this._setFieldError('_editValue', 'Value must be 255 characters or fewer.');
            return;
        }

        const { meta, errors } = this._collectMetaPairs(this.els.editMetaPairsList);
        if (errors.length > 0) {
            this._showMetaPairsErrors(errors, this.els.editMetaPairsList);
            return;
        }

        this.savingEdit = true;
        const btn = this.els.saveEditValueBtn;
        btn.disabled = true;
        btn.querySelector('.btn-label').textContent = 'Saving...';

        try {
            const res = await axios.patch(
                `${this.api.base}/meta/attributes/${value.id}`,
                { value: raw, meta },
                { withCredentials: true }
            );

            if (res.data?.success === false) {
                throw new Error(res.data.message || 'Failed to update value');
            }

            const updated = res.data?.value || res.data?.data || { ...value, value: raw, meta };

            const key = String(attr.id);
            const list = this.valuesCache[key] || [];
            const idx = list.findIndex(v => String(v.id) === String(value.id));
            if (idx >= 0) list[idx] = { ...list[idx], ...updated };
            this.valuesCache[key] = list;

            this.editingValue = null;
            this.els.editValuePanel.classList.add('hidden');
            this._renderValues(key, list);
            this._notify('success', 'Value updated.');

        } catch (err) {
            console.error('[AttributesManager.submitEditValue]', err);
            const msg = err.response?.data?.message || err.response?.data?.error;
            this.els.editValueError.textContent = msg;
            this.els.editValueError.classList.remove('hidden');
        } finally {
            this.savingEdit = false;
            btn.disabled = false;
            btn.querySelector('.btn-label').textContent = 'Save';
        }
    }

    // ==========================================================
    // Delete value
    // ==========================================================
    async deleteValue(valueId) {
        const attr = this.activeAttribute;
        if (!attr) return;
        if (!confirm('Remove this value? Products using it may lose the mapping.')) return;

        const key = String(attr.id);

        try {
            await axios.delete(
                `${this.api.base}/attributes/${encodeURIComponent(attr.id)}/values/${encodeURIComponent(valueId)}`,
                { withCredentials: true }
            );

            const list = (this.valuesCache[key] || []).filter(v => String(v.id) !== String(valueId));
            this.valuesCache[key] = list;

            if (this.valuesCache.meta?.[key]) {
                const m = this.valuesCache.meta[key];
                this.valuesCache.meta[key] = { ...m, total: Math.max(0, (m.total || list.length + 1) - 1) };
            }

            this._renderValues(key, list);
            this._notify('success', 'Value removed.');

        } catch (err) {
            console.error('[AttributesManager.deleteValue]', err);
            const status = err.response?.status;
            this._notify(
                'error',
                status === 403 ? "You don't have permission to remove this value." :
                    status === 404 ? 'Value not found.' :
                        "We couldn't remove this value."
            );
        }
    }

    // ==========================================================
    // Meta pairs builder
    // ==========================================================
    _renderMetaPairs(container, metaObject = {}) {
        if (!container) return;

        const entries = Object.entries(metaObject || {});
        const rows = entries.length > 0 ? entries : [['', '']];

        container.innerHTML = rows.map(([k, v]) => this._renderMetaPairRow(k, v)).join('');
        this._refreshIcons();
    }

    _renderMetaPairRow(key = '', value = '') {
        const k = this._escapeHtml(String(key ?? ''));
        const v = this._escapeHtml(String(value ?? ''));

        return `
      <div class="meta-pair-row" data-meta-pair>
        <input type="text" data-meta-key
          placeholder="Key (e.g. code)"
          value="${k}"
          autocomplete="off">
        <input type="text" data-meta-value
          placeholder="Value (e.g. #FF0000)"
          value="${v}"
          autocomplete="off">
        <button type="button" class="remove" data-remove-meta-pair title="Remove">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
    `;
    }

    _addMetaPairRow(container) {
        if (!container) return;
        container.insertAdjacentHTML('beforeend', this._renderMetaPairRow('', ''));
        this._refreshIcons();
        const rows = container.querySelectorAll('[data-meta-pair]');
        const last = rows[rows.length - 1];
        last?.querySelector('[data-meta-key]')?.focus();
    }

    _removeMetaPairRow(row, container) {
        if (!row || !container) return;
        const remaining = container.querySelectorAll('[data-meta-pair]').length;
        if (remaining <= 1) {
            // Keep one blank row visible
            row.querySelectorAll('input').forEach(i => i.value = '');
        } else {
            row.remove();
        }
    }

    _collectMetaPairs(container) {
        const meta = {};
        const errors = [];
        if (!container) return { meta, errors };

        const rows = Array.from(container.querySelectorAll('[data-meta-pair]'));
        const seenKeys = new Set();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const keyEl = row.querySelector('[data-meta-key]');
            const valueEl = row.querySelector('[data-meta-value]');
            const key = (keyEl?.value || '').trim();
            const value = (valueEl?.value || '').trim();

            if (!key && !value) continue;

            if (key && !value) {
                errors.push([`pair_${i}`, `Value for "${key}" is empty.`]);
                continue;
            }
            if (!key && value) {
                errors.push([`pair_${i}`, `Row ${i + 1} has a value but no key.`]);
                continue;
            }
            if (key.length > 64) {
                errors.push([`pair_${i}`, `Key "${key.slice(0, 20)}…" is too long (max 64).`]);
                continue;
            }

            const lower = key.toLowerCase();
            if (seenKeys.has(lower)) {
                errors.push([`pair_${i}`, `Duplicate key "${key}".`]);
                continue;
            }
            seenKeys.add(lower);

            meta[key] = value;
        }

        return { meta, errors };
    }

    _showMetaPairsErrors(errors, container) {
        const parent = container?.parentElement;
        if (!parent) return;
        parent.querySelectorAll('.pair-error')?.forEach(el => el.remove());
        errors.forEach(([_, msg]) => {
            const p = document.createElement('p');
            p.className = 'pair-error text-xs text-red-600 mt-1.5';
            p.textContent = msg;
            parent.appendChild(p);
        });
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
            this._setFieldError('_title', 'Please enter an attribute name.');
            this.els.modalTitle.focus();
            return;
        }
        if (title.length < 2 || title.length > 100) {
            this._setFieldError('_title', 'Attribute name must be 2–100 characters.');
            return;
        }

        const dup = this.attributes.find(
            a => String(a.title).toLowerCase().trim() === title.toLowerCase()
        );
        if (dup) {
            this._setFieldError('_title', `"${dup.title}" already exists. Search for it instead.`);
            return;
        }

        const existingReq = this.getRequestForTitle(title);
        if (existingReq && existingReq.status === 'requested') {
            this._setFieldError('_title', 'You already have a pending request for this attribute.');
            return;
        }

        this._setSubmitting(true);

        try {
            const res = await axios.post(
                `${this.api.base}/meta/attributes/insert`,
                { title: title, reason: reason || null },
                { withCredentials: true }
            );

            if (res.data?.success === false) {
                throw new Error(res.data.message || 'Failed to submit request');
            }

            const request = res.data?.request || res.data?.data || {
                id: `local-${Date.now()}`,
                title: title,
                status: 'requested',
                requested_reason: reason || null,
                requested_by: (window.__APP__?.vendorId) || 'me',
                requested_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            this.requests.unshift(request);
            this.closeModal();
            this._notify('success', 'Attribute request submitted. Our team will review it.');
            this.render();

        } catch (err) {
            console.error('[AttributesManager.submitRequest]', err);
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
        if (!btn) return;
        btn.disabled = on;
        const label = btn.querySelector('.btn-label');
        if (label) label.textContent = on ? 'Submitting...' : 'Submit';
        else btn.textContent = on ? 'Submitting...' : 'Submit';
    }

    _normalizePagination(p, fallbackTotal = 0) {
        p = p || {};
        return {
            page: p.page ?? 1,
            limit: p.limit ?? this.limit,
            total: p.total ?? p.counts ?? fallbackTotal,
            total_pages: p.total_pages ?? p.totalPages ?? 1,
            has_next_page: !!(p.has_next_page ?? p.hasNextPage),
            has_previous_page: !!(p.has_previous_page ?? p.hasPrevPage)
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

    _fmtDateTime(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return String(iso); }
    }

    _truncate(text, n) {
        const s = String(text || '').trim();
        return s.length > n ? s.slice(0, n - 1) + '…' : s;
    }

    _humanizeError(err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) return "You don't have permission to view attributes.";
        if (!err.response) return "We couldn't reach the server. Check your connection and try again.";
        return err.response?.data?.message || "We couldn't load attributes. Please try again.";
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

    _refreshIcons() { window.lucide?.createIcons?.(); }
    _notify(type, message) {
        if (window.Notification?.showNotification) {
            window.Notification.showNotification({ type, message });
        } else {
            console[type === 'error' ? 'error' : 'log'](`[${type}] ${message}`);
        }
    }
}