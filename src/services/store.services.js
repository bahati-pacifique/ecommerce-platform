const StoreModel = require('../models/store.model');

class StoreService {

    /**
     * Create a new store for a vendor.
     *
     * @param {string} vendorId
     * @param {Object} storeData
     * @returns {Promise<Object>}
     */
    static async createStore(vendorId, storeData) {

        if (!vendorId) {
            throw new Error('Vendor ID is required');
        }

        if (!storeData || typeof storeData !== 'object') {
            throw new Error('Store data is required');
        }

        const {
            name,
            slug,
            description,
            phone_number,
            email,
            physical_address,
            meta
        } = storeData;

        if (!name || !name.trim()) {
            throw new Error('Store name is required');
        }

        if (!slug || !slug.trim()) {
            throw new Error('Store slug is required');
        }

        const normalizedData = {
            name: name.trim(),
            slug: slug.trim().toLowerCase(),
            description: description?.trim() || null,
            phone_number: phone_number?.trim() || null,
            email: email?.trim().toLowerCase() || null,
            physical_address: physical_address?.trim() || null,
            meta: meta || {}
        };

        try {

            return await StoreModel.createStore(
                vendorId,
                normalizedData
            );

        } catch (error) {

            /*
             * PostgreSQL unique violation.
             */
            if (error.code === '23505') {
                throw new Error(
                    'A store with the same name or slug already exists'
                );
            }

            /*
             * Foreign-key violation.
             */
            if (error.code === '23503') {
                throw new Error('Vendor does not exist');
            }

            throw error;
        }
    }


    /**
     * Update store fields dynamically.
     *
     * @param {string} storeId
     * @param {string} vendorId
     * @param {Object} fields
     * @returns {Promise<Object>}
     */
    static async updateStore(
        storeId,
        vendorId,
        fields
    ) {

        if (!storeId) {
            throw new Error('Store ID is required');
        }

        if (!vendorId) {
            throw new Error('Vendor ID is required');
        }

        if (!fields || typeof fields !== 'object') {
            throw new Error('Update data is required');
        }

        /*
         * First make sure the store exists
         * and belongs to this vendor.
         */
        const store =
            await StoreModel.getStoreByIdOrNameOrSlug(storeId);

        if (!store) {
            throw new Error('Store not found');
        }

        if (store.vendor_id !== vendorId) {
            throw new Error(
                'You do not have permission to update this store'
            );
        }

        const allowedFields = [
            'name',
            'slug',
            'description',
            'phone_number',
            'email',
            'physical_address',
            'meta'
        ];

        const updateData = {};

        for (const field of allowedFields) {

            if (Object.prototype.hasOwnProperty.call(fields, field)) {

                let value = fields[field];

                if (
                    typeof value === 'string'
                    && field !== 'meta'
                ) {
                    value = value.trim();
                }

                if (field === 'email' && value) {
                    value = value.toLowerCase();
                }

                if (field === 'slug' && value) {
                    value = value.toLowerCase();
                }

                updateData[field] = value;
            }
        }

        if (Object.keys(updateData).length === 0) {
            throw new Error('No valid fields to update');
        }

        if (
            Object.prototype.hasOwnProperty.call(
                updateData,
                'name'
            ) &&
            !updateData.name
        ) {
            throw new Error('Store name cannot be empty');
        }

        if (
            Object.prototype.hasOwnProperty.call(
                updateData,
                'slug'
            ) &&
            !updateData.slug
        ) {
            throw new Error('Store slug cannot be empty');
        }

        try {

            const updatedStore =
                await StoreModel.updateStoreDynamicFields(
                    storeId,
                    updateData
                );

            if (!updatedStore) {
                throw new Error('Store update failed');
            }

            return updatedStore;

        } catch (error) {

            if (error.code === '23505') {
                throw new Error(
                    'A store with the same name or slug already exists'
                );
            }

            throw error;
        }
    }


    /**
     * Get a store by ID, name, or slug.
     *
     * @param {string} identifier
     * @returns {Promise<Object>}
     */
    static async getStore(identifier) {

        if (!identifier || !identifier.trim()) {
            throw new Error(
                'Store ID, name, or slug is required'
            );
        }

        const store =
            await StoreModel.getStoreByIdOrNameOrSlug(
                identifier.trim()
            );

        if (!store) {
            throw new Error('Store not found');
        }

        return store;
    }

