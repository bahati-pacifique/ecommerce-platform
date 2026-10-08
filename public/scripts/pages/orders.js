const { openDrawer } = window.__shell;

const state = {
    page: 1,
    limit: 10,
    search: '',
    status: '',
};

const tbody = document.getElementById('ordersTbody');
const pagination = document.getElementById('ordersPagination');
const searchInput = document.getElementById('ordersSearch');
const statusSelect = document.getElementById('ordersStatus');

async function load() {
    tbody.innerHTML = `
    <tr><td colspan="7" class="px-5 py-10 text-center text-slate-400">Loading…</td></tr>
  `;

    const params = new URLSearchParams({
        page: state.page,
        limit: state.limit,
        search: state.search,
        status: state.status,
    });

    try {
        const res = await axios.get(`${protocal}api.${domainName}/store/${storeId}/data`, { withCredentials: true });
        console.log(res.data);

        //renderRows(data.data);
        //renderPagination(data);
        console.log(res.data)
        window.lucide?.createIcons();
    } catch (error) {
        console.log(error);
        Notification.showNotification({
            type: 'warning',
            message: error.response?.data?.message || 'Internal Server Error'
        });
    }

}

function renderRows(rows) {
    if (!rows.length) {
        tbody.innerHTML = `
      <tr><td colspan="7" class="px-5 py-16 text-center">
        <div class="inline-flex flex-col items-center gap-2">
          <i data-lucide="inbox" class="h-8 w-8 text-slate-300"></i>
          <p class="text-sm font-medium text-slate-700">No orders found</p>
          <p class="text-xs text-slate-500">Try changing filters.</p>
        </div>
      </td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map(r => `
    <tr class="hover:bg-slate-50 cursor-pointer" data-order-id="${r.id}">
      <td class="px-5 py-4 font-semibold">#${r.id}</td>
      <td class="px-5 py-4">${r.date}</td>
      <td class="px-5 py-4">${r.customer}</td>
      <td class="px-5 py-4">${r.items}</td>
      <td class="px-5 py-4">${r.total}</td>
      <td class="px-5 py-4">
        <span class="rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' :
            r.status === 'Shipped' ? 'bg-brand-ultralight text-brand-dark' :
                'bg-amber-50 text-amber-700'
        }">${r.status}</span>
      </td>
      <td class="px-5 py-4">
        <button class="font-semibold text-brand">View</button>
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

function renderPagination({ page, limit, total, hasNext, hasPrev }) {
    const totalPages = Math.ceil(total / limit);
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    let pages = '';
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    for (let p = startPage; p <= endPage; p++) {
        pages += `<button class="px-3 py-1.5 rounded-lg border text-sm ${p === page ? 'bg-brand text-white border-brand' : 'hover:bg-slate-50'}" data-page="${p}">${p}</button>`;
    }

    pagination.innerHTML = `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
      <span>Showing ${from}–${to} of ${total}</span>
      <div class="flex gap-1">
        <button class="px-3 py-1.5 rounded-lg border text-sm ${!hasPrev ? 'opacity-40' : 'hover:bg-slate-50'}" data-page="${page - 1}" ${!hasPrev ? 'disabled' : ''}>Prev</button>
        ${pages}
        <button class="px-3 py-1.5 rounded-lg border text-sm ${!hasNext ? 'opacity-40' : 'hover:bg-slate-50'}" data-page="${page + 1}" ${!hasNext ? 'disabled' : ''}>Next</button>
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

// Filters
let debounce;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 1;
        load();
    }, 300);
});

statusSelect.addEventListener('change', (e) => {
    state.status = e.target.value;
    state.page = 1;
    load();
});

// Init
load();