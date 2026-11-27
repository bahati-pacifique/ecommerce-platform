const db = require('../../../src/configs/db');

class MainModel {
    /**
     * Get the top 15 global categories ranked by the number
     * of distinct products available on the storefront.
     */
    static async getCategories() {
        const query = `
            SELECT
                c.id,
                c.title,
                COUNT(DISTINCT p.id)::INTEGER AS product_count
            FROM categories c
            JOIN families f
                ON f.category_id = c.id
            JOIN products p
                ON p.family_id = f.id
            JOIN listings l
                ON l.product_id = p.id
            WHERE c.status = 'active'
            AND p.status = 'active'
            AND l.status = 'active'
            GROUP BY
                c.id,
                c.title
            ORDER BY
                product_count DESC,
                c.title ASC
            LIMIT 15;
        `;

        const { rows } = await db.query(query);

        return rows || [];
    }

    /**
     * Get at most 10 latest registered product catalog entries
     * for the customer-facing hero section.
     */
    static async getLatestHeroProductCatalog() {
        const query = `
        SELECT
            p.id,
            p.title,
            p.slug,
            p.description,
            p.created_at,

            f.id AS family_id,
            f.title AS family_title,

            c.id AS category_id,
            c.title AS category_title,

            b.id AS brand_id,
            b.title AS brand_title,

            pi.storage_key AS primary_image

        FROM products p

        JOIN families f
            ON f.id = p.family_id

        JOIN categories c
            ON c.id = f.category_id

        LEFT JOIN brands b
            ON b.id = p.brand_id

        LEFT JOIN product_media pi
            ON pi.product_id = p.id
           AND pi.is_primary = TRUE

        WHERE p.status = 'active'
          AND c.status = 'active'
          AND EXISTS (
              SELECT 1
              FROM listings l
              WHERE l.product_id = p.id
                AND l.status = 'active'
          )

        ORDER BY
            p.created_at DESC,
            p.id DESC

        LIMIT 10;
    `;

        const { rows } = await db.query(query);

        return rows;
    }

    /**
     * Get at most 21 product category images.
     *
     * Returns:
     * {
     *   product_id,
     *   product_title,
     *   product_image,
     *   category_id,
     *   category_title
     * }
     */
    static async getProductCategoryImages() {
        const query = `
        WITH active_products AS (
            SELECT p.id, p.title, p.family_id, p.created_at
            FROM products p
            WHERE p.status = 'active'
              AND EXISTS (
                  SELECT 1
                  FROM listings l
                  WHERE l.product_id = p.id
                    AND l.status = 'active'
              )
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT 21
        )
        SELECT
            p.id AS product_id,
            p.title AS product_title,
            pi.storage_key  AS product_image,
            c.id AS category_id,
            c.title AS category_title
        FROM active_products p
        JOIN families f ON f.id = p.family_id
        JOIN categories c ON c.id = f.category_id
        LEFT JOIN LATERAL (
            SELECT image.storage_key
            FROM product_media image
            WHERE image.product_id = p.id
              AND image.is_primary = TRUE
            ORDER BY image.created_at DESC, image.id DESC
            LIMIT 1
        ) pi ON TRUE
        ORDER BY p.created_at DESC, p.id DESC;
    `;

        const { rows } = await db.query(query);

        return rows;
    }

    /**
 * Get active landing listings, grouped by family in the result order,
 * with the lowest current price first within each family.
 */
    static async getLandingListings() {
        const query = `
            SELECT
                l.id AS listing_id,
                COALESCE(l.title, p.title) AS listing_title,
                l.description AS listing_description,
                l.condition,

                p.id AS product_id,
                p.title AS product_title,

                f.id AS family_id,
                f.title AS family_title,

                lv.id AS listing_variant_id,
                lv.sku,
                lv.options AS variant_options,

                c.id AS currency_id,
                c.code AS currency_code,
                c.symbol AS currency_symbol,

                cp.regular_price,
                cp.sale_price,
                cp.current_price,
                cp.is_on_sale,
                cp.discount_percentage,

                media.storage_key AS product_image

            FROM listings l
            JOIN products p
                ON p.id = l.product_id
            JOIN families f
                ON f.id = p.family_id
            JOIN listing_variants lv
                ON lv.listing_id = l.id

            JOIN currencies c
                ON c.is_base = TRUE
               AND c.status = 'active'

            JOIN listing_variant_current_prices cp
                ON cp.listing_variant_id = lv.id
               AND cp.currency_id = c.id

            LEFT JOIN LATERAL (
                SELECT m.storage_key
                FROM listing_variants_media m
                WHERE m.listing_variant_id = lv.id
                  AND m.media_type = 'image'
                  AND m.is_primary = TRUE
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
            ) media ON TRUE

            WHERE l.status = 'active'
              AND lv.status = 'active'
              AND p.status = 'active'

            ORDER BY
                f.title ASC,
                cp.current_price ASC,
                p.title ASC,
                lv.id
            LIMIT 100;
        `;

        const { rows } = await db.query(query);
        return rows;
    }

    /**
     * Get landing listings, ordered by family and current price ASC.
     */
    static async getLandingListingsPaginated({ page = 1, limit = 20 } = {}) {
        page = Math.max(1, Number.parseInt(page, 10) || 1);
        limit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));

        const offset = (page - 1) * limit;

        const query = `
        SELECT
            l.id AS listing_id,
            COALESCE(l.title, p.title) AS listing_title,
            
            l.condition,

            p.id AS product_id,
            p.title AS product_title,

            f.id AS family_id,
            f.title AS family_title,

            lv.id AS listing_variant_id,
            lv.sku,
            lv.options AS variant_options,

            c.id AS currency_id,
            c.code AS currency_code,
            c.symbol AS currency_symbol,

            cp.regular_price,
            
            cp.current_price,
            cp.is_on_sale,
            cp.discount_percentage,

            media.storage_key AS media_key

        FROM listings l
        JOIN products p
            ON p.id = l.product_id
        JOIN families f
            ON f.id = p.family_id
        JOIN listing_variants lv
            ON lv.listing_id = l.id

        JOIN currencies c
            ON c.is_base = TRUE
           AND c.status = 'active'

        JOIN listing_variant_current_prices cp
            ON cp.listing_variant_id = lv.id
           AND cp.currency_id = c.id

        LEFT JOIN LATERAL (
            SELECT m.storage_key
            FROM listing_variants_media m
            WHERE m.listing_variant_id = lv.id
              AND m.media_type = 'image'
              AND m.is_primary = TRUE
            ORDER BY m.created_at DESC, m.id DESC
            LIMIT 1
        ) media ON TRUE

        WHERE l.status = 'active'
          AND lv.status = 'active'
          AND p.status = 'active'

        ORDER BY
            f.title ASC,
            cp.current_price ASC,
            p.title ASC,
            lv.id

        LIMIT $1
        OFFSET $2;
    `;

        const { rows } = await db.query(query, [limit + 1, offset]);

        const hasNextPage = rows.length > limit;
        if (hasNextPage) rows.pop();

        return {
            listings: rows,
            pagination: {
                page,
                limit,
                hasNextPage,
                hasPrevPage: page > 1
            }
        };
    }
}

module.exports = MainModel;