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

    /**
     * 
     * @param {object} payload { title, slug, logo_url, website, description, meta }
     * @returns created brand or null
     */
    static async createBrand(payload) {
        return await ProductMetaModel.createProductBrand(payload);
    }

    static async getBrandById(id) {
        if (!id || isNaN(id)) {
            throw new Error("A valid numeric brand ID must be provided.");
        }
        const brand = await ProductMetaModel.getProductBrandById(id);
        if (!brand) {
            throw new Error("Brand not found");
        }
        return brand;
    }

    static async getPaginatedBrands(queryOptions) {
        const page = parseInt(queryOptions.page, 10) || 1;
        const limit = parseInt(queryOptions.limit, 10) || 10;
        const status = queryOptions.status || 'active';

        return await ProductMetaModel.getProductBrands({ page, limit, status });
    }

    static async getActiveBrandsList() {
        return await ProductMetaModel.getActiveBrands();
    }

    static async updateBrand(id, updateData) {
        if (!id || isNaN(id)) {
            throw new Error("A valid numeric brand ID must be provided.");
        }
        return await ProductMetaModel.updateProductBrand(id, updateData);
    }

    static async softDeleteBrand(id) {
        if (!id || isNaN(id)) {
            throw new Error("A valid numeric brand ID must be provided.");
        }
        const result = await ProductMetaModel.removeProductBrand(id);
        if (!result) {
            throw new Error("Brand not found or could not be soft deleted.");
        }
        return result;
    }

    static async activateBrand(id) {
        if (!id || isNaN(id)) {
            throw new Error("A valid numeric brand ID must be provided.");
        }
        const result = await ProductMetaModel.activateProductBrand(id);
        if (!result) {
            throw new Error("Brand not found or could not be activated.");
        }
        return result;
    }

    static async hardDeleteBrand(id) {
        if (!id || isNaN(id)) {
            throw new Error("A valid numeric brand ID must be provided.");
        }
        return await ProductMetaModel.deleteProductBrand(id);
    }

}

module.exports = ProductMetaService;