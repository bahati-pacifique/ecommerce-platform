const ProductMetaModel = require('../models/productMeta.model');

class ProductMetaService {
    static async createProductCategory(title, slug, description) {
        const result = await ProductMetaModel.createProductCategory(title, slug, description);

        return result;
    }

    static async getAllProductCategories(page, limit, status) {
        return await ProductMetaModel.getProductCategories({ page, limit, status });
    }

    static async getProductCategoryById(id) {
        return await ProductMetaModel.getProductCategoryById(id);
    }

    static async removeProductCategory(id) {
        return await ProductMetaModel.removeProductCategory(id);
    }

    static async deleteProductCategory(id) {
        return await ProductMetaModel.deleteProductCategory(id)
    }

    static async activateProductCategory(id) {
        return await ProductMetaModel.activateProductCategory(id)
    }

    static async getActiveCategories(){
        return await ProductMetaModel.getActiveCategories();
    }

    /**
     * 
     * @param {string|uuid} id Category identifier
     * @param {object} fields {title, slug, description}
     */
    static async updatedProductCategory(id, fields) {
        return await ProductMetaModel.updateProductCategory(id, fields)
    }

    //Product families operations

    static async createProductFamily(categoryId, title, slug, description) {
        return await ProductMetaModel.createProductFamily(categoryId, title, slug, description);
    }

    static async getProductFamily(id) {
        return await ProductMetaModel.getProductFamily(id);
    }

    static async getProductFamilies(filters) {
        return await ProductMetaModel.getProductFamilies(filters)
    }

    static async updateProductFamily(id, payload) {
        return await ProductMetaModel.updateProductFamily(id, payload);
    }

    static async removeProductFamily(id) {
        return await ProductMetaModel.removeProductFamily(id);
    }

    static async deleteProductFamily(id) {
        return await ProductMetaModel.deleteProductFamily(id);
    }

    static async activateProductFamily(id) {
        return await ProductMetaModel.activateProductFamily(id);
    }

    static async updateProductFamily(id, payload) {
        return await ProductMetaModel.updateProductFamily(id, payload)
    }

    static async getActiveFamilies(){
        return await ProductMetaModel.getActiveFamilies();
    }

}

module.exports = ProductMetaService;