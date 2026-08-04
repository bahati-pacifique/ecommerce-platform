const ProductMetaServices = require('../../../src/services/productMeta.services');
const { formatError } = require('../../../util/helpers');

async function getProductActiveCategories(req, res) {
    try {
        const result = await ProductMetaServices.getActiveCategories();

        return res.json(result);
    } catch (error) {
        return formatError('getProductActiveCategories()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getProductActiveFamilies(req, res) {
    try {
        const result = await ProductMetaServices.getActiveFamilies();

        return res.json(result);
    } catch (error) {
        return formatError('getProductActiveFamilies()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getActiveBrands(req, res) {
    try {
        const result = await ProductMetaServices.getActiveBrandsList();

        return res.json(result);
    } catch (error) {
        return formatError('getBrands()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getActiveAttributes(req, res) {
    try {
        const result = await ProductMetaServices.getActiveAttribute();

        return res.json(result);
    } catch (error) {
        return formatError('getAttribute()', 500, error, 'Failed — Internal Server Error', res);
    }
}

async function getActiveAttributeValues(req, res) {
    try {
        const result = await ProductMetaServices.getActiveAttributeValues();

        return res.json(result);
    } catch (error) {
        return formatError('getAttribute()', 500, error, 'Failed — Internal Server Error', res);
    }
}



module.exports = {
    getProductActiveCategories,
    getProductActiveFamilies,
    getActiveBrands,
    getActiveAttributes,
    getActiveAttributeValues
}