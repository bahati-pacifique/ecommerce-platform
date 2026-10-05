const db = require('../configs/db');

class ProductMediaModel {

    /**
     * Insert product media
     */
    static async createMedia({
        product_id,
        media_type,
        storage_key,
        url = null,
        mime_type = null,
        file_size = null,
        width = null,
        height = null,
        duration_seconds = null,
        display_order = 0,
        is_primary = false,
        meta = {}
    }) {
        const { rows } = await db.query(`
            INSERT INTO product_media (
                product_id,
                media_type,
                storage_key,
                url,
                mime_type,
                file_size,
                width,
                height,
                duration_seconds,
                display_order,
                is_primary,
                meta
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12
            )
            RETURNING *
        `, [
            product_id,
            media_type,
            storage_key,
            url,
            mime_type,
            file_size,
            width,
            height,
            duration_seconds,
            display_order,
            is_primary,
            meta
        ]);

        return rows[0] ?? null;
    }


    /**
     * Get media by ID
     */
    static async getMediaById(mediaId) {
        const { rows } = await db.query(`
            SELECT *
            FROM product_media
            WHERE id = $1
            LIMIT 1
        `, [mediaId]);

        return rows[0] ?? null;
    }


    /**
     * Get all media belonging to a product
     */
    static async getProductMedia(productId) {
        const { rows } = await db.query(`
            SELECT *
            FROM product_media
            WHERE product_id = $1
            ORDER BY display_order ASC, created_at ASC
        `, [productId]);

        return rows;
    }


    /**
     * Get primary image
     */
    static async getPrimaryImage(productId) {
        const { rows } = await db.query(`
            SELECT *
            FROM product_media
            WHERE product_id = $1
              AND media_type = 'image'
              AND is_primary = TRUE
            LIMIT 1
        `, [productId]);

        return rows[0] ?? null;
    }


    /**
     * Update media
     */
    static async updateMedia(
        mediaId,
        {
            storage_key,
            url,
            mime_type,
            file_size,
            width,
            height,
            duration_seconds,
            display_order,
            is_primary,
            meta
        }
    ) {
        const { rows } = await db.query(`
            UPDATE product_media
            SET
                storage_key = COALESCE($2, storage_key),
                url = COALESCE($3, url),
                mime_type = COALESCE($4, mime_type),
                file_size = COALESCE($5, file_size),
                width = COALESCE($6, width),
                height = COALESCE($7, height),
                duration_seconds = COALESCE($8, duration_seconds),
                display_order = COALESCE($9, display_order),
                is_primary = COALESCE($10, is_primary),
                meta = COALESCE($11, meta),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [
            mediaId,
            storage_key,
            url,
            mime_type,
            file_size,
            width,
            height,
            duration_seconds,
            display_order,
            is_primary,
            meta
        ]);

        return rows[0] ?? null;
    }


    /**
     * Set a media item as the product's primary image
     */
    static async setPrimaryImage(productId, mediaId) {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            // Remove current primary image
            await client.query(`
                UPDATE product_media
                SET
                    is_primary = FALSE,
                    updated_at = NOW()
                WHERE product_id = $1
                  AND media_type = 'image'
                  AND is_primary = TRUE
            `, [productId]);

            // Set requested image as primary
            const { rows } = await client.query(`
                UPDATE product_media
                SET
                    is_primary = TRUE,
                    updated_at = NOW()
                WHERE id = $1
                  AND product_id = $2
                  AND media_type = 'image'
                RETURNING *
            `, [mediaId, productId]);

            await client.query('COMMIT');

            return rows[0] ?? null;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;

        } finally {
            client.release();
        }
    }


    /**
     * Delete media
     */
    static async deleteMedia(mediaId) {
        const { rows } = await db.query(`
            DELETE FROM product_media
            WHERE id = $1
            RETURNING *
        `, [mediaId]);

        return rows[0] ?? null;
    }


    /**
     * Delete all media belonging to a product
     */
    static async deleteProductMedia(productId) {
        const { rows } = await db.query(`
            DELETE FROM product_media
            WHERE product_id = $1
            RETURNING *
        `, [productId]);

        return rows;
    }

    /**
     * Insert or update an embedding for media.
     */
    static async createEmbedding({
        media_id,
        embedding,
        model
    }) {
        const { rows } = await db.query(`
            INSERT INTO product_media_embeddings (
                media_id,
                embedding,
                model
            )
            VALUES ($1, $2, $3)
            ON CONFLICT (media_id, model)
            DO UPDATE SET
                embedding = EXCLUDED.embedding,
                created_at = NOW()
            RETURNING *
        `, [
            media_id,
            `[${embedding.join(',')}]`,
            model
        ]);

        return rows[0] ?? null;
    }


    /**
     * Get embedding by media ID and model.
     */
    static async getEmbedding(mediaId, model = null) {

        const query = model
            ? `
                SELECT *
                FROM product_media_embeddings
                WHERE media_id = $1
                  AND model = $2
                LIMIT 1
            `
            : `
                SELECT *
                FROM product_media_embeddings
                WHERE media_id = $1
                LIMIT 1
            `;

        const params = model
            ? [mediaId, model]
            : [mediaId];

        const { rows } = await db.query(query, params);

        return rows[0] ?? null;
    }


    /**
     * Delete embedding.
     */
    static async deleteEmbedding(mediaId, model = null) {

        const query = model
            ? `
                DELETE FROM product_media_embeddings
                WHERE media_id = $1
                  AND model = $2
                RETURNING *
            `
            : `
                DELETE FROM product_media_embeddings
                WHERE media_id = $1
                RETURNING *
            `;

        const params = model
            ? [mediaId, model]
            : [mediaId];

        const { rows } = await db.query(query, params);

        return rows;
    }


    /**
     * Find visually similar media.
     */
    static async findSimilarMedia({
        embedding,
        model,
        limit = 20
    }) {
        const { rows } = await db.query(`
            SELECT
                pme.id,
                pme.media_id,
                pme.model,
                pm.product_id,
                pm.storage_key,
                pm.url,
                pm.display_order,
                1 - (
                    pme.embedding <=> $1::vector
                ) AS similarity
            FROM product_media_embeddings pme
            INNER JOIN product_media pm
                ON pm.id = pme.media_id
            WHERE pme.model = $2
            ORDER BY pme.embedding <=> $1::vector
            LIMIT $3
        `, [
            `[${embedding.join(',')}]`,
            model,
            limit
        ]);

        return rows;
    }
}

module.exports = ProductMediaModel;