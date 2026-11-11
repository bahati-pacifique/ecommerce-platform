const db = require('../configs/db');

class ListingModel {
    // models/listing.model.js
    // static async searchListingByStore(storeId, query, { limit = 10 } = {}) {
    //     const { rows } = await db.query(`
    //         SELECT
    //         l.id,
    //         l.title,
    //         l.description,
    //         (SELECT pv.sku FROM product_variants pv
    //         JOIN listing_variants lv ON lv.product_variant_id = pv.id
    //         WHERE lv.listing_id = l.id
    //         LIMIT 1) AS sku,
    //         (SELECT lvm.storage_key FROM listing_variants_media lvm
    //         JOIN listing_variants lv ON lv.id = lvm.listing_variant_id
    //         WHERE lv.listing_id = l.id AND lvm.is_primary = TRUE
    //         ORDER BY lvm.id
    //         LIMIT 1) AS image_url
    //         FROM listings l
    //         WHERE l.store_id = $1
    //         AND l.status = 'active'
    //         AND (
    //             l.title ILIKE $2
    //             OR l.search_vector @@ plainto_tsquery('english', $3)
    //         )
    //         ORDER BY l.title ASC
    //         LIMIT $4;
    //     `, [storeId, `%${query}%`, query, limit]);

    //     return rows;
    // }

    static async searchListingByStore(storeId, query, { limit = 10 } = {}) {
        const { rows } = await db.query(`
            SELECT
            l.id,
            l.title,
            l.description,

            (
                SELECT pv.sku
                FROM listing_variants lv
                JOIN product_variants pv
                    ON pv.id = lv.product_variant_id
                WHERE lv.listing_id = l.id
                ORDER BY lv.id
                LIMIT 1
            ) AS sku,

            (
                SELECT lvm.storage_key
                FROM listing_variants_media lvm
                JOIN listing_variants lv
                    ON lv.id = lvm.listing_variant_id
                WHERE lv.listing_id = l.id
                  AND lvm.is_primary = TRUE
                ORDER BY lvm.id
                LIMIT 1
            ) AS image_url,

            COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', lv.id,
                        'product_variant_id', pv.id,
                        'sku', pv.sku,
                        'attributes', COALESCE(
                            (
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'id', a.id,
                                        'name', a.title,
                                        'value_id', av.id,
                                        'value', av.value
                                    )
                                    ORDER BY a.title
                                )
                                FROM variant_attribute_values vav
                                JOIN attribute_values av
                                    ON av.id = vav.attribute_value_id
                                JOIN attributes a
                                    ON a.id = av.attribute_id
                                WHERE vav.variant_id = pv.id
                            ),
                            '[]'::jsonb
                        ),
                        'image_url', (
                            SELECT lvm.storage_key
                            FROM listing_variants_media lvm
                            WHERE lvm.listing_variant_id = lv.id
                            AND lvm.is_primary = TRUE
                            ORDER BY lvm.id
                            LIMIT 1
                        )
                    )
                    ORDER BY lv.id
                )
                FROM listing_variants lv
                JOIN product_variants pv
                    ON pv.id = lv.product_variant_id
                WHERE lv.listing_id = l.id
            ), '[]'::jsonb) AS variants

            FROM listings l

            WHERE l.store_id = $1
            AND l.status = 'active'
            AND (
                l.title ILIKE $2
                OR l.search_vector @@ plainto_tsquery('english', $3)
            )

            ORDER BY l.title ASC
            LIMIT $4;
    `, [storeId, `%${query}%`, query, limit]);

        return rows;
    }

