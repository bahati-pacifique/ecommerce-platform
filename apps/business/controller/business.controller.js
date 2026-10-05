const { acceptsHtml } = require('../../../util/helpers');
const VendorService = require('../../../src/services/vendor.services');
const StoreService = require('../../../src/services/store.services');

const qs = require('qs');
const ProductService = require('../../../src/services/product.service');

const { clearAuthentication } = require('../../../util/helpers')

const isProduction = process.env.NODE_ENV === 'production';

const sslUrlPrefix = isProduction ? 'https://' : 'http://';

const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

const domain = `${sslUrlPrefix}business.${process.env.DOMAIN}${portSuffix}`;
const authDomain = `${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}?r=${domain}/dashboard`;

const protocal = sslUrlPrefix;
const domainName = `${process.env.DOMAIN}${portSuffix}`;

async function businessHomePage(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Welcome to COCOCE business"
        })
    }

    return res.render('business', { message: "Welcome to COCOCE business", user, authDomain, domain, protocal, domainName });
}

async function businessVendorPricing(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Welcome to COCOCE business"
        })
    }

    return res.render('vendor_pricing', { message: "", user, authDomain, domain });
}

async function renderVendorCreation(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            ...(user && { user }),
            domain,
            authDomain,
            message: "Join hundreds of happy vendors"
        })
    }

    return res.render('business-registration', { message: "Join hundreds of happy vendors", domain, domainName, protocal, authDomain, ...(user && { user }) });
}

async function renderApplicationConfirmation(req, res) {
    const user = req.user || null;

    return res.render('business-application-confirmation', user);
}

function redirectedToDashboard(req, res) {

    const user = req.user;

    const vendorId = user?.vendor?.id;

    if (!vendorId) {
        clearAuthentication(res);
        req.session.message = 'Please login to continue';
        return res.redirect(`${protocal}auth.${domainName}?r=${protocal}business.${domainName}/dashboard`)
    }

    if (acceptsHtml(req)) {
        res.redirect(`/${vendorId.replaceAll('-', '')}/dashboard`)
    }
}

async function renderAttributeRegistryTerms(req, res) {
    const user = req.user;

    res.render('attribute-registry-terms', { protocal, domainName, user });
}

async function renderDashboard(req, res) {
    const user = req.user || null;

    const vendorParam = req.params.vendor;

    if (!user || !user.vendor) {
        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    if (String(user.vendor.id).replaceAll('-', '') !== String(vendorParam)) {
        //TODO log activity
        //User attempt to access page without owning or having the vendor id stated
        console.log(`User attempt to access page without owning or having the vendor id stated from ip Add. ${req.ip}`)
        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Join hundreds of happy vendors"
        })
    }

    //Update lastActive
    try {
        await VendorService.updateLastActive(user.vendor.id);
    } catch (error) {
        console.log('updating vendor last active:', error)
    }

    return res.render('business-dashboard',
        {
            user,
            protocal,
            domainName
        });
}

async function renderApplicationReview(req, res) {

    const identifier = req.params.identifier;

    if (identifier) {
        req.session.applicationIdentifier = identifier;
        return res.redirect('/applications/')
    }

    const applicationIdentifier = req.session.applicationIdentifier || '';
    return res.render('business-application-review', { protocal, domainName, applicationIdentifier });
}

