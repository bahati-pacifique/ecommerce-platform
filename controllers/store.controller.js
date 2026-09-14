const StoreService = require('../src/services/store.services');
const EmailServices = require('../src/services/email/email.service');
const FileServices = require('../src/services/file.service')

const isProduction = process.env.NODE_ENV === 'production';

const sslUrlPrefix = isProduction ? 'https://' : 'http://';

const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

const domain = `${sslUrlPrefix}business.${process.env.DOMAIN}${portSuffix}`;
const authDomain = `${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}?r=${domain}/dashboard`;

const protocal = sslUrlPrefix;
const domainName = `${process.env.DOMAIN}${portSuffix}`;

class StoreController {

    /**
     * POST /stores
     *
     * Create a new store for the authenticated vendor.
     */
    static async createStore(req, res) {

        try {

            const vendorId = req.user?.vendor?.id;

            const user = req.user;
            const avatar = req.files?.avatar;

            console.log(req.files)

            if (!vendorId) {
                return res.status(403).json({
                    success: false,
                    message: 'Vendor account required'
                });
            }

            const payload = req.body;

            if (payload.meta) {
                payload.meta = JSON.parse(payload.meta)
            }

            const store = await StoreService.createStore(
                vendorId, payload
            );

            if (store && avatar) {
                try {

                    const ext = avatar.name.split('.').pop();
                    avatar.name = `${store.id}.${ext}`;
                    await FileServices.uploadStoreAvatar(avatar);
                    console.log('Store avatar uploaded to server');
                } catch (error) {
                    console.log('Error uploading user profile:', error);
                }
            }

            //TODO implement log activity for store creation

            //Send notification email
            await EmailServices.sendStoreCreationEmailEmail({
                to: user.email,
                storeName: store.name,
                firstName: user.username,
                businessName: user.vendor?.business_name,
                portalUrl: `${protocal}business.${domainName}/${user.vendor?.id}/dashboard`
            })

            return res.status(201).json({
                success: true,
                message: 'Store created successfully',
                store
            });

        } catch (error) {

            console.error(
                'CREATE_STORE_ERROR:',
                error
            );

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }


    /**
     * PATCH /stores/:storeId
     *
     * Update store fields.
     */
    static async updateStore(req, res) {

        try {

            const vendorId = req.user?.vendor_id;
            const { storeId } = req.params;

            if (!vendorId) {
                return res.status(403).json({
                    success: false,
                    message: 'Vendor account required'
                });
            }

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Store ID is required'
                });
            }

            const store =
                await StoreService.updateStore(
                    storeId,
                    vendorId,
                    req.body
                );