    /*static async getListingsByStore(storeId, {
        page = 1,
        limit = 20,
        status = 'active',
        sort = 'recent',
    } = {}) {
        // Clamp inputs so a hostile client can't ask for 10,000 rows
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
        const offset = (safePage - 1) * safeLimit;

        // Whitelist sort
        const orderBy = {
            recent: 'l.created_at DESC',
            title_asc: 'l.title ASC',
            title_desc: 'l.title DESC',
            price_asc: 'l.price ASC NULLS LAST',
            price_desc: 'l.price DESC NULLS LAST',
        }[sort] || 'l.created_at DESC';

        // Whitelist status → SQL fragment
        const allowedStatuses = ['active', 'draft', 'archived', 'paused'];
        const statusFilter = allowedStatuses.includes(status) ? status : 'active';

        // ── Count query (run first — same WHERE, no JOINs, no subselects) ──
        const { rows: countRows } = await db.query(
            `SELECT COUNT(*)::int AS total
            FROM listings l
            WHERE l.store_id = $1
            AND l.status   = $2`,
            [storeId, statusFilter]
        );
        const total = countRows[0]?.total ?? 0;

        // ── Data query (identical body, plus LIMIT/OFFSET) ────────────
        const { rows } = await db.query(`
            SELECT
            l.id,
            l.title,
            p.id AS product_id,
            p.title AS product_title,
            p.description AS product_description,
            l.description,
            l.status,
            l.created_at,
            l.updated_at,

            (
                SELECT pv.sku
                FROM listing_variants lv
                JOIN product_variants pv
                    ON pv.id = lv.product_variant_id
                WHERE lv.listing_id = l.id
                ORDER BY lv.id
                LIMIT 1
            ) AS sku,

            (
                SELECT lvm.storage_key
                FROM listing_variants_media lvm
                JOIN listing_variants lv
                    ON lv.id = lvm.listing_variant_id
                WHERE lv.listing_id = l.id
                AND lvm.is_primary = TRUE
                ORDER BY lvm.id
                LIMIT 1
            ) AS image_url,

            COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', lv.id,
                        'product_variant_id', pv.id,
                        'sku', pv.sku,

                        -- Pricing
                        'price', lcp.price,
                        'sale_price', lcp.sale_price,
                        'current_price', lcp.current_price,
                        'currency_id', lcp.currency_id,
                        'is_on_sale', COALESCE(lcp.is_on_sale, FALSE),

                        -- Attributes
                        'attributes', COALESCE(
                            (
                                SELECT jsonb_agg(
                                    jsonb_build_object(
                                        'id', a.id,
                                        'name', a.title,
                                        'value_id', av.id,
                                        'value', av.value
                                    )
                                    ORDER BY a.title
                                )
                                FROM variant_attribute_values vav
                                JOIN attribute_values av
                                    ON av.id = vav.attribute_value_id
                                JOIN attributes a
                                    ON a.id = av.attribute_id
                                WHERE vav.variant_id = pv.id
                            ),
                            '[]'::jsonb
                        ),

                        -- Primary image
                        'image_url', (
                            SELECT lvm.storage_key
                            FROM listing_variants_media lvm
                            WHERE lvm.listing_variant_id = lv.id
                            AND lvm.is_primary = TRUE
                            ORDER BY lvm.id
                            LIMIT 1
                        )
                    )
                    ORDER BY lv.id
                )
                FROM listing_variants lv
                JOIN product_variants pv
                    ON pv.id = lv.product_variant_id
                LEFT JOIN listing_variant_current_prices lcp
                    ON lcp.listing_variant_id = lv.id
                WHERE lv.listing_id = l.id
            ), '[]'::jsonb) AS variants

            FROM listings l
            LEFT JOIN products p ON p.id = l.product_id

            WHERE l.store_id = $1
            AND l.status = $2

            ORDER BY ${orderBy}
            LIMIT $3
            OFFSET $4;`, [storeId, statusFilter, safeLimit, offset]);

        // ── Pagination envelope ──────────────────────────────────────
        const totalPages = Math.max(1, Math.ceil(total / safeLimit));

        return {
            listings: rows,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages,
                hasNextPage: safePage < totalPages,
                hasPreviousPage: safePage > 1,
            },
        };
    }*/


    //Obsolete: Function lack search
    /*static async getListingsByStore(storeId, {
        page = 1,
        limit = 20,
        status = 'active',
        sort = 'recent',
    } = {}) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
        const offset = (safePage - 1) * safeLimit;

        // Whitelist sorting
        const orderBy = {
            recent: 'l.created_at DESC',
            title_asc: 'l.title ASC',
            title_desc: 'l.title DESC',
            price_asc: 'starting_price ASC NULLS LAST',
            price_desc: 'starting_price DESC NULLS LAST',
        }[sort] || 'l.created_at DESC';

        const allowedStatuses = ['active', 'draft', 'archived', 'paused'];
        const statusFilter = allowedStatuses.includes(status)
            ? status
            : 'active';

        // Count listings
        const { rows: countRows } = await db.query(
            `SELECT COUNT(*)::int AS total
         FROM listings l
         WHERE l.store_id = $1
           AND l.status = $2`,
            [storeId, statusFilter]
        );

        const total = countRows[0]?.total ?? 0;

        // Fetch lightweight listing data
        const { rows } = await db.query(`
        SELECT
            l.id,
            l.title,
            l.product_id,
            p.title AS product_title,
            p.family_id,
            fm.title AS family,
            fm.category_id,
            ct.title AS category,
            l.status,
            l.created_at,
            l.updated_at,

            -- First variant SKU
            (
                SELECT pv.sku
                FROM listing_variants lv
                JOIN product_variants pv
                    ON pv.id = lv.product_variant_id
                WHERE lv.listing_id = l.id
                ORDER BY lv.id
                LIMIT 1
            ) AS sku,

            -- Primary listing image
            (
                SELECT lvm.storage_key
                FROM listing_variants_media lvm
                JOIN listing_variants lv
                    ON lv.id = lvm.listing_variant_id
                WHERE lv.listing_id = l.id
                  AND lvm.is_primary = TRUE
                ORDER BY lvm.id
                LIMIT 1
            ) AS image_url,

            -- Total variants
            (
                SELECT COUNT(*)::int
                FROM listing_variants lv
                WHERE lv.listing_id = l.id
            ) AS total_variants,

            -- Starting price
            price_data.starting_price

        FROM listings l

        LEFT JOIN products p
            ON p.id = l.product_id
        LEFT JOIN families fm 
            ON fm.id = p.family_id
        LEFT JOIN categories ct
            ON ct.id = fm.category_id

        LEFT JOIN LATERAL (
            SELECT MIN(lcp.current_price) AS starting_price
            FROM listing_variants lv
            JOIN listing_variant_current_prices lcp
                ON lcp.listing_variant_id = lv.id
            WHERE lv.listing_id = l.id
        ) price_data ON TRUE

        WHERE l.store_id = $1
          AND l.status = $2

        ORDER BY ${orderBy}
        LIMIT $3
        OFFSET $4
    `, [storeId, statusFilter, safeLimit, offset]);

        const totalPages = Math.max(1, Math.ceil(total / safeLimit));

        return {
            listings: rows,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages,
                hasNextPage: safePage < totalPages,
                hasPreviousPage: safePage > 1,
            },
        };
    }*/