async function renderStoreCreation(req, res) {
    const user = req.user;
    const vendorParamId = req.params.vendorId;

    if (!user || !user.vendor) {
        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    if (String(user.vendor.id).replaceAll('-', '') !== String(vendorParamId)) {
        //TODO log activity
        //User attempt to access page without owning or having the vendor id stated

        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    //const vendor = await VendorService.getVendorByUserId(user.userId || user.user_id || user.id, { includeUser: false });
    return res.render('store-creation', { user, protocal, domainName });
}

async function renderTerms(req, res) {
    const user = req.user;
    return res.render('store-terms', { user, protocal, domainName });
}

async function renderStoreDashboard(req, res) {
    const user = req.user;
    return res.render('store-dashboard', { user, protocal, domainName });
}

async function renderInvontoryForm(req, res) {
    const vendorId = req.params.vendor;

    const user = req.user;

    if (user.vendor?.id.replaceAll('-', '') !== vendorId) {
        //Invalid session and id
        return res.redirect('/');
    }

    const { stores } = await StoreService.getPaginatedStoresByVendorId(user.vendor.id);

    return res.render('inventory-form', { user, protocal, domainName, stores });
}

async function getVendorOrderDashboard(req, res) {
    try {
        const vendorId = req.user.vendor.id;

        const { period } = req.query;

        if (!vendorId) return res.status(401).json({ message: 'Not authenticated' });

        const result = await VendorService.getOrderVendorDashboardData(vendorId, period);

        return res.json(result);
    } catch (error) {
        console.log('getVendorOrderDashboard():', error);
        res.status(500).json({ message: !error.code ? error.message : 'Failed — Internal Server Error' });
    }
}

async function getAnalyticVendorDashboardData(req, res) {
    try {
        const vendorId = req.user.vendor?.id || null;

        if (!vendorId) return res.status(403).json({
            message: 'Failed — It seems like you are not authenticated'
        })

        const { period } = req.query;

        if (!vendorId) return res.status(401).json({ message: 'Not authenticated' });

        const result = await VendorService.getAnalyticVendorDashboardData(vendorId, period);

        return res.json(result);
    } catch (error) {
        console.log('getVendorOrderDashboard():', error);
        res.status(500).json({ message: !error.code ? error.message : 'Failed — Internal Server Error' });
    }
}

async function getVendorOverviewData(req, res) {
    try {
        const vendorId = req.user.vendor?.id || null;

        if (!vendorId) return res.status(403).json({
            message: 'Failed — It seems like you are not authenticated'
        })

        const { period, lowStockThreshold } = req.query;

        if (!vendorId) return res.status(401).json({ message: 'Not authenticated' });

        const result = await VendorService.getVendorOverviewData(vendorId, period, lowStockThreshold);

        return res.json(result);
    } catch (error) {
        console.log('getVendorOrderDashboard():', error);
        res.status(500).json({ message: !error.code ? error.message : 'Failed — Internal Server Error' });
    }
}

async function renderProductCataloging(req, res) {
    const user = req.user;
    res.render('product-cataloging', { user, protocal, domainName });
}

async function renderProductCatalog(req, res) {
    const user = req.user;
    res.render('product-catalog', { user, protocal, domainName, type: 'vendor' });
}

async function renderMarketplacePolicy(req, res) {
    const user = req.user;
    res.render('marketplace-terms', { user, protocal, domainName })
}

async function renderCatalogPolicy(req, res) {
    const user = req.user;
    res.render('catalog-policy', { user, protocal, domainName })
}

async function renderCatalogTerms(req, res) {
    const user = req.user;
    res.render('catalog-terms', { user, protocal, domainName })
}

async function insertProductCatalog(req, res) {

    try {

        // --------------------------------------------------
        // PARSE REQUEST
        // --------------------------------------------------

        const body = qs.parse(
            Object.assign({}, req.body)
        );

        const product = body.product || {};

        const variants = Array.isArray(body.variants)
            ? body.variants
            : [];

        const mediaMeta = Array.isArray(body.media)
            ? body.media
            : [];


        // --------------------------------------------------
        // MAP UPLOADED FILES BY MEDIA INDEX
        // --------------------------------------------------

        const filesByIndex = {};

        for (const [fieldName, file] of Object.entries(
            req.files || {}
        )) {

            const match = fieldName.match(
                /^media\[(\d+)\]\[file\]$/
            );

            if (!match) continue;

            filesByIndex[
                Number(match[1])
            ] = file;
        }


        // --------------------------------------------------
        // BUILD MEDIA
        // --------------------------------------------------

        const media = mediaMeta.map((meta, index) => ({
            file: filesByIndex[index] || null,

            position: Number(
                meta?.position ?? index
            ),

            is_primary:
                meta?.is_primary === 'true' ||
                meta?.is_primary === true
        }));


        // --------------------------------------------------
        // VALIDATION
        // --------------------------------------------------

        const errors = [];


        // --------------------------------------------------
        // PRODUCT
        // --------------------------------------------------

        if (!product.title?.trim()) {

            errors.push(
                'product.title is required'
            );
        }


        if (!product.slug?.trim()) {

            errors.push(
                'product.slug is required'
            );
        }


        if (!product.family_id) {

            errors.push(
                'product.family_id is required'
            );
        }


        // --------------------------------------------------
        // VARIANTS
        // --------------------------------------------------

        if (!variants.length) {

            errors.push(
                'At least one variant is required'
            );
        }


        for (let i = 0; i < variants.length; i++) {

            const variant = variants[i];


            if (!variant.sku?.trim()) {

                errors.push(
                    `variants[${i}].sku is required`
                );
            }


            const attributes =
                Array.isArray(variant.attributes)
                    ? variant.attributes
                    : [];


            if (!attributes.length) {

                errors.push(
                    `variants[${i}].attributes must have at least one entry`
                );
            }
        }


        // --------------------------------------------------
        // MEDIA
        // --------------------------------------------------

        if (!media.length) {

            errors.push(
                'At least one image is required'
            );
        }


        if (media.length > 10) {

            errors.push(
                'A maximum of 10 images is allowed'
            );
        }


        for (let i = 0; i < media.length; i++) {

            const item = media[i];


            if (!item.file) {

                errors.push(
                    `media[${i}].file is missing`
                );

                continue;
            }


            if (
                !/^image\/(jpeg|png|webp)$/.test(
                    item.file.mimetype
                )
            ) {

                errors.push(
                    `media[${i}] has unsupported type ${item.file.mimetype}`
                );
            }
        }


        // --------------------------------------------------
        // PRIMARY IMAGE
        // --------------------------------------------------

        const primaryCount = media.filter(
            item => item.is_primary
        ).length;


        if (primaryCount > 1) {

            errors.push(
                'Only one product image can be primary'
            );
        }


        // --------------------------------------------------
        // VALIDATION RESPONSE
        // --------------------------------------------------

        if (errors.length) {

            return res.status(422).json({
                message: 'Validation failed',
                errors
            });
        }


        // --------------------------------------------------
        // CREATE PRODUCT CATALOG
        // --------------------------------------------------

        const result =
            await ProductService.createProductCatalog({

                product,

                variants,

                media,

                requestedBy:
                    req.user?.userId || req.user?.user_id || req.user?.id
            });


        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return res.status(201).json({

            message:
                'Product catalog submitted successfully',

            data: result
        });


    } catch (error) {

        console.error(
            '[insertProductCatalog]',
            error
        );


        return res.status(500).json({

            message:
                error.message ||
                'Internal server error'
        });
    }
}


async function getPaginatedProductsCatalog(req, res) {
    try {
        const { page = 1, limit } = req.query;
        const offset = (page - 1) * limit;
        const result = await ProductService.getPaginatedProductsCatalog({ limit, offset });

        return res.json(result);

    } catch (error) {
        console.log(`getPaginatedProductsCatalog()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }

}

async function deepSearchProductsCatalog(req, res) {
    try {
        const searchKey = req.query.key;
        const status = req.query.status;
        const limit = req.query.limit;
        const offset = req.query.offset
        const result = await ProductService.deepSearchProductsCatalog({ searchKey, limit, offset, status });

        return res.json(result);
    } catch (error) {
        console.log(`deepSearchProductsCatalog()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function searchProductByImage(req, res) {
    try {

        const file = req.files?.image;

        if (!file || Array.isArray(file)) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image using the image field'
            });
        }

        const requestedLimit = Number(req.body?.limit ?? 100);

        if (
            !Number.isInteger(requestedLimit) ||
            requestedLimit < 1
        ) {
            return res.status(400).json({
                success: false,
                message: 'Limit must be a positive integer'
            });
        }

        const limit = Math.min(requestedLimit, 100);

        const result =
            await ProductService.searchProductByImage({
                file,
                limit
            });

        return res.status(200).json({
            success: true,
            message: 'Image search completed successfully',
            ...result
        });

    } catch (error) {
        console.error(
            '[searchProductByImage]',
            error
        );

        if (
            error.message === 'Product search image is required' ||
            error.message === 'Only JPEG, PNG, and WebP images are supported'
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to search products by image'
        });
    }
}

async function getProductById(req, res) {
    try {
        const id = req.params.id;
        const result = await ProductService.getProductById(id);
        return res.json(result);
    } catch (error) {
        console.log(`getProductById()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteProduct(req, res) {
    try {
        const id = req.params.id;
        const result = await ProductService.deleteProduct(id);
        return res.json(result);
    } catch (error) {
        console.log(`deleteProduct()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteProductVariant(req, res) {
    try {
        const variantId = req.params.variantId;
        const result = await ProductService.deleteProductVariant(variantId);
        return res.json(result);
    } catch (error) {
        console.log(`deleteProductVariant()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteVariantAttributeValue(req, res) {
    try {
        const { variantId, attributeValueId } = req.query;
        const result = await ProductService.deleteVariantAttributeValue(variantId, attributeValueId);
        return res.json(result);
    } catch (error) {
        console.log(`deleteProductVariant()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteVariantAttributes(req, res) {
    try {
        const variantId = req.params.variantId;
        const result = await ProductService.deleteVariantAttributes(variantId);
        return res.json(result);
    } catch (error) {
        console.log(`deleteVariantAttributes()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function getProductVariants(req, res) {
    try {
        const productId = req.params.productId;
        const result = await ProductService.getProductVariants(productId);
        return res.json(result);
    } catch (error) {
        console.log(`getProductVariants()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function getProductVariantOnly(req, res) {
    try {
        const productId = req.params.productId;
        const result = await ProductService.getProductVariantOnly(productId);
        return res.json(result);
    } catch (error) {
        console.log(`getProductVariantOnly()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function getVariantAttributeValues(req, res) {
    try {
        const variantId = req.params.productId;
        const result = await ProductService.getVariantAttributeValues(variantId);
        return res.json(result);
    } catch (error) {
        console.log(`getVariantAttributeValues()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function deleteProductVariant(req, res) {
    try {
        const variantId = req.params.productId;
        const result = await ProductService.deleteProductVariant(variantId);
        return res.json(result);
    } catch (error) {
        console.log(`deleteProductVariant()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function updateProduct(req, res) {
    try {
        const productId = req.params.productId;
        const data = req.body.data;
        const result = await ProductService.updateProduct(productId, data);
        return res.json(result);
    } catch (error) {
        console.log(`updateProduct()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function updateProductStatus(req, res) {
    try {
        const productId = req.params.productId;
        const { status } = req.body;
        const userId = req.user.userId || req.user.user_id || req.user.id;
        const result = await ProductService.updateProductStatus(productId, status, userId);
        return res.json(result);
    } catch (error) {
        console.log(`updateProductStatus()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function updateProductVariant(req, res) {
    try {
        const variantId = req.params.variantId;
        const data = req.body.data;
        const result = await ProductService.updateProductVariant(variantId, data);
        return res.json(result);
    } catch (error) {
        console.log(`updateProductVariant()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function insertVariantAttributeValue(req, res) {
    try {
        const { variantId, attributeValueId } = req.body;
        const result = await ProductService.insertVariantAttributeValue(
            { variant_id: variantId, attribute_value_id: attributeValueId }
        );

        return res.json(result);
    } catch (error) {
        console.log(`insertVariantAttributeValue()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}

async function activateProduct(req, res) {
    try {
        const productId = req.params.productId;
        const userId = req.user.userId || req.user.user_id || req.user.id;
        const result = await ProductService.updateProductStatus(productId, 'active', userId);

        if (!result) {
            return res.status(404).json({ success: false, message: 'Failed — Please check product id' })
        }
        return res.json(result);
    } catch (error) {
        console.log(`insertVariantAttributeValue()`, error);
        res.status(500).json({
            message: 'Failed — Internal Error'
        });
    }
}


module.exports = {
    businessHomePage,
    renderVendorCreation,
    renderDashboard,
    businessVendorPricing,
    renderApplicationConfirmation,
    renderApplicationReview,
    renderStoreCreation,
    renderTerms,
    renderAttributeRegistryTerms,
    redirectedToDashboard,
    renderStoreDashboard,
    renderInvontoryForm,
    getVendorOrderDashboard,
    getAnalyticVendorDashboardData,
    getVendorOverviewData,
    renderProductCataloging,
    renderProductCatalog,
    renderMarketplacePolicy,
    renderCatalogPolicy,
    renderCatalogTerms,
    insertProductCatalog,
    getPaginatedProductsCatalog,
    deepSearchProductsCatalog,
    searchProductByImage,
    getProductById,
    activateProduct
}