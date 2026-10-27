
const db = require('../configs/db');

class StoreDashboardModel {
    /**
     * Return grouped dashboard data for one store.
     *
     * Date ranges use [from, to): from is inclusive, to is exclusive.
     */
    static async getCoreData({
        storeId,
        period = "7d",
        from,
        to,
        previousFrom,
        previousTo,
        lowStockThreshold = 5,
    }) {

        const now = new Date();

        // Use UTC boundaries consistently with the supplied timestamps.
        const end = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1
        ));

        let start;
        let previousStart;
        let previousEnd;

        switch (period) {
            case "today": {
                start = new Date(Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    now.getUTCDate()
                ));

                previousStart = new Date(start);
                previousStart.setUTCDate(previousStart.getUTCDate() - 1);

                previousEnd = start;
                break;
            }

            case "30d":
            case "90d":
            case "year":
            case "7d":
            default: {
                const days = {
                    "7d": 7,
                    "30d": 30,
                    "90d": 90,
                    year: 365,
                }[period] ?? 7;

                start = new Date(end);
                start.setUTCDate(start.getUTCDate() - days);

                previousEnd = start;
                previousStart = new Date(start);
                previousStart.setUTCDate(
                    previousStart.getUTCDate() - days
                );
                break;
            }
        }

        // Explicit dates override calculated defaults.
        from ??= start;
        to ??= end;
        previousFrom ??= previousStart;
        previousTo ??= previousEnd;

        const [
            sales,
            orderCounts,
            productCounts,
            inventoryAlerts,
            reviewStats,
            visits,
            searchStats,
            followerStats,
        ] = await Promise.all([
            // Sales and orders for current and comparison periods.
            db.query(
                `
                SELECT
                    COALESCE(SUM(so.total) FILTER (
                        WHERE so.created_at >= $2
                          AND so.created_at < $3
                          AND so.status NOT IN ('cancelled', 'refunded')
                    ), 0) AS current_sales,

                    COALESCE(SUM(so.total) FILTER (
                        WHERE so.created_at >= $4
                          AND so.created_at < $5
                          AND so.status NOT IN ('cancelled', 'refunded')
                    ), 0) AS previous_sales,

                    COUNT(*) FILTER (
                        WHERE so.created_at >= $2
                          AND so.created_at < $3
                    )::int AS current_orders,

                    COUNT(*) FILTER (
                        WHERE so.created_at >= $4
                          AND so.created_at < $5
                    )::int AS previous_orders

                FROM store_orders so
                WHERE so.store_id = $1
                  AND (
                    (so.created_at >= $2 AND so.created_at < $3)
                    OR
                    (so.created_at >= $4 AND so.created_at < $5)
                  )
                `,
                [storeId, from, to, previousFrom, previousTo]
            ),

            // Distinct customers with orders in each period.
            db.query(
                `
                SELECT
                    COUNT(DISTINCT co.customer_id) FILTER (
                        WHERE so.created_at >= $2
                          AND so.created_at < $3
                    )::int AS current_customers,

                    COUNT(DISTINCT co.customer_id) FILTER (
                        WHERE so.created_at >= $4
                          AND so.created_at < $5
                    )::int AS previous_customers

                FROM store_orders so
                JOIN customer_orders co
                  ON co.id = so.customer_order_id
                WHERE so.store_id = $1
                  AND (
                    (so.created_at >= $2 AND so.created_at < $3)
                    OR
                    (so.created_at >= $4 AND so.created_at < $5)
                  )
                `,
                [storeId, from, to, previousFrom, previousTo]
            ),

            // Listing counts; inventory is aggregated separately.
            db.query(
                `
                SELECT
                    COUNT(*)::int AS total_listings,
                    COUNT(*) FILTER (
                        WHERE l.status = 'active'
                    )::int AS active_listings
                FROM listings l
                WHERE l.store_id = $1
                `,
                [storeId]
            ),

            // Aggregate stock across the store's inventories.
            db.query(
                `
                WITH stock AS (
                    SELECT
                        l.id AS listing_id,
                        l.title,
                        COALESCE(
                            SUM(ii.quantity - ii.reserved), 0
                        )::int AS available_stock,
                        COALESCE(
                            SUM(ii.quantity), 0
                        )::int AS total_quantity,
                        COALESCE(
                            SUM(ii.reserved), 0
                        )::int AS reserved_quantity
                    FROM listings l
                    LEFT JOIN listing_variants lv ON lv.listing_id = l.id
                    LEFT JOIN inventories i
                      ON i.store_id = l.store_id
                     AND i.status = 'active'
                    LEFT JOIN inventory_items ii
                      ON ii.inventory_id = i.id
                     AND ii.listing_variant_id = lv.id
                    WHERE l.store_id = $1
                      AND l.status = 'active'
                    GROUP BY l.id, l.title
                )
                SELECT
                    COUNT(*) FILTER (
                        WHERE available_stock > 0
                          AND available_stock <= $2
                    )::int AS low_stock,

                    COUNT(*) FILTER (
                        WHERE available_stock <= 0
                    )::int AS out_of_stock
                FROM stock
                `,
                [storeId, lowStockThreshold]
            ),

            // Published store reviews.
            db.query(
                `
                SELECT
                    COALESCE(AVG(rating), 0)::numeric(4,2) AS average_rating,
                    COUNT(*)::int AS total_reviews,

                    COUNT(*) FILTER (WHERE rating = 1)::int AS rating_1,
                    COUNT(*) FILTER (WHERE rating = 2)::int AS rating_2,
                    COUNT(*) FILTER (WHERE rating = 3)::int AS rating_3,
                    COUNT(*) FILTER (WHERE rating = 4)::int AS rating_4,
                    COUNT(*) FILTER (WHERE rating = 5)::int AS rating_5,

                    COUNT(*) FILTER (
                        WHERE created_at >= date_trunc('month', CURRENT_TIMESTAMP)
                    )::int AS reviews_this_month,

                    COUNT(*) FILTER (
                        WHERE created_at >= $2
                          AND created_at < $3
                    )::int AS reviews_in_period,

                    COUNT(*) FILTER (
                        WHERE created_at >= $2
                          AND created_at < $3
                          AND vendor_response IS NOT NULL
                          AND BTRIM(vendor_response) <> ''
                    )::int AS responded_in_period

                FROM store_reviews
                WHERE store_id = $1
                  AND status = 'published'
                `,
                [storeId, from, to]
            ),

            // Store visits for current and previous periods.
            db.query(
                `
                SELECT
                    COUNT(*) FILTER (
                        WHERE visited_at >= $2
                          AND visited_at < $3
                    )::int AS current_visits,

                    COUNT(*) FILTER (
                        WHERE visited_at >= $4
                          AND visited_at < $5
                    )::int AS previous_visits
                FROM store_visits
                WHERE store_id = $1
                  AND (
                    (visited_at >= $2 AND visited_at < $3)
                    OR
                    (visited_at >= $4 AND visited_at < $5)
                  )
                `,
                [storeId, from, to, previousFrom, previousTo]
            ),

            // Search appearances and clicks from search impressions.
            db.query(
                `
                SELECT
                    COUNT(*) FILTER (
                        WHERE created_at >= $2
                          AND created_at < $3
                    )::int AS current_appearances,

                    COUNT(*) FILTER (
                        WHERE created_at >= $4
                          AND created_at < $5
                    )::int AS previous_appearances,

                    COUNT(*) FILTER (
                        WHERE created_at >= $2
                          AND created_at < $3
                          AND clicked = TRUE
                    )::int AS current_clicks

                FROM search_impressions
                WHERE store_id = $1
                  AND (
                    (created_at >= $2 AND created_at < $3)
                    OR
                    (created_at >= $4 AND created_at < $5)
                  )
                `,
                [storeId, from, to, previousFrom, previousTo]
            ),

            // Followers and new followers during the current period.
            db.query(
                `
                SELECT
                    COUNT(*)::int AS total_followers,

                    COUNT(*) FILTER (
                        WHERE followed_at >= $2
                          AND followed_at < $3
                    )::int AS new_followers_in_period,

                    COUNT(*) FILTER (
                        WHERE followed_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
                    )::int AS new_followers_this_week

                FROM store_followers
                WHERE store_id = $1
                `,
                [storeId, from, to]
            ),
        ]);

        return {
            sales: sales.rows[0],
            orders: orderCounts.rows[0],
            products: productCounts.rows[0],
            inventory: inventoryAlerts.rows[0],
            reviews: reviewStats.rows[0],
            visits: visits.rows[0],
            search: searchStats.rows[0],
            followers: followerStats.rows[0],
        };
    }

    /**
     * Fetch low-stock and out-of-stock listing details.
     */
    static async getInventoryAlertItems(
        storeId,
        lowStockThreshold = 5,
        limit = 10
    ) {
        const { rows } = await db.query(
            `
            WITH stock AS (
            SELECT
                l.id AS listing_id,
                COALESCE(l.title, p.title) AS title,
                COALESCE(SUM(ii.quantity - ii.reserved), 0)::int
                    AS available_stock
                FROM listings l
                JOIN products p
                  ON p.id = l.product_id
                LEFT JOIN inventories i
                  ON i.store_id = l.store_id
                 AND i.status = 'active'
                LEFT JOIN listing_variants lv ON lv.listing_id = l.id
                LEFT JOIN inventory_items ii
                  ON ii.inventory_id = i.id
                 AND ii.listing_variant_id = lv.id
                WHERE l.store_id = $1
                  AND l.status = 'active'
                GROUP BY l.id, l.title, p.title
            )
            SELECT
                s.listing_id,
                s.title,
                s.available_stock AS stock,
                CASE
                    WHEN s.available_stock <= 0 THEN 'out_of_stock'
                    ELSE 'low_stock'
                END AS status,

                (
                    SELECT lv.sku
                    FROM listing_variants lv
                    WHERE lv.listing_id = s.listing_id
                    ORDER BY lv.created_at ASC
                    LIMIT 1
                ) AS sku,

                (
                    SELECT lvm.url
                    FROM listing_variants lv
                    JOIN listing_variants_media lvm
                      ON lvm.listing_variant_id = lv.id
                    WHERE lv.listing_id = s.listing_id
                      AND lvm.media_type = 'image'
                    ORDER BY lvm.is_primary DESC, lvm.display_order ASC
                    LIMIT 1
                ) AS image

            FROM stock s
            WHERE s.available_stock <= $2
            ORDER BY s.available_stock ASC, s.title ASC
            LIMIT $3
            `,
            [storeId, lowStockThreshold, limit]
        );

        return rows;
    }

    /**
     * Daily sales series for charting.
     * Pass from/to as timestamps; to is exclusive.
     */
    static async getDailySalesSeries(storeId, from, to) {
        const { rows } = await db.query(
            `
            WITH days AS (
                SELECT generate_series(
                    $2::date,
                    ($3::date - INTERVAL '1 day')::date,
                    INTERVAL '1 day'
                )::date AS day
            ),
            daily AS (
                SELECT
                    so.created_at::date AS day,
                    COALESCE(SUM(so.total) FILTER (
                        WHERE so.status NOT IN ('cancelled', 'refunded')
                    ), 0)::numeric(12,2) AS revenue,
                    COUNT(*)::int AS orders
                FROM store_orders so
                WHERE so.store_id = $1
                  AND so.created_at >= $2
                  AND so.created_at < $3
                GROUP BY so.created_at::date
            )
            SELECT
                days.day AS date,
                COALESCE(daily.revenue, 0)::numeric(12,2) AS revenue,
                COALESCE(daily.orders, 0)::int AS orders
            FROM days
            LEFT JOIN daily USING (day)
            ORDER BY days.day ASC
            `,
            [storeId, from, to]
        );

        return rows;
    }


    static async getBaseCurrency() {
        const { rows } = await db.query(`SELECT * FROM currencies WHERE is_base = TRUE`);
        return rows[0] ?? null;
    }

    /**
     * Fetch additional data required by the store dashboard.
     *
     * @param {Object} params
     * @param {string} params.storeId
     * @param {Date|string} params.from
     * @param {Date|string} params.to
     * @param {number} [params.lowStockThreshold=5]
     * @returns {Promise<Object>}
     */
    static async getDashboardAdditions({
        storeId,
        from,
        to,
        lowStockThreshold = 5,
    }) {

        const [
            weeklyVisitsResult,
            bestHourResult,
            ordersAttentionResult,
            pendingOrdersResult,
            responseResult,
            topListingsResult,
            currencyResult,
            inventoryMetricsResult,
        ] = await Promise.all([
            // 1. Weekly store visits, Sunday (0) through Saturday (6).
            db.query(
                `
            SELECT
                EXTRACT(DOW FROM visited_at)::INTEGER AS day_index,
                COUNT(*)::INTEGER AS visits
            FROM store_visits
            WHERE store_id = $1
              AND visited_at >= $2
              AND visited_at <= $3
            GROUP BY EXTRACT(DOW FROM visited_at)
            ORDER BY day_index
            `,
                [storeId, from, to]
            ),

            // 2. Busiest two-hour visit window.
            db.query(
                `
            
                    WITH hourly_visits AS (
                        SELECT
                            EXTRACT(HOUR FROM visited_at)::INTEGER AS hour,
                            COUNT(*)::INTEGER AS visits
                        FROM store_visits
                        WHERE store_id = $1
                        AND visited_at >= $2
                        AND visited_at <= $3
                        GROUP BY EXTRACT(HOUR FROM visited_at)
                    ),
                    windows AS (
                        SELECT
                            h.hour AS start_hour,
                            COALESCE(v1.visits, 0)
                                + COALESCE(v2.visits, 0) AS visits
                        FROM generate_series(0, 23) AS h(hour)
                        LEFT JOIN hourly_visits v1
                            ON v1.hour = h.hour
                        LEFT JOIN hourly_visits v2
                            ON v2.hour = ((h.hour + 1) % 24)
                    )
                    SELECT start_hour, visits
                    FROM windows
                    ORDER BY visits DESC, start_hour ASC
                    LIMIT 1;

                `,
                [storeId, from, to]
            ),

            // 3. Recent orders requiring attention.
            // Total counts every matching order; items are limited to 5.
            db.query(
                `
            WITH attention_orders AS (
                SELECT
                    so.id,
                    so.order_number,
                    so.status::TEXT AS status,
                    so.total,
                    so.created_at,
                    co.currency_id,
                    co.customer_id,
                    c.user_id,
                    (
                        SELECT COUNT(*)::INTEGER
                        FROM order_items oi
                        WHERE oi.store_order_id = so.id
                    ) AS items_count
                FROM store_orders so
                JOIN customer_orders co
                    ON co.id = so.customer_order_id
                JOIN customers c
                    ON c.id = co.customer_id
                WHERE so.store_id = $1
                  AND so.status::TEXT IN (
                      'pending',
                      'confirmed',
                      'processing'
                  )
            ),
            total_count AS (
                SELECT COUNT(*)::INTEGER AS total
                FROM attention_orders
            ),
            recent AS (
                SELECT *
                FROM attention_orders
                ORDER BY created_at DESC
                LIMIT 5
            )
            SELECT
                tc.total,
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'id', r.id,
                            'order_number', r.order_number,
                            'customer', jsonb_build_object(
                                'id', r.customer_id,
                                'name', COALESCE(
                                    NULLIF(u.profile->>'display_name', ''),
                                    NULLIF(u.profile->>'name', ''),
                                    'Customer'
                                )
                            ),
                            'items_count', r.items_count,
                            'total', r.total,
                            'currency', cur.code,
                            'status', r.status,
                            'status_label',
                                CASE r.status
                                    WHEN 'pending'
                                        THEN 'Pending'
                                    WHEN 'confirmed'
                                        THEN 'Confirmed'
                                    WHEN 'processing'
                                        THEN 'Processing'
                                    ELSE INITCAP(r.status)
                                END,
                            'placed_at', r.created_at
                        )
                        ORDER BY r.created_at DESC
                    ) FILTER (WHERE r.id IS NOT NULL),
                    '[]'::JSONB
                ) AS items
            FROM total_count tc
            LEFT JOIN recent r ON TRUE
            LEFT JOIN users u ON u.id = r.user_id
            LEFT JOIN currencies cur
                ON cur.id = r.currency_id
            GROUP BY tc.total
            `,
                [storeId]
            ),

            // 4. Pending order count.
            db.query(
                `
            SELECT COUNT(*)::INTEGER AS value
            FROM store_orders
            WHERE store_id = $1
              AND status = 'pending'
            `,
                [storeId]
            ),

            // 5. Store review response metrics.
            db.query(
                `
            SELECT
                COUNT(*) FILTER (
                    WHERE NULLIF(BTRIM(vendor_response), '') IS NOT NULL
                )::INTEGER AS responded,

                COUNT(*)::INTEGER AS total,

                ROUND(
                    AVG(
                        EXTRACT(
                            EPOCH FROM (
                                vendor_responded_at - created_at
                            )
                        ) / 60.0
                    ) FILTER (
                        WHERE NULLIF(BTRIM(vendor_response), '') IS NOT NULL
                          AND vendor_responded_at IS NOT NULL
                          AND vendor_responded_at >= created_at
                    ),
                    1
                ) AS avg_minutes
            FROM store_reviews
            WHERE store_id = $1
              AND status = 'published'
              AND created_at >= $2
              AND created_at <= $3
            `,
                [storeId, from, to]
            ),

            // 6. Top listings by lifetime view_count.
            // CTR and orders are calculated for the selected date range.
            db.query(
                `
            SELECT
                l.id,
                COALESCE(l.title, p.title) AS title,
                l.view_count::BIGINT AS visits,

                COALESCE(si.impressions, 0)::BIGINT AS impressions,
                COALESCE(si.clicks, 0)::BIGINT AS clicks,

                CASE
                    WHEN COALESCE(si.impressions, 0) = 0 THEN NULL
                    ELSE ROUND(
                        100.0 * si.clicks / si.impressions,
                        1
                    )
                END AS ctr,

                COALESCE(oi.orders, 0)::INTEGER AS orders,

                media.image

            FROM listings l
            JOIN products p
                ON p.id = l.product_id

            LEFT JOIN LATERAL (
                SELECT
                    lvm.url AS image
                FROM listing_variants lv
                JOIN listing_variants_media lvm
                    ON lvm.listing_variant_id = lv.id
                WHERE lv.listing_id = l.id
                  AND lvm.media_type = 'image'
                  AND lvm.url IS NOT NULL
                ORDER BY
                    lvm.is_primary DESC,
                    lvm.display_order ASC,
                    lvm.created_at ASC
                LIMIT 1
            ) media ON TRUE

            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)::BIGINT AS impressions,
                    COUNT(*) FILTER (
                        WHERE clicked = TRUE
                    )::BIGINT AS clicks
                FROM search_impressions
                WHERE listing_id = l.id
                  AND store_id = l.store_id
                  AND created_at >= $2
                  AND created_at <= $3
            ) si ON TRUE

            LEFT JOIN LATERAL (
                SELECT
                    COUNT(DISTINCT oi.store_order_id)::INTEGER AS orders
                FROM order_items oi
                JOIN store_orders so
                    ON so.id = oi.store_order_id
                WHERE oi.listing_id = l.id
                  AND so.store_id = l.store_id
                  AND so.created_at >= $2
                  AND so.created_at <= $3
                  AND so.status::TEXT NOT IN (
                      'cancelled',
                      'refunded'
                  )
            ) oi ON TRUE

            WHERE l.store_id = $1
              AND l.status = 'active'

            ORDER BY l.view_count DESC, l.created_at DESC
            LIMIT 4
            `,
                [storeId, from, to]
            ),

            // 7. Base currency.
            db.query(
                `
            SELECT code
            FROM currencies
            WHERE is_base = TRUE
              AND status = 'active'
            LIMIT 1
            `
            ),
            // 8. Inventory metrics.
            db.query(
                `
                WITH item_stock AS (
                    SELECT
                        ii.id,
                        ii.quantity,
                        ii.reserved,
                        ii.status::TEXT AS status,
                        GREATEST(ii.quantity - ii.reserved, 0) AS available
                    FROM inventory_items ii
                    JOIN inventories i
                        ON i.id = ii.inventory_id
                    WHERE i.store_id = $1
                )
                SELECT
                    COUNT(*)::INTEGER AS inventory_records,

                    COALESCE(SUM(quantity), 0)::BIGINT
                        AS total_units,

                    COALESCE(SUM(reserved), 0)::BIGINT
                        AS reserved_units,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN status NOT IN (
                                    'damaged',
                                    'returned',
                                    'discontinued'
                                )
                                THEN available
                                ELSE 0
                            END
                        ),
                        0
                    )::BIGINT AS available_units,

                    COUNT(*) FILTER (
                        WHERE status NOT IN (
                            'damaged',
                            'returned',
                            'discontinued'
                        )
                        AND available > 0
                        AND available <= $2
                    )::INTEGER AS low_stock_records,

                    COUNT(*) FILTER (
                        WHERE status NOT IN (
                            'damaged',
                            'returned',
                            'discontinued'
                        )
                        AND available = 0
                    )::INTEGER AS out_of_stock_records,

                    COALESCE(
                        SUM(quantity) FILTER (
                            WHERE status = 'damaged'
                        ),
                        0
                    )::BIGINT AS damaged_units,

                    COALESCE(
                        SUM(quantity) FILTER (
                            WHERE status = 'returned'
                        ),
                        0
                    )::BIGINT AS returned_units

                FROM item_stock
                `,
                [storeId, lowStockThreshold]
            ),
        ]);

        const weeklyDays = [
            "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        ];

        const visitsByDay = new Map(
            weeklyVisitsResult.rows.map((row) => [
                Number(row.day_index),
                Number(row.visits),
            ])
        );

        const weekly = weeklyDays.map((day, index) => ({
            day,
            visits: visitsByDay.get(index) ?? 0,
        }));

        const hourRow = bestHourResult.rows[0];
        let bestHourRange = null;

        if (hourRow && Number(hourRow.visits) > 0) {
            const startHour = Number(hourRow.start_hour);
            const endHour = (startHour + 2) % 24;

            const formatHour = (hour) =>
                `${String(hour).padStart(2, "0")}:00`;

            bestHourRange =
                `${formatHour(startHour)} - ${formatHour(endHour)}`;
        }

        const attentionRow = ordersAttentionResult.rows[0] ?? {};
        const responseRow = responseResult.rows[0] ?? {};

        const topListings = topListingsResult.rows.map((row) => ({
            id: row.id,
            title: row.title,
            image: row.image ?? null,
            visits: Number(row.visits) || 0,
            ctr: row.ctr == null ? null : Number(row.ctr),
            orders: Number(row.orders) || 0,
        }));

        const responseTotal = Number(responseRow.total) || 0;
        const responseCount = Number(responseRow.responded) || 0;

        const inventoryRow = inventoryMetricsResult.rows[0] ?? {};



        const inventoryMetrics = {
            inventory_records:
                Number(inventoryRow.inventory_records) || 0,

            total_units:
                Number(inventoryRow.total_units) || 0,

            reserved_units:
                Number(inventoryRow.reserved_units) || 0,

            available_units:
                Number(inventoryRow.available_units) || 0,

            low_stock_records:
                Number(inventoryRow.low_stock_records) || 0,

            out_of_stock_records:
                Number(inventoryRow.out_of_stock_records) || 0,

            damaged_units:
                Number(inventoryRow.damaged_units) || 0,

            returned_units:
                Number(inventoryRow.returned_units) || 0,
        };

        return {
            visits: {
                weekly,
                best_hour_range: bestHourRange,
            },

            orders_attention: {
                total: Number(attentionRow.total) || 0,
                items: attentionRow.items ?? [],
            },

            most_visited_listing: topListings[0] ?? null,
            top_listings: topListings,

            response: {
                rate: responseTotal > 0
                    ? Number(
                        ((responseCount / responseTotal) * 100).toFixed(1)
                    )
                    : null,
                avg_minutes: responseRow.avg_minutes == null
                    ? null
                    : Number(responseRow.avg_minutes),
            },

            pending_orders: {
                value: Number(
                    pendingOrdersResult.rows[0]?.value
                ) || 0,
            },

            sales: {
                currency: currencyResult.rows[0]?.code?.trim() ?? "$",
            },
            inventory: inventoryMetrics,
        };
    }

    /**
     * Get paginated listing inventory analytics for a store.
     *
     * @param {Object} params
     * @param {string} params.storeId
     * @param {number} [params.page=1]
     * @param {number} [params.limit=20]
     * @param {string} [params.search]
     * @param {string} [params.status]
     * @param {string} [params.sortBy=created_at]
     * @param {string} [params.sortOrder=DESC]
     * @returns {Promise<Object>}
     */
    static async getPaginatedListingAnalytics({
        storeId,
        page = 1,
        limit = 20,
        search = "",
        status,
        sortBy = "created_at",
        sortOrder = "DESC",
    }) {
        const offset = (page - 1) * limit;

        const sortColumns = {
            listing_name: "l.title",
            product_name: "p.title",
            total_variants: "COALESCE(vm.total_variants, 0)",
            stored_units: "COALESCE(im.stored_units, 0)",
            reserved_units: "COALESCE(im.reserved_units, 0)",
            available_units: "COALESCE(im.available_units, 0)",
            created_at: "l.created_at",
        };

        const orderColumn =
            sortColumns[sortBy] ?? sortColumns.created_at;

        const orderDirection =
            String(sortOrder).toUpperCase() === "ASC"
                ? "ASC"
                : "DESC";

        const values = [storeId];
        let paramIndex = values.length + 1;

        let filters = "";

        if (search.trim()) {
            filters += `
                AND (
                    l.title ILIKE $${paramIndex}
                    OR p.title ILIKE $${paramIndex}
                )
            `;
            values.push(`%${search.trim()}%`);
            paramIndex++;
        }

        if (status) {
            filters += ` AND l.status::TEXT = $${paramIndex}`;
            values.push(status);
            paramIndex++;
        }

        const countQuery = `
            SELECT COUNT(*)::INTEGER AS total
            FROM listings l
            JOIN products p
                ON p.id = l.product_id
            WHERE l.store_id = $1
            ${filters}
        `;

        const dataQuery = `
            WITH variant_metrics AS (
                SELECT
                    lv.listing_id,
                    COUNT(*)::INTEGER AS total_variants
                FROM listing_variants lv
                GROUP BY lv.listing_id
            ),
            inventory_metrics AS (
                SELECT
                    lv.listing_id,

                    COUNT(*)::INTEGER AS inventory_records,

                    COALESCE(SUM(ii.quantity), 0)::BIGINT
                        AS stored_units,

                    COALESCE(SUM(ii.reserved), 0)::BIGINT
                        AS reserved_units,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN ii.status::TEXT NOT IN (
                                    'damaged',
                                    'returned',
                                    'discontinued'
                                )
                                THEN GREATEST(
                                    ii.quantity - ii.reserved,
                                    0
                                )
                                ELSE 0
                            END
                        ),
                        0
                    )::BIGINT AS available_units

                FROM inventory_items ii
                JOIN inventories i
                    ON i.id = ii.inventory_id
                LEFT JOIN listing_variants lv ON lv.id = ii.listing_variant_id
                WHERE i.store_id = $1
                GROUP BY lv.listing_id
            )
            SELECT
                l.id AS listing_id,
                l.title AS listing_name,
                p.title AS product_name,
                l.status::TEXT AS listing_status,

                COALESCE(vm.total_variants, 0)
                    AS total_variants,

                COALESCE(im.inventory_records, 0)
                    AS inventory_records,

                COALESCE(im.stored_units, 0)
                    AS stored_units,

                COALESCE(im.reserved_units, 0)
                    AS reserved_units,

                COALESCE(im.available_units, 0)
                    AS available_units,

                l.created_at,
                l.updated_at

            FROM listings l
            JOIN products p
                ON p.id = l.product_id

            LEFT JOIN variant_metrics vm
                ON vm.listing_id = l.id

            LEFT JOIN inventory_metrics im
                ON im.listing_id = l.id

            WHERE l.store_id = $1
            ${filters}

            ORDER BY ${orderColumn} ${orderDirection},
                     l.id ASC

            LIMIT $${paramIndex}
            OFFSET $${paramIndex + 1}
        `;

        const countResult = await db.query(
            countQuery,
            values
        );

        const dataResult = await db.query(
            dataQuery,
            [...values, limit, offset]
        );

        const total = Number(countResult.rows[0].total);

        return {
            data: dataResult.rows.map((row) => ({
                ...row,
                total_variants: Number(row.total_variants),
                inventory_records: Number(row.inventory_records),
                stored_units: Number(row.stored_units),
                reserved_units: Number(row.reserved_units),
                available_units: Number(row.available_units),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get all inventories belonging to a store with stock metrics.
     *
     * @param {Object} params
     * @param {string} params.storeId
     * @param {number} [params.lowStockThreshold=5]
     * @returns {Promise<Array>}
     */
    // static async getInventoriesByStoreId({
    //     storeId,
    //     page = 1,
    //     limit = 20,
    //     search = "",
    //     status,
    //     stock,
    //     sortBy = "created_at",
    //     sortOrder = "DESC",
    //     lowStockThreshold = 5,
    // }) {
    //     const validPage = Math.max(1, Number.parseInt(page, 10) || 1);
    //     const validLimit = Math.min(
    //         100,
    //         Math.max(1, Number.parseInt(limit, 10) || 20)
    //     );

    //     const offset = (validPage - 1) * validLimit;

    //     const allowedSortColumns = {
    //         title: "title",
    //         status: "status",
    //         created_at: "created_at",
    //         updated_at: "updated_at",
    //         low_stock: "low_stock",
    //         out_of_stock: "out_of_stock",
    //         reserved: "reserved",
    //         items: "items",
    //         quantity: "quantity",
    //     };

    //     const orderColumn =
    //         allowedSortColumns[sortBy] ?? "created_at";

    //     const orderDirection =
    //         String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

    //     const validStockFilters = [
    //         "low",
    //         "out_of_stock",
    //         "available",
    //     ];

    //     if (stock && !validStockFilters.includes(stock)) {
    //         throw new Error(
    //             `Invalid stock filter. Allowed values: ${validStockFilters.join(", ")}`
    //         );
    //     }

    //     if (
    //         !Number.isFinite(Number(lowStockThreshold)) ||
    //         Number(lowStockThreshold) < 0
    //     ) {
    //         throw new Error("lowStockThreshold must be a non-negative number");
    //     }

    //     const values = [
    //         storeId,
    //         Number(lowStockThreshold),
    //     ];

    //     const filters = ["i.store_id = $1"];
    //     let paramIndex = 3;

    //     if (search?.trim()) {
    //         filters.push(`i.title ILIKE $${paramIndex}`);
    //         values.push(`%${search.trim()}%`);
    //         paramIndex++;
    //     }

    //     if (status) {
    //         filters.push(`i.status::TEXT = $${paramIndex}`);
    //         values.push(status);
    //         paramIndex++;
    //     }

    //     const stockFilter = stock
    //         ? `WHERE stock_filter = $${paramIndex}`
    //         : "";

    //     if (stock) {
    //         values.push(stock);
    //         paramIndex++;
    //     }

    //     const whereClause = filters.join(" AND ");

    //     const query = `
    //         WITH inventory_metrics AS (
    //             SELECT
    //                 i.id,
    //                 i.title,
    //                 i.status::TEXT AS status,
    //                 i.is_default,
    //                 i.created_at,
    //                 i.updated_at,

    //                 COUNT(ii.id) FILTER (
    //                     WHERE ii.status::TEXT NOT IN (
    //                         'damaged',
    //                         'returned',
    //                         'discontinued'
    //                     )
    //                     AND GREATEST(ii.quantity - ii.reserved, 0) > 0
    //                     AND GREATEST(ii.quantity - ii.reserved, 0) <= $2
    //                 )::INTEGER AS low_stock,

    //                 COUNT(ii.id) FILTER (
    //                     WHERE ii.status::TEXT NOT IN (
    //                         'damaged',
    //                         'returned',
    //                         'discontinued'
    //                     )
    //                     AND GREATEST(ii.quantity - ii.reserved, 0) = 0
    //                 )::INTEGER AS out_of_stock,

    //                 COALESCE(SUM(ii.reserved), 0)::BIGINT
    //                     AS reserved,

    //                 COUNT(DISTINCT ii.listing_id)::INTEGER
    //                     AS items,

    //                 COALESCE(SUM(ii.quantity), 0)::BIGINT
    //                     AS quantity,

    //                 COUNT(ii.id) FILTER (
    //                     WHERE ii.status::TEXT NOT IN (
    //                         'damaged',
    //                         'returned',
    //                         'discontinued'
    //                     )
    //                     AND GREATEST(ii.quantity - ii.reserved, 0) > 0
    //                 )::INTEGER AS available_records

    //             FROM inventories i
    //             LEFT JOIN inventory_items ii
    //                 ON ii.inventory_id = i.id

    //             WHERE ${whereClause}

    //             GROUP BY
    //                 i.id,
    //                 i.title,
    //                 i.status,
    //                 i.is_default,
    //                 i.created_at,
    //                 i.updated_at
    //         ),
    //         filtered_inventories AS (
    //             SELECT *,
    //                 CASE
    //                     WHEN low_stock > 0 THEN 'low'
    //                     WHEN out_of_stock > 0 THEN 'out_of_stock'
    //                     WHEN available_records > 0 THEN 'available'
    //                     ELSE 'out_of_stock'
    //                 END AS stock_filter
    //             FROM inventory_metrics
    //         )
    //         SELECT *
    //         FROM filtered_inventories
    //         ${stockFilter}
    //         ORDER BY ${orderColumn} ${orderDirection},
    //                  id DESC
    //         LIMIT $${paramIndex}
    //         OFFSET $${paramIndex + 1};
    //     `;

    //     const countQuery = `
    //         WITH inventory_metrics AS (
    //             SELECT
    //                 i.id,

    //                 COUNT(ii.id) FILTER (
    //                     WHERE ii.status::TEXT NOT IN (
    //                         'damaged',
    //                         'returned',
    //                         'discontinued'
    //                     )
    //                     AND GREATEST(ii.quantity - ii.reserved, 0) > 0
    //                     AND GREATEST(ii.quantity - ii.reserved, 0) <= $2
    //                 )::INTEGER AS low_stock,

    //                 COUNT(ii.id) FILTER (
    //                     WHERE ii.status::TEXT NOT IN (
    //                         'damaged',
    //                         'returned',
    //                         'discontinued'
    //                     )
    //                     AND GREATEST(ii.quantity - ii.reserved, 0) = 0
    //                 )::INTEGER AS out_of_stock,

    //                 COUNT(ii.id) FILTER (
    //                     WHERE ii.status::TEXT NOT IN (
    //                         'damaged',
    //                         'returned',
    //                         'discontinued'
    //                     )
    //                     AND GREATEST(ii.quantity - ii.reserved, 0) > 0
    //                 )::INTEGER AS available_records

    //             FROM inventories i
    //             LEFT JOIN inventory_items ii
    //                 ON ii.inventory_id = i.id

    //             WHERE ${whereClause}

    //             GROUP BY i.id
    //         ),
    //         filtered_inventories AS (
    //             SELECT *,
    //                 CASE
    //                     WHEN low_stock > 0 THEN 'low'
    //                     WHEN out_of_stock > 0 THEN 'out_of_stock'
    //                     WHEN available_records > 0 THEN 'available'
    //                     ELSE 'out_of_stock'
    //                 END AS stock_filter
    //             FROM inventory_metrics
    //         )
    //         SELECT COUNT(*)::INTEGER AS total
    //         FROM filtered_inventories
    //         ${stockFilter};
    //     `;

    //     // Build separate parameter arrays because pagination values
    //     // are only required by the data query.
    //     const countValues = [...values];

    //     const dataValues = [
    //         ...values,
    //         validLimit,
    //         offset,
    //     ];

    //     const [dataResult, countResult] = await Promise.all([
    //         db.query(query, dataValues),
    //         db.query(countQuery, countValues),
    //     ]);

    //     const data = dataResult.rows.map((row) => ({
    //         ...row,
    //         low_stock: Number(row.low_stock),
    //         out_of_stock: Number(row.out_of_stock),
    //         reserved: Number(row.reserved),
    //         items: Number(row.items),
    //         quantity: Number(row.quantity),
    //         available_records: Number(row.available_records),
    //     }));

    //     const total = Number(countResult.rows[0].total);

    //     return {
    //         data,
    //         pagination: {
    //             page: validPage,
    //             limit: validLimit,
    //             total,
    //             totalPages: Math.ceil(total / validLimit),
    //         },
    //     };
    // }


    // static async getInventoriesByStoreId({
    //     storeId,
    //     page = 1,
    //     limit = 20,
    //     search = "",
    //     status,
    //     stock,
    //     sortBy = "created_at",
    //     sortOrder = "DESC",
    //     lowStockThreshold = 5,
    // }) {
    //     const validPage = Math.max(1, Number.parseInt(page, 10) || 1);
    //     const validLimit = Math.min(
    //         100,
    //         Math.max(1, Number.parseInt(limit, 10) || 20)
    //     );

    //     const offset = (validPage - 1) * validLimit;
    //     const threshold = Number(lowStockThreshold);

    //     if (!Number.isFinite(threshold) || threshold < 0) {
    //         throw new Error("lowStockThreshold must be a non-negative number");
    //     }

    //     const allowedSortColumns = {
    //         title: "title",
    //         status: "status",
    //         created_at: "created_at",
    //         updated_at: "updated_at",
    //         low_stock: "low_stock",
    //         out_of_stock: "out_of_stock",
    //         reserved: "reserved",
    //         items: "items",
    //         quantity: "quantity",
    //     };

    //     const orderColumn = allowedSortColumns[sortBy] ?? "created_at";
    //     const orderDirection =
    //         String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

    //     const validStockFilters = ["low", "out_of_stock", "available"];

    //     if (stock && !validStockFilters.includes(stock)) {
    //         throw new Error(
    //             `Invalid stock filter. Allowed values: ${validStockFilters.join(", ")}`
    //         );
    //     }

    //     const values = [storeId, threshold];
    //     const filters = ["i.store_id = $1"];
    //     let paramIndex = 3;

    //     if (search?.trim()) {
    //         filters.push(`i.title ILIKE $${paramIndex}`);
    //         values.push(`%${search.trim()}%`);
    //         paramIndex++;
    //     }

    //     if (status) {
    //         filters.push(`i.status::TEXT = $${paramIndex}`);
    //         values.push(status);
    //         paramIndex++;
    //     }

    //     const whereClause = filters.join(" AND ");
    //     const stockParam = stock ? `$${paramIndex++}` : null;
    //     const limitParam = `$${paramIndex++}`;
    //     const offsetParam = `$${paramIndex++}`;

    //     if (stock) {
    //         values.push(stock);
    //     }

    //     const dataValues = [...values, validLimit, offset];
    //     const countValues = [...values];

    //     const baseCtes = `
    //     WITH inventory_metrics AS (
    //         SELECT
    //             i.id,
    //             i.title,
    //             i.status::TEXT AS status,
    //             i.is_default,
    //             i.created_at,
    //             i.updated_at,

    //             COUNT(ii.id) FILTER (
    //                 WHERE ii.status::TEXT NOT IN (
    //                     'damaged', 'returned', 'discontinued'
    //                 )
    //                 AND GREATEST(ii.quantity - ii.reserved, 0) > 0
    //                 AND GREATEST(ii.quantity - ii.reserved, 0) <= $2
    //             )::INTEGER AS low_stock,

    //             COUNT(ii.id) FILTER (
    //                 WHERE ii.status::TEXT NOT IN (
    //                     'damaged', 'returned', 'discontinued'
    //                 )
    //                 AND GREATEST(ii.quantity - ii.reserved, 0) = 0
    //             )::INTEGER AS out_of_stock,

    //             COALESCE(SUM(ii.reserved), 0)::BIGINT AS reserved,
    //             COUNT(DISTINCT ii.listing_id)::INTEGER AS items,
    //             COALESCE(SUM(ii.quantity), 0)::BIGINT AS quantity,

    //             COUNT(ii.id) FILTER (
    //                 WHERE ii.status::TEXT NOT IN (
    //                     'damaged', 'returned', 'discontinued'
    //                 )
    //                 AND GREATEST(ii.quantity - ii.reserved, 0) > 0
    //             )::INTEGER AS available_records

    //         FROM inventories i
    //         LEFT JOIN inventory_items ii
    //             ON ii.inventory_id = i.id

    //         WHERE ${whereClause}

    //         GROUP BY
    //             i.id, i.title, i.status, i.is_default,
    //             i.created_at, i.updated_at
    //     ),

    //     filtered_inventories AS (
    //         SELECT *,
    //             CASE
    //                 WHEN low_stock > 0 THEN 'low'
    //                 WHEN out_of_stock > 0 THEN 'out_of_stock'
    //                 WHEN available_records > 0 THEN 'available'
    //                 ELSE 'out_of_stock'
    //             END AS stock_filter
    //         FROM inventory_metrics
    //     )
    // `;

    //     const stockCondition = stock
    //         ? `WHERE stock_filter = ${stockParam}`
    //         : "";

    //     const query = `
    //     ${baseCtes},

    //     listing_details AS (
    //         SELECT
    //             ii.inventory_id,
    //             l.id AS listing_id,
    //             l.title AS listing_title,
    //             l.status::TEXT AS listing_status,
    //             p.id AS product_id,
    //             p.title AS product_title,

    //             COUNT(ii.id)::INTEGER AS inventory_records,
    //             COALESCE(SUM(ii.quantity), 0)::BIGINT AS quantity,
    //             COALESCE(SUM(ii.reserved), 0)::BIGINT AS reserved,

    //             COALESCE(
    //                 SUM(GREATEST(ii.quantity - ii.reserved, 0)),
    //                 0
    //             )::BIGINT AS available_quantity

    //         FROM inventory_items ii
    //         JOIN listings l
    //             ON l.id = ii.listing_id
    //         JOIN products p
    //             ON p.id = l.product_id

    //         WHERE ii.inventory_id IN (
    //             SELECT id FROM filtered_inventories ${stockCondition}
    //         )

    //         GROUP BY
    //             ii.inventory_id,
    //             l.id,
    //             l.title,
    //             l.status,
    //             p.id,
    //             p.title
    //     ),

    //     listing_aggregates AS (
    //         SELECT
    //             inventory_id,
    //             jsonb_agg(
    //                 jsonb_build_object(
    //                     'listing_id', listing_id,
    //                     'listing_title', listing_title,
    //                     'listing_status', listing_status,
    //                     'product_id', product_id,
    //                     'product_title', product_title,
    //                     'inventory_records', inventory_records,
    //                     'quantity', quantity,
    //                     'reserved', reserved,
    //                     'available_quantity', available_quantity
    //                 )
    //                 ORDER BY listing_title
    //             ) AS listings
    //         FROM listing_details
    //         GROUP BY inventory_id
    //     )

    //     SELECT
    //         fi.*,
    //         COALESCE(la.listings, '[]'::JSONB) AS listings

    //     FROM filtered_inventories fi
    //     LEFT JOIN listing_aggregates la
    //         ON la.inventory_id = fi.id

    //     ${stockCondition}

    //     ORDER BY ${orderColumn} ${orderDirection}, fi.id DESC
    //     LIMIT ${limitParam}
    //     OFFSET ${offsetParam};
    // `;

    //     const countQuery = `
    //     ${baseCtes}
    //     SELECT COUNT(*)::INTEGER AS total
    //     FROM filtered_inventories
    //     ${stockCondition};
    // `;

    //     const [dataResult, countResult] = await Promise.all([
    //         db.query(query, dataValues),
    //         db.query(countQuery, countValues),
    //     ]);

    //     const data = dataResult.rows.map((row) => ({
    //         ...row,
    //         low_stock: Number(row.low_stock),
    //         out_of_stock: Number(row.out_of_stock),
    //         reserved: Number(row.reserved),
    //         items: Number(row.items),
    //         quantity: Number(row.quantity),
    //         available_records: Number(row.available_records),
    //         listings: (row.listings ?? []).map((listing) => ({
    //             ...listing,
    //             inventory_records: Number(listing.inventory_records),
    //             quantity: Number(listing.quantity),
    //             reserved: Number(listing.reserved),
    //             available_quantity: Number(listing.available_quantity),
    //         })),
    //     }));

    //     const total = Number(countResult.rows[0].total);

    //     return {
    //         data,
    //         pagination: {
    //             page: validPage,
    //             limit: validLimit,
    //             total,
    //             totalPages: Math.ceil(total / validLimit),
    //         },
    //     };
    // }

    static async getInventoriesByStoreId({
        storeId,
        page = 1,
        limit = 20,
        search = "",
        status,
        stock,
        sortBy = "created_at",
        sortOrder = "DESC",
        lowStockThreshold = 5,
    }) {
        const validPage = Math.max(
            1,
            Number.parseInt(page, 10) || 1
        );

        const validLimit = Math.min(
            100,
            Math.max(1, Number.parseInt(limit, 10) || 20)
        );

        const offset = (validPage - 1) * validLimit;
        const threshold = Number(lowStockThreshold);

        if (!Number.isFinite(threshold) || threshold < 0) {
            throw new Error(
                "lowStockThreshold must be a non-negative number"
            );
        }

        const allowedSortColumns = {
            title: "fi.title",
            status: "fi.status",
            created_at: "fi.created_at",
            updated_at: "fi.updated_at",
            low_stock: "fi.low_stock",
            out_of_stock: "fi.out_of_stock",
            reserved: "fi.reserved",
            items: "fi.items",
            quantity: "fi.quantity",
        };

        const orderColumn =
            allowedSortColumns[sortBy] ?? "fi.created_at";

        const orderDirection =
            String(sortOrder).toUpperCase() === "ASC"
                ? "ASC"
                : "DESC";

        const validStockFilters = [
            "low",
            "out_of_stock",
            "available",
        ];

        if (stock && !validStockFilters.includes(stock)) {
            throw new Error(
                `Invalid stock filter. Allowed values: ${validStockFilters.join(", ")}`
            );
        }

        const values = [storeId, threshold];
        const filters = ["i.store_id = $1"];

        let paramIndex = 3;

        if (search?.trim()) {
            filters.push(`i.title ILIKE $${paramIndex}`);
            values.push(`%${search.trim()}%`);
            paramIndex++;
        }

        if (status) {
            filters.push(`i.status::TEXT = $${paramIndex}`);
            values.push(status);
            paramIndex++;
        }

        const whereClause = filters.join(" AND ");

        let stockParam = null;

        if (stock) {
            stockParam = `$${paramIndex++}`;
            values.push(stock);
        }

        const limitParam = `$${paramIndex++}`;
        const offsetParam = `$${paramIndex++}`;

        const dataValues = [
            ...values,
            validLimit,
            offset,
        ];

        const countValues = [...values];

        const baseCtes = `
        WITH unit_metrics AS (
            SELECT
                iu.inventory_item_id,

                COUNT(*) FILTER (
                    WHERE iu.status IN ('available', 'reserved')
                )::BIGINT AS total_units,

                COUNT(*) FILTER (
                    WHERE iu.status = 'reserved'
                )::BIGINT AS reserved_units,

                COUNT(*) FILTER (
                    WHERE iu.status = 'available'
                )::BIGINT AS available_units

            FROM inventory_units iu

            GROUP BY iu.inventory_item_id
        ),

        item_stock AS (
            SELECT
                ii.id AS inventory_item_id,
                ii.inventory_id,
                ii.listing_variant_id,
                ii.tracking_mode,
                ii.status::TEXT AS item_status,

                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN ii.quantity::BIGINT
                    ELSE COALESCE(um.total_units, 0)
                END AS quantity,

                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN ii.reserved::BIGINT
                    ELSE COALESCE(um.reserved_units, 0)
                END AS reserved,

                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN GREATEST(
                        ii.quantity - ii.reserved, 0
                    )::BIGINT
                    ELSE COALESCE(um.available_units, 0)
                END AS available_quantity

            FROM inventory_items ii

            LEFT JOIN unit_metrics um
                ON um.inventory_item_id = ii.id
        ),

        inventory_metrics AS (
            SELECT
                i.id,
                i.title,
                i.status::TEXT AS status,
                i.is_default,
                i.created_at,
                i.updated_at,

                COUNT(s.inventory_item_id) FILTER (
                    WHERE s.item_status NOT IN (
                        'damaged',
                        'returned',
                        'discontinued'
                    )
                    AND s.available_quantity > 0
                    AND s.available_quantity <= $2
                )::INTEGER AS low_stock,

                COUNT(s.inventory_item_id) FILTER (
                    WHERE s.item_status NOT IN (
                        'damaged',
                        'returned',
                        'discontinued'
                    )
                    AND s.available_quantity = 0
                )::INTEGER AS out_of_stock,

                COALESCE(
                    SUM(s.reserved),
                    0
                )::BIGINT AS reserved,

                COUNT(
                    DISTINCT s.listing_variant_id
                ) FILTER (
                    WHERE s.inventory_item_id IS NOT NULL
                )::INTEGER AS items,

                COALESCE(
                    SUM(s.quantity),
                    0
                )::BIGINT AS quantity,

                COUNT(s.inventory_item_id) FILTER (
                    WHERE s.item_status NOT IN (
                        'damaged',
                        'returned',
                        'discontinued'
                    )
                    AND s.available_quantity > 0
                )::INTEGER AS available_records

            FROM inventories i

            LEFT JOIN item_stock s
                ON s.inventory_id = i.id

            WHERE ${whereClause}

            GROUP BY
                i.id,
                i.title,
                i.status,
                i.is_default,
                i.created_at,
                i.updated_at
        ),

        filtered_inventories AS (
            SELECT
                *,

                CASE
                    WHEN low_stock > 0
                        THEN 'low'

                    WHEN out_of_stock > 0
                        THEN 'out_of_stock'

                    WHEN available_records > 0
                        THEN 'available'

                    ELSE 'out_of_stock'
                END AS stock_filter

            FROM inventory_metrics
        )
    `;

        const stockCondition = stock
            ? `WHERE stock_filter = ${stockParam}`
            : "";

        const query = `
        ${baseCtes},

        listing_details AS (
            SELECT
                s.inventory_id,

                l.id AS listing_id,
                l.title AS listing_title,
                l.status::TEXT AS listing_status,

                p.id AS product_id,
                p.title AS product_title,

                COUNT(
                    DISTINCT s.inventory_item_id
                )::INTEGER AS inventory_records,

                COALESCE(
                    SUM(s.quantity),
                    0
                )::BIGINT AS quantity,

                COALESCE(
                    SUM(s.reserved),
                    0
                )::BIGINT AS reserved,

                COALESCE(
                    SUM(s.available_quantity),
                    0
                )::BIGINT AS available_quantity

            FROM item_stock s

            JOIN listing_variants lv
                ON lv.id = s.listing_variant_id

            JOIN listings l
                ON l.id = lv.listing_id

            JOIN products p
                ON p.id = l.product_id

            WHERE s.inventory_id IN (
                SELECT id
                FROM filtered_inventories
                ${stockCondition}
            )

            GROUP BY
                s.inventory_id,
                l.id,
                l.title,
                l.status,
                p.id,
                p.title
        ),

        listing_aggregates AS (
            SELECT
                inventory_id,

                jsonb_agg(
                    jsonb_build_object(
                        'listing_id', listing_id,
                        'listing_title', listing_title,
                        'listing_status', listing_status,
                        'product_id', product_id,
                        'product_title', product_title,
                        'inventory_records', inventory_records,
                        'quantity', quantity,
                        'reserved', reserved,
                        'available_quantity', available_quantity
                    )
                    ORDER BY listing_title
                ) AS listings

            FROM listing_details

            GROUP BY inventory_id
        )

        SELECT
            fi.*,

            COALESCE(
                la.listings,
                '[]'::JSONB
            ) AS listings

        FROM filtered_inventories fi

        LEFT JOIN listing_aggregates la
            ON la.inventory_id = fi.id

        ${stockCondition}

        ORDER BY
            ${orderColumn} ${orderDirection},
            fi.id DESC

        LIMIT ${limitParam}
        OFFSET ${offsetParam};
    `;

        const countQuery = `
        ${baseCtes}

        SELECT COUNT(*)::INTEGER AS total

        FROM filtered_inventories

        ${stockCondition};
    `;

        const [dataResult, countResult] = await Promise.all([
            db.query(query, dataValues),
            db.query(countQuery, countValues),
        ]);

        const data = dataResult.rows.map((row) => ({
            ...row,

            low_stock: Number(row.low_stock),
            out_of_stock: Number(row.out_of_stock),
            reserved: Number(row.reserved),
            items: Number(row.items),
            quantity: Number(row.quantity),
            available_records: Number(row.available_records),

            listings: (row.listings ?? []).map((listing) => ({
                ...listing,
                inventory_records: Number(
                    listing.inventory_records
                ),
                quantity: Number(listing.quantity),
                reserved: Number(listing.reserved),
                available_quantity: Number(
                    listing.available_quantity
                ),
            })),
        }));

        const total = Number(countResult.rows[0].total);

        return {
            data,

            pagination: {
                page: validPage,
                limit: validLimit,
                total,
                totalPages: Math.ceil(total / validLimit),
            },
        };
    }


}

module.exports = StoreDashboardModel;