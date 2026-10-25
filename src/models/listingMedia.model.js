const db = require('../configs/db');

class ListingMedia {
    static async insertListingVariantMedia(client, {
        listing_variant_id,
        media_type = 'image',
        storage_key,
        mime_type,
        file_size,
        width = null,
        height = null,
        duration_seconds = null,
        display_order = 0,
        is_primary = false,
        meta = {}
    }) {
        const dbInstance = client || db;
        const { rows } = await dbInstance.query(
            `
            INSERT INTO listing_variants_media (
                listing_variant_id,
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
                $1, $2, $3, NULL, $4, $5,
                $6, $7, $8, $9, $10, $11::jsonb
            )
            RETURNING *
            `,
            [
                listing_variant_id,
                media_type,
                storage_key,
                mime_type,
                file_size,
                width,
                height,
                duration_seconds,
                display_order,
                is_primary,
                JSON.stringify(meta)
            ]
        );

        return rows[0] ?? null;
    }

    static async deleteVariantListingMedia(variantId){
        const { rows } = await db.query(`
            DELETE FROM listing_variants_media
            WHERE listing_variant_id = $1
            RETURNING *
        `, [variantId]);

        return rows;
    }

}

module.exports = ListingMedia;