    /**
     * Check name availability by ID, name, or slug.
     *
     * @param {string} identifier
     * @returns {Promise<Object>}
     */
    static async checkStore(identifier) {

        if (!identifier || !identifier.trim()) {
            throw new Error(
                'Store ID, name, or slug is required'
            );
        }

        const store =
            await StoreModel.getStoreByIdOrNameOrSlug(
                identifier.trim()
            );

        if (!store) {
            return { available: true, message: 'is available' };
        }

        return { available: false, message: 'already exists' };;
    }

    /**
     * Get a store belonging to a specific vendor.
     *
     * Useful for protected vendor operations.
     *
     * @param {string} storeId
     * @param {string} vendorId
     * @returns {Promise<Object>}
     */
    static async getVendorStore(
        storeId,
        vendorId
    ) {

        if (!storeId) {
            throw new Error('Store ID is required');
        }

        if (!vendorId) {
            throw new Error('Vendor ID is required');
        }

        const store =
            await StoreModel.getStoreByIdOrNameOrSlug(
                storeId
            );

        if (!store) {
            throw new Error('Store not found');
        }

        if (store.vendor_id !== vendorId) {
            throw new Error(
                'You do not have access to this store'
            );
        }

        return store;
    }


    /**
     * Change store status.
     *
     * @param {string} storeId
     * @param {string} vendorId
     * @param {string} status
     * @returns {Promise<Object>}
     */
    static async setStoreStatus(
        storeId,
        vendorId,
        status
    ) {

        if (!storeId) {
            throw new Error('Store ID is required');
        }

        if (!vendorId) {
            throw new Error('Vendor ID is required');
        }

        const allowedStatuses = [
            'active',
            'inactive',
            'deleted'
        ];

        if (!allowedStatuses.includes(status)) {
            throw new Error('Invalid store status');
        }

        const store =
            await StoreService.getVendorStore(
                storeId,
                vendorId
            );

        /*
         * Avoid unnecessary database update.
         */
        if (store.status === status) {
            return store;
        }

        const updatedStore =
            await StoreModel.setStoreStatus(
                storeId,
                status
            );

        if (!updatedStore) {
            throw new Error(
                'Unable to update store status'
            );
        }

        return updatedStore;
    }


    /**
     * Add a rating to a store.
     *
     * @param {string} storeId
     * @param {string} userId
     * @param {number} rating
     * @param {string|null} review
     * @returns {Promise<Object>}
     */
    static async insertStoreRate(
        storeId,
        userId,
        rating,
        review = null
    ) {

        if (!storeId) {
            throw new Error('Store ID is required');
        }

        if (!userId) {
            throw new Error('User ID is required');
        }

        rating = Number(rating);

        if (
            !Number.isFinite(rating)
            || rating < 1
            || rating > 5
        ) {
            throw new Error(
                'Rating must be between 1 and 5'
            );
        }

        if (review !== null) {
            review = String(review).trim();

            if (!review) {
                review = null;
            }
        }

        const store =
            await StoreModel.getStoreByIdOrNameOrSlug(
                storeId
            );

        if (!store) {
            throw new Error('Store not found');
        }

        try {

            return await StoreModel.insertStoreRate(
                storeId,
                userId,
                rating,
                review
            );

        } catch (error) {

            /*
             * UNIQUE(store_id, user_id)
             */
            if (error.code === '23505') {
                throw new Error(
                    'You have already rated this store'
                );
            }

            throw error;
        }
    }


    /**
     * Get vendor's stores with pagination.
     *
     * @param {string} vendorId
     * @param {number} page
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    static async getPaginatedStoresByVendorId(
        vendorId,
        page = 1,
        limit = 7
    ) {

        if (!vendorId) {
            throw new Error('Vendor ID is required');
        }

        return await StoreModel
            .getPaginatedStoresByVendorId(
                vendorId,
                page,
                limit
            );
    }


    /**
     * Get all stores with optional filters.
     *
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    static async getAllPaginatedStoresBy(
        options = {}
    ) {

        return await StoreModel
            .getAllPaginatedStoresBy(options);
    }

    static async setStoreLastActive(id) {
        return StoreModel.setLastActive(id);
    }
}

module.exports = StoreService;