const db = require('../configs/db');

const PERIOD_DAYS = {
    "7d": 7,
    "30d": 30,
    all: null,
};

class StoreModel {

    /**
     * Create a new store.
     *
     * @param {string} vendorId
     * @param {Object} storeData
     * @returns {Promise<Object>}
     */
    static async createStore(vendorId, storeData) {

        const {
            name,
            slug,
            description = null,
            phone_number = null,
            email = null,
            physical_address = null,
            meta = {}
        } = storeData;

        const query = `
            INSERT INTO stores (
                vendor_id,
                name,
                slug,
                description,
                phone_number,
                email,
                physical_address,
                meta
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;

        console.log("meta", meta)

        const values = [
            vendorId,
            name,
            slug,
            description,
            phone_number,
            email,
            physical_address,
            meta
        ];

        const { rows } = await db.query(query, values);

        return rows[0];
    }


    /**
     * Dynamically update store fields.
     *
     * Only fields included in ALLOWED_FIELDS can be updated.
     *
     * @param {string} storeId
     * @param {Object} fields
     * @returns {Promise<Object|null>}
     */
    static async updateStoreDynamicFields(storeId, fields) {

        const ALLOWED_FIELDS = [
            'name',
            'slug',
            'description',
            'phone_number',
            'email',
            'physical_address',
            'meta'
        ];

        const updates = [];
        const values = [storeId];

        for (const [field, value] of Object.entries(fields)) {

            if (!ALLOWED_FIELDS.includes(field)) {
                continue;
            }

            values.push(value);

            updates.push(
                `${field} = $${values.length}`
            );
        }

        if (updates.length === 0) {
            return null;
        }

        updates.push('updated_at = NOW()');

        const query = `
            UPDATE stores
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING *;
        `;

        const { rows } = await db.query(query, values);

        return rows[0] || null;
    }


    /**
     * Get a store by UUID, name, or slug.
     *
     * @param {string} identifier
     * @returns {Promise<Object|null>}
     */
    static async getStoreByIdOrName(identifier) {

        const query = `
            SELECT *
            FROM stores
            WHERE id::text = $1
               OR LOWER(name) = LOWER($1)
               OR LOWER(slug) = LOWER($1)
            LIMIT 1;
        `;

        const { rows } = await db.query(query, [identifier]);

        return rows[0] || null;
    }

    static async getStoreByIdOrNameOrSlug(identifier) {

        const query = `
        SELECT *
        FROM stores
        WHERE id::text = $1
           OR LOWER(name) = LOWER($1)
           OR LOWER(slug) = LOWER($1)
        LIMIT 1;
    `;

        const { rows } = await db.query(query, [identifier]);

        return rows[0] || null;
    }


    /**
     * Change store status.
     *
     * @param {string} storeId
     * @param {string} status
     * @returns {Promise<Object|null>}
     */
    static async setStoreStatus(storeId, status) {

        const query = `
            UPDATE stores
            SET
                status = $2,
                last_active = CASE
                    WHEN $2 = 'active' THEN NOW()
                    ELSE last_active
                END,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *;
        `;

        const { rows } = await db.query(query, [
            storeId,
            status
        ]);

        return rows[0] || null;
    }


    /**
     * Insert a store rating.
     *
     * NOTE:
     * This requires a separate store_ratings table.
     *
     * @param {string} storeId
     * @param {string} userId
     * @param {number} rating
     * @param {string|null} review
     * @returns {Promise<Object>}
     */
    static async insertStoreRate(
        storeId,
        userId,
        rating,
        review = null
    ) {

        const query = `
            INSERT INTO store_ratings (
                store_id,
                user_id,
                rating,
                review
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;

        const values = [
            storeId,
            userId,
            rating,
            review
        ];

        const { rows } = await db.query(query, values);

        return rows[0];
    }


    /**
     * Get paginated stores belonging to a vendor.
     *
     * @param {string} vendorId
     * @param {number} page
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    static async getPaginatedStoresByVendorId(
        vendorId,
        page = 1,
        limit = 20
    ) {

        const offset = (page - 1) * limit;

        const query = `
        SELECT
            s.id,
            s.vendor_id,
            s.name,
            s.slug,
            s.description,
            s.phone_number,
            s.email,
            s.physical_address,
            s.rating,
            s.meta,
            s.status,
            s.last_active,
            s.created_at,
            s.updated_at,

            COALESCE(l.total_listings, 0) AS total_listings,

            COALESCE(i.available_quantity, 0) AS available_quantity,

            COALESCE(o.total_orders, 0) AS total_orders

        FROM stores s

        /* --------------------------------
         * Total active listings
         * -------------------------------- */
        LEFT JOIN (
            SELECT
                store_id,
                COUNT(*) AS total_listings
            FROM listings
            WHERE status = 'active'
            GROUP BY store_id
        ) l
            ON l.store_id = s.id

        /* --------------------------------
         * Available inventory quantity
         * -------------------------------- */
        LEFT JOIN (
            SELECT
                inv.store_id,
                SUM(
                    GREATEST(
                        ii.quantity - ii.reserved,
                        0
                    )
                ) AS available_quantity
            FROM inventories inv
            JOIN inventory_items ii
                ON ii.inventory_id = inv.id
            WHERE inv.status = 'active'
              AND ii.status = 'in_stock'
            GROUP BY inv.store_id
        ) i
            ON i.store_id = s.id

        /* --------------------------------
         * Total orders
         * -------------------------------- */
        LEFT JOIN (
            SELECT
                store_id,
                COUNT(*) AS total_orders
            FROM store_orders
            GROUP BY store_id
        ) o
            ON o.store_id = s.id

        WHERE s.vendor_id = $1

        ORDER BY s.created_at DESC

        LIMIT $2
        OFFSET $3
    `;

        const countQuery = `
        SELECT COUNT(*) AS total
        FROM stores
        WHERE vendor_id = $1
    `;

        const [storesResult, countResult] = await Promise.all([
            db.query(query, [
                vendorId,
                limit,
                offset
            ]),

            db.query(countQuery, [
                vendorId
            ])
        ]);

        const totalStores = Number(
            countResult.rows[0].total
        );

        const totalPages = Math.ceil(
            totalStores / limit
        );

        return {
            stores: storesResult.rows,

            pagination: {
                page: Number(page),
                limit: Number(limit),
                totalStores,
                totalPages,
                hasNextPage: Number(page) < totalPages,
                hasPrevPage: Number(page) > 1
            }
        };
    }

    /**
     * Get all stores with pagination and optional filters.
     *
     * Supported filters:
     * - vendor_id
     * - status
     * - search
     *
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    static async getAllPaginatedStoresBy(options = {}) {

        let {
            vendor_id = null,
            status = null,
            search = null,
            page = 1,
            limit = 20
        } = options;

        page = Math.max(Number(page) || 1, 1);

        limit = Math.min(
            Math.max(Number(limit) || 20, 1),
            100
        );

        const offset = (page - 1) * limit;

        const conditions = [];
        const values = [];

        /*
         * Vendor filter
         */
        if (vendor_id) {
            values.push(vendor_id);

            conditions.push(
                `vendor_id = $${values.length}`
            );
        }

        /*
         * Status filter
         */
        if (status) {
            values.push(status);

            conditions.push(
                `status = $${values.length}`
            );
        }

        /*
         * Search by store name or slug
         */
        if (search) {
            values.push(`%${search}%`);

            conditions.push(`
                (
                    name ILIKE $${values.length}
                    OR slug ILIKE $${values.length}
                )
            `);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        /*
         * Count
         */
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM stores
            ${whereClause};
        `;

        /*
         * Data
         */
        const dataValues = [
            ...values,
            limit,
            offset
        ];

        const storesQuery = `
            SELECT *
            FROM stores
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${dataValues.length - 1}
            OFFSET $${dataValues.length};
        `;

        const [countResult, storesResult] = await Promise.all([
            db.query(countQuery, values),
            db.query(storesQuery, dataValues)
        ]);

        const totalStores = countResult.rows[0].total;
        const totalPages = Math.ceil(totalStores / limit);

        return {
            stores: storesResult.rows,
            paginations: {
                page,
                limit,
                totalStores,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };
    }

    static async setLastActive(storeId) {

        const { rows } = await db.query(`UPDATE stores SET last_active = NOW() WHERE id = $1 RETURNING *`, [storeId]);

        return rows[0] ?? null;
    }



    static async getStoreDashboardAnalytics(storeId, period = "7d") {
        if (!storeId) {
            throw new Error("storeId is required");
        }

        if (!Object.hasOwn(PERIOD_DAYS, period)) {
            throw new Error("Invalid period. Use 7d, 30d, or all.");
        }

        const now = new Date();
        const days = PERIOD_DAYS[period];

        const startDate = days === null
            ? null
            : new Date(now.getTime() - days * 86400000);

        const previousStartDate = startDate
            ? new Date(startDate.getTime() - days * 86400000)
            : null;

        const query = async (sql, params = []) => {
            const { rows } = await db.query(sql, params);
            return rows;
        };

        const [
            ratingRows,
            visitRows,
            dailyVisitRows,
            searchRows,
            followerRows,
            topListingRows,
            orderRows,
        ] = await Promise.all([

            // 1. Review statistics.
            query(`
            SELECT
                COALESCE(
                    ROUND(AVG(rating)::numeric, 1), 0
                ) AS average,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE rating = 5)::int AS five,
                COUNT(*) FILTER (WHERE rating = 4)::int AS four,
                COUNT(*) FILTER (WHERE rating = 3)::int AS three,
                COUNT(*) FILTER (WHERE rating = 2)::int AS two,
                COUNT(*) FILTER (WHERE rating = 1)::int AS one,

                COUNT(*) FILTER (
                    WHERE created_at >= date_trunc('month', NOW())
                )::int AS this_month,

                COUNT(*) FILTER (
                    WHERE vendor_response IS NOT NULL
                      AND btrim(vendor_response) <> ''
                )::int AS responded

            FROM store_reviews
            WHERE store_id = $1
              AND status = 'active'
        `, [storeId]),

            // 2. Store visits for the selected and previous periods.
            query(`
            SELECT
                COUNT(*) FILTER (
                    WHERE $2::timestamptz IS NULL
                       OR visited_at >= $2::timestamptz
                )::int AS total,

                COUNT(*) FILTER (
                    WHERE $2::timestamptz IS NOT NULL
                      AND visited_at >= $3::timestamptz
                      AND visited_at < $2::timestamptz
                )::int AS previous_total

            FROM store_visits
            WHERE store_id = $1
              AND (
                  $2::timestamptz IS NULL
                  OR visited_at >= $3::timestamptz
              )
        `, [storeId, startDate, previousStartDate]),

            // 3. Daily store visits over the last seven calendar days.
            query(`
            WITH days AS (
                SELECT generate_series(
                    CURRENT_DATE - 6,
                    CURRENT_DATE,
                    INTERVAL '1 day'
                )::date AS day
            )
            SELECT
                d.day,
                TO_CHAR(d.day, 'Dy') AS day_label,
                COUNT(v.visited_at)::int AS visits

            FROM days d

            LEFT JOIN store_visits v
                ON v.store_id = $1
               AND v.visited_at >= d.day::timestamptz
               AND v.visited_at < (d.day + 1)::timestamptz

            GROUP BY d.day
            ORDER BY d.day
        `, [storeId]),

            // 4. Search impressions and clicks.
            query(`
            SELECT
                COUNT(*) FILTER (
                    WHERE $2::timestamptz IS NULL
                       OR created_at >= $2::timestamptz
                )::int AS total,

                COUNT(*) FILTER (
                    WHERE $2::timestamptz IS NOT NULL
                      AND created_at >= $3::timestamptz
                      AND created_at < $2::timestamptz
                )::int AS previous_total,

                COUNT(*) FILTER (
                    WHERE clicked = TRUE
                      AND (
                          $2::timestamptz IS NULL
                          OR created_at >= $2::timestamptz
                      )
                )::int AS clicks

            FROM search_impressions
            WHERE store_id = $1
              AND (
                  $2::timestamptz IS NULL
                  OR created_at >= $3::timestamptz
              )
        `, [storeId, startDate, previousStartDate]),

            // 5. Current follower count and recent follows.
            query(`
            SELECT
                COUNT(DISTINCT customer_id)::int AS total,

                COUNT(DISTINCT customer_id) FILTER (
                    WHERE followed_at >= NOW() - INTERVAL '7 days'
                )::int AS new_this_week,

                COUNT(DISTINCT customer_id) FILTER (
                    WHERE $2::timestamptz IS NOT NULL
                      AND followed_at >= $2::timestamptz
                )::int AS new_in_period

            FROM store_followers
            WHERE store_id = $1
        `, [storeId, startDate]),

            // 6. Top five active listings by lifetime views.
            query(`
            WITH impressions AS (
                SELECT
                    si.listing_id,
                    COUNT(*)::int AS impressions,
                    COUNT(*) FILTER (
                        WHERE si.clicked = TRUE
                    )::int AS clicks

                FROM search_impressions si

                WHERE si.store_id = $1
                  AND si.listing_id IS NOT NULL
                  AND (
                      $2::timestamptz IS NULL
                      OR si.created_at >= $2::timestamptz
                  )

                GROUP BY si.listing_id
            ),

            listing_orders AS (
                SELECT
                    oi.listing_id,
                    COUNT(DISTINCT so.id)::int AS orders

                FROM order_items oi

                JOIN store_orders so
                    ON so.id = oi.store_order_id

                WHERE so.store_id = $1
                  AND so.status NOT IN (
                      'cancelled', 'refunded'
                  )
                  AND (
                      $2::timestamptz IS NULL
                      OR so.created_at >= $2::timestamptz
                  )

                GROUP BY oi.listing_id
            )

            SELECT
                l.id,
                l.title,
                l.view_count AS views,
                l.last_viewed_at,

                media.image,

                COALESCE(i.impressions, 0)::int AS impressions,
                COALESCE(i.clicks, 0)::int AS clicks,

                COALESCE(
                    ROUND(
                        100.0 * COALESCE(i.clicks, 0)
                        / NULLIF(i.impressions, 0),
                        1
                    ),
                    0
                ) AS ctr,

                COALESCE(o.orders, 0)::int AS orders

            FROM listings l

            LEFT JOIN impressions i
                ON i.listing_id = l.id

            LEFT JOIN listing_orders o
                ON o.listing_id = l.id

            LEFT JOIN LATERAL (
                SELECT m.url AS image

                FROM listing_variants lv

                JOIN listing_variants_media m
                    ON m.listing_variant_id = lv.id

                WHERE lv.listing_id = l.id
                  AND m.media_type = 'image'
                  AND m.is_primary = TRUE

                ORDER BY m.display_order, m.created_at
                LIMIT 1
            ) media ON TRUE

            WHERE l.store_id = $1
              AND l.status = 'active'

            ORDER BY
                l.view_count DESC,
                l.last_viewed_at DESC NULLS LAST,
                l.created_at DESC

            LIMIT 5
        `, [storeId, startDate]),

            // 7. Orders for the selected and previous periods.
            query(`
            SELECT
                COUNT(*) FILTER (
                    WHERE $2::timestamptz IS NULL
                       OR created_at >= $2::timestamptz
                )::int AS total,

                COUNT(*) FILTER (
                    WHERE $2::timestamptz IS NOT NULL
                      AND created_at >= $3::timestamptz
                      AND created_at < $2::timestamptz
                )::int AS previous_total

            FROM store_orders

            WHERE store_id = $1
              AND status NOT IN ('cancelled', 'refunded')
              AND (
                  $2::timestamptz IS NULL
                  OR created_at >= $3::timestamptz
              )
        `, [storeId, startDate, previousStartDate]),
        ]);

        const rating = ratingRows[0];
        const visits = visitRows[0];
        const search = searchRows[0];
        const followers = followerRows[0];
        const orders = orderRows[0];

        const changePct = (current, previous) => {
            const currentValue = Number(current || 0);
            const previousValue = Number(previous || 0);

            if (previousValue === 0) {
                return currentValue === 0 ? 0 : null;
            }

            return Number(
                (
                    ((currentValue - previousValue) / previousValue) * 100
                ).toFixed(1)
            );
        };

        const weekly = dailyVisitRows.map((row) => ({
            day: row.day_label.trim(),
            visits: Number(row.visits),
        }));

        const totalVisits = Number(visits.total);
        const totalImpressions = Number(search.total);
        const totalOrders = Number(orders.total);
        const totalReviews = Number(rating.total);

        const responseRate = totalReviews
            ? Number(
                (
                    (Number(rating.responded) / totalReviews) * 100
                ).toFixed(1)
            )
            : 0;

        const dailyAverage = weekly.length
            ? Math.round(
                weekly.reduce((sum, day) => sum + day.visits, 0)
                / weekly.length
            )
            : 0;

        // const peakDay = weekly.reduce(
        //     (peak, day) =>
        //         day.visits > (peak?.visits ?? -1) ? day : peak,
        //     null
        // );

        const peakDay = weekly.reduce(
            (peak, day) =>
                day.visits > (peak?.visits ?? 0) ? day : peak,
            null
        );

        return {
            period,
            generated_at: new Date().toISOString(),

            rating: {
                average: Number(rating.average),
                total: totalReviews,

                breakdown: {
                    "5": Number(rating.five),
                    "4": Number(rating.four),
                    "3": Number(rating.three),
                    "2": Number(rating.two),
                    "1": Number(rating.one),
                },

                this_month: Number(rating.this_month),
                response_rate: responseRate,
            },

            visits: {
                total: totalVisits,

                change_pct: startDate
                    ? changePct(visits.total, visits.previous_total)
                    : null,

                weekly,
                peak_day: peakDay?.day ?? null,
                daily_average: dailyAverage,
                best_hour_range: null,
            },

            search_appearances: {
                total: totalImpressions,

                change_pct: startDate
                    ? changePct(search.total, search.previous_total)
                    : null,
            },

            most_visited_listing: topListingRows[0] ?? null,

            followers: {
                total: Number(followers.total),
                change_pct: null,
                new_this_week: Number(followers.new_this_week),
            },

            response: {
                rate: null,
                avg_minutes: null,
            },

            conversion: {
                rate: totalVisits
                    ? Number(
                        ((totalOrders / totalVisits) * 100).toFixed(1)
                    )
                    : 0,

                change_pct: null,
            },

            top_listings: topListingRows,
        };
    }


}

module.exports = StoreModel;