    static async getListingsByStore(storeId, {
        page = 1,
        limit = 20,
        status = 'active',
        sort = 'recent',
        search = '',
    } = {}) {
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
        const offset = (safePage - 1) * safeLimit;

        const searchTerm = String(search || '').trim() || null;

        // Whitelist sorting
        const orderBy = {
            recent: 'l.created_at DESC',
            title_asc: 'l.title ASC',
            title_desc: 'l.title DESC',
            price_asc: 'starting_price ASC NULLS LAST',
            price_desc: 'starting_price DESC NULLS LAST',

            relevance: `
            (
                ts_rank(
                    COALESCE(l.search_vector, ''::tsvector),
                    websearch_to_tsquery('simple', $3)
                ) +
                ts_rank(
                    COALESCE(p.search_vector, ''::tsvector),
                    websearch_to_tsquery('simple', $3)
                )
            ) DESC,
            l.created_at DESC
        `,
        }[sort] || 'l.created_at DESC';

        const allowedStatuses = [
            'active',
            'draft',
            'archived',
            'paused',
        ];

        const statusFilter = allowedStatuses.includes(status)
            ? status
            : 'active';

        // Shared search conditions
        const searchCondition = `
        (
            $3::text IS NULL

            OR ct.title ILIKE '%' || $3 || '%'

            OR fm.title ILIKE '%' || $3 || '%'

            OR br.title ILIKE '%' || $3 || '%'

            OR (
                p.search_vector @@ websearch_to_tsquery('simple', $3)
            )

            OR (
                l.search_vector @@ websearch_to_tsquery('simple', $3)
            )

            OR EXISTS (
                SELECT 1
                FROM listing_variants lv
                JOIN product_variants pv
                    ON pv.id = lv.product_variant_id
                WHERE lv.listing_id = l.id
                  AND pv.sku ILIKE '%' || $3 || '%'
             )
        )
        `;

        // Count matching listings
        const { rows: countRows } = await db.query(`
            SELECT COUNT(*)::int AS total

            FROM listings l

            LEFT JOIN products p
                ON p.id = l.product_id

            LEFT JOIN brands br
                ON br.id = p.brand_id

            LEFT JOIN families fm
                ON fm.id = p.family_id

            LEFT JOIN categories ct
                ON ct.id = fm.category_id

            WHERE l.store_id = $1
            AND l.status = $2
            AND ${searchCondition}
        `, [storeId, statusFilter, searchTerm]);

        const total = countRows[0]?.total ?? 0;

        // Fetch listing summaries
        const { rows } = await db.query(`
            SELECT
            l.id,
            l.title,
            l.product_id,
            p.title AS product_title,
            p.slug AS product_slug,
            p.family_id,
            br.title AS brand,
            br.logo_url AS brand_logo_url,
            fm.title AS family,
            fm.category_id,
            ct.title AS category,
            l.status,
            l.created_at,
            COALESCE (l.updated_at, l.created_at) AS updated_at,

            -- First variant SKU
            (
                SELECT pv.sku
                FROM listing_variants lv
                JOIN product_variants pv
                    ON pv.id = lv.product_variant_id
                WHERE lv.listing_id = l.id
                ORDER BY lv.id
                LIMIT 1
            ) AS sku,

            -- Primary listing image
            (
                SELECT lvm.storage_key
                FROM listing_variants_media lvm
                JOIN listing_variants lv
                    ON lv.id = lvm.listing_variant_id
                WHERE lv.listing_id = l.id
                  AND lvm.is_primary = TRUE
                ORDER BY lvm.id
                LIMIT 1
            ) AS image_url,

            -- Total variants
            (
                SELECT COUNT(*)::int
                FROM listing_variants lv
                WHERE lv.listing_id = l.id
            ) AS total_variants,

             -- First variant SKU
            (
                SELECT code
                FROM currencies WHERE is_base
            ) AS currency,

            -- Starting price
            price_data.starting_price,
            COALESCE(inventory_data.available_quantity, 0)
            AS available_quantity,

        COALESCE(inventory_data.reserved_quantity, 0)
            AS reserved_quantity,

        COALESCE(inventory_data.inventory_records, 0)
            AS inventory_records,

        CASE
            WHEN COALESCE(inventory_data.inventory_records, 0) = 0
                THEN 'untracked'

            WHEN COALESCE(inventory_data.available_quantity, 0) = 0
                THEN 'out_of_stock'

            WHEN inventory_data.available_quantity <= 5
                THEN 'low_stock'

            ELSE 'in_stock'
        END AS availability_status

        FROM listings l

        LEFT JOIN products p
            ON p.id = l.product_id

        LEFT JOIN brands br
            ON br.id = p.brand_id

        LEFT JOIN families fm
            ON fm.id = p.family_id

        LEFT JOIN categories ct
            ON ct.id = fm.category_id

        LEFT JOIN LATERAL (
            SELECT MIN(lcp.current_price) AS starting_price
            FROM listing_variants lv
            JOIN listing_variant_current_prices lcp
                ON lcp.listing_variant_id = lv.id
            WHERE lv.listing_id = l.id
        ) price_data ON TRUE

        LEFT JOIN LATERAL (
        SELECT
        COUNT(ii.id)::int AS inventory_records,

        COALESCE(
            SUM(
                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN GREATEST(ii.quantity - ii.reserved, 0)

                    WHEN ii.tracking_mode = 'serialized'
                    THEN COALESCE(unit_stock.available_units, 0)

                    ELSE 0
                END
            ), 0
        )::int AS available_quantity,

        COALESCE(
            SUM(
                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN ii.reserved

                    WHEN ii.tracking_mode = 'serialized'
                    THEN COALESCE(unit_stock.reserved_units, 0)

                    ELSE 0
                END
            ), 0
        )::int AS reserved_quantity

            FROM listing_variants lv

            JOIN inventory_items ii
                ON ii.listing_variant_id = lv.id

            JOIN inventories inv
                ON inv.id = ii.inventory_id
            AND inv.store_id = l.store_id

            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*) FILTER (
                        WHERE iu.status = 'available'
                    )::int AS available_units,

                    COUNT(*) FILTER (
                        WHERE iu.status = 'reserved'
                    )::int AS reserved_units

                FROM inventory_units iu
                WHERE iu.inventory_item_id = ii.id

            ) unit_stock ON TRUE

            WHERE lv.listing_id = l.id

        ) inventory_data ON TRUE

                WHERE l.store_id = $1
                AND l.status = $2
                AND ${searchCondition}

                ORDER BY ${orderBy}

                LIMIT $4
                OFFSET $5
            `, [storeId, statusFilter, searchTerm, safeLimit, offset]);

        const totalPages = Math.max(1, Math.ceil(total / safeLimit));

        return {
            listings: rows,
            pagination: {
                total,
                page: safePage,
                limit: safeLimit,
                totalPages,
                hasNextPage: safePage < totalPages,
                hasPreviousPage: safePage > 1,
            },
        };
    }

