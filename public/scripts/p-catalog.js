(function () {
    'use strict';

    const Size = Quill.import('attributors/style/size');
    Size.whitelist = ['12px', '14px', '16px', '18px', '24px'];
    Quill.register(Size, true);

    const Toast = {
        show(type, message, duration = 4000) {
            const colors = {
                success: 'bg-emerald-600',
                error: 'bg-red-600',
                info: 'bg-ink-900',
                warning: 'bg-amber-500'
            };
            const icons = {
                success: 'check-circle-2',
                error: 'alert-circle',
                info: 'info',
                warning: 'alert-triangle'
            };
            const el = document.createElement('div');
            el.className = `${colors[type] || colors.info} text-white rounded-xl shadow-pop px-4 py-3 text-sm font-medium flex items-center gap-2.5 max-w-sm`;
            el.innerHTML = `<i data-lucide="${icons[type] || icons.info}" class="w-4 h-4 flex-shrink-0"></i><span>${message}</span>`;
            document.getElementById('toastContainer').appendChild(el);
            if (window.lucide) lucide.createIcons();
            setTimeout(() => {
                el.style.transition = 'opacity .3s, transform .3s';
                el.style.opacity = '0';
                el.style.transform = 'translateY(8px)';
                setTimeout(() => el.remove(), 300);
            }, duration);
        }
    };

    const editor = new Quill('#detailDescription', {
        readOnly: true,
        theme: 'snow', // or 'bubble'
        // modules: {
        //     toolbar: [
        //         [{ 'size': ['12px', '14px', '16px', '18px', '24px'] }],
        //         ['bold', 'italic', 'underline']
        //     ]
        // }
        modules: {
            toolbar: false
        }
    });

    const Api = {
        async request(method, path, data, options = {}, host = `${API_BASE}`) {
            try {
                const config = {
                    method,
                    url: host,
                    withCredentials: true,
                    ...options
                };
                if (data && !options.raw) config.data = data;
                const res = await axios(config);
                return res.data;
            } catch (err) {
                const status = err.response?.status;
                const msg = err.response?.data?.message || err.response?.data?.error || err.message;
                const e = new Error(msg || 'Request failed');
                e.status = status;
                e.response = err.response;
                throw e;
            }
        },
        get(path, params, url = `${API_BASE}`) {
            const qs = params ? '?' + new URLSearchParams(params).toString() : '';
            return this.request('GET', path + qs, {}, {}, url);
        }
    };

    const ImageSearch = {
        MAX_BYTES: 5 * 1024 * 1024,
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

        file: null,
        objectUrl: null,
        requestSeq: 0,

        init() {
            this.btn = document.getElementById('imageSearchBtn');
            this.input = document.getElementById('imageSearchInput');
            this.wrapText = document.getElementById('textSearchWrap');
            this.wrapImg = document.getElementById('imageSearchWrap');
            this.thumb = document.getElementById('imageSearchThumb');
            this.nameEl = document.getElementById('imageSearchName');
            this.statusEl = document.getElementById('imageSearchStatus');
            this.clearBtn = document.getElementById('clearImageSearchBtn');

            if (!this.btn || !this.input) return;

            // Click the icon → open file picker
            this.btn.addEventListener('click', () => this.input.click());

            // File selected
            this.input.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) this.handleFile(file);
                // Reset so the same file can be re-picked
                e.target.value = '';
            });

            // Clear image search
            this.clearBtn.addEventListener('click', () => this.clear());

            // Paste an image from the clipboard anywhere on the search area
            this.wrapText.addEventListener('paste', (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                            e.preventDefault();
                            this.handleFile(file);
                            return;
                        }
                    }
                }
            });

            // Drag and drop onto the search bar
            ['dragenter', 'dragover'].forEach(ev =>
                this.wrapText.addEventListener(ev, (e) => {
                    e.preventDefault();
                    this.wrapText.classList.add('is-drop-target');
                }));

            ['dragleave', 'drop'].forEach(ev =>
                this.wrapText.addEventListener(ev, (e) => {
                    e.preventDefault();
                    this.wrapText.classList.remove('is-drop-target');
                }));

            this.wrapText.addEventListener('drop', (e) => {
                const file = e.dataTransfer?.files?.[0];
                if (file && file.type.startsWith('image/')) {
                    this.handleFile(file);
                } else if (file) {
                    Toast.show('error', 'Please drop an image file.');
                }
            });
        },

        validate(file) {
            if (!this.ALLOWED_TYPES.includes(file.type)) {
                return 'Use a JPEG, PNG, or WebP image.';
            }
            if (file.size > this.MAX_BYTES) {
                return 'Image must be under 5MB.';
            }
            return null;
        },

        async handleFile(file) {
            const err = this.validate(file);
            if (err) {
                Toast.show('error', err);
                return;
            }

            // Revoke any previous preview URL
            if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);

            this.file = file;
            this.objectUrl = URL.createObjectURL(file);

            // Show the chip
            this.thumb.src = this.objectUrl;
            this.nameEl.textContent = file.name;
            this.statusEl.textContent = 'Searching…';
            this.statusEl.className = 'text-[11px] text-ink-400 mt-1.5';
            this.wrapText.classList.add('hidden');
            this.wrapImg.classList.remove('hidden');

            // Clear text search so we don't mix modes
            if (State.search) {
                State.search = '';
                const searchEl = document.getElementById('searchInput');
                if (searchEl) searchEl.value = '';
                const clearBtn = document.getElementById('clearSearchBtn');
                if (clearBtn) clearBtn.classList.add('hidden');
            }

            await this.search(file);
        },

        async search(file) {
            const seq = ++this.requestSeq;

            showListLoading();

            try {
                const fd = new FormData();
                fd.append('image', file);

                if (State.status) fd.append('status', State.status);

                const res = await axios.post(
                    `${CFG.protocal}business.${CFG.domainName}/products/catalog/s`,
                    fd, {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
                );

                if (seq !== this.requestSeq) return;

                const payload = res.data || {};
                const rows = payload.data?.data || payload.data || payload.products || [];
                State.products = Array.isArray(rows) ? rows : [];

                const p = payload.pagination || payload.data?.pagination || {};
                State.pagination = {
                    page: p.page ?? 1,
                    total: p.total ?? p.counts ?? State.products.length,
                    total_pages: p.total_pages ?? p.totalPages ?? 1,
                    has_next_page: !!(p.has_next_page ?? p.hasNextPage),
                    has_previous_page: !!(p.has_previous_page ?? p.hasPrevPage)
                };
                State.page = 1;

                renderList();

                // Update the status line under the chip
                const count = State.products.length;
                if (count === 0) {
                    this.statusEl.textContent = 'No similar products found.';
                    this.statusEl.className = 'text-[11px] text-amber-600 mt-1.5';
                } else {
                    this.statusEl.textContent = `${count} similar product${count === 1 ? '' : 's'} found`;
                    this.statusEl.className = 'text-[11px] text-emerald-600 mt-1.5';
                }
            } catch (err) {
                if (seq !== this.requestSeq) return;
                console.error('[catalog] image search failed', err);
                this.statusEl.textContent = err.response?.data?.message || 'Search failed. Try another image.';
                this.statusEl.className = 'text-[11px] text-red-600 mt-1.5';
                showListError(err.message || 'Image search failed');
            }
        },

        clear() {
            this.requestSeq++; // invalidate any in-flight search
            this.file = null;

            if (this.objectUrl) {
                URL.revokeObjectURL(this.objectUrl);
                this.objectUrl = null;
            }

            this.thumb.removeAttribute('src');
            this.nameEl.textContent = '—';
            this.wrapImg.classList.add('hidden');
            this.wrapText.classList.remove('hidden');

            // Reload the normal product list
            loadList({
                resetPage: true
            });
        }
    };

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c =>
        ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    function fmtDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return '—';
        }
    }

    function fmtDateTime(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '—';
        }
    }

    function statusLabel(status) {
        switch (status) {
            case 'requested':
                return 'Requested';
            case 'draft':
                return 'Draft';
            case 'active':
                return 'Active';
            case 'verified':
                return 'Verified';
            case 'rejected':
                return 'Rejected';
            case 'denied':
                return 'Denied';
            case 'inactive':
                return 'Inactive';
            case 'suspended':
                return 'Suspended';
            default:
                return status ? String(status) : 'Unknown';
        }
    }

    function statusIcon(status) {
        switch (status) {
            case 'active':
            case 'verified':
                return 'check-circle-2';
            case 'rejected':
            case 'denied':
                return 'x-circle';
            case 'requested':
                return 'clock';
            case 'draft':
                return 'pencil';
            case 'inactive':
                return 'pause-circle';
            case 'suspended':
                return 'ban';
            default:
                return 'circle';
        }
    }

    function showConfirm(msg) {
        els.confirmModal.classList.remove('hidden');
        els.confirmModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeConfirm() {
        els.confirmModal.classList.add('hidden');
        els.confirmModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    const State = {
        page: 1,
        limit: 99,
        search: '',
        status: '',
        products: [],
        selectedId: null,
        detailCache: {},
        pagination: {
            page: 1,
            total: 0,
            total_pages: 1,
            has_next_page: false,
            has_previous_page: false
        },
        loadingList: false,
        loadingDetail: false,
        listRequestSeq: 0,
        detailRequestSeq: 0
    };

    const els = {
        search: document.getElementById('searchInput'),
        clearSearch: document.getElementById('clearSearchBtn'),
        statusFilter: document.getElementById('statusFilter'),
        refreshBtn: document.getElementById('refreshBtn'),

        listScroll: document.getElementById('listScroll'),
        listLoading: document.getElementById('listLoading'),
        listError: document.getElementById('listError'),
        listErrorMessage: document.getElementById('listErrorMessage'),
        listRetryBtn: document.getElementById('listRetryBtn'),
        listEmpty: document.getElementById('listEmpty'),
        listEmptyMessage: document.getElementById('listEmptyMessage'),
        listRows: document.getElementById('listRows'),

        pageInfo: document.getElementById('pageInfo'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),

        detailPanel: document.getElementById('detailPanel'),
        detailEmpty: document.getElementById('detailEmpty'),
        detailLoading: document.getElementById('detailLoading'),
        detailContent: document.getElementById('detailContent'),
        closeDetailBtn: document.getElementById('closeDetailBtn'),
        detailBackdrop: document.getElementById('detailBackdrop'),

        detailHeroImage: document.getElementById('detailHeroImage'),
        detailThumbs: document.getElementById('detailThumbs'),
        detailTitle: document.getElementById('detailTitle'),
        detailSubtitle: document.getElementById('detailSubtitle'),
        detailStatus: document.getElementById('detailStatus'),
        metaGrid: document.getElementById('metaGrid'),
        variantList: document.getElementById('variantList'),
        variantCountBadge: document.getElementById('variantCountBadge'),
        detailDescription: document.getElementById('detailDescription'),
        toggleDescriptionBtn: document.getElementById('toggleDescriptionBtn'),
        verificationSection: document.getElementById('verificationSection'),
        verificationTrail: document.getElementById('verificationTrail'),

        verifyBtn: document.getElementById('verifyBtn'),
        confirmModal: document.getElementById('confirmModal'),
        closeConfirmBtns: document.querySelectorAll('.confirm-close'),
        activateBtn: document.getElementById('activateBtn')

    };

    function showDetailState(state) {
        const is = (name) => state === name;
        els.detailEmpty.classList.toggle('hidden', !is('empty'));
        els.detailLoading.classList.toggle('hidden', !is('loading'));
        els.detailContent.classList.toggle('hidden', !is('content'));
    }

    async function loadList({
        resetPage = false
    } = {}) {
        if (resetPage) State.page = 1;

        const seq = ++State.listRequestSeq;
        State.loadingList = true;
        showListLoading();

        try {
            const params = {
                page: String(State.page),
                limit: String(State.limit)
            };
            //if (State.search) params.q = State.search;
            if (State.status) params.status = State.status;

            let url = `${CFG.protocal}business.${CFG.domainName}/products/catalog/list`;

            if (State.search) {
                url = `${CFG.protocal}business.${CFG.domainName}/products/catalog/s`;
                params.key = State.search;
            }

            const res = await axios.get(
                url, {
                withCredentials: true,
                params
            }
            );

            if (seq !== State.listRequestSeq) return;

            const payload = res.data || {};
            const rows = payload.data?.data || payload.data || payload.products || [];
            State.products = Array.isArray(rows) ? rows : [];

            const p = payload.pagination || payload.data?.pagination || {};

            State.pagination = {
                page: p.page ?? State.page,
                total: p.total ?? p.counts ?? State.products.length,
                total_pages: p.total_pages ?? p.totalPages ?? 1,
                has_next_page: !!(p.has_next_page ?? p.hasNextPage),
                has_previous_page: !!(p.has_previous_page ?? p.hasPrevPage)
            };
            State.page = State.pagination.page;

            renderList();
        } catch (err) {
            if (seq !== State.listRequestSeq) return;
            console.error('[catalog] load list failed', err);
            showListError(err.message || 'Failed to load products');
        } finally {
            if (seq === State.listRequestSeq) State.loadingList = false;
        }
    }

    function showListLoading() {
        els.listLoading.classList.remove('hidden');
        els.listError.classList.add('hidden');
        els.listEmpty.classList.add('hidden');
        els.listRows.innerHTML = '';
    }

    function showListError(message) {
        els.listLoading.classList.add('hidden');
        els.listEmpty.classList.add('hidden');
        els.listRows.innerHTML = '';
        els.listError.classList.remove('hidden');
        els.listErrorMessage.textContent = message;
    }

    async function activateProduct(target) {
        const targetContent = target?.innerHTML || 'Verify';
        try {
            if (target) {
                target.disabled = true;
                target.innerHTML = 'Processing...';
            }

            await axios.patch(`${CFG.protocal}admin.${CFG.domainName}/products/${State.selectedId}/activate`, { withCredentials: true });
            closeConfirm();

            showSnackbar({
                type: 'success',
                message: 'Product activated for listing'
            });

            loadList();
            if (State.selectedId) selectProduct(State.selectedId, true);

        } catch (error) {
            console.log(error);
            showSnackbar({
                type: 'error',
                message: error.response?.data?.message || 'Failed — Internal Server Error'
            });
        } finally {
            if (target) {
                target.disabled = false;
                target.innerHTML = targetContent;
            }
        }
    }

    function renderList() {
        els.listLoading.classList.add('hidden');
        els.listError.classList.add('hidden');

        if (!State.products.length) {
            els.listRows.innerHTML = '';
            els.listEmpty.classList.remove('hidden');
            els.listEmptyMessage.textContent = State.search || State.status ?
                'No products match your filters.' :
                'Register your first product to see it here.';
            els.pageInfo.textContent = '0 products';
            els.prevBtn.disabled = true;
            els.nextBtn.disabled = true;
            if (window.lucide) lucide.createIcons();
            return;
        }

        els.listEmpty.classList.add('hidden');

        els.listRows.innerHTML = State.products.map(p => {
            const id = p.id;
            const isActive = String(id) === String(State.selectedId);
            const image = p.primary_image || p.image_url || '';
            console.log(image)
            const title = p.title || 'Untitled';
            const subtitle = [
                p.category_title || p.category?.title,
                p.brand_title || p.brand?.title,
                p.family_title || p.family?.title
            ].filter(Boolean).join(' > ');
            const status = p.status || 'requested';

            const thumb = image ?
                `<img class="product-row-thumb" src="http://localhost:9000/${escapeHtml(image)}" alt="" loading="lazy">` :
                `<div class="product-row-placeholder"><i data-lucide="package" class="w-4 h-4"></i></div>`;

            return `
                <div class="product-row ${isActive ? 'is-active' : ''}"
                    role="button" tabindex="0"
                    data-product-id="${escapeHtml(id)}"
                    aria-label="Open ${escapeHtml(title)}">
                ${thumb}
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-ink-900 truncate">${escapeHtml(title)}</p>
                    <p class="text-xs text-ink-500 truncate">${escapeHtml(subtitle) || '—'}</p>
                    <div class="flex items-center gap-2 mt-1.5">
                    <span class="status-pill ${escapeHtml(status)}">
                        <i data-lucide="${statusIcon(status)}" class="w-3 h-3"></i>
                        ${escapeHtml(statusLabel(status))}
                    </span>
                    ${p.variants_count != null ? `<span class="text-[10px] text-ink-400">${p.variants_count} variant${p.variants_count === 1 ? '' : 's'}</span>` : ''}
                    </div>
                </div>
                <i data-lucide="chevron-right" class="w-4 h-4 text-ink-300 flex-shrink-0"></i>
                </div>
          `;
        }).join('');

        els.listRows.querySelectorAll('.product-row').forEach(row => {
            const open = () => selectProduct(row.dataset.productId);
            row.addEventListener('click', open);
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open();
                }
            });
        });

        const p = State.pagination;

        const start = (p.page - 1) * State.limit + 1;
        const end = Math.min(p.page * State.limit, p.total);
        els.pageInfo.textContent = p.total ? `${start}–${end} of ${p.total}` : '0 products';
        els.prevBtn.disabled = !p.has_previous_page;
        els.nextBtn.disabled = !p.has_next_page;

        if (window.lucide) lucide.createIcons();
    }

    function highlightRow(productId) {
        els.listRows.querySelectorAll('.product-row').forEach(row => {
            row.classList.toggle('is-active', row.dataset.productId === String(productId));
        });
    }

    async function selectProduct(productId, refresh = false) {
        if (!productId) return;
        State.selectedId = productId;

        highlightRow(productId);
        openDetailDrawer();

        // Full detail from cache
        if (State.detailCache[productId] && !refresh) {
            renderDetail(State.detailCache[productId]);
            return;
        }

        const seq = ++State.detailRequestSeq;
        try {
            showDetailState('loading');

            const res = await axios.get(`${CFG.protocal}business.${CFG.domainName}/products/catalog/${productId}`, {
                withCredentials: true
            });

            if (seq !== State.detailRequestSeq) return;

            const full = res.product || res.data || res;
            State.detailCache[productId] = full;
            renderDetail(full);
        } catch (err) {
            if (seq !== State.detailRequestSeq) return;
            console.warn('[catalog] detail load failed', err);
            Toast.show('warning', 'Full details unavailable — showing summary.');
        }
    }

    function renderDetail(product, {
        partial = false
    } = {}) {
        if (!product) return;

        showDetailState('content');

        const title = product.title || 'Untitled product';
        els.detailTitle.textContent = title;
        els.detailSubtitle.textContent = [product.family_title, product.brand_title]
            .filter(Boolean).join(' · ') || (product.slug ? `/${product.slug}` : '—');

        const status = product.status || 'requested';
        els.detailStatus.className = `status-pill ${status}`;
        els.detailStatus.innerHTML = `
          <i data-lucide="${statusIcon(status)}" class="w-3 h-3"></i>
          ${escapeHtml(statusLabel(status))}
        `;

        const images = product.media_urls ||
            product.images ||
            (product.primary_image_url ? [product.primary_image_url] : []);

        const heroSrc = `http://localhost:9000/${images[0].storage_key}`;
        if (heroSrc) {
            els.detailHeroImage.src = heroSrc;
            els.detailHeroImage.alt = title;
            els.detailHeroImage.parentElement.style.display = '';
        } else {
            els.detailHeroImage.removeAttribute('src');
            els.detailHeroImage.parentElement.style.display = 'none';
        }

        els.detailThumbs.innerHTML = images.length > 1 ?
            images.map((media, i) => `
              <button class="detail-thumb ${i === 0 ? 'is-active' : ''}" data-url="http://localhost:9000/${media.storage_key}" type="button">
                <img src="http://localhost:9000/${media.storage_key}" alt="Thumbnail">
              </button>
            `).join('') :
            '';

        if (images.length > 1) {
            els.detailThumbs.querySelectorAll('.detail-thumb').forEach(btn => {
                btn.addEventListener('click', () => {
                    els.detailHeroImage.src = btn.dataset.url;
                    els.detailThumbs.querySelectorAll('.detail-thumb')
                        .forEach(b => b.classList.toggle('is-active', b === btn));
                });
            });
        }

        const totalListings = product.total_listings ?? product.listings_count ?? 0;
        const totalStores = product.total_stores ?? product.stores_count ?? 0;
        const variantsCount = product.total_variants ?? (Array.isArray(product.variants) ? product.variants.length : 0);
        const mediaCount = images.length;
        const createdAt = product.created_at;
        const updatedAt = product.updated_at;
        const requestedBy = product.requested_by_name || product.requested_by || '—';
        const requestedAt = product.requested_at;

        els.metaGrid.innerHTML = [
            metaCard({
                icon: 'layers',
                label: 'Total listings',
                value: totalListings.toLocaleString(),
                sub: `Across ${totalStores} store${totalStores === 1 ? '' : 's'}`,
                tone: 'brand'
            }),
            metaCard({
                icon: 'palette',
                label: 'Variants',
                value: variantsCount.toLocaleString(),
                sub: variantsCount ? 'configurations' : 'none yet',
                tone: 'blue'
            }),
            metaCard({
                icon: 'image',
                label: 'Media',
                value: mediaCount.toLocaleString(),
                sub: mediaCount ? 'images attached' : 'no images',
                tone: 'purple'
            }),
            metaCard({
                icon: 'calendar',
                label: 'Registered',
                value: fmtDate(createdAt),
                sub: requestedAt && requestedAt !== createdAt ? `requested ${fmtDate(requestedAt)}` : null,
                tone: 'green'
            }),
            metaCard({
                icon: 'user',
                label: 'Reg. By',
                value: typeof requestedBy === 'string' ? requestedBy : '—',
                sub: requestedAt ? fmtDateTime(requestedAt) : null,
                tone: 'amber'
            }),
            metaCard({
                icon: 'clock',
                label: 'Last updated',
                value: fmtDate(updatedAt || createdAt),
                sub: updatedAt ? fmtDateTime(updatedAt) : null,
                tone: 'slate'
            })
        ].join('');

        // --- Variants ---
        const variants = Array.isArray(product.variants) ? product.variants : [];
        els.variantCountBadge.textContent = variants.length ?
            `${variants.length} variant${variants.length === 1 ? '' : 's'}` :
            'None';

        if (!variants.length) {
            els.variantList.innerHTML = `
            <div class="rounded-lg border border-dashed border-ink-200 p-4 text-center">
              <p class="text-xs text-ink-400">No variants registered yet.</p>
            </div>
          `;
        } else {
            els.variantList.innerHTML = variants.slice(0, 8).map(v => {
                const displays = v.attributes || [];
                const chips = Array.isArray(displays) && displays.length ?
                    displays.map(d => {
                        const swatch = d.meta?.code ?
                            `<span class="inline-block w-3 h-3 rounded-full border border-gray-300" style="background:${escapeHtml(d.meta.code)}"></span>` :
                            '';
                        return `<span class="attr-chip inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ink-100 text-[11px] text-ink-700 border border-ink-200">${swatch}${escapeHtml(d.attribute || '')} : ${escapeHtml(d.value || '')}</span>`;
                    }).join(' ') :
                    '<span class="text-[11px] text-ink-400">No attributes</span>';
                return `
              <div class="flex items-center justify-between gap-3 py-2 border-b border-ink-100 last:border-0">
                <span class="text-xs font-mono text-ink-700 truncate">${escapeHtml(v.sku || '—')}</span>
                <div class="flex flex-wrap gap-1.5 justify-end">${chips}</div>
              </div>
            `;
            }).join('');

            if (variants.length > 8) {
                els.variantList.insertAdjacentHTML('beforeend', `
              <p class="text-[11px] text-ink-400 text-center pt-2">+${variants.length - 8} more</p>
            `);
            }
        }

        const desc = product.description || '';
        const delta = editor.clipboard.convert({ html: desc });
        if (desc) {
            editor.setContents(delta, 'api');
            console.log(desc)
            //els.detailDescription.classList.remove('text-ink-400');
            // requestAnimationFrame(() => {
            //     const overflowing = els.detailDescription.scrollHeight > els.detailDescription.clientHeight + 4;
            //     els.toggleDescriptionBtn.classList.toggle('hidden', !overflowing);
            //     els.toggleDescriptionBtn.textContent = 'Expand';
            //     els.detailDescription.dataset.expanded = 'false';
            //     els.detailDescription.classList.add('max-h-40');
            // });
        } else {
            editor.setContents('<em class="text-ink-400">No description</em>');
            els.toggleDescriptionBtn.classList.add('hidden');
        }

        const trail = [];

        if (product.requested_at) trail.push(['Requested', fmtDateTime(product.requested_at), 'clock']);
        if (product.verified_at) trail.push(['Verified', fmtDateTime(product.verified_at), 'check-circle-2']);
        if (product.denied_reason) trail.push(['Denied', product.denied_reason, 'x-circle']);
        if (product.requested_reason) trail.push(['Reason', product.requested_reason, 'message-square']);

        if (trail.length) {
            els.verificationSection?.classList.remove('hidden');
            if (els.verificationSection) {
                els.verificationTrail.innerHTML = trail.map(([label, value, icon]) => `
            <div class="flex items-start gap-3 px-4 py-3">
              <div class="w-7 h-7 rounded-lg bg-ink-100 flex items-center justify-center flex-shrink-0">
                <i data-lucide="${icon}" class="w-3.5 h-3.5 text-ink-500"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-400">${escapeHtml(label)}</p>
                <p class="text-sm text-ink-700 mt-0.5 break-words">${escapeHtml(String(value))}</p>
              </div>
            </div>
          `).join('');
            }
        } else {
            els.verificationSection?.classList.add('hidden');
        }

        if (els.verifyBtn && product.status === 'active') {
            els.verifyBtn?.classList.add('hidden');
        } else {
            els.verifyBtn?.classList.remove('hidden');
        }

        if (window.lucide) lucide.createIcons();
    }

    function metaCard({
        icon,
        label,
        value,
        sub,
        tone = 'slate'
    }) {
        const tones = {
            brand: 'bg-brand-light text-brand',
            blue: 'bg-blue-50 text-blue-600',
            purple: 'bg-purple-50 text-purple-600',
            green: 'bg-emerald-50 text-emerald-600',
            amber: 'bg-amber-50 text-amber-600',
            slate: 'bg-ink-100 text-ink-500'
        };
        return `
          <div class="meta-card">
            <div class="meta-card-icon ${tones[tone] || tones.slate}">
              <i data-lucide="${icon}" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="meta-card-label">${escapeHtml(label)}</p>
              <p class="meta-card-value">${escapeHtml(String(value))}</p>
              ${sub ? `<p class="meta-card-sub">${escapeHtml(String(sub))}</p>` : ''}
            </div>
          </div>
        `;
    }

    function openDetailDrawer() {
        if (window.innerWidth >= 1024) return;
        els.detailPanel.classList.add('is-open');
        els.detailBackdrop.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeDetailDrawer() {
        els.detailPanel.classList.remove('is-open');
        els.detailBackdrop.classList.add('hidden');
        document.body.style.overflow = '';
    }

    let searchDebounce;
    els.search.addEventListener('input', () => {
        const v = els.search.value.trim();
        els.clearSearch.classList.toggle('hidden', !v);
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            if (v === State.search) return;
            State.search = v;
            loadList({
                resetPage: true
            });
        }, 300);
    });

    els.clearSearch.addEventListener('click', () => {
        els.search.value = '';
        els.clearSearch.classList.add('hidden');
        State.search = '';
        loadList({
            resetPage: true
        });
        els.search.focus();
    });

    els.statusFilter.addEventListener('change', () => {
        State.status = els.statusFilter.value;
        loadList({
            resetPage: true
        });
    });

    els.refreshBtn.addEventListener('click', () => loadList());
    els.listRetryBtn.addEventListener('click', () => loadList());

    els.prevBtn.addEventListener('click', () => {
        if (!State.pagination.has_previous_page) return;
        State.page = Math.max(1, State.page - 1);
        loadList();
    });

    els.nextBtn.addEventListener('click', () => {
        if (!State.pagination.has_next_page) return;
        State.page = State.page + 1;
        loadList();
    });

    els.closeDetailBtn.addEventListener('click', closeDetailDrawer);
    els.detailBackdrop.addEventListener('click', closeDetailDrawer);

    // Description expand/collapse
    els.toggleDescriptionBtn.addEventListener('click', () => {
        const expanded = els.detailDescription.dataset.expanded === 'true';
        if (expanded) {
            els.detailDescription.classList.add('max-h-40');
            els.detailDescription.dataset.expanded = 'false';
            els.toggleDescriptionBtn.textContent = 'Expand';
        } else {
            els.detailDescription.classList.remove('max-h-40');
            els.detailDescription.dataset.expanded = 'true';
            els.toggleDescriptionBtn.textContent = 'Collapse';
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            e.preventDefault();
            els.search.focus();
            els.search.select();
            return;
        }
        if (e.key === 'Escape') {
            closeDetailDrawer();
        }
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && document.activeElement.closest('#listRows')) {
            e.preventDefault();
            const rows = Array.from(els.listRows.querySelectorAll('.product-row'));
            const idx = rows.indexOf(document.activeElement);
            const next = e.key === 'ArrowDown' ?
                Math.min(idx + 1, rows.length - 1) :
                Math.max(idx - 1, 0);
            if (rows[next]) rows[next].focus();
        }
    });

    els.verifyBtn?.addEventListener('click', (e) => {
        els.confirmModal.classList.remove('hidden');
        els.confirmModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    els.closeConfirmBtns?.forEach(b => {
        b.addEventListener('click', () => {
            closeConfirm();
        })
    });

    els.activateBtn?.addEventListener('click', (e) => {
        activateProduct(e.target);
    });


    const button = document.getElementById('dropdownButton');
    const menu = document.getElementById('dropdownMenu');

    button.addEventListener('click', () => {
        menu.classList.toggle('hidden');
    });

    // Optional: Close the dropdown when clicking outside
    window.addEventListener('click', (e) => {
        if (!button.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });

    ImageSearch.init();
    showDetailState('empty');
    loadList();
})();