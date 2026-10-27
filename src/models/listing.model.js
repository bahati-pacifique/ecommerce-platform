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
}

module.exports = ListingModel;