    // static async getListingById(storeId, listingId) {
    //     const { rows } = await db.query(`
    //     SELECT
    //     -- Listing
    //     l.id,
    //     l.title,
    //     l.description,
    //     l.status,
    //     l.created_at,
    //     l.updated_at,

    //     -- Product
    //     p.id AS product_id,
    //     p.title AS product_title,
    //     p.description AS product_description,

    //     -- Family
    //     fm.id AS family_id,
    //     fm.title AS family_title,

    //     -- Category
    //     ct.id AS category_id,
    //     ct.title AS category_title,

    //     -- Variants
    //     COALESCE((
    //         SELECT jsonb_agg(
    //             jsonb_build_object(
    //                 'id', lv.id,
    //                 'product_variant_id', pv.id,
    //                 'sku', pv.sku,

    //                 -- Pricing
    //                 'price', lcp.price,
    //                 'sale_price', lcp.sale_price,
    //                 'current_price', lcp.current_price,
    //                 'currency_id', lcp.currency_id,
    //                 'is_on_sale', COALESCE(lcp.is_on_sale, FALSE),

    //                 -- Attributes
    //                 'attributes', COALESCE(
    //                     (
    //                         SELECT jsonb_agg(
    //                             jsonb_build_object(
    //                                 'id', a.id,
    //                                 'name', a.title,
    //                                 'value_id', av.id,
    //                                 'value', av.value
    //                             )
    //                             ORDER BY a.title
    //                         )
    //                         FROM variant_attribute_values vav
    //                         JOIN attribute_values av
    //                             ON av.id = vav.attribute_value_id
    //                         JOIN attributes a
    //                             ON a.id = av.attribute_id
    //                         WHERE vav.variant_id = pv.id
    //                     ),
    //                     '[]'::jsonb
    //                 ),

    //                 -- Primary image
    //                 'image_url', (
    //                     SELECT lvm.storage_key
    //                     FROM listing_variants_media lvm
    //                     WHERE lvm.listing_variant_id = lv.id
    //                         AND lvm.is_primary = TRUE
    //                     ORDER BY lvm.id
    //                     LIMIT 1
    //                 )
    //             )
    //             ORDER BY lv.id
    //         )
    //         FROM listing_variants lv
    //         JOIN product_variants pv
    //             ON pv.id = lv.product_variant_id
    //         LEFT JOIN listing_variant_current_prices lcp
    //             ON lcp.listing_variant_id = lv.id
    //         WHERE lv.listing_id = l.id
    //     ), '[]'::jsonb) AS variants

    //     FROM listings l

    //     LEFT JOIN products p
    //         ON p.id = l.product_id

    //     LEFT JOIN families fm
    //         ON fm.id = p.family_id

    //     LEFT JOIN categories ct
    //         ON ct.id = fm.category_id

    //     WHERE l.id = $1
    //       AND l.store_id = $2

    //     LIMIT 1
    // `, [listingId, storeId]);

    //     return rows[0] || null;
    // }


