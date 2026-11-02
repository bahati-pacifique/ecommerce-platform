$(document).ready(() => {
    const {
        toast
    } = window.__shell;

    const els = {
        grid: document.getElementById('listingsGrid'),
        search: document.getElementById('listingsSearch'),
        status: document.getElementById('listingsStatus'),
        sort: document.getElementById('listingsSort'),
        limit: document.getElementById('listingsLimit'),
        count: document.getElementById('listingsCount'),
        activeFilters: document.getElementById('listingsActiveFilters'),
        pageInfo: document.getElementById('listingsPageInfo'),
        pageControls: document.getElementById('listingsPageControls'),
    };

    const state = {
        page: 1,
        limit: 10,
        search: '',
        status: '',
        sort: els.sort.value,
        pagination: {
            page: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            totalPages: 1,
            total: 0,
            limit: 10,
        },
    };

    function getStoreId() {
        const match = window.location.pathname.match(/\/stores\/([^/]+)/);
        return match ? match[1] : null;
    }

    function debounce(fn, ms) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str ?? '';
        return div.innerHTML;
    }

    function skeletonGrid(count) {
        return Array(count).fill(`
        <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div class="aspect-[4/3] animate-pulse bg-slate-100"></div>
          <div class="space-y-3 p-4">
            <div class="h-4 animate-pulse rounded bg-slate-100"></div>
            <div class="h-3 w-2/3 animate-pulse rounded bg-slate-100"></div>
            <div class="h-3 w-1/2 animate-pulse rounded bg-slate-100"></div>
          </div>
        </div>
      `).join('');
    }

    async function load() {
        els.grid.innerHTML = skeletonGrid(state.limit);
        els.count.textContent = 'Loading…';
        els.pageInfo.textContent = '—';
        els.pageControls.innerHTML = '';

        try {
            const params = new URLSearchParams({
                page: state.page,
                limit: state.limit,
                search: state.search,
                status: state.status,
                sort: state.search ? 'relevance' : state.sort,
            });

            const response = await axios.get(`/stores/${_STOREID}/listings`, {
                params,
                withCredentials: true
            });

            console.log(response.data);

            state.pagination = response.data.pagination || {
                page: 1,
                hasNextPage: false,
                hasPreviousPage: false,
                totalPages: 1,
                total: 0,
                limit: 21
            }

            renderCards(response.data.listings);
            renderPagination(state.pagination);

        } catch (err) {
            console.error(err);
            els.grid.innerHTML = `
                <div class="col-span-full rounded-xl border border-rose-200 bg-rose-50 py-16 text-center">
                    <i data-lucide="alert-circle" class="mx-auto h-8 w-8 text-rose-500"></i>
                    <p class="mt-2 text-sm font-medium text-rose-700">Failed to load listings</p>
                    <button data-action-reload class="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
                        Retry
                    </button>
                </div>
            `
            window.lucide?.createIcons();
        }
    }

    function renderCards(items) {
        if (!items.length) {
            els.grid.innerHTML = `
        <div class="col-span-full rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          <div class="inline-flex flex-col items-center gap-2">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-ultralight)]">
              <i data-lucide="search-x" class="h-6 w-6 text-[var(--color-brand)]"></i>
            </div>
            <p class="text-sm font-medium text-slate-700">No listings found</p>
            <p class="text-xs text-slate-500">Try adjusting your search or filters.</p>
            <button id="clearFiltersBtn" class="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold hover:bg-slate-50">
              Clear filters
            </button>
          </div>
        </div>`;
            document.getElementById('clearFiltersBtn')?.addEventListener('click', clearFilters);
            window.lucide?.createIcons();
            return;
        }

        els.grid.innerHTML = items.map(renderCardHTML).join('');
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const icon = header.querySelector('svg');

                document.querySelectorAll('.accordion-content').forEach(otherContent => {
                    if (otherContent !== content) {
                        otherContent.style.maxHeight = null;
                        otherContent.previousElementSibling.querySelector('svg').classList.remove('-rotate-180');
                    }
                });

                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                    icon.classList.remove('-rotate-180');
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                    icon.classList.add('-rotate-180');
                }
            });
        });
        window.lucide?.createIcons();
    }

    function renderCardHTML(l) {
        const statusTone = {
            active: 'bg-emerald-50 text-emerald-700',
            draft: 'bg-slate-100 text-slate-600',
            archived: 'bg-rose-50 text-rose-700',
        }[l.status] || 'bg-slate-100 text-slate-600';

        const priceLabel = l.starting_price != null ?
            new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: l.currency || 'USD'
            })
                .format(l.starting_price / 100) :
            '—';

        const updatedLabel = l.updated_at ?
            new Date(l.updated_at).toLocaleDateString('en-UK', {
                year: "numeric",
                month: 'short',
                day: 'numeric',
                hour: "2-digit",
                minute: "2-digit",
            }) :
            '—';

        const image = l.image_url ?
            `<img src="https://cdn.cococe.rw/${escapeHtml(l.image_url)}" alt="${escapeHtml(l.title)}" class="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]" loading="lazy" />` :
            `<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"><i data-lucide="image" class="h-10 w-10 text-slate-300"></i></div>`;

        const variantBadge = l.total_variants ?
            `<span class="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">${escapeHtml(l.total_variants)} Vars.</span>` :
            '— No variants —';

        const brandBadge = l.brand_logo_url ?
            `${l.brand_logo_url ? `<img src="${l.brand_logo_url}" class="absolute right-3 bottom-1 max-w-[80px] p-1 bg-white/60 rounded-full">` : ''}` : '';

        const storeId = l.store_id || getStoreId();
        const listingUrl = `/stores/${storeId}/listings/review/${l.id}`;

        return `
        <article class="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                data-listing-id="${escapeHtml(l.id)}">
          <div class="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
            ${image}
            <span class="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusTone}">${escapeHtml(l.status || 'draft')}</span>
            ${variantBadge}
            ${brandBadge}
          </div>
          <div class="flex flex-1 flex-col p-4">
            <button class="accordion-header flex w-full items-center justify-between p-4 font-medium text-left text-slate-800 hover:bg-slate-50 transition-colors">
              <div class="w-full flex flex-col">
                <h3 class="line-clamp-2 text-sm font-semibold text-slate-900">${escapeHtml(l.title)}</h3>
                <p class="mt-1 line-clamp-1 text-xs text-slate-500">${escapeHtml(l.product_title || '—')}</p>
              </div>
              <svg class="w-5 h-5 text-slate-500 transition-transform duration-300" xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div class="accordion-content max-h-0 transition-[max-height] duration-300 ease-in-out overflow-hidden">
              <dl class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div><dt class="text-slate-400" title="Category">Category</dt><dd class="font-medium text-slate-700">${l.category || '(Uncategorized)'}</dd></div>
                <div><dt class="text-slate-400" title="Product Family">Family</dt><dd class="font-medium text-slate-700">${l.family || '(Unassigned)'}</dd></div>
                <div>
                  <dt class="text-slate-400" title="Product brand">Brand</dt><dd class="font-medium text-slate-700">${l.brand || '(Unbranded)'}</dd>
                </div>
                ${l.product_slug ? `<div><dt class="text-slate-400" title="Product slug">P. SLUG</dt><dd class="truncate font-medium text-slate-700">${escapeHtml(l.product_slug)}</dd></div>` : ''}
                <div><dt class="text-slate-400 cursor-pointer" title="Starting price">S. Price</dt><dd class="font-medium text-slate-700">${priceLabel}</dd></div>
                <div><dt class="text-slate-400 cursor-pointer" title="Inventory records">Inv. Records</dt><dd class="font-medium text-slate-700">${Number(l.inventory_records)}</dd></div>
                <div><dt class="text-slate-400 cursor-pointer" title="Total sold">T. Sold</dt><dd class="font-medium text-slate-700">${l.total_sold || '— Not provided —'}</dd></div>
                <div><dt class="text-slate-400 cursor-pointer" title="Reserved quantity">Rsv. Qty</dt><dd class="font-medium text-slate-700">${l.reserved_quantity || '— Not provided —'}</dd></div>
                <div><dt class="text-slate-400 cursor-pointer font-bold" title="Available quantity">Avail. Qty</dt><dd class="font-medium text-slate-700">${Number(l.available_quantity)}</dd></div>
                ${l.stock != null ? `<div><dt class="text-slate-400">Stock</dt><dd class="font-medium ${l.stock === 0 ? 'text-rose-600' : (l.stock < 10 ? 'text-amber-600' : 'text-slate-700')}">${l.stock === 0 ? 'Out of stock' : `${l.stock} available`}</dd></div>` : ''}
                <div><dt class="text-slate-400">Updated</dt><dd class="font-medium text-slate-700">${updatedLabel}</dd></div>
              </dl>
            </div>
            
            <div class="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span class="truncate font-mono text-[10px] text-slate-400">#${escapeHtml(String(l.id).slice(0, 12))}...</span>
              <a href="${listingUrl}"
                class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--color-brand-dark)]" title="Manage Listing">
                <i data-lucide="settings-2" class="h-3.5 w-3.5"></i>View
              </a>
            </div>
          </div>
        </article>`;
    }

    function renderPagination({
        page,
        hasNextPage,
        hasPreviousPage,
        totalPages,
        total,
        limit
    }) {
        const from = total ? (page - 1) * limit + 1 : 0;
        const to = Math.min(page * limit, total);

        // Results count
        els.count.textContent = total ?
            `Showing ${from} – ${to} of ${total} listings` :
            'No listings';

        // Page info
        els.pageInfo.textContent = total ?
            `Page ${page} of ${totalPages}` :
            '—';

        // Buttons
        els.pageControls.innerHTML = `
        <button
          type="button"
          class="pagination-btn"
          data-page="${page - 1}"
          ${!hasPreviousPage ? 'disabled' : ''}
          aria-label="Previous page"
        >
          <i data-lucide="chevron-left" class="h-4 w-4"></i>
          <span>Previous</span>
        </button>

        <span class="px-3 text-sm font-medium text-slate-600">
          Page <span class="font-bold text-slate-900">${page}</span> of ${totalPages}
        </span>

        <button
          type="button"
          class="pagination-btn"
          data-page="${page + 1}"
          ${!hasNextPage ? 'disabled' : ''}
          aria-label="Next page"
        >
          <span>Next</span>
          <i data-lucide="chevron-right" class="h-4 w-4"></i>
        </button>
      `;

        window.lucide?.createIcons();

        els.pageControls.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page, 10);
                if (p >= 1 && p <= totalPages && p !== page) {
                    state.page = p;
                    load();
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    function renderActiveFilters() {
        const chips = [];

        if (state.search) {
            chips.push(`
      <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
        Search: "${escapeHtml(state.search)}"
        <button data-clear="search" class="text-slate-400 hover:text-rose-600">×</button>
      </span>`);
        }
        if (state.status) {
            chips.push(`
      <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
        Status: ${escapeHtml(state.status)}
        <button data-clear="status" class="text-slate-400 hover:text-rose-600">×</button>
      </span>`);
        }

        els.activeFilters.innerHTML = chips.join('');

        els.activeFilters.querySelectorAll('[data-clear]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.clear;
                if (key === 'search') {
                    state.search = '';
                    els.search.value = '';
                }
                if (key === 'status') {
                    state.status = '';
                    els.status.value = '';
                }
                state.page = 1;
                renderActiveFilters();
                load();
            });
        });
    }

    function clearFilters() {
        state.search = '';
        state.status = '';
        state.page = 1;
        els.search.value = '';
        els.status.value = '';
        renderActiveFilters();
        load();
    }

    els.search?.addEventListener('input', debounce((e) => {
        state.search = e.target.value.trim();
        state.page = 1;
        renderActiveFilters();
        load();
    }, 500));

    els.status?.addEventListener('change', (e) => {
        state.status = e.target.value;
        state.page = 1;
        renderActiveFilters();
        load();
    });

    els.sort?.addEventListener('change', (e) => {
        state.sort = e.target.value;
        state.page = 1;
        load();
    });

    els.limit?.addEventListener('change', (e) => {
        state.limit = parseInt(e.target.value, 10);
        state.page = 1;
        load();
    });

    document.getElementById('createListingButton')?.addEventListener('click', () => {
        toast('Create listing flow opened');
    });

    renderActiveFilters();
    load();
})