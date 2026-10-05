class OverviewManager {

    constructor() {

        this.api = {
            base: `${protocal}api.${domainName}`
        };

        this.period = '7d';

        this.salesChart = null;
        this.orderChart = null;

        this.mockOverviewResponse = {
            period: "7d",

            summary: {
                sales: 4857500,
                orders: 128,
                pending_orders: 17,
                inventory_items: 342,
                low_stock_items: 14,
                total_stores: 3,
                active_stores: 2,
                pending_stores: 1
            },

            sales_chart: [
                {
                    date: "2026-09-15",
                    label: "Mon",
                    sales: 425000
                },
                {
                    date: "2026-09-16",
                    label: "Tue",
                    sales: 680000
                },
                {
                    date: "2026-09-17",
                    label: "Wed",
                    sales: 510000
                },
                {
                    date: "2026-09-18",
                    label: "Thu",
                    sales: 790000
                },
                {
                    date: "2026-09-19",
                    label: "Fri",
                    sales: 625000
                },
                {
                    date: "2026-09-20",
                    label: "Sat",
                    sales: 945000
                },
                {
                    date: "2026-09-21",
                    label: "Sun",
                    sales: 882500
                }
            ],

            order_status: {
                pending: 17,
                processing: 24,
                shipped: 31,
                delivered: 49,
                cancelled: 7
            },

            alerts: [
                {
                    type: "low_stock",
                    severity: "urgent",
                    icon: "⚠️",
                    title: "Low Stock Alert",
                    message: "14 inventory item(s) are low on stock."
                },
                {
                    type: "pending_orders",
                    severity: "attention",
                    icon: "📦",
                    title: "Pending Orders",
                    message: "17 order(s) are waiting for processing."
                },
                {
                    type: "pending_stores",
                    severity: "attention",
                    icon: "🏪",
                    title: "Pending Stores",
                    message: "1 store(s) are waiting for approval."
                }
            ],

            recent_orders: [
                {
                    id: "a1111111-1111-1111-1111-111111111111",
                    order_number: "COC-20260921-00128",
                    store_name: "Cococe Electronics",
                    status: "pending",
                    total: 185000,
                    created_at: "2026-09-21T13:42:00Z"
                },
                {
                    id: "a2222222-2222-2222-2222-222222222222",
                    order_number: "COC-20260921-00127",
                    store_name: "Digital Hub",
                    status: "processing",
                    total: 425000,
                    created_at: "2026-09-21T12:18:00Z"
                },
                {
                    id: "a3333333-3333-3333-3333-333333333333",
                    order_number: "COC-20260921-00126",
                    store_name: "Cococe Electronics",
                    status: "shipped",
                    total: 275000,
                    created_at: "2026-09-21T10:51:00Z"
                },
                {
                    id: "a4444444-4444-4444-4444-444444444444",
                    order_number: "COC-20260920-00125",
                    store_name: "Mobile World",
                    status: "delivered",
                    total: 680000,
                    created_at: "2026-09-20T16:27:00Z"
                },
                {
                    id: "a5555555-5555-5555-5555-555555555555",
                    order_number: "COC-20260920-00124",
                    store_name: "Digital Hub",
                    status: "cancelled",
                    total: 120000,
                    created_at: "2026-09-20T14:05:00Z"
                }
            ]
        };

        this.elements = {

            period:
                document.getElementById('overview-period'),

            sales:
                document.getElementById('overview-sales'),

            salesChange:
                document.getElementById('overview-sales-change'),

            orders:
                document.getElementById('overview-orders'),

            pendingOrders:
                document.getElementById('overview-pending-orders'),

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
                document.getElementById('overview-recent-orders')
        };


        /*
         * Period selector
         */
        if (this.elements.period) {

            this.elements.period.addEventListener(
                'change',
                (event) => {

                    this.period = event.target.value;

                    this.getVendorOverview();
                }
            );
        }


        /*
         * Initial load
         */
        this.getVendorOverview();
    }


    /*
     * =========================================================
     * GET OVERVIEW DATA
     * =========================================================
     */
    async getVendorOverview() {

        try {

            // const mockApiResponse = {
            //     overview: this.mockOverviewResponse
            // };
            // console.log(mockApiResponse)
            const response = await axios.get(
                `${this.api.base}/vendor/data/overview`,
                {
                    params: {
                        period: this.period
                    },

                    withCredentials: true
                }
            );

            // const response = {
            //     data: {
            //         overview: this.mockOverviewResponse
            //     }
            // };

            // console.log(
            //     'Vendor overview:',
            //     response.data
            // );


            const data =
                response.data?.overview
                ?? response.data?.data?.overview
                ?? response.data?.data
                ?? response.data;


            this.render(data);

        } catch (error) {

            console.error(
                'Vendor overview error:',
                error
            );


            Notification.showNotification({
                type: 'error',

                message:
                    error.response?.data?.message
                    || 'Unable to load dashboard overview'
            });
        }
    }


    /*
     * =========================================================
     * RENDER OVERVIEW
     * =========================================================
     */
    render(data) {

        const summary = data?.summary || {};


        /*
         * Summary cards
         */
        this.setText(
            this.elements.sales,
            this.formatCurrency(summary.sales)
        );


        this.setText(
            this.elements.salesChange,
            'Current period'
        );


        this.setText(
            this.elements.orders,
            this.formatNumber(summary.orders)
        );


        this.setText(
            this.elements.pendingOrders,
            `${this.formatNumber(summary.pending_orders)} pending`
        );


        this.setText(
            this.elements.inventoryItems,
            this.formatNumber(summary.inventory_items)
        );


        this.setText(
            this.elements.lowStock,
            `⚠️ ${this.formatNumber(summary.low_stock_items)} low stock`
        );


        this.setText(
            this.elements.totalStores,
            this.formatNumber(summary.total_stores)
        );


        this.setText(
            this.elements.storeStatus,
            `${this.formatNumber(summary.active_stores)} active · ${this.formatNumber(summary.pending_stores)} pending`
        );


        /*
         * Charts
         */
        this.renderSalesChart(
            data.sales_chart || []
        );


        this.renderOrderChart(
            data.order_status || {}
        );


        /*
         * Alerts
         */
        this.renderAlerts(
            data.alerts || []
        );


        /*
         * Recent orders
         */
        this.renderRecentOrders(
            data.recent_orders || []
        );
    }


    /*
     * =========================================================
     * SALES CHART
     * =========================================================
     */
    renderSalesChart(data) {

        const canvas =
            document.getElementById('salesChart');


        if (!canvas) {
            return;
        }


        const context =
            canvas.getContext('2d');


        if (!context) {
            return;
        }


        /*
         * Destroy previous chart
         * before creating a new one.
         */
        if (this.salesChart) {

            this.salesChart.destroy();

            this.salesChart = null;
        }


        const labels = data.map(
            item => item.label
        );


        const sales = data.map(
            item => Number(item.sales || 0)
        );


        this.salesChart = new Chart(
            context,
            {
                type: 'line',

                data: {

                    labels,

                    datasets: [
                        {
                            label: 'Sales',

                            data: sales,

                            borderColor: '#ED1B24',

                            backgroundColor:
                                'rgba(237, 27, 36, 0.05)',

                            fill: true,

                            tension: 0.4,

                            borderWidth: 2,

                            pointBackgroundColor:
                                '#ED1B24',

                            pointBorderColor:
                                'white',

                            pointBorderWidth: 2
                        }
                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        }
                    },


                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {
                                callback: (value) =>
                                    this.formatCompactCurrency(value)
                            }
                        },


                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            }
        );
    }


    renderOrderChart(orderStatus) {

        const canvas =
            document.getElementById('orderChart');


        if (!canvas) {
            return;
        }


        const context =
            canvas.getContext('2d');


        if (!context) {
            return;
        }


        /*
         * Destroy previous chart
         */
        if (this.orderChart) {

            this.orderChart.destroy();

            this.orderChart = null;
        }


        this.orderChart = new Chart(
            context,
            {
                type: 'doughnut',

                data: {

                    labels: [
                        'Delivered',
                        'Processing',
                        'Shipped',
                        'Pending',
                        'Cancelled'
                    ],


                    datasets: [
                        {
                            data: [

                                Number(
                                    orderStatus.delivered || 0
                                ),

                                Number(
                                    orderStatus.processing || 0
                                ),

                                Number(
                                    orderStatus.shipped || 0
                                ),

                                Number(
                                    orderStatus.pending || 0
                                ),

                                Number(
                                    orderStatus.cancelled || 0
                                )
                            ],


                            backgroundColor: [
                                '#22c55e',
                                '#3b82f6',
                                '#8b5cf6',
                                '#f59e0b',
                                '#ef4444'
                            ],

                            borderWidth: 0
                        }
                    ]
                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: 'bottom',

                            labels: {

                                padding: 12,

                                usePointStyle: true,

                                pointStyle: 'circle'
                            }
                        }
                    },


                    cutout: '70%'
                }
            }
        );
    }


    /*
     * =========================================================
     * ALERTS
     * =========================================================
     */
    renderAlerts(alerts) {

        if (!this.elements.alerts) {
            return;
        }


        if (!alerts.length) {

            this.elements.alerts.innerHTML = `
                <div class="p-4 bg-green-50 rounded-xl
                            border border-green-200">

                    <p class="text-sm font-medium text-green-700">
                        No active alerts
                    </p>

                    <p class="text-xs text-green-600 mt-1">
                        Everything looks good.
                    </p>

                </div>
            `;

            return;
        }


        this.elements.alerts.innerHTML =
            alerts.map(alert => {

                const severity =
                    alert.severity || 'attention';


                const styles = {

                    urgent: {
                        container:
                            'bg-red-50 border-red-200',

                        title:
                            'text-red-700',

                        message:
                            'text-red-600',

                        badge:
                            'text-red-700'
                    },


                    attention: {
                        container:
                            'bg-amber-50 border-amber-200',

                        title:
                            'text-amber-700',

                        message:
                            'text-amber-600',

                        badge:
                            'text-amber-700'
                    },


                    done: {
                        container:
                            'bg-green-50 border-green-200',

                        title:
                            'text-green-700',

                        message:
                            'text-green-600',

                        badge:
                            'text-green-700'
                    }
                };


                const style =
                    styles[severity] ||
                    styles.attention;


                return `
                    <div class="
                        flex items-center gap-3
                        p-3 rounded-xl border
                        ${style.container}
                    ">

                        <span class="text-xl">
                            ${alert.icon || '⚠️'}
                        </span>


                        <div class="flex-1">

                            <p class="
                                text-sm font-medium
                                ${style.title}
                            ">
                                ${this.escapeHtml(
                    alert.title
                )}
                            </p>


                            <p class="
                                text-xs
                                ${style.message}
                            ">
                                ${this.escapeHtml(
                    alert.message
                )}
                            </p>

                        </div>


                        <span class="
                            text-xs font-semibold
                            ${style.badge}
                        ">
                            ${this.escapeHtml(
                    severity.toUpperCase()
                )}
                        </span>

                    </div>
                `;
            })
                .join('');
    }


    /*
     * =========================================================
     * RECENT ORDERS
     * =========================================================
     */
    renderRecentOrders(orders) {

        if (!this.elements.recentOrders) {
            return;
        }


        if (!orders.length) {

            this.elements.recentOrders.innerHTML = `
                <div class="
                    p-4
                    rounded-xl
                    border
                    border-gray-100
                    bg-gray-50
                ">
                    <p class="text-sm text-gray-400">
                        No recent orders.
                    </p>
                </div>
            `;

            return;
        }


        this.elements.recentOrders.innerHTML =
            orders.map(order => `

                <div class="
                    flex items-center
                    justify-between
                    gap-3
                    p-3
                    bg-gray-50
                    rounded-xl
                ">

                    <div class="min-w-0">

                        <p class="
                            text-sm
                            font-medium
                            text-gray-800
                        ">
                            #${this.escapeHtml(
                order.order_number
            )}
                        </p>


                        <p class="
                            text-xs
                            text-gray-400
                            mt-1
                        ">
                            ${this.escapeHtml(
                order.store_name
            )}
                        </p>

                    </div>


                    <div class="
                        flex
                        items-center
                        gap-3
                    ">

                        <span class="
                            text-sm
                            font-medium
                            text-gray-700
                        ">
                            ${this.formatCurrency(
                order.total
            )}
                        </span>


                        <span class="
                            status-badge
                            ${this.getStatusClass(
                order.status
            )}
                        ">
                            ${this.formatStatus(
                order.status
            )}
                        </span>

                    </div>

                </div>

            `).join('');
    }

    getStatusClass(status) {

        const classes = {

            pending:
                'pending',

            processing:
                'active',

            shipped:
                'active',

            delivered:
                'active',

            cancelled:
                'inactive'
        };


        return classes[status] || 'inactive';
    }


    formatStatus(status) {

        if (!status) {
            return 'Unknown';
        }


        return status
            .replace(/_/g, ' ')
            .replace(
                /\b\w/g,
                char => char.toUpperCase()
            );
    }


    setText(element, value) {

        if (element) {
            element.textContent = value ?? '';
        }
    }


    formatNumber(value) {

        return new Intl.NumberFormat()
            .format(
                Number(value || 0)
            );
    }


    formatCurrency(value) {

        return new Intl.NumberFormat(
            undefined,
            {
                style: 'currency',
                currency: 'RWF'
            }
        ).format(
            Number(value || 0)
        );
    }


    formatCompactCurrency(value) {

        const number =
            Number(value || 0);


        if (number >= 1000000) {
            return `Rwf ${(
                number / 1000000
            ).toFixed(1)}M`;
        }


        if (number >= 1000) {
            return `Rwf ${(
                number / 1000
            ).toFixed(1)}K`;
        }


        return `Rwf ${number}`;
    }


    escapeHtml(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }


}