    static async getListingById(storeId, listingId) {
        const { rows } = await db.query(`
        SELECT

        -- Vendor
        v.id AS vendor_id,
        v.business_name AS vendor_name,
        v.verification_status AS vendor_verification,

        -- Store
        s.id AS store_id,
        s.name AS store_name,
        s.rating AS store_rating,
        s.meta AS store_meta,

        -- Listing
        l.id,
        l.title,
        l.description,
        l.status,
        l.created_at,
        l.updated_at,

        -- Product
        p.id AS product_id,
        p.title AS product_title,
        p.description AS product_description,

        -- Brand
        br.title AS brand,
        br.logo_url AS brand_logo_url,

        -- Family
        fm.title AS family,

        -- Category
        ct.title AS category,

        CONCAT(
            'listings/videos/',
            l.id,
            '/',
            l.id,
            '.mp4'
        ) AS listing_video_storage_key,

        -- Base currency
        COALESCE(
            (
                SELECT jsonb_build_object(
                    'id', c.id,
                    'code', c.code,
                    'symbol', c.symbol,
                    'name', c.name
                )
                FROM currencies c
                WHERE c.is_base
                LIMIT 1
            ),
            '{}'::jsonb
        ) AS base_currency,

        -- Listing variants
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', lv.id,
                    'product_variant_id', pv.id,
                    'sku', pv.sku,
                    'status', lv.status,

                    -- Pricing
                    'base_price_id', lcp.base_price_id,
                    'regular_price', lcp.regular_price,

                    'promotion_id', lcp.promotion_id,
                    'sale_price', lcp.sale_price,

                    'current_price', lcp.current_price,
                    'currency_id', lcp.currency_id,

                    'is_on_sale',
                        COALESCE(lcp.is_on_sale, FALSE),

                    'discount_percentage',
                        COALESCE(lcp.discount_percentage, 0),

                    -- Regular price validity
                    'regular_price_starts_at',
                        lcp.regular_price_starts_at,

                    'regular_price_ends_at',
                        lcp.regular_price_ends_at,

                    -- Promotion validity
                    'promotion_starts_at',
                        lcp.promotion_starts_at,

                    'promotion_ends_at',
                        lcp.promotion_ends_at,

                    -- Inventory availability
                    'inventory', jsonb_build_object(
                        'available_quantity',
                            COALESCE(
                                inventory_data.available_quantity,
                                0
                            ),

                        'reserved_quantity',
                            COALESCE(
                                inventory_data.reserved_quantity,
                                0
                            ),

                        'inventory_records',
                            COALESCE(
                                inventory_data.inventory_records,
                                0
                            ),

                        'availability_status',
                            CASE
                                WHEN COALESCE(
                                    inventory_data.inventory_records,
                                    0
                                ) = 0
                                    THEN 'untracked'

                                WHEN COALESCE(
                                    inventory_data.available_quantity,
                                    0
                                ) = 0
                                    THEN 'out_of_stock'

                                WHEN inventory_data.available_quantity <= 5
                                    THEN 'low_stock'

                                ELSE 'in_stock'
                            END
                    ),

                    -- Attributes
                    'attributes', COALESCE(
                        (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'id', a.id,
                                    'name', a.title,
                                    'value_id', av.id,
                                    'value', av.value
                                )
                                ORDER BY a.title
                            )
                            FROM variant_attribute_values vav

                            JOIN attribute_values av
                                ON av.id = vav.attribute_value_id

                            JOIN attributes a
                                ON a.id = av.attribute_id

                            WHERE vav.variant_id = pv.id
                        ),
                        '[]'::jsonb
                    ),

                    -- Primary image
                    'image_url', (
                        SELECT lvm.storage_key
                        FROM listing_variants_media lvm
                        WHERE lvm.listing_variant_id = lv.id
                          AND lvm.is_primary = TRUE
                        ORDER BY lvm.id
                        LIMIT 1
                    )
                )
                ORDER BY lv.id
            )

            FROM listing_variants lv

            JOIN product_variants pv
                ON pv.id = lv.product_variant_id

            -- Current pricing in base currency only
            LEFT JOIN listing_variant_current_prices lcp
                ON lcp.listing_variant_id = lv.id
                AND lcp.currency_id = (
                    SELECT id
                    FROM currencies
                    WHERE is_base
                    LIMIT 1
                )

            -- Inventory aggregation
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(ii.id)::int AS inventory_records,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN ii.tracking_mode = 'bulk'
                                    THEN GREATEST(
                                        ii.quantity - ii.reserved,
                                        0
                                    )

                                WHEN ii.tracking_mode = 'serialized'
                                    THEN COALESCE(
                                        unit_stock.available_units,
                                        0
                                    )

                                ELSE 0
                            END
                        ),
                        0
                    )::int AS available_quantity,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN ii.tracking_mode = 'bulk'
                                    THEN ii.reserved

                                WHEN ii.tracking_mode = 'serialized'
                                    THEN COALESCE(
                                        unit_stock.reserved_units,
                                        0
                                    )

                                ELSE 0
                            END
                        ),
                        0
                    )::int AS reserved_quantity

                FROM inventory_items ii

                JOIN inventories inv
                    ON inv.id = ii.inventory_id
                   AND inv.store_id = l.store_id

                LEFT JOIN LATERAL (
                    SELECT
                        COUNT(*) FILTER (
                            WHERE iu.status = 'available'
                        )::int AS available_units,

                        COUNT(*) FILTER (
                            WHERE iu.status = 'reserved'
                        )::int AS reserved_units

                    FROM inventory_units iu
                    WHERE iu.inventory_item_id = ii.id
                ) unit_stock ON TRUE

                WHERE ii.listing_variant_id = lv.id

            ) inventory_data ON TRUE

            WHERE lv.listing_id = l.id

        ), '[]'::jsonb) AS variants,

        -- Product media
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', pm.id,
                        'media_type', pm.media_type,
                        'width', pm.width,
                        'height', pm.height,
                        'storage_key', pm.storage_key,
                        'url', pm.url
                    )
                    ORDER BY pm.id
                )
                FROM product_media pm
                WHERE pm.product_id = p.id
            ),
            '[]'::jsonb
        ) AS product_media

        FROM listings l

        LEFT JOIN products p
            ON p.id = l.product_id

        LEFT JOIN brands br
            ON br.id = p.brand_id

        LEFT JOIN families fm
            ON fm.id = p.family_id

        LEFT JOIN categories ct
            ON ct.id = fm.category_id

        LEFT JOIN stores s
            ON s.id = l.store_id

        LEFT JOIN vendors v
            ON v.id = s.vendor_id

        WHERE l.id = $1
          AND l.store_id = $2

        LIMIT 1
    `, [listingId, storeId]);

        return rows[0] || null;
    }


