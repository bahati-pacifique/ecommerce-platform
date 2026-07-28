const ProductMetaModel = require('../models/productMeta.model');

class ProductMetaService {
    static async createProductCategory(title, slug, description) {
        const result = await ProductMetaModel.createProductCategory(title, slug, description);

        return result;
    }

    static async getAllProductCategories() {
        return await ProductMetaModel.getProductCategories();
    }

    static async getAllProductCategoriesByStatus(status) {
        return await ProductMetaModel.getProductCategoriesByStatus(status);
    }

    static async getProductCategoryById(id) {
        return await ProductMetaModel.getProductCategoryById(id);
    }

    static async removeProductCategory(id) {
        return await ProductMetaModel.removingProductCategory(id);
    }

    static async deleteProductCategory(id) {
        return await ProductMetaModel.deleteProductCategory(id)
    }

    static async activateProductCategory(id) {
        return await ProductMetaModel.activateProductCategory(id)
    }

    /**
     * 
     * @param {string|uuid} id Category identifier
     * @param {object} fields {title, slug, description}
     */
    static async updatedProductCategory(id, fields){
        return await ProductMetaModel.updateProductCategory(id, fields)
    }
}

module.exports = ProductMetaService;