const crypto = require('crypto');

const ProductModel = require('../models/product.model');
const ProductMediaModel = require('../models/productMedia.model');

const { convertToWebp } = require('./media.service');
const { saveProductImage } = require('./file.service');

const {
    generateImageEmbedding
} = require('./vector.service');


class ProductService {

    /**
     * Create a complete product catalog entry.
     *
     * Creates:
     * - Product
     * - Product variants
     * - Variant attribute values
     * - Product media
     *
     * @param {Object} data
     * @returns {Object}
     */
    static async createProductCatalog({
        product,
        variants = [],
        media = [],
        requestedBy
    }) {

        if (!product) {
            throw new Error('Product information is required');
        }

        if (!product.title) {
            throw new Error('Product title is required');
        }

        if (!product.family_id) {
            throw new Error('Product family is required');
        }

        if (!variants.length) {
            throw new Error('At least one product variant is required');
        }

        if (!media.length) {
            throw new Error('At least one product image is required');
        }


        // --------------------------------------------------
        // 1. Create product
        // --------------------------------------------------

        const createdProduct = await ProductModel.createProduct({
            family_id: product.family_id,
            brand_id: product.brand_id || null,
            title: product.title,
            slug: product.slug,
            description: product.description || null,
            target_gender: product.target_gender || 'not_applied',
            age_restriction: product.age_restriction || 'not_applied',
            meta: product.meta || {},
            requested_reason: product.requested_reason || null,
            requested_by: requestedBy
        });


        if (!createdProduct) {
            throw new Error('Failed to create product');
        }


        try {

            // --------------------------------------------------
            // 2. Create variants
            // --------------------------------------------------

            const createdVariants = [];

            for (const variant of variants) {

                const createdVariant =
                    await ProductModel.insertProductVariant({
                        product_id: createdProduct.id,
                        sku: variant.sku,
                        barcode: variant.barcode || null,
                        weight_grams: variant.weight_grams || null,
                        meta: variant.meta || {},
                        status: variant.status || 'available'
                    });



                if (!createdVariant) {
                    throw new Error(
                        `Failed to create variant: ${variant.sku}`
                    );
                }


                // ----------------------------------------------
                // Variant attributes
                // ----------------------------------------------

                const attributeValues =
                    Array.isArray(variant.attributes)
                        ? variant.attributes
                        : [];

                // console.log("ATTR: ", attributeValues);
                //[ { attribute_id: '5', attribute_value_id: '21' } ]

                for (const attributeValueId of attributeValues) {

                    await ProductModel.insertVariantAttributeValue({
                        variant_id: createdVariant.id,
                        attribute_value_id: attributeValueId.attribute_value_id
                    });

                }


                createdVariants.push(createdVariant);
            }


            // --------------------------------------------------
            // 3. Process product media
            // --------------------------------------------------

            const createdMedia = [];

            for (let index = 0; index < media.length; index++) {

                const item = media[index];

                if (!item.file) {
                    throw new Error(
                        `Media file is missing at position ${index}`
                    );
                }


                // ----------------------------------------------
                // Convert image to WebP
                // ----------------------------------------------

                const converted = await convertToWebp(
                    item.file.data
                );


                // ----------------------------------------------
                // Generate media ID
                // ----------------------------------------------

                const mediaId = crypto.randomUUID();

                const filename = `${mediaId}.webp`;


                // ----------------------------------------------
                // Storage path
                // ----------------------------------------------

                const storageKey =
                    `products/images/${createdProduct.id}/${filename}`;


                // ----------------------------------------------
                // Save file
                // ----------------------------------------------

                await saveProductImage(
                    converted.buffer,
                    createdProduct.id,
                    mediaId
                );


                // ----------------------------------------------
                // Save media metadata
                // ----------------------------------------------

                const created =
                    await ProductMediaModel.createMedia({
                        product_id: createdProduct.id,
                        media_type: 'image',
                        storage_key: storageKey,
                        url: null,
                        mime_type: converted.mime_type,
                        file_size: converted.size,
                        width: converted.width,
                        height: converted.height,
                        duration_seconds: null,
                        display_order:
                            item.position ?? index,
                        is_primary:
                            item.is_primary === true,
                        meta: {
                            original_name: item.file.name,
                            original_mimetype: item.file.mimetype,
                            original_size: item.file.size,
                            original_format:
                                converted.original_format
                        }
                    });


                if (!created) {
                    throw new Error(
                        `Failed to create media at position ${index}`
                    );
                }


                // ----------------------------------------------
                // Generate image embedding
                // ----------------------------------------------

                const embeddingResult =
                    await generateImageEmbedding(
                        converted.buffer
                    );

                // ----------------------------------------------
                // Save embedding
                // ----------------------------------------------

                const createdEmbedding =
                    await ProductMediaModel.createEmbedding({
                        media_id: created.id,
                        embedding: embeddingResult.embedding,
                        model: embeddingResult.model
                    });

                if (!createdEmbedding) {
                    throw new Error(
                        `Failed to create embedding for media ${created.id}`
                    );
                }

                createdMedia.push(created);
            }


            // --------------------------------------------------
            // 4. Return complete product
            // --------------------------------------------------

            return {
                product: createdProduct,
                variants: createdVariants,
                media: createdMedia
            };


        } catch (error) {

            /*
             * Product was already inserted before the failure.
             *
             * At this stage you should eventually use a DB
             * transaction + storage cleanup strategy.
             *
             * For now, remove the product so that its variants
             * and media records are also removed through CASCADE.
             */

            await ProductModel.deleteProduct(
                createdProduct.id
            );

            throw error;
        }
    }

