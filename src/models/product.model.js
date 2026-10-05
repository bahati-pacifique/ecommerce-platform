const db = require('../configs/db');

class ProductModel {

    // =========================================================
    // PRODUCT
    // =========================================================

    /**
     * Create a product
     */
    static async createProduct({
        family_id,
        brand_id = null,
        title,
        slug,
        description = null,
        target_gender = 'not_applied',
        age_restriction = 'not_applied',
        meta = {},
        requested_reason = null,
        requested_by = null
    }) {

        const { rows } = await db.query(`
            INSERT INTO products (
                family_id,
                brand_id,
                title,
                slug,
                description,
                target_gender,
                age_restriction,
                meta,
                requested_reason,
                requested_by,
                requested_at
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10, NOW()
            )
            RETURNING *
        `, [
            family_id,
            brand_id,
            title,
            slug,
            description,
            target_gender,
            age_restriction,
            meta,
            requested_reason,
            requested_by
        ]);

        return rows[0] ?? null;
    }


    /**
     * Get product by ID
     */

    static async getProductById(productId) {

        const { rows } = await db.query(`
        SELECT
            p.id,
            p.family_id,
            p.brand_id,
            p.title,
            p.slug,
            p.description,
            p.target_gender,
            p.age_restriction,
            p.meta,
            p.status,
            p.requested_reason,
            u.username AS requested_by,
            p.requested_at,
            p.verified_by,
            p.verified_at,
            p.denied_reason,
            p.created_at,
            p.updated_at,

            -- Family
            f.title AS family_title,
            f.slug AS family_slug,

            -- Category
            c.id AS category_id,
            c.title AS category_title,
            c.slug AS category_slug,

            -- Brand
            b.title AS brand_title,
            b.slug AS brand_slug,
            b.logo_url AS brand_logo_url,

            -- Full image gallery
            COALESCE(
                media.images,
                '[]'::jsonb
            ) AS images,

            -- VARIANTS
            COALESCE(
                variant_data.variants,
                '[]'::jsonb
            ) AS variants,

            -- Total variants
            (
                SELECT COUNT(*)::int
                FROM product_variants pv
                WHERE pv.product_id = p.id
            ) AS total_variants,

            -- Total vendor/store listings
            (
                SELECT COUNT(*)::int
                FROM listings l
                WHERE l.product_id = p.id
            ) AS total_listings,

            -- Total distinct stores selling this product
            (
                SELECT COUNT(DISTINCT l.store_id)::int
                FROM listings l
                WHERE l.product_id = p.id
            ) AS total_stores
            

        FROM products p

        LEFT JOIN families f
            ON f.id = p.family_id

        LEFT JOIN categories c
            ON c.id = f.category_id

        LEFT JOIN brands b
            ON b.id = p.brand_id

        LEFT JOIN LATERAL (
            SELECT
                jsonb_agg(
                    jsonb_build_object(
                        'id', pm.id,
                        'storage_key', pm.storage_key,
                        'url', pm.url,
                        'mime_type', pm.mime_type,
                        'width', pm.width,
                        'height', pm.height,
                        'file_size', pm.file_size,
                        'display_order', pm.display_order,
                        'is_primary', pm.is_primary
                    )
                    ORDER BY
                        pm.is_primary DESC,
                        pm.display_order ASC,
                        pm.created_at ASC
                ) AS images

            FROM product_media pm

            WHERE pm.product_id = p.id
              AND pm.media_type = 'image'
        ) media ON TRUE

        
        LEFT JOIN LATERAL (
        SELECT
        jsonb_agg(
            jsonb_build_object(
                'id', pv.id,
                'sku', pv.sku,
                'barcode', pv.barcode,
                'weight_grams', pv.weight_grams,
                'meta', pv.meta,
                'status', pv.status,

                'attributes',
                COALESCE(
                    variant_attrs.attributes,
                    '[]'::jsonb
                )
            )
            ORDER BY pv.created_at ASC
        ) AS variants

        FROM product_variants pv

        LEFT JOIN LATERAL (
            SELECT
                jsonb_agg(
                    jsonb_build_object(
                        'attribute_value_id', av.id,
                        'attribute_id', a.id,
                        'attribute', a.title,
                        'value', av.value,
                        'meta', av.meta
                    )
                    ORDER BY
                        a.display_order ASC,
                        av.display_order ASC,
                        a.title ASC
                ) AS attributes

            FROM variant_attribute_values vav

            INNER JOIN attribute_values av
                ON av.id = vav.attribute_value_id

            INNER JOIN attributes a
                ON a.id = av.attribute_id

            WHERE vav.variant_id = pv.id
        ) variant_attrs ON TRUE

        WHERE pv.product_id = p.id
        ) variant_data ON TRUE

        LEFT JOIN users u ON u.id = p.requested_by

        WHERE p.id = $1

        LIMIT 1
    `, [productId]);

        return rows[0] ?? null;
    }


