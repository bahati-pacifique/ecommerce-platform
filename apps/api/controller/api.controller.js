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

module.exports = {
    getProductActiveCategories,
    getProductActiveFamilies
}