    static async getListingVariantPrices(storeId, listingId, variantId) {
        const { rows } = await db.query(`
        SELECT
        lp.id,
        lp.listing_variant_id,
        lp.currency_id,
        c.code AS currency_code,
        c.name AS currency_name,
        lp.price,
        lp.sale_price,
        CASE
            WHEN lp.sale_price IS NOT NULL
                THEN lp.sale_price
            ELSE lp.price
        END AS current_price,
        (
            lp.sale_price IS NOT NULL
        ) AS is_on_sale,
        lp.starts_at,
        lp.ends_at,
        lp.status,
        lp.created_at,
        lp.updated_at
        FROM listing_prices lp

        JOIN currencies c
            ON c.id = lp.currency_id

        JOIN listing_variants lv
            ON lv.id = lp.listing_variant_id

        JOIN listings l
            ON l.id = lv.listing_id

        WHERE l.id = $1
          AND l.store_id = $2
          AND lv.id = $3

        ORDER BY lp.starts_at DESC
    `, [listingId, storeId, variantId]);

        return rows;
    }

    static async insertListing(client, {
        store_id,
        product_id,
        title,
        description,
        options,
        status,
        condition
    }) {
        const { rows } = await client.query(
            `
            INSERT INTO listings (
                store_id,
                product_id,
                title,
                description,
                options,
                status,
                condition
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
            RETURNING *
            `,
            [
                store_id,
                product_id,
                title,
                description ?? null,
                JSON.stringify(options ?? {}),
                status ?? 'active',
                condition ?? 'new'
            ]
        );

        return rows[0] ?? null;
    }

    static async insertListingVariant(client, {
        listing_id,
        product_variant_id,
        sku,
        options = {},
        status = 'active'
    }) {
        const { rows } = await client.query(
            `
            INSERT INTO listing_variants (
                listing_id,
                product_variant_id,
                sku,
                options,
                status
            )
            VALUES ($1, $2, $3, $4::jsonb, $5)
            RETURNING *
            `,
            [
                listing_id,
                product_variant_id,
                sku,
                JSON.stringify(options),
                status
            ]
        );

        return rows[0] ?? null;
    }

    static async insertListingPrice(client, {
        listing_variant_id,
        currency_id,
        price,
        is_initial = false,
        starts_at = null,
        ends_at = null
    }) {

        const dbInstance = client || db;

        const { rows } = await dbInstance.query(
            `
            INSERT INTO listing_prices (
                listing_variant_id,
                currency_id,
                price,
                is_initial,
                starts_at,
                ends_at
            )
            VALUES (
                $1, $2, $3, $4,
                COALESCE($5::timestamptz, NOW()),
                $6
            )
            RETURNING *
        `,
            [
                listing_variant_id,
                currency_id,
                price,
                is_initial,
                starts_at,
                ends_at
            ]
        );

        return rows[0] ?? null;
    }

    static async insertListingPromotionPrice({
        listing_variant_id,
        currency_id,
        base_price_id,
        sale_price,
        starts_at = null,
        ends_at
    }) {
        const { rows } = await db.query(
            `
                INSERT INTO listing_prices (
                    listing_variant_id,
                    currency_id,
                    base_price_id,
                    sale_price,
                    starts_at,
                    ends_at
                )
                VALUES (
                    $1, $2, $3, $4,
                    COALESCE($5::timestamptz, NOW()),
                    $6
                )
                RETURNING *
            `,
            [
                listing_variant_id,
                currency_id,
                base_price_id,
                sale_price,
                starts_at,
                ends_at
            ]
        );

        return rows[0] ?? null;
    }

    /**
     * Replaces the current regular price with a new price.
     * Creates the initial price if the variant has no initial price.
     *
     * The original initial price is preserved in price history.
     */
    // static async makeInitialPrice(variantId, newPrice) {
    //     const client = await db.connect();

    //     try {
    //         await client.query('BEGIN');

    //         if (
    //             newPrice === null ||
    //             newPrice === undefined ||
    //             !Number.isFinite(Number(newPrice)) ||
    //             Number(newPrice) < 0
    //         ) {
    //             throw new Error('A valid non-negative price is required');
    //         }

    //         // Lock the variant to prevent concurrent price changes.
    //         const { rows: variantRows } = await client.query(
    //             `
    //             SELECT lv.id
    //             FROM listing_variants lv
    //             WHERE lv.id = $1
    //             FOR UPDATE
    //         `,
    //             [variantId]
    //         );

    //         if (!variantRows.length) {
    //             throw new Error('Listing variant not found');
    //         }

    //         // Resolve the active base currency.
    //         const { rows: currencyRows } = await client.query(
    //             `
    //         SELECT id
    //         FROM currencies
    //         WHERE is_base = TRUE
    //           AND status = 'active'
    //         LIMIT 1
    //         `
    //         );

    //         if (!currencyRows.length) {
    //             throw new Error('No active base currency configured');
    //         }

    //         const currencyId = currencyRows[0].id;

    //         // Find the original initial price, if one exists.
    //         const { rows: initialRows } = await client.query(
    //             `
    //             SELECT id, price, starts_at, ends_at, status
    //             FROM listing_prices
    //             WHERE listing_variant_id = $1
    //             AND currency_id = $2
    //             AND is_initial = TRUE
    //             FOR UPDATE
    //         `,
    //             [variantId, currencyId]
    //         );

    //         const hasInitialPrice = initialRows.length > 0;