    /**
     * Get product together with its variants
     */
    static async getProductWithVariants(productId) {

        const product = await this.getProductById(productId);

        if (!product) {
            return null;
        }

        product.variants =
            await this.getProductVariants(productId);

        return product;
    }


    /**
     * Get product variants
     */
    static async getProductVariants(productId) {

        const { rows } = await db.query(`
            SELECT
                pv.*,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', av.id,
                            'attribute_id', a.id,
                            'attribute', a.title,
                            'value', av.value
                        )
                        ORDER BY a.display_order, av.value
                    ) FILTER (
                        WHERE av.id IS NOT NULL
                    ),
                    '[]'::json
                ) AS attributes

            FROM product_variants pv

            LEFT JOIN variant_attribute_values vav
                ON vav.variant_id = pv.id

            LEFT JOIN attribute_values av
                ON av.id = vav.attribute_value_id

            LEFT JOIN attributes a
                ON a.id = av.attribute_id

            WHERE pv.product_id = $1

            GROUP BY pv.id

            ORDER BY pv.created_at ASC
        `, [productId]);

        return rows;
    }


    /**
     * Search products
     *
     * Searches title, slug and description.
     */
    static async searchProductBase(searchKey) {

        const search = `%${String(searchKey).trim()}%`;

        const { rows } = await db.query(`
            SELECT
                p.*,

                f.title AS family_title,
                c.title AS category_title,
                b.title AS brand_title

            FROM products p

            LEFT JOIN families f
                ON f.id = p.family_id

            LEFT JOIN categories c
                ON c.id = f.category_id

            LEFT JOIN brands b
                ON b.id = p.brand_id

            WHERE
                p.title ILIKE $1
                OR p.slug ILIKE $1
                OR p.description ILIKE $1
                OR f.title ILIKE $1
                OR b.title ILIKE $1

            ORDER BY p.created_at DESC
        `, [search]);

        return rows;
    }

    static async searchProduct(searchKey) {

        const search = String(searchKey || '').trim();

        if (!search) {
            return [];
        }

        const { rows } = await db.query(`
        SELECT
            p.*,

            f.title AS family_title,
            f.slug AS family_slug,

            c.id AS category_id,
            c.title AS category_title,
            c.slug AS category_slug,

            b.title AS brand_title,
            b.slug AS brand_slug,

            ts_rank(
                p.search_vector,
                websearch_to_tsquery('english', $1)
            ) AS relevance

        FROM products p

        LEFT JOIN families f
            ON f.id = p.family_id

        LEFT JOIN categories c
            ON c.id = f.category_id

        LEFT JOIN brands b
            ON b.id = p.brand_id

        WHERE p.search_vector @@
            websearch_to_tsquery('english', $1)

        ORDER BY relevance DESC, p.created_at DESC
    `, [search]);

        return rows;
    }

    // static async deepProductSearch(searchKey) {

    //     const search = String(searchKey || '').trim();

    //     if (!search) {
    //         return [];
    //     }

    //     const { rows } = await db.query(`
    //     SELECT
    //         p.*,

    //         f.title AS family_title,
    //         f.slug AS family_slug,

    //         c.id AS category_id,
    //         c.title AS category_title,
    //         c.slug AS category_slug,

    //         b.title AS brand_title,
    //         b.slug AS brand_slug,

    //         (
    //             ts_rank(
    //                 p.search_vector,
    //                 websearch_to_tsquery('english', $1)
    //             )
    //         ) AS relevance

    //     FROM products p

    //     LEFT JOIN families f
    //         ON f.id = p.family_id

    //     LEFT JOIN categories c
    //         ON c.id = f.category_id

    //     LEFT JOIN brands b
    //         ON b.id = p.brand_id

    //     WHERE
    //         p.search_vector @@
    //             websearch_to_tsquery('english', $1)

    //         OR c.title ILIKE '%' || $1 || '%'
    //         OR c.slug ILIKE '%' || $1 || '%'

    //         OR f.title ILIKE '%' || $1 || '%'
    //         OR f.slug ILIKE '%' || $1 || '%'

