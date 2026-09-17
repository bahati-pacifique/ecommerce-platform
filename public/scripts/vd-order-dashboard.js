// class VendorOrder {
//     constructor() {
//         this._fetchVendorStoreData();
//     }

//     async _fetchVendorStoreData() {

//         try {
//             const response = await axios.get(`${protocal}api.${domainName}/vendor/data/orders`, { withCredentials: true });
//             console.log(response.data)
//         } catch (error) {
//             console.log(error)
//             Notification.showNotification({
//                 type: 'error',
//                 message: error.response?.data?.message || 'Internal Server Error'
//             })
//         } finally {
//             //Close tab loader
//         }
//     }
// }


class OrdersManager {
    constructor(options = {}) {
        this.root = options.root || document;

        this.loaded = false;
        this.loading = false;
        this.range = '30d';          // '7' | '30' | 'all'
        this.data = null;           // { summary, stores }

        this.els = this._queryDom();

        this._onSidebarClick = () => this.load();
        this._onKeydown = (e) => { /* reserved */ };

        this._wire();
        this.load();
    }

    // ----------------------------------------------------------
    // DOM
    // ----------------------------------------------------------
    _queryDom() {
        const $ = (s) => this.root.querySelector(s);
        const $$ = (s) => Array.from(this.root.querySelectorAll(s));

        return {
            refreshBtn: $('#ordersRefreshBtn'),
            retryBtn: $('#ordersRetryBtn'),

            loading: $('#ordersLoading'),
            error: $('#ordersError'),
            errorMsg: $('#ordersErrorMsg'),
            content: $('#ordersContent'),

            rangeBtns: $$('.range-btn'),

            kpiTotalOrders: $('#kpiTotalOrders'),
            kpiOrdersDelta: $('#kpiOrdersDelta'),
            kpiRevenue: $('#kpiRevenue'),
            kpiRevenueHint: $('#kpiRevenueHint'),
            kpiAov: $('#kpiAov'),
            kpiStores: $('#kpiStores'),

            statusBreakdown: $('#statusBreakdown'),
            moneyBreakdown: $('#moneyBreakdown'),

            velocity24: $('#velocity24'),
            velocity7: $('#velocity7'),
            velocity30: $('#velocity30'),

            storesGrid: $('#storesGrid'),
            storesEmpty: $('#storesEmpty'),
            storesCount: $('#storesCount'),

            sidebarLink: document.querySelector('.sidebar-link[data-tab="orders"]')
        };
    }

