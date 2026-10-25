const StoreModel = require('../models/store.model');
const StoreDashboardModel = require('../models/store.dashboard.model');

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

    static async getStoreDashboardAnalytics(storeId, period) {
        return await StoreModel.getStoreDashboardAnalytics(storeId, period);
    }

    //======================= Dashboard Data ==============================
    static ALLOWED_PERIODS = [
        "today",
        "7d",
        "30d",
        "90d",
        "year",
        "custom",
    ];

    static resolvePeriod({ period = "7d", from, to }) {
        if (!this.ALLOWED_PERIODS.includes(period)) {
            throw new Error(
                "Invalid period. Use today, 7d, 30d, 90d, year, or custom."
            );
        }

        const now = new Date();
        let start;
        let end = now;
        let days;

        if (period === "custom") {
            if (!from || !to) {
                throw new Error(
                    "Both from and to are required for a custom period."
                );
            }

            start = new Date(`${from}T00:00:00.000Z`);
            end = new Date(`${to}T23:59:59.999Z`);

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())
            ) {
                throw new Error("Invalid from or to date.");
            }

            if (start > end) {
                throw new Error("from must be before or equal to to.");
            }

            if (end > now) {
                throw new Error("to cannot be in the future.");
            }

            // Inclusive calendar-day range.
            days = Math.round(
                (Date.UTC(
                    end.getUTCFullYear(),
                    end.getUTCMonth(),
                    end.getUTCDate()
                ) - Date.UTC(
                    start.getUTCFullYear(),
                    start.getUTCMonth(),
                    start.getUTCDate()
                )) / 86400000
            ) + 1;
        } else if (period === "today") {
            start = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ));
            days = 1;
        } else {
            days = {
                "7d": 7,
                "30d": 30,
                "90d": 90,
                year: 365,
            }[period];

            start = new Date(now.getTime() - days * 86400000);
        }

        const duration = end.getTime() - start.getTime();

        const previousTo = start;
        const previousFrom = new Date(
            previousTo.getTime() - duration
        );

        return {
            key: period,
            label: period === "custom"
                ? `${from} to ${to}`
                : {
                    today: "Today",
                    "7d": "Last 7 days",
                    "30d": "Last 30 days",
                    "90d": "Last 90 days",
                    year: "Last 365 days",
                }[period],
            from: start,
            to: end,
            previousFrom,
            previousTo,
            days,
        };
    }

    static calculateChange(current, previous) {
        if (previous === 0 || previous == null) {
            return null;
        }

        return Number(
            (((current - previous) / previous) * 100).toFixed(1)
        );
    }


    static async getDashboard({
        storeId,
        period = "7d",
        from,
        to,
    }) {
        const range = this.resolvePeriod({ period, from, to });

        const [
            core,
            salesSeries,
            previousSalesSeries,
            inventoryItems,
            additions,
        ] = await Promise.all([
            StoreDashboardModel.getCoreData({
                storeId,
                from: range.from,
                to: range.to,
                previousFrom: range.previousFrom,
                previousTo: range.previousTo,
                lowStockThreshold: 5,
            }),

            StoreDashboardModel.getDailySalesSeries(
                storeId,
                range.from,
                range.to
            ),

            StoreDashboardModel.getDailySalesSeries(
                storeId,
                range.previousFrom,
                range.previousTo
            ),

            StoreDashboardModel.getInventoryAlertItems(
                storeId,
                5,
                10
            ),

            StoreDashboardModel.getDashboardAdditions({
                storeId,
                from: range.from,
                to: range.to,
            }),
        ]);

        // Merge the additional fields into the existing core response.
        core.sales.currency = additions.sales.currency;

        core.visits.weekly = additions.visits.weekly;
        core.visits.best_hour_range =
            additions.visits.best_hour_range;

        core.response = additions.response;
        core.pending_orders = additions.pending_orders;

        return {
            period: {
                key: range.key,
                label: range.label,
                from: range.from.toISOString(),
                to: range.to.toISOString(),
            },

            generated_at: new Date().toISOString(),

            core,

            sales_overview: {
                series: salesSeries,
                previous_series: previousSalesSeries,
            },

            inventory_alerts: {
                items: inventoryItems,
            },

            orders_attention: additions.orders_attention,
            most_visited_listing: additions.most_visited_listing,
            top_listings: additions.top_listings,
            inventory: additions.inventory
        };
    }

    /**
     * Retrieves paginated product listing analytics based on filters.
     * 
     * @param {Object} filters - The filter configuration.
     * @param {*} filters.storeId - The unique identifier for the store.
     * @param {number} [filters.page=1] - The page number for pagination.
     * @param {number} [filters.limit=20] - Number of items per page.
     * @param {string} [filters.search=""] - Search query string.
     * @param {*} [filters.status] - Filter by product status.
     * @param {string} [filters.sortBy="created_at"] - Field to sort the results by.
     * @param {"ASC" | "DESC"} [filters.sortOrder="DESC"] - Sort direction.
     */
    static async getProductListingAnalytics(filters) {
        const result = await StoreDashboardModel.getPaginatedListingAnalytics(filters);
        return result;
    }

    /**
     * Retrieves store inventory data
     * 
     * @param {*} payload - The Filter configuration.
     * @param {UUID} payload.storeId - The unique store identifier.
     * @param {number} payload.page - The page number for pagination.
     * @param {number} payload.limit - Number of items per page.
     * @param {string} search - Search query string.
     * @param {*} status - Filter by product status.
     * @param {*} stock - Stock Filter.
     * @param {*} sortBy - Field to sort the results by.
     * @param {*} sortOrder - Sort direction.,
     * @param {*} lowStockThreshold = 5 Low stock preset,
     */
    static async getInventoriesByStoreId(payload) {
        const result = await StoreDashboardModel.getInventoriesByStoreId(payload);
        return result;
    }

    

}

module.exports = StoreService;