    //         OR b.title ILIKE '%' || $1 || '%'
    //         OR b.slug ILIKE '%' || $1 || '%'

    //     ORDER BY
    //         relevance DESC,
    //         p.created_at DESC
    // `, [search]);

    //     return rows;
    // }



    /**
     * Performs an advanced, deep text search across the product catalog.
     * 
     * @param {Object} queryPayload - The search filter configuration.
     * @param {string} queryPayload.searchKey - The search term or keyword.
     * @param {number} queryPayload.limit - The maximum number of products to return.
     * @param {number} queryPayload.offset - The number of products to skip for pagination.
     * @param {string} queryPayload.status - The product status filter (e.g., 'active', 'archived').
     * @returns {Promise<Object[]>} A promise that resolves to an array of product objects.
     */
    static async deepProductSearch({
        searchKey,
        limit = 100,
        offset = 0,
        status = null
    }) {
        const search = String(searchKey || '').trim();

        limit = Math.max(1, Math.min(100, Number(limit) || 10));
        offset = Math.max(0, Number(offset) || 0);

        if (!search) {
            return {
                data: [],
                total: 0,
                limit,
                offset
            };
        }

        const query = `
        WITH matched_products AS (
            SELECT
                p.id,
                p.title,
                p.slug,
                p.created_at,
                f.title AS family_title,
                f.slug AS family_slug,

                c.id AS category_id,
                c.title AS category_title,
                c.slug AS category_slug,

                b.title AS brand_title,
                b.slug AS brand_slug,
                ts_rank(
                    p.search_vector,
                    websearch_to_tsquery('english', $1)
                ) AS relevance
            FROM products p
            LEFT JOIN families f
                ON f.id = p.family_id
            LEFT JOIN categories c
                ON c.id = f.category_id
            LEFT JOIN brands b
                ON b.id = p.brand_id
            WHERE
                ($4::product_status IS NULL OR p.status = $4)
                AND (
                    p.search_vector @@ websearch_to_tsquery('english', $1)
                    OR p.title ILIKE '%' || $1 || '%'
                    OR p.description ILIKE '%' || $1 || '%'
                    OR c.title ILIKE '%' || $1 || '%'
                    OR c.slug ILIKE '%' || $1 || '%'
                    OR f.title ILIKE '%' || $1 || '%'
                    OR f.slug ILIKE '%' || $1 || '%'
                    OR b.title ILIKE '%' || $1 || '%'
                    OR b.slug ILIKE '%' || $1 || '%'
                )
        )
        SELECT
        mp.id,
        mp.title,
        mp.slug,
        mp.category_id,
        mp.category_title,
        mp.category_slug,
        mp.family_title,
        mp.family_slug,
        mp.brand_title,
        mp.brand_slug,
        pm.storage_key AS primary_image,
        COUNT(*) OVER()::int AS total
        FROM matched_products mp
        LEFT JOIN product_media pm
        ON pm.product_id = mp.id
        AND pm.is_primary = TRUE
        AND pm.media_type = 'image'
        ORDER BY
        mp.relevance DESC,
        mp.created_at DESC,
        mp.id DESC
        LIMIT $2
        OFFSET $3
    `;

        const { rows } = await db.query(query, [
            search,
            limit,
            offset,
            status
        ]);

        return {
            data: rows.map(({ total, ...product }) => product),
            total: rows.length ? rows[0].total : 0,
            limit,
            offset
        };
    }


