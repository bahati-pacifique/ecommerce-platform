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
}

module.exports = MainModel;