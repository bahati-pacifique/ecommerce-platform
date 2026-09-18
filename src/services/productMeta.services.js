const ProductMetaModel = require('../models/productMeta.model');

class ProductMetaService {

    static async batchInsert(tableName, columns, values, conflictOptionals = {}) {

        const result = await ProductMetaModel.batchInsert(tableName, columns, values, conflictOptionals)

        return result;
    }

    //===========================================================================
    static async createProductCategory(title, slug, description) {
        const result = await ProductMetaModel.createProductCategory(title, slug, description);

        return result;
    }

    static async insertProductCategory(title, slug, description, reason, by) {
        const result = await ProductMetaModel.insertProductCategory(title, slug, description, reason, by);

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

    static async getActiveCategories() {
        return await ProductMetaModel.getActiveCategories();
    }

    static async getCategoriesPaginated(page, limit, status = 'active', reqId) {
        return await ProductMetaModel.getCategoriesPaginated(page, limit, status, reqId);
    }

    static async searchCategory(searchKey, page, limit) {
        return await ProductMetaModel.searchCategory(searchKey, page, limit);
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

    static async insertProductFamily(categoryId, title, slug, description, reason, by) {
        
        return await ProductMetaModel.insertProductFamily(categoryId, title, slug, description, reason, by);
    }

    static async getProductFamily(id) {
        return await ProductMetaModel.getProductFamily(id);
    }

    static async getProductFamilies(filters) {
        return await ProductMetaModel.getProductFamilies(filters)
    }

    static async searchProductFamilies(searchKey, page, limit) {
        return await ProductMetaModel.searchFamily(searchKey, page, limit)
    }

    static async getProductFamiliesWithRequested(page, limit, status = 'active', requesterId) {
        return await ProductMetaModel.getProductFamiliesPaginatedRequested(page, limit, status, requesterId);
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

    static async getActiveProductFamilies() {
        return await ProductMetaModel.getActiveProductFamilies();
    }

    // static async getProductFamilies() {
    //     return await ProductMetaModel.getProductFamilies();
    // }

    /**
     * 
     * @param {object} payload { title, slug, logo_url, website, description, meta }
     * @returns created brand or null
     */
    static async createBrand(payload) {
        return await ProductMetaModel.createProductBrand(payload);
    }

    static async insertBrand(payload) {
        return await ProductMetaModel.insertProductBrand(payload);
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
        const page = parseInt(queryOptions?.page, 10) || 1;
        const limit = parseInt(queryOptions?.limit, 10) || 10;
        const status = queryOptions?.status || 'active';

        return await ProductMetaModel.getProductBrands({ page, limit, status });
    }

    static async getPaginatedBrandsRequested(queryOptions, requesterId) {
        const page = parseInt(queryOptions?.page, 10) || 1;
        const limit = parseInt(queryOptions?.limit, 10) || 10;
        const status = queryOptions?.status || 'active';

        return await ProductMetaModel.getProductBrandsRequested(page, limit, status, requesterId);
    }
    
    static async searchBrands(searchKey, page, limit) {
        return await ProductMetaModel.searchBrands(searchKey, page, limit);
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

    //Attributes operations

    //Attributes
    static async createAttribute(payload) {
        return await ProductMetaModel.createAttribute(payload);
    }

    static async insertAttribute(payload) {
        return await ProductMetaModel.insertAttribute(payload);
    }

    static async getAttributeById(id) {
        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }
        const attribute = await ProductMetaModel.getAttributeById(id);
        if (!attribute) {
            throw new Error("Not found");
        }
        return attribute;
    }

    static async getPaginatedAttributes(queryOptions) {
        const page = parseInt(queryOptions?.page, 10) || 1;
        const limit = parseInt(queryOptions?.limit, 10) || 10;
        const status = queryOptions?.status || 'active';
        return await ProductMetaModel.getAttributes({ page, limit, status });
    }

    static async getActiveAttribute() {
        return await ProductMetaModel.getActiveAttributes();
    }

    static async updateAttribute(id, updateData) {
        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }
        const result = ProductMetaModel.updateAttribute(id, updateData);
        if (!result) { throw new Error("Not found"); }
        return result;
    }

    static async softDeleteAttribute(id) {
        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }
        const result = await ProductMetaModel.removeAttribute(id);
        if (!result) {
            throw new Error("Not found");
        }
        return result;
    }

    static async activateAttribute(id) {
        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }
        const result = await ProductMetaModel.activateAttribute(id);
        if (!result) {
            throw new Error("Not found");
        }
        return result;
    }

    static async hardDeleteAttribute(id) {
        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }
        const result = await ProductMetaModel.deleteAttribute(id);

        if (!result) {
            throw new Error('Not found')
        }

        return result;
    }

    //Attribute values
    static async createAttributeValue(payload) {
        return await ProductMetaModel.createAttributeValue(payload);
    }

    static async getAttributeValueById(id) {
        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }
        const attribute = await ProductMetaModel.getAttributeValueById(id);
        if (!attribute) {
            throw new Error("Not found");
        }
        return attribute;
    }

    static async getPaginatedAttributesValue(queryOptions) {

        queryOptions.page = parseInt(queryOptions.page, 10) || 1;
        queryOptions.limit = parseInt(queryOptions.limit, 10) || 10;
        queryOptions.status = queryOptions?.status || 'active';

        return await ProductMetaModel.getAttributeValues(queryOptions);

    }

    static async getActiveAttributeValues() {
        return await ProductMetaModel.getActiveAttributeValues();
    }

    static async updateAttributeValue(id, updateData) {

        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }
        const result = await ProductMetaModel.updateAttributeValues(id, updateData);
        if (!result) {
            throw new Error('Not found');
        }
        return result;
    }

    static async softDeleteAttributeValue(id) {
        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }
        const result = await ProductMetaModel.removeAttributeValue(id);
        if (!result) {
            throw new Error("Not found");
        }
        return result;
    }

    static async activateAttributeValue(id) {
        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }
        const result = await ProductMetaModel.activateAttributeValue(id);
        if (!result) {
            throw new Error("Not found");
        }
        return result;
    }

    static async hardDeleteAttributeValue(id) {
        if (!id || isNaN(id)) {
            throw new Error("ID must be provided.");
        }

        const result = await ProductMetaModel.deleteAttributeValue(id);
        if (!result) {
            throw new Error('Not found');
        }
        return result
    }

}

module.exports = ProductMetaService;