    //         // Reject an already scheduled future regular price.
    //         const { rows: futureRows } = await client.query(
    //             `
    //         SELECT id
    //         FROM listing_prices
    //         WHERE listing_variant_id = $1
    //           AND currency_id = $2
    //           AND price IS NOT NULL
    //           AND status = 'active'
    //           AND starts_at > NOW()
    //           AND (ends_at IS NULL OR ends_at > NOW())
    //         LIMIT 1
    //         `,
    //             [variantId, currencyId]
    //         );

    //         if (futureRows.length) {
    //             throw new Error(
    //                 'A future regular price is already scheduled for this variant'
    //             );
    //         }

    //         // Close the currently effective regular price period.
    //         // This also closes the initial price when it is still current.
    //         await client.query(
    //             `
    //         UPDATE listing_prices
    //         SET ends_at = NOW(),
    //             updated_at = NOW()
    //         WHERE listing_variant_id = $1
    //           AND currency_id = $2
    //           AND price IS NOT NULL
    //           AND status = 'active'
    //           AND starts_at <= NOW()
    //           AND (ends_at IS NULL OR ends_at > NOW())
    //         `,
    //             [variantId, currencyId]
    //         );

    //         // Insert the replacement price.
    //         const newPriceRecord = await this.insertListingPrice(client, {
    //             listing_variant_id: variantId,
    //             currency_id: currencyId,
    //             price: Number(newPrice),
    //             is_initial: !hasInitialPrice
    //         });

    //         await client.query('COMMIT');

    //         return newPriceRecord;

    //     } catch (error) {
    //         await client.query('ROLLBACK');
    //         throw error;
    //     } finally {
    //         client.release();
    //     }
    // }