            return res.status(200).json({
                success: true,
                message: 'Store updated successfully',
                store
            });

        } catch (error) {

            console.error(
                'UPDATE_STORE_ERROR:',
                error
            );

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }


    /**
     * GET /stores/:identifier
     *
     * Get store by:
     * - UUID
     * - name
     * - slug
     */
    static async getStore(req, res) {

        try {

            const { identifier } = req.params;

            if (!identifier) {
                return res.status(400).json({
                    success: false,
                    message: 'Store identifier is required'
                });
            }

            const store =
                await StoreService.getStore(
                    identifier
                );

            return res.status(200).json({
                success: true,
                store
            });

        } catch (error) {

            console.error(
                'GET_STORE_ERROR:',
                error
            );

            const statusCode =
                error.message === 'Store not found'
                    ? 404
                    : 400;

            return res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }


    /**
     * Check store name availability /stores/:identifier
     *
     * Get store by:
     * - UUID
     * - name
     * - slug
     */
    static async checkStore(req, res) {

        try {

            const { identifier } = req.params;

            if (!identifier) {
                return res.status(400).json({
                    success: false,
                    message: 'Store identifier is required'
                });
            }

            const result =
                await StoreService.checkStore(
                    identifier
                );

            return res.status(200).json(result);

        } catch (error) {
            console.log('checkStore() ', error);
            return res.status(500).json({ available: true, message: 'Unable check name availability — Internal error' })
        }
    }


    /**
     * GET /vendors/stores/:storeId
     *
     * Get a store belonging to the authenticated vendor.
     *
     * This should be used by vendor dashboard operations.
     */
    static async getVendorStore(req, res) {

        try {

            const vendorId = req.user?.vendor_id;
            const { storeId } = req.params;

            if (!vendorId) {
                return res.status(403).json({
                    success: false,
                    message: 'Vendor account required'
                });
            }

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Store ID is required'
                });
            }

            const store =
                await StoreService.getVendorStore(
                    storeId,
                    vendorId
                );

            return res.status(200).json({
                success: true,
                store
            });

        } catch (error) {

            console.error(
                'GET_VENDOR_STORE_ERROR:',
                error
            );

            const statusCode =
                error.message === 'Store not found'
                    ? 404
                    : error.message.includes('access')
                        ? 403
                        : 400;

            return res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }


    /**
     * PATCH /stores/:storeId/status
     *
     * Change store status.
     */
    static async setStoreStatus(req, res) {

        try {

            const vendorId = req.user?.vendor_id;
            const { storeId } = req.params;
            const { status } = req.body;

            if (!vendorId) {
                return res.status(403).json({
                    success: false,
                    message: 'Vendor account required'
                });
            }

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Store ID is required'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Store status is required'
                });
            }

            const store =
                await StoreService.setStoreStatus(
                    storeId,
                    vendorId,
                    status
                );

            return res.status(200).json({
                success: true,
                message: 'Store status updated successfully',
                store
            });

        } catch (error) {

            console.error(
                'SET_STORE_STATUS_ERROR:',
                error
            );

            const statusCode =
                error.message.includes('access')
                    ? 403
                    : error.message === 'Store not found'
                        ? 404
                        : 400;

            return res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }


    /**
     * POST /stores/:storeId/rating
     *
     * Add a rating/review to a store.
     */
    static async insertStoreRate(req, res) {

        try {

            const userId = req.user?.id;
            const { storeId } = req.params;

            const {
                rating,
                review = null
            } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Store ID is required'
                });
            }

            if (rating === undefined || rating === null) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating is required'
                });
            }

            const storeRating =
                await StoreService.insertStoreRate(
                    storeId,
                    userId,
                    rating,
                    review
                );

            return res.status(201).json({
                success: true,
                message: 'Store rating submitted successfully',
                rating: storeRating
            });

        } catch (error) {

            console.error(
                'INSERT_STORE_RATE_ERROR:',
                error
            );

            const statusCode =
                error.message === 'Store not found'
                    ? 404
                    : error.message.includes(
                        'already rated'
                    )
                        ? 409
                        : 400;

            return res.status(statusCode).json({
                success: false,
                message: error.message
            });
        }
    }


    /**
     * GET /vendors/stores
     *
     * Get all stores belonging to the authenticated vendor.
     */
    static async getPaginatedStoresByVendorId(
        req,
        res
    ) {

        try {

            const vendorId = req.user?.vendor.id;

            if (!vendorId) {
                return res.status(403).json({
                    success: false,
                    message: 'Vendor account required'
                });
            }

            const {
                page = 1,
                limit = 20
            } = req.query;

            const result =
                await StoreService
                    .getPaginatedStoresByVendorId(
                        vendorId,
                        page,
                        limit
                    );

            return res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {

            console.error(
                'GET_VENDOR_STORES_ERROR:',
                error
            );

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }


    /**
     * GET /stores
     *
     * Get all stores with optional filters.
     *
     * Query parameters:
     *
     * ?vendor_id=
     * ?status=
     * ?search=
     * ?page=
     * ?limit=
     */
    static async getAllPaginatedStores(
        req,
        res
    ) {

        try {

            const {
                vendor_id = null,
                status = null,
                search = null,
                page = 1,
                limit = 20
            } = req.query;

            const result =
                await StoreService
                    .getAllPaginatedStoresBy({
                        vendor_id,
                        status,
                        search,
                        page,
                        limit
                    });

            return res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {

            console.error(
                'GET_ALL_STORES_ERROR:',
                error
            );

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    static async setStoreLastActive(req, res) {
        const id = req.params.id;
        try {
            const result = await StoreService.setStoreLastActive(id);

            return res.json(result)
        } catch (error) {
            console.log('setStoreLastActive: ', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed — Intenal Error'
            });
        }
    }
}

module.exports = StoreController;