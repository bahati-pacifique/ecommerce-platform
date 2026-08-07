// ========== VENDOR CONTROLLER ==========

const VendorService = require('../src/services/vendor.services');
const { VENDOR_TYPES, VENDOR_CATEGORIES, VERIFICATION_STATUSES, STATUSES } = require('../src/models/vendor.model');
const { validate } = require('uuid');

const { formatError } = require('../util/helpers');

class VendorController {
    /**
     * Create a new vendor
     * POST /api/vendors
     * @param {Function} next - Express next middleware
     */
    static async createVendor(req, res, next) {
        try {
            const {
                userId,
                businessName,
                businessAddress,
                tinNumber,
                vatNumber,
                taxRegistered,
                taxCountry,
                type,
                category,
                verificationStatus,
                status
            } = req.body;

            // Validate required fields
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            if (!businessName) {
                return res.status(400).json({
                    success: false,
                    message: 'Business name is required'
                });
            }

            // Validate UUID format
            if (!validate(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
            }

            const vendor = await VendorService.createVendor({
                userId,
                businessName,
                businessAddress,
                tinNumber,
                vatNumber,
                taxRegistered,
                taxCountry,
                type,
                category,
                verificationStatus,
                status
            });

            return res.status(201).json({
                success: true,
                message: 'Vendor created successfully',
                data: vendor
            });

        } catch (error) {
            // Handle specific errors
            let message = 'Failed — Internal Server Error';
            let status = 500;

            if (error.message.includes('already exists')) {
                message = error.message;
                status = 409;
            }

            if (error.message.includes('Invalid')) {
                message = error.message;
                status = 400;
            }

            return formatError('createVendor()', status, error, message, res);
        }
    }

    /**
     * Get vendor by ID
     * GET /api/vendors/:id
     * @param {Function} next - Express next middleware
     */
    static async getVendorById(req, res, next) {
        try {
            const { id } = req.params;
            const { includeUser } = req.query;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }

            if (!validate(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid vendor ID format'
                });
            }

            const vendor = await VendorService.getVendorById(id, {
                includeUser: includeUser === 'true'
            });

            return res.status(200).json({
                success: true,
                data: vendor
            });

        } catch (error) {
            let message = 'Failed to fetch vendor'
            let status = 500;

            if (error.message === 'Vendor not found') {
                message = error.message;
                status = 404;
            }

            return formatError('getVendorById()', status, error, message, res);
        }
    }

    /**
     * Get vendor by user ID
     * GET /api/vendors/user/:userId
     * @param {Function} next - Express next middleware
     */
    static async getVendorByUserId(req, res, next) {
        try {
            const { userId } = req.params;
            const { includeUser } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            if (!validate(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
            }

            const vendor = await VendorService.getVendorByUserId(userId, {
                includeUser: includeUser === 'true'
            });

            return res.status(200).json({
                success: true,
                data: vendor
            });

        } catch (error) {
            let message = 'Failed to fetch vendor';
            let status = 500;

            if (error.message === 'Vendor not found for this user') {
                message = error.message;
                status = 404;
            }

            return formatError('getVendorByUserId()', status, error, message, res);
        }
    }

    /**
     * Get all vendors with filters and pagination
     * GET /api/vendors
     * @param {Function} next - Express next middleware
     */
    static async getVendors(req, res, next) {
        
        try {

            const {
                page = 1,
                limit = 20,
                type,
                category,
                verificationStatus,
                status = 'active',
                search,
                sortBy,
                sortOrder,
                includeUser = false
            } = req.query;

            // Validate vendor type if provided
            if (type && !VENDOR_TYPES.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`
                });
            }

            // Validate category if provided
            if (category && !VENDOR_CATEGORIES.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid vendor category. Must be one of: ${VENDOR_CATEGORIES.join(', ')}`
                });
            }

            // Validate verification status if provided
            if (verificationStatus && !VERIFICATION_STATUSES.includes(verificationStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`
                });
            }

            // Validate status if provided
            if (status && !STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${STATUSES.join(', ')}`
                });
            }

            const result = await VendorService.getVendors({
                page: parseInt(page),
                limit: parseInt(limit),
                type,
                category,
                verificationStatus,
                status,
                search,
                sortBy,
                sortOrder,
                includeUser: includeUser === 'true'
            });

            return res.status(200).json({
                vendors: result.vendors,
                pagination: result.pagination
            });

        } catch (error) {
            return formatError('getVendors()', 500, error, 'Failed to fetch vendors', res);
        }
    }

    /**
     * Update vendor
     * PUT /api/vendors/:id
     * @param {Function} next - Express next middleware
     */
    static async updateVendor(req, res, next) {
        try {
            const { id } = req.params;
            const {
                businessName,
                businessAddress,
                tinNumber,
                vatNumber,
                taxRegistered,
                taxCountry,
                type,
                category,
                verificationStatus,
                status
            } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }

            if (!validate(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid vendor ID format'
                });
            }

            // Validate vendor type if provided
            if (type && !VENDOR_TYPES.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`
                });
            }

            // Validate category if provided
            if (category && !VENDOR_CATEGORIES.includes(category)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid vendor category. Must be one of: ${VENDOR_CATEGORIES.join(', ')}`
                });
            }

            // Validate verification status if provided
            if (verificationStatus && !VERIFICATION_STATUSES.includes(verificationStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`
                });
            }

            // Validate status if provided
            if (status && !STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${STATUSES.join(', ')}`
                });
            }

            const vendor = await VendorService.updateVendor(id, {
                businessName,
                businessAddress,
                tinNumber,
                vatNumber,
                taxRegistered,
                taxCountry,
                type,
                category,
                verificationStatus,
                status
            });

            return res.status(200).json({
                success: true,
                message: 'Vendor updated successfully',
                data: vendor
            });

        } catch (error) {
            let message = 'Failed to update vendor';
            let status = 500;

            if (error.message === 'Vendor not found') {
                message = error.message;
                status = 404;
            }

            if (error.message.includes('already exists')) {
                message = error.message;
                status = 409;
            }

            if (error.message.includes('Invalid')) {
                message = error.message;
                status = 400;
            }

            return formatError('updateVendor()', status, error, message, res);
        }
    }

    /**
     * Update vendor verification status
     * PATCH /api/vendors/:id/verification
     * @param {Function} next - Express next middleware
     */
    static async updateVendorVerificationStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }

            if (!validate(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid vendor ID format'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification status is required'
                });
            }

            if (!VERIFICATION_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`
                });
            }

            const vendor = await VendorService.updateVerificationStatus(id, status, reason);

            return res.status(200).json({
                success: true,
                message: 'Verification status updated successfully',
                data: vendor
            });

        } catch (error) {

            let message = 'Failed to update verification status';
            let status = 500;

            if (error.message === 'Vendor not found') {
                message = error.message;
                status = 404;
            }

            if (error.message.includes('already')) {
                message = error.message;
                status = 400
            }

            return formatError('updateVerificationStatus()', status, error, message, res);
        }
    }

    /**
     * Update vendor status
     * PATCH /api/vendors/:id/status
     * @param {Function} next - Express next middleware
     */
    static async updateVendorStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }

            if (!validate(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid vendor ID format'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
            }

            if (!STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${STATUSES.join(', ')}`
                });
            }

            const vendor = await VendorService.updateVendorStatus(id, status);

            return res.status(200).json({
                success: true,
                message: 'Vendor status updated successfully',
                data: vendor
            });

        } catch (error) {

            let message = 'Failed to update vendor status';
            let status = 500;

            if (error.message === 'Vendor not found') {
                message = error.message;
                status = 404;
            }

            if (error.message.includes('already')) {
                 message = error.message;
                 status = 400;
            }

            return formatError('updateVendorStatus()', status, error, message, res);
        }
    }

    /**
     * Delete vendor (soft delete)
     * DELETE /api/vendors/:id
     * @param {Function} next - Express next middleware
     */
    static async deleteVendor(req, res, next) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }

            if (!validate(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid vendor ID format'
                });
            }

            const vendor = await VendorService.deleteVendor(id);

            return res.status(200).json({
                success: true,
                message: 'Vendor deleted successfully',
                data: vendor
            });

        } catch (error) {
            let message = 'Failed to delete vendor';
            let status = 500;

            if (error.message === 'Vendor not found') {
                message = error.message;
                status = 404;
            }

            if (error.message.includes('already')) {
                 message = error.message;
                 status = 400;
            }

            return formatError('deleteVendor()', status, error, message, res);
        }
    }

    /**
     * Permanently remove vendor
     * DELETE /api/vendors/:id/permanent
     * @param {Function} next - Express next middleware
     */
    static async removeVendor(req, res, next) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }

            if (!validate(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid vendor ID format'
                });
            }

            const result = await VendorService.removeVendor(id);

            return res.status(200).json({
                success: true,
                message: 'Vendor permanently removed',
                data: { id, removed: result }
            });

        } catch (error) {

            let message = 'Failed to permanently remove vendor';
            let status = 500;

            if (error.message === 'Vendor not found') {
               message = error.message;
               status = 404;
            }

            if (error.message.includes('related records')) {
                message = error.message;
               status = 409;
            }

            return formatError('removeVendor()', status, error, message, res);
        }
    }

    /**
     * Get vendor statistics
     * GET /api/vendors/stats
     * @param {Function} next - Express next middleware
     */
    static async getVendorStats(req, res, next) {
        try {
            const stats = await VendorService.getVendorStats();

            return res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            return formatError('getVendorStatus()', status, error, 'Failed to get vendor statistics', res);
        }
    }

    /**
     * Search vendors
     * GET /api/vendors/search
     * @param {Function} next - Express next middleware
     */
    static async searchVendors(req, res, next) {
        try {
            const { q, page, limit, type, status, verificationStatus } = req.query;

            if (!q || q.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query must be at least 2 characters'
                });
            }

            const result = await VendorService.searchVendors(q, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                type,
                status,
                verificationStatus
            });

            return res.status(200).json({
                success: true,
                data: result.vendors,
                pagination: result.pagination
            });

        } catch (error) {
            return formatError('searchVendors()', status, error, 'Search failed', res);
        }
    }

    /**
     * Bulk update verification status
     * PATCH /api/vendors/bulk/verification
     * @param {Function} next - Express next middleware
     */
    static async bulkUpdateVerificationStatus(req, res, next) {
        try {
            const { ids, status } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor IDs array is required'
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification status is required'
                });
            }

            if (!VERIFICATION_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`
                });
            }

            // Validate all IDs
            const invalidIds = ids.filter(id => !validate(id));
            if (invalidIds.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid vendor ID format',
                    invalidIds
                });
            }

            const results = await VendorService.bulkUpdateVerificationStatus(ids, status);

            return res.status(200).json({
                success: true,
                message: 'Bulk verification update completed',
                data: results
            });

        } catch (error) {
            return formatError('bulkUpdateVerificationStatus()', status, error, 'Bulk update failed', res);
        }
    }

    /**
     * Update vendor's last active timestamp
     * PATCH /api/vendors/:id/active
     * @param {Function} next - Express next middleware
     */
    static async updateVendorLastActive(req, res, next) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Vendor ID is required'
                });
            }

            if (!validate(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid vendor ID format'
                });
            }

            const vendor = await VendorService.updateLastActive(id);

            return res.status(200).json({
                success: true,
                message: 'Last active timestamp updated',
                data: vendor
            });

        } catch (error) {
            let message = 'Failed to update last active timestamp';
            let status = 500
            if (error.message === 'Vendor not found') {
                message = error.message;
                status = 404;
            }

            return formatError('updateVendorLastActive()', status, error, message, res);
        }
    }

    /**
     * Get vendors by type with summary
     * GET /api/vendors/types/:type
     * @param {Function} next - Express next middleware
     */
    static async getVendorsByType(req, res, next) {
        try {
            const { type } = req.params;
            const { page = 1, limit = 20 } = req.query;

            if (!VENDOR_TYPES.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`
                });
            }

            const result = await VendorService.getVendorsByTypeWithSummary(type, {
                page: parseInt(page),
                limit: parseInt(limit)
            });

            return res.status(200).json({
                success: true,
                data: result.vendors,
                pagination: result.pagination,
                summary: result.summary
            });

        } catch (error) {
            return formatError('getVendorsByType()', status, error, 'Failed to fetch vendors by type', res);
        }
    }

    /**
     * Check if vendor exists for a user
     * GET /api/vendors/check/:userId
     * @param {Function} next - Express next middleware
     */
    static async checkVendorExists(req, res, next) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            if (!validate(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID format'
                });
            }

            const exists = await Vendor.vendorExistsByUserId(userId);

            return res.status(200).json({
                success: true,
                data: { exists }
            });

        } catch (error) {
            return formatError('getVendorsByType()', status, error, 'Failed to check vendor existence', res);
        }
    }

    /**
     * Get enum values for frontend
     * GET /api/vendors/enums
     * @param {Function} next - next middleware
     */
    static async getEnumValues(req, res, next) {
        try {
            return res.status(200).json({
                success: true,
                data: {
                    vendorTypes: VENDOR_TYPES,
                    vendorCategories: VENDOR_CATEGORIES,
                    verificationStatuses: VERIFICATION_STATUSES,
                    statuses: STATUSES
                }
            });

        } catch (error) {
            return formatError('getEnumValues', status, error, 'Failed to fetch enum values', res);
        }
    }
}

module.exports = VendorController;