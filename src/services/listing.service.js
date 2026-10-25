const ListingModel = require('../models/listing.model');
const { convertToWebp } = require('./media.service');
const listingMediaModel = require('../models/listingMedia.model');
const db = require('../configs/db');
const { saveListingImage,saveListingVideo, removeFile } = require('./file.service');
const {insertListingVariantMedia, deleteVariantListingMedia} = require('../models/listingMedia.model');

class ListingServices {

    static async searchListingByStore(storeId, query, opts) {
        return await ListingModel.searchListingByStore(storeId, query, opts);
    }

    static async createListing({
        listing,
        variants = [],
        imagesByIndex = {},
        video = null,
        vendorId
    }) {
        if (!vendorId) {
            const error = new Error('Vendor account required');
            error.statusCode = 403;
            throw error;
        }

        if (!listing || !Array.isArray(variants) || !variants.length) {
            const error = new Error(
                'Listing information and at least one variant are required'
            );
            error.statusCode = 422;
            throw error;
        }

        const client = await db.connect();
        const savedFiles = [];

        let transactionStarted = false;

        try {
            await client.query('BEGIN');
            transactionStarted = true;

            // ----------------------------------------------
            // 1. Verify store ownership
            // ----------------------------------------------

            // const store = await ListingModel.getStoreForVendor(
            //     client,
            //     listing.store_id,
            //     vendorId
            // );

            // if (!store) {
            //     const error = new Error(
            //         'Store not found or does not belong to this vendor'
            //     );
            //     error.statusCode = 403;
            //     throw error;
            // }

            // ----------------------------------------------
            // 2. Verify catalog product
            // ----------------------------------------------

            // const product = await ListingModel.getProduct(
            //     client,
            //     listing.product_id
            // );

            // if (!product) {
            //     const error = new Error('Catalog product not found');
            //     error.statusCode = 404;
            //     throw error;
            // }

            // ----------------------------------------------
            // 3. Insert listing
            // ----------------------------------------------

            const createdListing = await ListingModel.insertListing(
                client,
                listing
            );

            if (!createdListing) {
                throw new Error('Failed to create listing');
            }

            const createdVariants = [];
            const createdMedia = [];

            // ----------------------------------------------
            // 4. Insert variants and initial prices
            // ----------------------------------------------

            for (let i = 0; i < variants.length; i++) {
                const variant = variants[i];

                // const catalogVariant =
                //     await ListingModel.getProductVariant(
                //         client,
                //         variant.catalog_variant_id,
                //         listing.product_id
                //     );

                // if (!catalogVariant) {
                //     const error = new Error(
                //         `Variant at index ${i} does not belong to this product`
                //     );
                //     error.statusCode = 422;
                //     throw error;
                // }

                const currency = await ListingModel.getBaseCurrency(
                    client
                );

                // if (!currency) {
                //     const error = new Error(
                //         `Invalid currency for variant at index ${i}`
                //     );
                //     error.statusCode = 422;
                //     throw error;
                // }

                const createdVariant =
                    await ListingModel.insertListingVariant(client, {
                        listing_id: createdListing.id,
                        product_variant_id: variant.catalog_variant_id,
                        sku: variant.sku.trim(),
                        options: variant.options ?? {},
                        status: variant.status ?? 'active'
                    });

                if (!createdVariant) {
                    throw new Error(
                        `Failed to create listing variant: ${variant.sku}`
                    );
                }

                const createdPrice =
                    await ListingModel.insertListingPrice(client, {
                        listing_variant_id: createdVariant.id,
                        currency_id: currency.id,
                        price: variant.price
                    });

                createdVariants.push({
                    ...createdVariant,
                    price: createdPrice
                });
            }

            // ----------------------------------------------
            // 5. Save variant images as WebP
            // ----------------------------------------------

            for (const [indexString, files] of Object.entries(
                imagesByIndex
            )) {
                const index = Number(indexString);

                if (
                    !Number.isInteger(index) ||
                    index < 0 ||
                    index >= createdVariants.length
                ) {
                    const error = new Error(
                        `Invalid variant index for images: ${indexString}`
                    );
                    error.statusCode = 422;
                    throw error;
                }

                const variant = createdVariants[index];

                for (let position = 0; position < files.length; position++) {
                    const file = files[position];

                    const converted = await convertToWebp(file.data);
                    const mediaId = crypto.randomUUID();

                    const storageKey =
                        `listings/images/${variant.id}/${mediaId}.webp`;

                    const listingMediaSaveResult = await saveListingImage(
                        converted.buffer,
                        variant.id,
                        mediaId
                    );

                    savedFiles.push(listingMediaSaveResult.storageKey);

                    
                    const media = await insertListingVariantMedia(
                        client,
                        {
                            listing_variant_id: variant.id,
                            media_type: 'image',
                            storage_key: storageKey,
                            mime_type: converted.mime_type,
                            file_size: converted.size,
                            width: converted.width,
                            height: converted.height,
                            display_order: position,
                            is_primary: position === 0,
                            meta: {
                                original_name: file.name,
                                original_mimetype: file.mimetype,
                                original_size: file.size,
                                original_format: converted.original_format
                            }
                        }
                    );

                    if (!media) {
                        throw new Error(
                            `Failed to save image metadata for variant ${index}`
                        );
                    }

                    createdMedia.push(media);
                }
            }

            // ----------------------------------------------
            // 6. Save listing video separately as MP4
            // ----------------------------------------------

            if (video) {
                const storageKey =
                    `listings/videos/${createdListing.id}.mp4`;

                // Preserve the original video bytes.
                await saveListingVideo(
                    video.data,
                    createdListing.id
                );

                savedFiles.push(storageKey);
            }

            // ----------------------------------------------
            // 7. Commit transaction
            // ----------------------------------------------

            await client.query('COMMIT');
            transactionStarted = false;

            return {
                listing: createdListing,
                variants: createdVariants,
                media: createdMedia,
                video: video
                    ? `listings/videos/${createdListing.id}.mp4`
                    : null
            };

        } catch (error) {
            if (transactionStarted) {
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error(
                        '[ListingService] Rollback failed:',
                        rollbackError
                    );
                }
            }

            // Files are external to the SQL transaction.
            // Clean them up if any operation failed.
            for (const storageKey of savedFiles.reverse()) {
                try {
                    await removeFile(storageKey);
                } catch (cleanupError) {
                    console.error(
                        '[ListingService] File cleanup failed:',
                        storageKey,
                        cleanupError
                    );
                }
            }

            throw error;

        } finally {
            client.release();
        }
    }

}

module.exports = ListingServices;