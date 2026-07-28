
const ProductMetaServices = require('../src/services/productMeta.services');

function formatError(name, status = 500, error, returnMessage, res) {
    console.log(`${name} — Error:`, error);
    res.status(status).json({
        success: false,
        returnMessage
    })
}

async function createProductCategory(req, res) {
    try {

        const { title, slug, description } = req.body;

        if (!title) return res.status(400).json({
            message: "Failed — Category title is required"
        });

        const category = await ProductMetaServices.createProductCategory(title, slug, description);

        return res.json({
            category
        })

    } catch (error) {
        return formatError('createProductCategory()', 500, error, 'Unable to create category — Internal Server Error', res);
    }
}

async function getProductCategories(req, res) {
    try {
        const status = req.params.status;

        let productCategories = await ProductMetaServices.getAllProductCategories()

        return res.json(productCategories);

    } catch (error) {
        return formatError('getProductCategories()', 500, error, 'Internal Server Error', res);
    }
}

async function getProductCategoriesByStatus(req, res) {
    try {
        const status = req.query.status;

        const productCategories = await ProductMetaServices.getAllProductCategoriesByStatus(status)

        return res.json({
            categories: productCategories
        })

    } catch (error) {
        return formatError('getProductCategories()', 500, error, 'Internal Server Error', res);
    }
}

async function getProductCategory(req, res) {
    try {
        const id = req.params.id;

        const category = await ProductMetaServices.getProductCategoryById(id);

        return res.status(category ? 404 : 200).json({
            success: !!category,
            category,
            message: deleted ? '' : 'Category not found — Check category id'
        })

    } catch (error) {
        return formatError('getProductCategory()', 500, error, 'Not found — Internal Server Error', res);
    }
}

async function deleteProductCategory(req, res) {
    try {
        const deleted = await ProductMetaServices.deleteProductCategory(req.params.id);

        return res.status(deleted ? 201 : 404).json({
            success: !!deleted,
            category: deleted,
            message: deleted ? '' : 'Category not found — Check category id'
        });
    } catch (error) {
        return formatError('deleteProductCategory()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function removeProductCategory(req, res) {
    try {
        const removed = await ProductMetaServices.removeProductCategory(req.params.id);

        return res.status(deleted ? 201 : 404).json({
            success: !!removed,
            category: removed,
            message: removed ? '' : 'Category not found — Check category id'
        });
    } catch (error) {
        return formatError('removeProductCategory()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function activateProductCategory(req, res) {
    try {
        const activated = await ProductMetaServices.activateProductCategory(req.params.id);

        return res.status(activated ? 201 : 404).json({
            success: !!activated,
            category: activated,
            message: removed ? '' : 'Category not found — Check category id'
        });

    } catch (error) {
        return formatError('activateProductCategory()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function updatedProductCategory(req, res) {
    try {
        const id = req.params.id;

        const updated = await ProductMetaServices.updatedProductCategory(id, req.body);

        return res.status(updated ? 201 : 404).json({
            success: !!activated,
            category: updated,
            message: updated ? '' : 'Category not found — Check category id'
        });

    } catch (error) {
        return formatError('activateProductCategory()', 500, error, 'Failed — Internal Server Error', res);
    }
}

module.exports = {
    createProductCategory,
    getProductCategories,
    getProductCategoriesByStatus,
    removeProductCategory,
    updatedProductCategory,
    deleteProductCategory,
    getProductCategory
};