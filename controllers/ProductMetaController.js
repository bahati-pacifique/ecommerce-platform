
const ProductMetaServices = require('../src/services/productMeta.services');
const { formatError } = require('../util/helpers');

async function batchInsert(req, res) {
    const { tableName, columns, values, confictOptions } = req.body;

    try {
        const result = await ProductMetaServices.batchInsert(tableName, columns, values, confictOptions);
        return res.json(result);
    } catch (error) {
        formatError('batchInsert()', 500, error, error.message || 'Failed — Internal Server Error', res)
    }
}

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

async function insertProductCategory(req, res) {
    const userId = req.user.userId || req.user.user_id || req.user.id;
    let { title, slug = '', description, reason } = req.body;
    if (!slug && title) slug = title.toLowerCase().replaceAll(" ", "-");
    try {

        if (!title) return res.status(400).json({
            message: "Failed — Category title is required"
        });

        const category = await ProductMetaServices.insertProductCategory(title, slug, description, reason, userId);

        return res.json(category);

    } catch (error) {
        let message = 'Failed — Internal Server Error';
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
        return formatError('updateProductCategory()', 500, error, !error.code ? error.message :'Failed — Internal Server Error', res);
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

async function insertProductFamily(req, res) {
    
    const userId = req.user.userId || req.user.user_id || req.user.id;

    let { category_id = null, title, slug = null, description, reason } = req.body;

    if (!slug && title) slug = title.toLowerCase().replaceAll(" ", "-");

    try {

        if (!title) return res.status(400).json({
            message: "Failed — Category title is required"
        });

        const family = await ProductMetaServices.insertProductFamily(category_id, title, slug, description, reason, userId);

        return res.json(family);

    } catch (error) {
        let message = 'Failed — Internal Server Error';
        if (error.code == 23505) message = `${title} category already exists`;
        return formatError('createProductCategory()', 500, error, message, res);
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

async function insertBrand(req, res) {
    const { title } = req.body;
    try {
        const newBrand = await ProductMetaServices.insertBrand(req.body);
        return res.status(newBrand ? 201 : 500).json(newBrand);
    } catch (error) {
        console.log(error);
        let message = 'Failed — Internal Server Error';
        if (error.code == '23505') message = `${title} brand already exists`;

        return formatError('createBrand()', 400, error, message, res);
    }
}

async function getBrandById(req, res) {
    try {
        const brand = await ProductMetaServices.getBrandById(req.params.id);
        return res.status(200).json(brand);
    } catch (error) {
        const status = error.message === "Brand not found" ? 404 : 400;
        return formatError('getBrandById()', status, error, error.message, res);
    }
}

async function getBrands(req, res) {
    try {
        const paginatedData = await ProductMetaServices.getPaginatedBrands(req.query);
        return res.status(200).json(paginatedData);
    } catch (error) {
        return formatError('getBrands()', 500, error, error.message, res);
    }
}

async function getActiveBrands(req, res) {
    try {
        const result = await ProductMetaServices.getActiveBrandsList();
        return res.status(200).json(result);
    } catch (error) {
        return formatError('getActiveBrands()', 500, error, error.message, res);
    }
}

async function updateBrand(req, res) {
    try {
        const updatedBrand = await ProductMetaServices.updateBrand(req.params.id, req.body);
        return res.status(200).json(updatedBrand);
    } catch (error) {
        return formatError('updateBrand()', 404, error, error.message, res);
    }
}

async function softDeleteBrand(req, res) {
    try {
        const brand = await ProductMetaServices.softDeleteBrand(req.params.id);
        return res.status(200).json(brand);
    } catch (error) {
        return formatError('softDeleteBrand()', 400, error, error.message, res);
    }
}

async function activateBrand(req, res) {
    try {
        const brand = await ProductMetaServices.activateBrand(req.params.id);
        return res.status(200).json(brand);
    } catch (error) {
        return formatError('activateBrand()', 400, error, error.message, res);
    }
}

async function hardDeleteBrand(req, res) {
    try {
        const brand = await ProductMetaServices.hardDeleteBrand(req.params.id);
        return res.status(200).json({ success: true, message: "Brand permanently purged from database.", data: brand });
    } catch (error) {
        return formatError('hardDeleteBrands()', 400, error, error.message, res);
    }
}

//Attributes
async function createAttribute(req, res) {
    const { title } = req.body;
    try {
        const attribute = await ProductMetaServices.createAttribute(req.body);

        return res.json(attribute)
    } catch (error) {
        return formatError('createAttribute()', 500, error, error.message, res);
    }
}

async function insertAttribute(req, res) {
    const { title } = req.body;
    try {
        const attribute = await ProductMetaServices.insertAttribute(req.body);

        return res.json(attribute)
    } catch (error) {
        return formatError('createAttribute()', 500, error, error.message, res);
    }
}

async function getAttribute(req, res) {
    try {
        const attribute = await ProductMetaServices.getAttributeById(req.params.id);
        return res.json(attribute);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('getAttribute()', status, error, error.message, res);
    }
}

async function getAttributes(req, res) {
    try {
        const attributes = await ProductMetaServices.getPaginatedAttributes(req.query);
        return res.json(attributes);
    } catch (error) {
        return formatError('getAttributes()', 500, error, error.message, res);
    }
}

async function updateAttribute(req, res) {
    try {
        
        const attribute = await ProductMetaServices.updateAttribute(req.params.id, req.body);
        return res.json(attribute);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('updateAttribute()', status, error, error.message, res);
    }
}

async function activateAttribute(req, res) {
    try {
        const attribute = await ProductMetaServices.activateAttribute(req.params.id);
        return res.json(attribute);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('activateAttribute()', status, error, error.message, res);
    }
}

async function softDeleteAttribute(req, res) {
    try {
        const attribute = await ProductMetaServices.softDeleteAttribute(req.params.id);
        return res.json(attribute);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('softDeleteAttribute()', status, error, error.message, res);
    }
}

async function hardDeleteAttribute(req, res) {
    try {
        const attribute = await ProductMetaServices.hardDeleteAttribute(req.params.id);
        return res.json(attribute);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('hardDeleteAttribute()', status, error, error.message, res);
    }
}

//Values
async function createAttributeValue(req, res) {
    const { title } = req.body;
    try {
        const attributeValue = await ProductMetaServices.createAttributeValue(req.body);

        return res.json(attributeValue)
    } catch (error) {
        return formatError('createAttributeValue()', 500, error, error.message, res);
    }
}

async function getAttributeValue(req, res) {
    try {
        const attributeValue = await ProductMetaServices.getAttributeValueById(req.params.id);
        return res.json(attributeValue);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('getAttributeValue()', status, error, error.message, res);
    }
}

async function getAttributesValues(req, res) {
    try {
        const result = await ProductMetaServices.getPaginatedAttributesValue(req.query);
        return res.json(result);
    } catch (error) {
        return formatError('getAttributeValues()', 500, error, error.message, res);
    }
}

async function updateAttributeValue(req, res) {
    try {
        const attributeValue = await ProductMetaServices.updateAttributeValue(req.params.id, req.body);
        return res.json(attributeValue);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('updateAttributeValue()', status, error, error.message, res);
    }
}

async function activateAttributeValue(req, res) {
    try {
        const attributeValue = await ProductMetaServices.activateAttributeValue(req.params.id);
        return res.json(attributeValue);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('activateAttributeValue()', status, error, error.message, res);
    }
}

async function softDeleteAttributeValue(req, res) {
    try {
        const attributeValue = await ProductMetaServices.softDeleteAttributeValue(req.params.id);
        return res.json(attributeValue);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('softDeleteAttributeValue()', status, error, error.message, res);
    }
}

async function hardDeleteAttributeValue(req, res) {
    try {
        const attributeValue = await ProductMetaServices.hardDeleteAttributeValue(req.params.id);
        return res.json(attributeValue);
    } catch (error) {
        const status = error.message === "Not found" ? 404 : 400;
        return formatError('hardDeleteAttributeValue()', status, error, error.message, res);
    }
}

module.exports = {
    batchInsert,

    createProductCategory,
    insertProductCategory,
    getProductCategories,
    removeProductCategory,
    updatedProductCategory,
    deleteProductCategory,
    getProductCategory,
    activateProductCategory,

    createProductFamily,
    insertProductFamily,
    getProductFamily,
    getProductFamilies,
    deleteProductFamily,
    removeProductFamily,
    activateProductFamily,
    updateProductFamily,

    createBrand,
    insertBrand,
    getBrandById,
    getActiveBrands,
    getBrands,
    updateBrand,
    softDeleteBrand,
    hardDeleteBrand,
    activateBrand,

    createAttribute,
    insertAttribute,
    getAttribute,
    getAttributes,
    updateAttribute,
    activateAttribute,
    softDeleteAttribute,
    hardDeleteAttribute,

    createAttributeValue,
    getAttributeValue,
    getAttributesValues,
    updateAttributeValue,
    activateAttributeValue,
    softDeleteAttributeValue,
    hardDeleteAttributeValue
};