    static async getPaginatedProductsCatalog({ limit, offset, status }) {
        return await ProductModel.getPaginatedProduct(limit, offset, status);
    }

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
    static async deepSearchProductsCatalog(queryPayload) {
        return await ProductModel.deepProductSearch(queryPayload);
    }

    static async searchProductByImage({
        file,
        limit = 100
    }) {
        if (!file || !Buffer.isBuffer(file.data)) {
            throw new Error('Product search image is required');
        }

        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(
                'Only JPEG, PNG, and WebP images are supported'
            );
        }

        // Generate an embedding for the uploaded search image.
        const embeddingResult = await generateImageEmbedding(
            file.data
        );

        // Search existing product-image embeddings.
        const products = await ProductModel.searchProductsByImage(
            embeddingResult.embedding,
            limit
        );

        return {
            data: products,
            total: products.length,
            model: embeddingResult.model
        };
    }

    static async getProductById(id) {
        return await ProductModel.getProductById(id);
    }

    static async deleteProduct(id) {
        return await ProductModel.deleteProduct(id);
    }

    static async deleteProductVariant(variantId) {
        return await ProductModel.deleteProductVariant(variantId)
    }

    static async deleteVariantAttributeValue(variantId, attributeValueId) {
        return await ProductModel.deleteVariantAttributeValue(variantId, attributeValueId);
    }

    static async deleteVariantAttributes(variantId) {
        return await ProductModel.deleteVariantAttributes(variantId);
    }

    static async getProductVariants(productId) {
        return await ProductModel.getProductVariants(productId);
    }

    static async getProductVariantOnly(productId) {
        return await ProductModel.getProductVariantsOnly(productId);
    }

    static async getVariantAttributeValues(variantId) {
        return await ProductMediaModel.getVariantAttributeValues(variantId);
    }

    static async deleteProductVariant(variantId) {
        return await ProductModel.deleteProductVariant(variantId);
    }

    static async updateProduct(productId, data) {
        return await ProductModel.updateProduct(productId, data);
    }

    static async updateProductStatus(productId, status, userId) {
        return await ProductModel.updateProductStatus(productId, status, userId);
    }

    static async updateProductVariant(variantId, data) {
        return await ProductModel.updateProductVariant(variantId, data);
    }

    static async insertVariantAttributeValue({ variant_id, attribute_value_id }) {
        return await ProductModel.insertVariantAttributeValue({ variant_id, attribute_value_id });
    }

}


module.exports = ProductService;