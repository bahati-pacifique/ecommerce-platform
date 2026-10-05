class AnalyticsManager {

    constructor() {
        this.api = {
            base: `${protocal}api.${domainName}`
        };

        this.period = '7d';

        this.elements = {
            period: document.getElementById('overview-period'),

            sales: document.getElementById('overview-sales'),
            salesChange: document.getElementById('overview-sales-change'),

            orders: document.getElementById('overview-orders'),
            pendingOrders: document.getElementById('overview-pending-orders'),

            inventoryItems:
                document.getElementById('overview-inventory-items'),

            lowStock:
                document.getElementById('overview-low-stock'),

            totalStores:
                document.getElementById('overview-total-stores'),

            storeStatus:
                document.getElementById('overview-store-status'),

            alerts:
                document.getElementById('overview-alerts'),

            recentOrders:
                document.getElementById('overview-recent-orders'),

            loader: 
                document.getElementById('analyticsLoader')
        };

        if (this.elements.period) {
            this.elements.period.addEventListener('change', (event) => {
                this.period = event.target.value;
                this.getVendorAnalytics();
            });
        }

        this.getVendorAnalytics();
    }


    /**
     * Bind analytics events.
     */
    bindEvents() {

        if (!this.elements.period) {
            return;
        }

        this.elements.period.addEventListener(
            'change',
            () => {

                this.period =
                    this.elements.period.value || '30d';

                this.getVendorAnalytics();
            }
        );

        this.elements.refreshBtn.addEventListener('click', async (e) => {
            this.getVendorAnalytics(true);
        })
    }


    /**
     * Get vendor analytics.
     *
     * @param {boolean} force
     */
    async getVendorAnalytics(force = false) {

        try {

            this.elements.loader.classList.remove('hidden');

            const response = await axios.get(
                `${this.api.base}/vendor/data/analytics`,
                {
                    params: {
                        period: this.period
                    },

                    withCredentials: true
                }
            );

            /*
             * Depending on your controller response,
             * analytics may be directly under data.analytics.
             */
            const analytics =
                response.data?.analytics
                ?? response.data?.data?.analytics
                ?? response.data?.data
                ?? response.data;

            if (!analytics) {
                throw new Error(
                    'Analytics data was not returned.'
                );
            }

            this.renderAnalytics(analytics);

        } catch (error) {

            console.log(
                'Analytics error:',
                error
            );

            Notification.showNotification({
                type: 'error',
                message:
                    error.response?.data?.message
                    || error.message
                    || 'Internal Server Error'
            });
        } finally {
            this.elements.loader.classList.add('hidden');
        }
    }


    /**
     * Render complete analytics dashboard.
     *
     * @param {Object} analytics
     */
    renderAnalytics(analytics) {

        const summary =
            analytics.summary || {};

        const changes =
            analytics.changes || {};

        const orders =
            analytics.orders_by_status || {};

        const inventory =
            analytics.inventory || {};

        /*
         * Summary
         */
        this.setText(
            this.elements.sales,
            this.formatCurrency(
                summary.sales
            )
        );

        this.setText(
            this.elements.orders,
            this.formatNumber(
                summary.orders
            )
        );

        this.setText(
            this.elements.aov,
            this.formatCurrency(
                summary.average_order_value
            )
        );

        this.setText(
            this.elements.itemsSold,
            this.formatNumber(
                summary.items_sold
            )
        );

        this.setText(
            this.elements.customers,
            this.formatNumber(
                summary.customer_orders
            )
        );


        /*
         * Percentage changes
         */
        this.renderChange(
            this.elements.salesChange,
            changes.sales,
            'from previous period'
        );

        this.renderChange(
            this.elements.ordersChange,
            changes.orders,
            'from previous period'
        );

        this.renderChange(
            this.elements.aovChange,
            changes.average_order_value,
            'from previous period'
        );


        /*
         * Order status
         */
        this.setText(
            this.elements.pending,
            this.formatNumber(
                orders.pending
            )
        );

        this.setText(
            this.elements.processing,
            this.formatNumber(
                orders.processing
            )
        );

        this.setText(
            this.elements.shipped,
            this.formatNumber(
                orders.shipped
            )
        );

        this.setText(
            this.elements.delivered,
            this.formatNumber(
                orders.delivered
            )
        );

        this.setText(
            this.elements.cancelled,
            this.formatNumber(
                orders.cancelled
            )
        );


        /*
         * Inventory
         */
        this.setText(
            this.elements.availableStock,
            this.formatNumber(
                inventory.available_quantity
            )
        );

        this.setText(
            this.elements.lowStock,
            `${this.formatNumber(
                inventory.low_stock_items
            )} low stock`
        );

        this.setText(
            this.elements.inventoryTotal,
            this.formatNumber(
                inventory.total_quantity
            )
        );

        this.setText(
            this.elements.inventoryReserved,
            this.formatNumber(
                inventory.reserved_quantity
            )
        );

        this.setText(
            this.elements.inventoryLow,
            this.formatNumber(
                inventory.low_stock_items
            )
        );

        this.setText(
            this.elements.inventoryOut,
            this.formatNumber(
                inventory.out_of_stock_items
            )
        );


        /*
         * Tables
         */
        this.renderStores(
            analytics.stores || []
        );

        this.renderProducts(
            analytics.top_products || []
        );
    }


    /**
     * Render store performance.
     *
     * @param {Array} stores
     */
    renderStores(stores) {

        if (!this.elements.stores) {
            return;
        }

        if (!stores.length) {

            this.elements.stores.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="py-8 text-center text-gray-400"
                    >
                        No store data available
                    </td>
                </tr>
            `;

            return;
        }

        this.elements.stores.innerHTML =
            stores.map(store => `
                <tr
                    class="border-b border-gray-50 last:border-0"
                >

                    <td class="py-3 pr-4">
                        <span class="font-medium text-gray-900">
                            ${this.escapeHtml(
                store.store_name || 'Unnamed Store'
            )}
                        </span>
                    </td>

                    <td class="py-3 px-4 text-gray-700">
                        ${this.formatNumber(
                store.orders
            )}
                    </td>

                    <td class="py-3 px-4 text-gray-700">
                        ${this.formatNumber(
                store.items_sold
            )}
                    </td>

                    <td class="py-3 px-4 font-medium text-gray-900">
                        ${this.formatCurrency(
                store.sales
            )}
                    </td>

                    <td class="py-3 pl-4 text-gray-700">
                        ${this.formatCurrency(
                store.average_order_value
            )}
                    </td>

                </tr>
            `).join('');
    }


    /**
     * Render top selling products.
     *
     * @param {Array} products
     */
    renderProducts(products) {

        if (!this.elements.products) {
            return;
        }

        if (!products.length) {

            this.elements.products.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="py-8 text-center text-gray-400"
                    >
                        No product data available
                    </td>
                </tr>
            `;

            return;
        }

        this.elements.products.innerHTML =
            products.map(product => `
                <tr
                    class="border-b border-gray-50 last:border-0"
                >

                    <td class="py-3 pr-4">

                        <span
                            class="font-medium text-gray-900"
                        >
                            ${this.escapeHtml(
                product.product_title
                || 'Unnamed Product'
            )}
                        </span>

                    </td>

                    <td class="py-3 px-4 text-gray-700">
                        ${this.formatNumber(
                product.units_sold
            )}
                    </td>

                    <td class="py-3 px-4 text-gray-700">
                        ${this.formatNumber(
                product.orders
            )}
                    </td>

                    <td class="py-3 pl-4 font-medium text-gray-900">
                        ${this.formatCurrency(
                product.sales
            )}
                    </td>

                </tr>
            `).join('');
    }


    /**
     * Render percentage change.
     *
     * @param {HTMLElement} element
     * @param {number|null} value
     * @param {string} label
     */
    renderChange(
        element,
        value,
        label = 'from previous period'
    ) {

        if (!element) {
            return;
        }

        if (
            value === null ||
            value === undefined ||
            Number.isNaN(Number(value))
        ) {

            element.className =
                'text-sm text-gray-400 mt-1';

            element.textContent =
                'No previous period data';

            return;
        }

        const number = Number(value);

        const isPositive = number > 0;
        const isNegative = number < 0;

        let arrow = '→';

        if (isPositive) {
            arrow = '↑';
        } else if (isNegative) {
            arrow = '↓';
        }

        /*
         * Zero is neutral.
         */
        let color = 'text-gray-500';

        if (isPositive) {
            color = 'text-green-600';
        } else if (isNegative) {
            color = 'text-amber-600';
        }

        element.className =
            `text-sm mt-1 ${color}`;

        element.textContent =
            `${arrow} ${Math.abs(number).toFixed(1)}% ${label}`;
    }


    /**
     * Set element text safely.
     *
     * @param {HTMLElement} element
     * @param {*} value
     */
    setText(element, value) {

        if (!element) {
            return;
        }

        element.textContent =
            value ?? '';
    }


    /**
     * Format number.
     *
     * @param {*} value
     * @returns {string}
     */
    formatNumber(value) {

        const number = Number(value || 0);

        return new Intl.NumberFormat(
            undefined,
            {
                maximumFractionDigits: 0
            }
        ).format(number);
    }


    /**
     * Format currency.
     *
     * Change RWF to your marketplace currency
     * when your currency system is finalized.
     *
     * @param {*} value
     * @returns {string}
     */
    formatCurrency(value) {

        const number = Number(value || 0);

        return new Intl.NumberFormat(
            undefined,
            {
                style: 'currency',
                currency: 'RWF',
                maximumFractionDigits: 2
            }
        ).format(number);
    }


    /**
     * Escape HTML before inserting
     * server-provided values into innerHTML.
     *
     * @param {*} value
     * @returns {string}
     */
    escapeHtml(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}