    // ----------------------------------------------------------
    // Wiring
    // ----------------------------------------------------------
    _wire() {
        const e = this.els;

        e.sidebarLink?.addEventListener('click', this._onSidebarClick);
        e.refreshBtn?.addEventListener('click', () => this.load(true));
        e.retryBtn?.addEventListener('click', () => this.load(true));

        e.rangeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.range = btn.dataset.range;
                e.rangeBtns.forEach(b => b.classList.toggle('active', b === btn));
                this.load(true);
            });
        });

        // Default active class for the initial range
        e.rangeBtns.forEach(b =>
            b.classList.toggle('active', b.dataset.range === this.range)
        );
    }

    // ----------------------------------------------------------
    // Load
    // ----------------------------------------------------------
    async load(force = false) {
        if (this.loading) return;
        if (this.loaded && !force) return;

        this.loading = true;
        this.els.loading.classList.remove('hidden');
        this.els.error.classList.add('hidden');
        this.els.content.classList.add('hidden');

        try {
            // const params = new URLSearchParams();
            // if (this.range !== 'all') params.set('range', `${this.range}d`);

            const res = await axios.get(`${protocal}api.${domainName}/vendor/data/orders`, { params: { period: this.range }, withCredentials: true });
            const payload = res.data || {};

            const body = payload.data && payload.data.summary ? payload.data : payload;
            this.data = {
                summary: body.summary || {},
                stores: Array.isArray(body.stores) ? body.stores : []
            };

            this.loaded = true;
            this.loading = false;
            this.render();

        } catch (err) {
            console.error('[OrdersManager.load]', err);
            this.loading = false;
            this.loaded = false;
            this.els.loading.classList.add('hidden');
            this.els.error.classList.remove('hidden');
            this.els.errorMsg.textContent = this._humanizeError(err);
            this._refreshIcons();
        }
    }

    // ----------------------------------------------------------
    // Render
    // ----------------------------------------------------------
    render() {
        const e = this.els;
        e.loading.classList.add('hidden');
        e.content.classList.remove('hidden');

        const s = this.data?.summary || {};
        const stores = this.data?.stores || [];

        // ---- KPIs ----
        const totalOrders = Number(s.total_orders || 0);
        const revenue = Number(s.total_revenue || 0);
        const delivered = Number(s.delivered || 0);

        e.kpiTotalOrders.textContent = this._num(totalOrders);

        const last30 = Number(s.orders_last_30_days || 0);
        const last7 = Number(s.orders_last_7_days || 0);
        e.kpiOrdersDelta.textContent = last30
            ? `${this._num(last30)} in last 30 days`
            : (last7 ? `${this._num(last7)} in last 7 days` : '—');

        e.kpiRevenue.textContent = this._money(revenue);
        e.kpiRevenueHint.textContent = s.subtotal
            ? `before ${this._money(Number(s.discount || 0) + Number(s.tax || 0))} fees/tax`
            : '—';

        e.kpiAov.textContent = delivered > 0
            ? this._money(revenue / delivered)
            : '—';

        e.kpiStores.textContent = this._num(stores.length);

        // ---- Status breakdown ----
        const statuses = [
            { key: 'pending', label: 'Pending', cls: 'fill-pending' },
            { key: 'processing', label: 'Processing', cls: 'fill-processing' },
            { key: 'shipped', label: 'Shipped', cls: 'fill-shipped' },
            { key: 'delivered', label: 'Delivered', cls: 'fill-delivered' },
            { key: 'cancelled', label: 'Cancelled', cls: 'fill-cancelled' }
        ];
        const statusTotal = statuses.reduce((a, { key }) => a + Number(s[key] || 0), 0) || 1;

        e.statusBreakdown.innerHTML = statuses.map(st => {
            const v = Number(s[st.key] || 0);
            const pct = Math.round((v / statusTotal) * 100);
            return `
        <div class="status-row">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="text-gray-600">${st.label}</span>
            <span class="text-gray-800 font-semibold tabular-nums">
              ${this._num(v)} <span class="text-gray-400 font-normal">· ${pct}%</span>
            </span>
          </div>
          <div class="track col-span-2">
            <div class="fill ${st.cls}" style="width:${pct}%"></div>
          </div>
        </div>
      `;
        }).join('');

        // ---- Money breakdown ----
        const rows = [
            { label: 'Subtotal', value: Number(s.subtotal || 0), strong: false },
            { label: 'Discount', value: -Number(s.discount || 0), strong: false, negative: true },
            { label: 'Tax', value: Number(s.tax || 0), strong: false },
            { label: 'Shipping', value: Number(s.shipping_fee || 0), strong: false }
        ];
        e.moneyBreakdown.innerHTML = rows.map(r => `
      <div class="flex items-center justify-between text-sm">
        <dt class="text-gray-500">${r.label}</dt>
        <dd class="tabular-nums ${r.negative ? 'text-red-600' : 'text-gray-800'}">
          ${r.negative ? '−' : ''}${this._money(Math.abs(r.value))}
        </dd>
      </div>
    `).join('') + `
      <div class="flex items-center justify-between text-sm pt-2.5 border-t border-gray-100">
        <dt class="font-semibold text-gray-800">Total revenue</dt>
        <dd class="tabular-nums font-bold text-gray-900">${this._money(revenue)}</dd>
      </div>
    `;

        // ---- Velocity ----
        e.velocity24.textContent = this._num(Number(s.orders_last_24_hours || 0));
        e.velocity7.textContent = this._num(Number(s.orders_last_7_days || 0));
        e.velocity30.textContent = this._num(Number(s.orders_last_30_days || 0));

        // ---- Stores ----
        if (stores.length === 0) {
            e.storesGrid.innerHTML = '';
            e.storesGrid.classList.add('hidden');
            e.storesEmpty.classList.remove('hidden');
            e.storesCount.textContent = '0 stores';
        } else {
            e.storesGrid.classList.remove('hidden');
            e.storesEmpty.classList.add('hidden');
            e.storesCount.textContent =
                `${stores.length} store${stores.length === 1 ? '' : 's'}`;

            // Sort by total revenue desc
            const sorted = [...stores].sort(
                (a, b) => Number(b.total_revenue || 0) - Number(a.total_revenue || 0)
            );

            e.storesGrid.innerHTML = sorted.map(st => this._renderStoreCard(st)).join('');
        }

        this._refreshIcons();
    }

    _renderStoreCard(st) {
        const total = Number(st.total_orders || 0);
        const revenue = Number(st.total_revenue || 0);

        // Status pills for the store
        const pills = [
            { key: 'pending', label: 'Pending', bg: 'bg-amber-50', fg: 'text-amber-700' },
            { key: 'processing', label: 'Processing', bg: 'bg-blue-50', fg: 'text-blue-700' },
            { key: 'shipped', label: 'Shipped', bg: 'bg-violet-50', fg: 'text-violet-700' },
            { key: 'delivered', label: 'Delivered', bg: 'bg-emerald-50', fg: 'text-emerald-700' },
            { key: 'cancelled', label: 'Cancelled', bg: 'bg-red-50', fg: 'text-red-700' }
        ]
            .map(p => ({ ...p, value: Number(st[p.key] || 0) }))
            .filter(p => p.value > 0)
            .map(p => `
        <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.bg} ${p.fg}">
          ${p.value} ${p.label}
        </span>
      `).join('');

        return `
      <div class="store-summary-card">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-brand-light text-brand flex items-center justify-center flex-shrink-0">
              <i data-lucide="store" class="w-4 h-4"></i>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate" title="${this._escapeHtml(st.store_name || '')}">
                ${this._escapeHtml(st.store_name || 'Unnamed Store')}
              </p>
              <p class="text-[11px] text-gray-400">
                ${this._num(total)} orders
              </p>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="text-sm font-bold text-gray-900 tabular-nums">${this._money(revenue)}</p>
            <p class="text-[11px] text-gray-400">revenue</p>
          </div>
        </div>

        ${pills ? `<div class="flex flex-wrap gap-1.5">${pills}</div>` : ''}
      </div>
    `;
    }

    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------
    _num(n) {
        return Number(n || 0).toLocaleString('en-US');
    }

    _money(n) {
        const v = Number(n || 0);
        // Compact for large numbers, full otherwise
        if (Math.abs(v) >= 1_000_000) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency', currency: 'RWF',
                notation: 'compact', maximumFractionDigits: 1
            }).format(v);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'RWF',
            maximumFractionDigits: 0
        }).format(v);
    }

    _escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
        );
    }

    _humanizeError(err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) return "You don't have permission to view orders.";
        if (!err.response) return "We couldn't reach the server. Check your connection and try again.";
        return err.response?.data?.message || "We couldn't load order data. Please try again.";
    }

    _refreshIcons() {
        window.lucide?.createIcons?.();
    }
}