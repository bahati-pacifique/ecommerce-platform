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

        -- vendor
        v.id AS vendor_id,
        v.business_name AS vendor_name,
        v.verification_status AS vendor_verification,
        
        -- store
        s.id AS store_id,
        s.name AS store_name,
        s.rating as store_rating,
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

        (CONCAT('listings/videos/', l.id, '/', l.id, '.mp4')) AS listing_video_storage_key,

        -- Variants
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

                    -- Inventory availability
                    'inventory', jsonb_build_object(
                        'available_quantity',
                            COALESCE(inventory_data.available_quantity, 0),

                        'reserved_quantity',
                            COALESCE(inventory_data.reserved_quantity, 0),

                        'inventory_records',
                            COALESCE(inventory_data.inventory_records, 0),

                        'availability_status',
                            CASE
                                WHEN COALESCE(inventory_data.inventory_records, 0) = 0
                                    THEN 'untracked'
                                WHEN COALESCE(inventory_data.available_quantity, 0) = 0
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

            LEFT JOIN listing_variant_current_prices lcp
                ON lcp.listing_variant_id = lv.id

            -- Inventory aggregation for this listing variant
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
                        ),
                        0
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
        sale_price = null
    }) {
        const { rows } = await client.query(
            `
            INSERT INTO listing_prices (
                listing_variant_id,
                currency_id,
                price
            )
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [
                listing_variant_id,
                currency_id,
                price,
            ]
        );

        return rows[0] ?? null;
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
}

module.exports = ListingModel;