    //======
    /**
     * Creates the initial regular price for a listing variant.
     * Rejects the operation if an initial price already exists.
     */
    static async createInitialPrice(variantId, price) {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            if (
                price === null ||
                price === undefined ||
                !Number.isFinite(Number(price)) ||
                Number(price) <= 0
            ) {
                throw new Error('A valid non-negative price is required');
            }

            const { rows: variantRows } = await client.query(
                `
            SELECT id
            FROM listing_variants
            WHERE id = $1
            FOR UPDATE
            `,
                [variantId]
            );

            if (!variantRows.length) {
                throw new Error('Listing variant not found');
            }

            const { rows: currencyRows } = await client.query(
                `
            SELECT id
            FROM currencies
            WHERE is_base = TRUE
              AND status = 'active'
            LIMIT 1
            `
            );

            if (!currencyRows.length) {
                throw new Error('No active base currency configured');
            }

            const currencyId = currencyRows[0].id;

            const { rows: existingRows } = await client.query(
                `
            SELECT id
            FROM listing_prices
            WHERE listing_variant_id = $1
              AND currency_id = $2
              AND is_initial = TRUE
            LIMIT 1
            `,
                [variantId, currencyId]
            );

            if (existingRows.length) {
                throw new Error('Initial price already exists for this variant');
            }

            const newPriceRecord = await this.insertListingPrice(client, {
                listing_variant_id: variantId,
                currency_id: currencyId,
                price: Number(price),
                is_initial: true
            });

            await client.query('COMMIT');

            return newPriceRecord;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    //=======
    /**
     * Closes the current regular price and inserts a replacement.
     * Preserves the original initial price in price history.
     */
    static async updateRegularPrice(variantId, newPrice) {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            if (
                newPrice === null ||
                newPrice === undefined ||
                !Number.isFinite(Number(newPrice)) ||
                Number(newPrice) < 0
            ) {
                throw new Error('A valid non-negative price is required');
            }

            const { rows: variantRows } = await client.query(
                `
            SELECT id
            FROM listing_variants
            WHERE id = $1
            FOR UPDATE
            `,
                [variantId]
            );

            if (!variantRows.length) {
                throw new Error('Listing variant not found');
            }

            const { rows: currencyRows } = await client.query(
                `
            SELECT id
            FROM currencies
            WHERE is_base = TRUE
              AND status = 'active'
            LIMIT 1
            `
            );

            if (!currencyRows.length) {
                throw new Error('No active base currency configured');
            }

            const currencyId = currencyRows[0].id;

            const { rows: initialRows } = await client.query(
                `
            SELECT id
            FROM listing_prices
            WHERE listing_variant_id = $1
              AND currency_id = $2
              AND is_initial = TRUE
            LIMIT 1
            `,
                [variantId, currencyId]
            );

            if (!initialRows.length) {
                throw new Error(
                    'Initial price not found. Create the initial price first.'
                );
            }

            const { rows: futureRows } = await client.query(
                `
            SELECT id
            FROM listing_prices
            WHERE listing_variant_id = $1
              AND currency_id = $2
              AND price IS NOT NULL
              AND status = 'active'
              AND starts_at > NOW()
              AND (ends_at IS NULL OR ends_at > NOW())
            LIMIT 1
            `,
                [variantId, currencyId]
            );

            if (futureRows.length) {
                throw new Error(
                    'A future regular price is already scheduled for this variant'
                );
            }

            await client.query(
                `
            UPDATE listing_prices
            SET ends_at = NOW(),
                updated_at = NOW()
            WHERE listing_variant_id = $1
              AND currency_id = $2
              AND price IS NOT NULL
              AND status = 'active'
              AND starts_at <= NOW()
              AND (ends_at IS NULL OR ends_at > NOW())
            `,
                [variantId, currencyId]
            );

            const newPriceRecord = await this.insertListingPrice(client, {
                listing_variant_id: variantId,
                currency_id: currencyId,
                price: Number(newPrice),
                is_initial: false
            });

            await client.query('COMMIT');

            return newPriceRecord;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async getBaseCurrency(client) {
        const dbInstance = client || db;
        const { rows } = await dbInstance.query('SELECT * FROM currencies WHERE is_base = TRUE');

        return rows[0] ?? null;
    }

    static async patchListingOnStoreLevel(listingId, storeId, newStatus) {
        const allowedStatus = [
            'draft',
            'active',
            'inactive',
            'not_available'
        ]

        if (!allowedStatus.includes(newStatus)) {
            throw new Error(`Not allowed`);
        }

        const { rows } = await db.query(`UPDATE listings SET status = $1 WHERE id = $2 AND store_id = $3 RETURNING id, status`, [newStatus, listingId, storeId]);
        return rows[0] ?? null;
    }

    static async createVariantPrice({ listing_variant_id, currency_id, price, sale_price, starts_at, ends_at, status }) {
        const { rows } = await db.query(
            `INSERT INTO listing_prices
            (listing_variant_id, currency_id, price, sale_price, starts_at, ends_at, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [listing_variant_id, currency_id, price, sale_price, starts_at, ends_at, status || 'active']
        );
        return rows[0] ?? null;
    }

    static async toggleVariantPriceStatus(priceId) {
        const { rows } = await db.query(
            `UPDATE listing_prices
                SET status = CASE
                    WHEN status = 'active' THEN 'inactive'
                    WHEN status = 'inactive' THEN 'active'
                    ELSE status
                END,
                updated_at = NOW()
              WHERE id = $1
              RETURNING id, status`,
            [priceId]
        );
        return rows[0];
    }

    static async deleteVariantPrice(priceId) {
        await db.query(`UPDATED listing_prices SET status = 'deleted' WHERE id = $1`, [priceId]);
    }

    static async findPricesByVariant(variantId) {
        const { rows } = await db.query(
            `
        SELECT
            jsonb_build_object(
                'listing_id', l.id,
                'listing_title', l.title,
                'variant_id', lv.id,
                'variant_sku', lv.sku,
                'variant_status', lv.status,
                'variant_image', (
                    SELECT lvm.storage_key
                    FROM listing_variants_media lvm
                    WHERE lvm.listing_variant_id = lv.id
                      AND lvm.is_primary = TRUE
                    ORDER BY lvm.id
                    LIMIT 1
                )
            ) AS variant,

            (
                SELECT jsonb_build_object(
                    'currency_id', cy.id,
                    'currency_name', cy.name,
                    'currency_code', cy.code,
                    'currency_symbol', cy.symbol
                )
                FROM currencies cy
                WHERE cy.is_base = TRUE
                  AND cy.status = 'active'
                LIMIT 1
            ) AS base_currency,

            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', lp.id,
                        'listing_variant_id', lp.listing_variant_id,
                        'currency_id', lp.currency_id,
                        'currency_code', c.code,
                        'currency_symbol', c.symbol,

                        -- Price type
                        'price', lp.price,
                        'sale_price', lp.sale_price,
                        'base_price_id', lp.base_price_id,
                        'is_initial', lp.is_initial,

                        -- Validity period
                        'starts_at', lp.starts_at,
                        'ends_at', lp.ends_at,

                        -- Status and timestamps
                        'status', lp.status,
                        'created_at', lp.created_at,
                        'updated_at', lp.updated_at,

                        -- Current pricing information
                        'is_current', (lcp.base_price_id = lp.id),
                        'is_current_promotion', (lcp.promotion_id = lp.id),
                        'current_price', lcp.current_price,
                        'is_on_sale', COALESCE(lcp.is_on_sale, FALSE),
                        'discount_percentage',
                            COALESCE(lcp.discount_percentage, 0)
                    )
                    ORDER BY
                        lp.starts_at DESC,
                        lp.created_at DESC,
                        lp.id DESC
                ) FILTER (WHERE lp.id IS NOT NULL),
                '[]'::jsonb
            ) AS prices

        FROM listing_variants lv
        JOIN listings l
            ON l.id = lv.listing_id

        LEFT JOIN listing_prices lp
            ON lp.listing_variant_id = lv.id

        LEFT JOIN currencies c
            ON c.id = lp.currency_id

        LEFT JOIN listing_variant_current_prices lcp
            ON lcp.listing_variant_id = lv.id
           AND lcp.currency_id = lp.currency_id

        WHERE lv.id = $1

        GROUP BY lv.id, l.id
        `,
            [variantId]
        );

        return rows[0] || null;
    }

    static async findCurrentPriceForVariant(variantId) {
        const { rows } = await db.query(
            `
        SELECT
            vpc.listing_variant_id,

            -- Regular/base price
            vpc.base_price_id,
            vpc.regular_price,
            vpc.regular_price_starts_at,
            vpc.regular_price_ends_at,

            -- Currently selected promotion
            vpc.promotion_id,
            vpc.sale_price,
            vpc.promotion_starts_at,
            vpc.promotion_ends_at,

            -- Effective price
            vpc.current_price,
            vpc.is_on_sale,
            vpc.discount_percentage,

            -- Currency
            vpc.currency_id,
            c.name AS currency_name,
            c.code AS currency_code,
            c.symbol AS currency_symbol

        FROM listing_variant_current_prices vpc

        JOIN currencies c
            ON c.id = vpc.currency_id

        WHERE vpc.listing_variant_id = $1

        ORDER BY c.is_base DESC, c.code ASC
        `,
            [variantId]
        );

        return rows;
    }

}

module.exports = ListingModel;