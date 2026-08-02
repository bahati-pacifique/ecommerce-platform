
const ProductMetaServices = require('../src/services/productMeta.services');
const { formatError } = require('../util/helpers');

async function createProductCategory(req, res) {
    const { title, slug, description } = req.body;
    try {

        if (!title) return res.status(400).json({
            message: "Failed — Category title is required"
        });

        const category = await ProductMetaServices.createProductCategory(title, slug, description);

        return res.json(category)

    } catch (error) {
        let message = 'Unable to create category — Internal Server Error';
        if (error.code == 23505) message = `${title} category already exists`;
        return formatError('createProductCategory()', 500, error, message, res);
    }
}

async function getProductCategories(req, res) {
    try {
        const { page, limit, status } = req.query;

        let productCategories = await ProductMetaServices.getAllProductCategories(page, limit, status);

        return res.json(productCategories);

    } catch (error) {
        return formatError('getProductCategories()', 500, error, 'Internal Server Error', res);
    }
}

async function getProductCategory(req, res) {
    try {
        const id = req.params.id;

        const category = await ProductMetaServices.getProductCategoryById(id);

        return res.status(category ? 200 : 404).json(category || { message: "Not found" })

    } catch (error) {
        return formatError('getProductCategory()', 500, error, 'Not found — Internal Server Error', res);
    }
}

async function deleteProductCategory(req, res) {
    try {
        const deleted = await ProductMetaServices.deleteProductCategory(req.params.id);

        return res.status(deleted ? 201 : 404).json(deleted || { message: "Failed — Not found" });
    } catch (error) {
        return formatError('deleteProductCategory()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function removeProductCategory(req, res) {
    try {
        const removed = await ProductMetaServices.removeProductCategory(req.params.id);

        return res.status(removed ? 201 : 404).json(removed || { message: "Failed — Not found" });
    } catch (error) {
        return formatError('removeProductCategory()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function activateProductCategory(req, res) {
    try {
        const activated = await ProductMetaServices.activateProductCategory(req.params.id);

        return res.status(activated ? 201 : 404).json(activated || "Failed — Not found");

    } catch (error) {
        return formatError('activateProductCategory()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function updatedProductCategory(req, res) {
    try {
        const id = req.params.id;

        const updated = await ProductMetaServices.updatedProductCategory(id, req.body);

        return res.status(updated ? 201 : 404).json(updated || { message: "Failed — Not found" });

    } catch (error) {
        return formatError('updateProductCategory()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function createProductFamily(req, res) {
    const { category_id, title, slug, description } = req.body;
    try {

        if (!title) return res.status(400).json({
            message: "Failed — Title is required"
        });

        const family = await ProductMetaServices.createProductFamily(category_id, title, slug, description);

        return res.json(family)

    } catch (error) {
        let message = 'Failed — Internal Server Error';

        if (error.code == '23505') message = `${title} family already exists`;
        if (error.code === '23503') message = `Failed — Category does not exists`;

        return formatError('createProductFamily()', 500, error, message, res);
    }
}

async function getProductFamilies(req, res) {
    try {

        let families = await ProductMetaServices.getProductFamilies(req.query);

        return res.json(families);

    } catch (error) {
        return formatError('getProductFamilies()', 500, error, 'Internal Server Error', res);
    }
}

async function getProductFamily(req, res) {
    try {
        const id = req.params.id;

        const family = await ProductMetaServices.getProductFamily(id);

        return res.status(family ? 200 : 404).json(family || { message: 'Not found' })

    } catch (error) {
        return formatError('getProductFamily()', 500, error, 'Not found — Internal Server Error', res);
    }
}

async function deleteProductFamily(req, res) {
    try {
        const deleted = await ProductMetaServices.deleteProductFamily(req.params.id);

        return res.status(deleted ? 201 : 404).json(deleted || { message: "Failed — Not found" });

    } catch (error) {
        return formatError('deleteProductFamily()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function removeProductFamily(req, res) {
    try {
        const removed = await ProductMetaServices.removeProductFamily(req.params.id);

        return res.status(removed ? 201 : 404).json(removed || { message: "Failed — Not found" });
    } catch (error) {
        return formatError('removeProductFamily()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function activateProductFamily(req, res) {
    try {
        const activated = await ProductMetaServices.activateProductFamily(req.params.id);

        return res.status(activated ? 201 : 404).json(activated || { message: "Failed — Not found" });

    } catch (error) {
        return formatError('activateProductCategory()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function updateProductFamily(req, res) {
    try {
        const id = req.params.id;

        const updated = await ProductMetaServices.updateProductFamily(id, req.body);

        return res.status(updated ? 201 : 404).json(updated || { message: "Failed — Not found" });

    } catch (error) {
        return formatError('updateProductFamily()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function createBrand(req, res) {
    const { title } = req.body;
    try {
        const newBrand = await ProductMetaServices.createBrand(req.body);
        return res.status(newBrand ? 201 : 500).json(newBrand);
    } catch (error) {
        console.log(error);
        let message = 'Failed — Internal Server Error';
        if (error.code == '23505') message = `${title} brand already exists`;
        
        return formatError('createBrand()', 400, error, message, res);
    }
}

// GET /api/brands/:id
async function getBrandById(req, res) {
    try {
        const brand = await ProductMetaServices.getBrandById(req.params.id);
        return res.status(200).json(brand);
    } catch (error) {
        const status = error.message === "Brand not found" ? 404 : 400;
        return formatError('getBrandById()', status, error, error.message, res);
    }
}

// GET /api/brands
async function getBrands(req, res) {
    try {
        const paginatedData = await ProductMetaServices.getPaginatedBrands(req.query);
        return res.status(200).json(paginatedData);
    } catch (error) {
        return formatError('getBrands()', 500, error, error.message, res);
    }
}

// GET /api/brands/list/active
async function getActiveBrands(req, res) {
    try {
        const result = await ProductMetaServices.getActiveBrandsList();
        return res.status(200).json(result);
    } catch (error) {
        return formatError('getActiveBrands()', 500, error, error.message, res);
    }
}

// PUT /api/brands/:id
async function updateBrand(req, res) {
    try {
        const updatedBrand = await ProductMetaServices.updateBrand(req.params.id, req.body);
        return res.status(200).json(updatedBrand);
    } catch (error) {
        return formatError('updateBrand()', 404, error, error.message, res);
    }
}

// PATCH /api/brands/:id/soft-delete
async function softDeleteBrand(req, res) {
    try {
        const brand = await ProductMetaServices.softDeleteBrand(req.params.id);
        return res.status(200).json(brand);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

// PATCH /api/brands/:id/activate
async function activateBrand(req, res) {
    try {
        const brand = await ProductMetaServices.activateBrand(req.params.id);
        return res.status(200).json(brand);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

// DELETE /api/brands/:id
async function hardDeleteBrand(req, res) {
    try {
        const brand = await ProductMetaServices.hardDeleteBrand(req.params.id);
        return res.status(200).json({ success: true, message: "Brand permanently purged from database.", data: brand });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
}

module.exports = {
    createProductCategory,
    getProductCategories,
    removeProductCategory,
    updatedProductCategory,
    deleteProductCategory,
    getProductCategory,
    activateProductCategory,

    createProductFamily,
    getProductFamily,
    getProductFamilies,
    deleteProductFamily,
    removeProductFamily,
    activateProductFamily,
    updateProductFamily,

    createBrand,
    getBrandById,
    getBrands,
    updateBrand,
    softDeleteBrand,
    hardDeleteBrand,
    activateBrand

};