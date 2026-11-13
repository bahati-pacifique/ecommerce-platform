(function () {
    const {
        openDrawer
    } = window.__shell;

    const state = {
        page: 1,
        limit: 100,
        search: '',
        status: '',
    };

    const tbody = document.getElementById('ordersTbody');
    const pagination = document.getElementById('ordersPagination');
    const searchInput = document.getElementById('listingDataSearch');
    const statusSelect = document.getElementById('listingDataStatus');

    $('#listingDataRefreshBtn').click(() => {
        state.search = '';
        state.status = '';
        load();
    });

    async function load() {
        tbody.innerHTML = `<tr><td colspan="7" class="px-5 py-10 text-center text-slate-400">Loading…</td></tr>`;

        const params = new URLSearchParams({
            page: state.page,
            limit: state.limit,
            ...(!!state.search && {
                search: state.search
            }),
            ...(!!state.status && {
                status: state.status
            }),
        });

        try {

            const res = await axios.get(`${protocal}business.${domainName}/stores/${store.id}/data/product-listing/analytics`, {
                params,
                withCredentials: true
            });

            renderRows(res.data.data);
            renderPagination(res.data.pagination);

            window.lucide?.createIcons();
        } catch (error) {
            console.error(error);
            Notification.showNotification({
                type: 'warning',
                message: error.response?.data?.message || 'Internal Server Error'
            });
        } finally {
            state.search = null;
        }

    }

    function renderRows(rows) {
        if (!rows.length) {
            tbody.innerHTML = `
            <tr><td colspan="7" class="px-5 py-16 text-center">
                <div class="inline-flex flex-col items-center gap-2">
                <i data-lucide="package-open" class="h-8 w-8 text-slate-300"></i>
                <p class="text-sm font-medium text-slate-700">No product listing data available</p>
                <p class="text-xs text-slate-500">Try changing filters.</p>
                </div>
            </td></tr>
        `;
            return;
        }

        tbody.innerHTML = rows.map(r => `
        <tr class="hover:bg-slate-50 cursor-pointer" data-order-id="${r.id}">
          <td class="px-5 py-4">${truncateText(r.product_name, 25)}</td>
          <td class="px-5 py-4">${truncateText(r.listing_name, 25)}</td>
          <td class="px-5 py-4">${r.total_variants}</td>
          <td class="px-5 py-4">${r.inventory_records}</td>
          <td class="px-5 py-4">
            ${r.reserved_units}
          </td>
          <td class="px-5 py-4">
              ${r.available_units}
          </td>
          <td class="px-5 py-4">
              ${r.stored_units}
          </td>
          <td class="px-5 py-4 font-semibold">
            <a href="/stores/${storeId}/listings/${r.listing_id}/review" target="blank" class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">
              <i data-lucide="arrow-right"></i>
            </a>
          </td>
        </tr>
      `).join('');

        tbody.querySelectorAll('tr[data-order-id]').forEach(tr => {
            tr.addEventListener('click', () => {
                const order = rows.find(r => r.id === tr.dataset.orderId);
                if (order) openDrawer(order);
            });
        });
    }

    function renderPagination(payload) {

        const totalPages = payload.totalPages;
        const from = (payload.page - 1) * (payload.total > 0 ? payload.limit + 1 : 0);
        const to = Math.min(payload.page * payload.limit, payload.total);
        const hasPrev = totalPages > 1;
        const hasNext = payload.page < totalPages;

        let pages = '';
        const startPage = Math.max(1, payload.page - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        for (let p = startPage; p <= endPage; p++) {
            pages += `<button class="px-3 py-1.5 rounded-lg border text-sm ${p === payload.page ? 'bg-brand text-white border-brand' : 'hover:bg-slate-50'}" data-page="${p}">${p}</button>`;
        }

        pagination.innerHTML = `
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>Showing ${from} – ${to} of ${totalPages}</span>
          <div class="flex gap-1">
            <button class="px-3 py-1.5 rounded-lg border text-sm ${!hasPrev ? 'opacity-40' : 'hover:bg-slate-50'}" data-page="${payload.page - 1}" ${!hasPrev ? 'disabled' : ''}>Prev</button>
            ${pages}
            <button class="px-3 py-1.5 rounded-lg border text-sm ${!hasNext ? 'opacity-40' : 'hover:bg-slate-50'}" data-page="${payload.page + 1}" ${!hasNext ? 'disabled' : ''}>Next</button>
          </div>
        </div>
      `;

        pagination.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.page);
                if (p >= 1 && p <= totalPages && p !== state.page) {
                    state.page = p;
                    load();
                }
            });
        });
    }


    let debounce;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            state.search = e.target.value.trim();
            state.page = 1;
            load();
        }, 500);
    });

    statusSelect.addEventListener('change', (e) => {
        state.status = e.target.value;
        state.page = 1;
        load();
    });

    // Init
    load();
})();