    /**
     * Paginated products
     */
    static async getPaginatedProduct(
        limit = 10,
        offset = 0,
        status = null
    ) {

        limit = Math.max(1, Number(limit));
        offset = Math.max(0, Number(offset));

        const conditions = [];
        const values = [];

        if (status) {
            values.push(status);

            conditions.push(
                `p.status = $${values.length}`
            );
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const limitParam = values.length + 1;
        const offsetParam = values.length + 2;

        values.push(limit);
        values.push(offset);

        const countValues = values.slice(0, -2);

        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM products p
            ${whereClause}
        `;

        const dataQuery = `
            SELECT
                p.id,
                p.family_id,
                p.brand_id,
                p.title,
                p.slug,
                p.status,

                f.title AS family_title,
                f.slug AS family_slug,

                c.id AS category_id,
                c.title AS category_title,
                c.slug AS category_slug,

                b.title AS brand_title,
                b.slug AS brand_slug,

                pm.storage_key AS primary_image

            FROM products p

            LEFT JOIN families f
                ON f.id = p.family_id

            LEFT JOIN categories c
                ON c.id = f.category_id

            LEFT JOIN brands b
                ON b.id = p.brand_id

            LEFT JOIN product_media pm
                ON pm.product_id = p.id
                AND pm.is_primary = TRUE
                AND pm.media_type = 'image'

            ${whereClause}

            ORDER BY p.created_at DESC, p.id DESC

            LIMIT $${limitParam}
            OFFSET $${offsetParam}
        `;

        const [countResult, dataResult] =
            await Promise.all([
                db.query(
                    countQuery,
                    countValues
                ),
                db.query(
                    dataQuery,
                    values
                )
            ]);


        const currentPage = Math.floor(offset / limit) + 1;
        const totalPages = Math.ceil(countResult.rows[0].total / limit);

        return {
            data: dataResult.rows,
            pagination: {
                total: countResult.rows[0].total,
                limit,
                offset,
                currentPage,
                totalPages,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1
            }
        };
    }


    // =========================================================
    // PRODUCT VARIANTS
    // =========================================================

    /**
     * Insert a product variant
     */
    static async insertProductVariant({
        product_id,
        sku,
        barcode = null,
        weight_grams = null,
        meta = {},
        status = 'available'
    }) {

        const { rows } = await db.query(`
            INSERT INTO product_variants (
                product_id,
                sku,
                barcode,
                weight_grams,
                meta,
                status
            )
            VALUES (
                $1, $2, $3, $4, $5, $6
            )
            RETURNING *
        `, [
            product_id,
            sku,
            barcode,
            weight_grams,
            meta,
            status
        ]);

        return rows[0] ?? null;
    }


    /**
     * Get variant by ID
     */
    static async getProductVariantById(variantId) {

        const { rows } = await db.query(`
            SELECT
                pv.*,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', av.id,
                            'attribute_id', a.id,
                            'attribute', a.title,
                            'value', av.value
                        )
                        ORDER BY a.display_order, av.value
                    ) FILTER (
                        WHERE av.id IS NOT NULL
                    ),
                    '[]'::json
                ) AS attributes

            FROM product_variants pv

            LEFT JOIN variant_attribute_values vav
                ON vav.variant_id = pv.id

            LEFT JOIN attribute_values av
                ON av.id = vav.attribute_value_id

            LEFT JOIN attributes a
                ON a.id = av.attribute_id

            WHERE pv.id = $1

            GROUP BY pv.id
        `, [variantId]);

        return rows[0] ?? null;
    }


    /**
     * Get variants by product
     */
    static async getProductVariantsOnly(productId) {

        const { rows } = await db.query(`
            SELECT *
            FROM product_variants
            WHERE product_id = $1
            ORDER BY created_at ASC
        `, [productId]);

        return rows;
    }


    /**
     * Update variant
     */
    static async updateProductVariant(
        variantId,
        {
            sku,
            barcode,
            weight_grams,
            meta,
            status
        }
    ) {

        const fields = [];
        const values = [];

        if (sku !== undefined) {
            values.push(sku);
            fields.push(`sku = $${values.length}`);
        }

        if (barcode !== undefined) {
            values.push(barcode);
            fields.push(`barcode = $${values.length}`);
        }

        if (weight_grams !== undefined) {
            values.push(weight_grams);
            fields.push(`weight_grams = $${values.length}`);
        }

        if (meta !== undefined) {
            values.push(meta);
            fields.push(`meta = $${values.length}`);
        }

        if (status !== undefined) {
            values.push(status);
            fields.push(`status = $${values.length}`);
        }

        if (!fields.length) {
            return this.getProductVariantById(
                variantId
            );
        }

        values.push(variantId);

        const { rows } = await db.query(`
            UPDATE product_variants
            SET
                ${fields.join(', ')},
                updated_at = NOW()
            WHERE id = $${values.length}
            RETURNING *
        `, values);

        return rows[0] ?? null;
    }


    // =========================================================
    // VARIANT ATTRIBUTES
    // =========================================================

    /**
     * Insert attribute value for variant
     */
    static async insertVariantAttributeValue({
        variant_id,
        attribute_value_id
    }) {

        const { rows } = await db.query(`
            INSERT INTO variant_attribute_values (
                variant_id,
                attribute_value_id
            )
            VALUES ($1, $2)
            RETURNING *
        `, [
            variant_id,
            attribute_value_id
        ]);

        return rows[0] ?? null;
    }


    /**
     * Get variant attribute values
     */
    static async getVariantAttributeValues(
        variantId
    ) {

        const { rows } = await db.query(`
            SELECT
                vav.id,

                av.id AS attribute_value_id,
                av.value,

                a.id AS attribute_id,
                a.title AS attribute

            FROM variant_attribute_values vav

            JOIN attribute_values av
                ON av.id = vav.attribute_value_id

            JOIN attributes a
                ON a.id = av.attribute_id

            WHERE vav.variant_id = $1

            ORDER BY
                a.display_order,
                a.title,
                av.value
        `, [variantId]);

        return rows;
    }


    /**
     * Remove attribute value from variant
     */
    static async deleteVariantAttributeValue(
        variantId,
        attributeValueId
    ) {

        const { rows } = await db.query(`
            DELETE FROM variant_attribute_values
            WHERE
                variant_id = $1
                AND attribute_value_id = $2
            RETURNING *
        `, [
            variantId,
            attributeValueId
        ]);

        return rows[0] ?? null;
    }


    /**
     * Remove all attributes from variant
     */
    static async deleteVariantAttributes(
        variantId
    ) {

        const { rowCount } = await db.query(`
            DELETE FROM variant_attribute_values
            WHERE variant_id = $1
        `, [variantId]);

        return rowCount;
    }


    // =========================================================
    // PRODUCT STATUS
    // =========================================================

    /**
     * Update product status
     */
    static async updateProductStatus(
        productId,
        status,
        userId = null
    ) {

        const values = [
            status,
            productId
        ];

        let verifiedFields = '';

        /*
         * When product becomes verified,
         * record who verified it and when.
         */
        if (status === 'verified') {

            values.push(userId);

            verifiedFields = `
                verified_by = $3,
                verified_at = NOW(),
            `;
        }

        const { rows } = await db.query(`
            UPDATE products
            SET
                status = $1,
                ${verifiedFields}
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, values);

        return rows[0] ?? null;
    }


    /**
     * Deny product
     */
    static async denyProduct(
        productId,
        reason,
        userId = null
    ) {

        const { rows } = await db.query(`
            UPDATE products
            SET
                status = 'denied',
                denied_reason = $1,
                verified_by = $2,
                verified_at = NOW(),
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [
            reason,
            userId,
            productId
        ]);

        return rows[0] ?? null;
    }


    // =========================================================
    // PRODUCT UPDATE
    // =========================================================

    /**
     * Update product
     */
    static async updateProduct(
        productId,
        {
            family_id,
            brand_id,
            title,
            slug,
            description,
            target_gender,
            age_restriction,
            meta
        }
    ) {

        const fields = [];
        const values = [];

        if (family_id !== undefined) {
            values.push(family_id);
            fields.push(
                `family_id = $${values.length}`
            );
        }

        if (brand_id !== undefined) {
            values.push(brand_id);
            fields.push(
                `brand_id = $${values.length}`
            );
        }

        if (title !== undefined) {
            values.push(title);
            fields.push(
                `title = $${values.length}`
            );
        }

        if (slug !== undefined) {
            values.push(slug);
            fields.push(
                `slug = $${values.length}`
            );
        }

        if (description !== undefined) {
            values.push(description);
            fields.push(
                `description = $${values.length}`
            );
        }

        if (target_gender !== undefined) {
            values.push(target_gender);
            fields.push(
                `target_gender = $${values.length}`
            );
        }

        if (age_restriction !== undefined) {
            values.push(age_restriction);
            fields.push(
                `age_restriction = $${values.length}`
            );
        }

        if (meta !== undefined) {
            values.push(meta);
            fields.push(
                `meta = $${values.length}`
            );
        }

        if (!fields.length) {
            return this.getProductById(productId);
        }

        values.push(productId);

        const { rows } = await db.query(`
            UPDATE products
            SET
                ${fields.join(', ')},
                updated_at = NOW()
            WHERE id = $${values.length}
            RETURNING *
        `, values);

        return rows[0] ?? null;
    }


    // =========================================================
    // DELETE
    // =========================================================

    /**
     * Delete product
     *
     * Variants and variant attribute values will be deleted
     * automatically because of ON DELETE CASCADE.
     */
    static async deleteProduct(productId) {

        const { rows } = await db.query(`
            DELETE FROM products
            WHERE id = $1
            RETURNING *
        `, [productId]);

        return rows[0] ?? null;
    }


    /**
     * Delete product variant
     *
     * Variant attribute values will be deleted automatically.
     */
    static async deleteProductVariant(variantId) {

        const { rows } = await db.query(`
            DELETE FROM product_variants
            WHERE id = $1
            RETURNING *
        `, [variantId]);

        return rows[0] ?? null;
    }


    // static async searchProductsByImage(
    //     embedding,
    //     limit = 20
    // ) {

    //     if (
    //         !Array.isArray(embedding) ||
    //         embedding.length !== 512 ||
    //         !embedding.every(Number.isFinite)
    //     ) {
    //         throw new Error(
    //             'A valid 512-dimensional embedding is required'
    //         );
    //     }

    //     limit = Math.min(
    //         100,
    //         Math.max(1, Number(limit) || 20)
    //     );

    //     const vector = `[${embedding.join(',')}]`;

    //     const { rows } = await db.query(`
    //     SELECT
    //         p.id,
    //         p.title,
    //         p.slug,

    //         b.title AS brand_title,

    //         primary_media.storage_key
    //             AS primary_image,

    //         MIN(
    //             pme.embedding <=> $1::vector
    //         ) AS distance,

    //         1 - MIN(
    //             pme.embedding <=> $1::vector
    //         ) AS similarity

    //     FROM product_media_embeddings pme

    //     INNER JOIN product_media pm
    //         ON pm.id = pme.media_id

    //     INNER JOIN products p
    //         ON p.id = pm.product_id

    //     LEFT JOIN brands b
    //         ON b.id = p.brand_id

    //     LEFT JOIN LATERAL (
    //         SELECT pm2.storage_key
    //         FROM product_media pm2
    //         WHERE pm2.product_id = p.id
    //           AND pm2.media_type = 'image'
    //           AND pm2.is_primary = TRUE
    //         LIMIT 1
    //     ) primary_media ON TRUE

    //     WHERE p.status = 'active'
    //       AND pme.model = 'ViT-B/32'

    //     GROUP BY
    //         p.id,
    //         p.title,
    //         p.slug,
    //         b.title,
    //         primary_media.storage_key

    //     ORDER BY
    //         MIN(pme.embedding <=> $1::vector) ASC

    //     LIMIT $2
    // `, [vector, limit]);

    //     return rows;
    // }

    static async searchProductsByImage(
        embedding,
        limit = 20,
        status = null,
        minSimilarity = 0.70
    ) {
        if (
            !Array.isArray(embedding) ||
            embedding.length !== 512 ||
            !embedding.every(Number.isFinite)
        ) {
            throw new Error(
                'A valid 512-dimensional embedding is required'
            );
        }

        limit = Math.min(
            100,
            Math.max(1, Number(limit) || 20)
        );

        if (
            minSimilarity !== null &&
            (!Number.isFinite(Number(minSimilarity)) ||
                Number(minSimilarity) < -1 ||
                Number(minSimilarity) > 1)
        ) {
            throw new Error(
                'minSimilarity must be between -1 and 1, or null'
            );
        }

        const vector = `[${embedding.join(',')}]`;

        const { rows } = await db.query(`
        WITH product_matches AS (
            SELECT
                p.id,
                p.title,
                p.slug,
                p.status,
                b.title AS brand_title,

                MIN(pme.embedding <=> $1::vector) AS distance

            FROM product_media_embeddings pme

            INNER JOIN product_media pm
                ON pm.id = pme.media_id

            INNER JOIN products p
                ON p.id = pm.product_id

            LEFT JOIN brands b
                ON b.id = p.brand_id

            WHERE
                ($3::product_status IS NULL OR p.status = $3)
                AND pme.model = 'ViT-B/32'
                AND pm.media_type = 'image'

            GROUP BY
                p.id,
                p.title,
                p.slug,
                p.status,
                b.title
        )
        SELECT
            matches.id,
            matches.title,
            matches.slug,
            matches.status,
            matches.brand_title,
            primary_media.storage_key AS primary_image,
            matches.distance,
            1 - matches.distance AS similarity

        FROM product_matches matches

        LEFT JOIN LATERAL (
            SELECT pm2.storage_key
            FROM product_media pm2
            WHERE pm2.product_id = matches.id
              AND pm2.media_type = 'image'
              AND pm2.is_primary = TRUE
            LIMIT 1
        ) primary_media ON TRUE

        WHERE
            $4::double precision IS NULL
            OR 1 - matches.distance >= $4

        ORDER BY
            matches.distance ASC,
            matches.id ASC

        LIMIT $2
    `, [
            vector,
            limit,
            status,
            minSimilarity
        ]);

        return rows;
    }


}

module.exports = ProductModel;