// ========== VENDOR SERVICE ==========
// services/vendorService.js

const { Vendor, VENDOR_TYPES, VENDOR_CATEGORIES, VERIFICATION_STATUSES, STATUSES } = require('../models/vendor.model');
const { validate } = require('uuid');

class VendorService {
    /**
     * Create a new vendor with validation
     * @param {Object} vendorData - Vendor creation data
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Created vendor with user details
     */
    static async createVendor(vendorData, options = {}) {
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
        } = vendorData;

        // Validate required fields
        this._validateRequiredFields({ userId, businessName });

        // Validate UUID
        if (!validate(userId)) {
            throw new Error('Invalid user ID format');
        }

        // Validate business name length
        if (businessName.length < 2 || businessName.length > 155) {
            throw new Error('Business name must be between 2 and 155 characters');
        }

        // Validate TIN/VAT if provided
        if (tinNumber && tinNumber.length > 100) {
            throw new Error('TIN number cannot exceed 100 characters');
        }
        if (vatNumber && vatNumber.length > 100) {
            throw new Error('VAT number cannot exceed 100 characters');
        }

        // Validate email format if provided (assuming user exists)
        // Note: Email validation should be done at user level

        // Check if vendor already exists for this user
        const existingVendor = await Vendor.getVendorByUserId(userId);
        if (existingVendor) {
            throw new Error('A vendor profile already exists for this user');
        }

        // Check for duplicate business name (case insensitive)
        const existingBusiness = await this._findVendorByBusinessName(businessName);
        if (existingBusiness) {
            throw new Error('A vendor with this business name already exists');
        }

        try {
            const vendor = await Vendor.createVendor({
                userId,
                businessName: businessName.trim(),
                businessAddress: businessAddress?.trim() || null,
                tinNumber: tinNumber?.trim() || null,
                vatNumber: vatNumber?.trim() || null,
                taxRegistered: taxRegistered?.trim() || null,
                taxCountry: taxCountry?.trim() || null,
                type: type || 'retailer',
                category: category || 'internal',
                verificationStatus: verificationStatus || 'pending',
                status: status || 'active'
            });

            // Log vendor creation (if you have a logging system)
            //TODO implement: logging activity
            console.log(`Vendor created: ${vendor.id} - ${vendor.business_name}`);

            return vendor;
        } catch (error) {
            // Re-throw with additional context
            throw new Error(`Failed to create vendor: ${error.message}`);
        }
    }

    /**
     * Get vendor by ID with optional user details
     * @param {string} id - Vendor UUID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Vendor object
     */
    static async getVendorById(id, options = {}) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!validate(id)) {
            throw new Error('Invalid vendor ID format');
        }

        const vendor = await Vendor.getVendorById(id, options);

        if (!vendor) {
            throw new Error('Vendor not found');
        }

        return vendor;
    }

    /**
     * Get vendor by user ID
     * @param {string} userId - User UUID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Vendor object
     */
    static async getVendorByUserId(userId, options = {}) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        if (!validate(userId)) {
            throw new Error('Invalid user ID format');
        }

        const vendor = await Vendor.getVendorByUserId(userId, options);

        if (!vendor) {
            throw new Error('Vendor not found for this user');
        }

        return vendor;
    }

    /**
     * Get all vendors with filters, sorting, and pagination
     * @param {Object} filters - Filter and pagination options
     * @returns {Promise<Object>} Vendors with pagination
     */
    static async getVendors(filters = {}) {
        const {
            page = 1,
            limit = 20,
            type,
            category,
            verificationStatus,
            status,
            search,
            sortBy = 'last_active',
            sortOrder = 'DESC',
            includeUser = false
        } = filters;

        // Validate pagination
        const validatedPage = Math.max(1, parseInt(page) || 1);
        const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

        // Validate sort field
        const validSortFields = ['business_name', 'type', 'status', 'verification_status', 'last_active', 'updated_at'];
        const validSortOrder = ['ASC', 'DESC'];
        const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'last_active';
        const validatedSortOrder = validSortOrder.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        try {
            const result = await Vendor.getVendors({
                page: validatedPage,
                limit: validatedLimit,
                type,
                category,
                verificationStatus,
                status,
                search,
                includeUser,
                sortBy: validatedSortBy,
                sortOrder: validatedSortOrder
            });

            return result;
        } catch (error) {
            
            throw new Error(`Failed to fetch vendors: ${error.message}`);
        }
    }

    /**
     * Update vendor with validation
     * @param {string} id - Vendor UUID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated vendor
     */
    static async updateVendor(id, updateData) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!validate(id)) {
            throw new Error('Invalid vendor ID format');
        }

        // Get existing vendor first
        const existingVendor = await Vendor.getVendorById(id);
        if (!existingVendor) {
            throw new Error('Vendor not found');
        }

        // Validate and clean data
        const cleanedData = this._cleanUpdateData(updateData);

        // Check if business name is being updated and if it's unique
        if (cleanedData.businessName && cleanedData.businessName !== existingVendor.business_name) {
            const existingBusiness = await this._findVendorByBusinessName(cleanedData.businessName);
            if (existingBusiness && existingBusiness.id !== id) {
                throw new Error('A vendor with this business name already exists');
            }
        }

        // Prevent updating user_id (should be handled separately if needed)
        delete cleanedData.userId;

        try {
            const updated = await Vendor.updateVendor(id, cleanedData);

            // Log update
            //TODO Implement: Log activity in system
            console.log(`Vendor updated: ${id} - ${updated.business_name}`);

            return updated;
        } catch (error) {
            throw new Error(`Failed to update vendor: ${error.message}`);
        }
    }

    /**
     * Update vendor verification status with reason
     * @param {string} id - Vendor UUID
     * @param {string} status - New verification status
     * @param {string} reason - Reason for status change
     * @returns {Promise<Object>} Updated vendor
     */
    static async updateVerificationStatus(id, status, reason = null) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!validate(id)) {
            throw new Error('Invalid vendor ID format');
        }

        if (!VERIFICATION_STATUSES.includes(status)) {
            throw new Error(`Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
        }

        const existingVendor = await Vendor.getVendorById(id);
        if (!existingVendor) {
            throw new Error('Vendor not found');
        }

        // Prevent updating to same status
        if (existingVendor.verification_status === status) {
            throw new Error(`Vendor is already ${status}`);
        }

        try {
            const updated = await Vendor.updateVerificationStatus(id, status);

            // Log verification change
            //TODO Implement: Log activity in system
            console.log(`Vendor verification updated: ${id} - ${existingVendor.verification_status} → ${status}`);
            if (reason) {
                console.log(`   Reason: ${reason}`);
            }

            return updated;
        } catch (error) {
            throw new Error(`Failed to update verification status: ${error.message}`);
        }
    }

    /**
     * Update vendor status
     * @param {string} id - Vendor UUID
     * @param {string} status - New status
     * @returns {Promise<Object>} Updated vendor
     */
    static async updateVendorStatus(id, status) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!validate(id)) {
            throw new Error('Invalid vendor ID format');
        }

        if (!STATUSES.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${STATUSES.join(', ')}`);
        }

        const existingVendor = await Vendor.getVendorById(id);
        if (!existingVendor) {
            throw new Error('Vendor not found');
        }

        // Prevent updating to same status
        if (existingVendor.status === status) {
            throw new Error(`Vendor is already ${status}`);
        }

        try {
            const updated = await Vendor.updateVendorStatus(id, status);

            //TODO Implement: Log activity in system
            console.log(`✅ Vendor status updated: ${id} - ${existingVendor.status} → ${status}`);

            return updated;
        } catch (error) {
            throw new Error(`Failed to update vendor status: ${error.message}`);
        }
    }

    /**
     * Delete vendor (soft delete)
     * @param {string} id - Vendor UUID
     * @returns {Promise<Object>} Deleted vendor
     */
    static async deleteVendor(id) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!validate(id)) {
            throw new Error('Invalid vendor ID format');
        }

        const existingVendor = await Vendor.getVendorById(id);
        if (!existingVendor) {
            throw new Error('Vendor not found');
        }

        // Check if vendor is already inactive
        if (existingVendor.status === 'inactive') {
            throw new Error('Vendor is already deleted');
        }

        try {
            const deleted = await Vendor.deleteVendor(id);

            //TODO Implement: Log activity in system
            console.log(`Vendor deleted (soft): ${id} - ${deleted.business_name}`);

            return deleted;
        } catch (error) {
            throw new Error(`Failed to delete vendor: ${error.message}`);
        }
    }

    /**
     * Permanently remove vendor
     * @param {string} id - Vendor UUID
     * @returns {Promise<boolean>} True if removed
     */
    static async removeVendor(id) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!validate(id)) {
            throw new Error('Invalid vendor ID format');
        }

        const existingVendor = await Vendor.getVendorById(id);
        if (!existingVendor) {
            throw new Error('Vendor not found');
        }

        // Check if vendor has related records (orders, products, etc.)
        // This would need additional checks based on your schema
        // const hasRelatedRecords = await this._checkRelatedRecords(id);
        // if (hasRelatedRecords) {
        //     throw new Error('Cannot remove vendor with existing related records');
        // }

        try {
            const result = await Vendor.removeVendor(id);

            //TODO Implement: Log activity in system
            console.log(`Vendor permanently removed: ${id} - ${existingVendor.business_name}`);

            return result;
        } catch (error) {
            throw new Error(`Failed to remove vendor: ${error.message}`);
        }
    }

    /**
     * Get vendor statistics
     * @returns {Promise<Object>} Vendor statistics
     */
    static async getVendorStats() {
        try {
            const stats = await Vendor.getVendorStats();

            // Add additional calculated stats
            return {
                ...stats,
                verificationRate: stats.total_vendors > 0
                    ? Math.round((stats.verified_vendors / stats.total_vendors) * 100)
                    : 0,
                activeRate: stats.total_vendors > 0
                    ? Math.round((stats.active_vendors / stats.total_vendors) * 100)
                    : 0
            };
        } catch (error) {
            throw new Error(`Failed to get vendor statistics: ${error.message}`);
        }
    }

    /**
     * Search vendors by multiple criteria
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Object>} Search results
     */
    static async searchVendors(query, options = {}) {
        if (!query || query.trim().length < 2) {
            throw new Error('Search query must be at least 2 characters');
        }

        const {
            page = 1,
            limit = 20,
            type,
            status,
            verificationStatus
        } = options;

        try {
            const result = await Vendor.getVendors({
                search: query.trim(),
                page,
                limit,
                type,
                status,
                verificationStatus,
                includeUser: true
            });

            return result;
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    /**
     * Bulk update vendor verification status
     * @param {Array<string>} ids - Array of vendor UUIDs
     * @param {string} status - New verification status
     * @returns {Promise<Object>} Update results
     */
    static async bulkUpdateVerificationStatus(ids, status) {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            throw new Error('No vendor IDs provided');
        }

        if (!VERIFICATION_STATUSES.includes(status)) {
            throw new Error(`Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
        }

        const results = {
            success: [],
            failed: [],
            errors: []
        };

        for (const id of ids) {
            try {
                const updated = await this.updateVerificationStatus(id, status);
                results.success.push(updated.id);
            } catch (error) {
                results.failed.push(id);
                results.errors.push({ id, error: error.message });
            }
        }

        return results;
    }

    /**
     * Get vendors by type with summary
     * @param {string} type - Vendor type
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Vendors with summary
     */
    static async getVendorsByTypeWithSummary(type, options = {}) {
        if (!VENDOR_TYPES.includes(type)) {
            throw new Error(`Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`);
        }

        const { page = 1, limit = 20 } = options;

        const result = await Vendor.getVendorsByType(type, { page, limit });

        // Get summary for this type
        const summary = await this._getTypeSummary(type);

        return {
            ...result,
            summary
        };
    }

    /**
     * Update vendor's last active timestamp
     * @param {string} id - Vendor UUID
     * @returns {Promise<Object>} Updated vendor
     */
    static async updateLastActive(id) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!validate(id)) {
            throw new Error('Invalid vendor ID format');
        }

        const existingVendor = await Vendor.getVendorById(id);
        if (!existingVendor) {
            throw new Error('Vendor not found');
        }

        try {
            const updated = await Vendor.updateLastActive(id);
            return updated;
        } catch (error) {
            throw new Error(`Failed to update last active timestamp: ${error.message}`);
        }
    }

    // ========== PRIVATE HELPER METHODS ==========

    /**
     * Validate required fields
     * @private
     */
    static _validateRequiredFields(fields) {
        const required = ['userId', 'businessName'];
        const missing = required.filter(field => !fields[field]);

        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
    }

    /**
     * Clean update data - remove undefined and trim strings
     * @private
     */
    static _cleanUpdateData(data) {
        const cleaned = {};

        // Map of field names (frontend -> database)
        const fieldMap = {
            businessName: 'businessName',
            businessAddress: 'businessAddress',
            tinNumber: 'tinNumber',
            vatNumber: 'vatNumber',
            taxRegistered: 'taxRegistered',
            taxCountry: 'taxCountry',
            type: 'type',
            category: 'category',
            verificationStatus: 'verificationStatus',
            status: 'status'
        };

        for (const [key, dbKey] of Object.entries(fieldMap)) {
            if (data[key] !== undefined && data[key] !== null) {
                // Trim strings
                const value = typeof data[key] === 'string' ? data[key].trim() : data[key];
                if (value !== '' || value !== null) {
                    cleaned[dbKey] = value;
                }
            }
        }

        return cleaned;
    }

    /**
     * Find vendor by business name (case insensitive)
     * @private
     */
    static async _findVendorByBusinessName(businessName) {
        const result = await Vendor.getVendors({
            search: businessName,
            limit: 1
        });

        return result.vendors.length > 0 ? result.vendors[0] : null;
    }

    /**
     * Get summary for a specific vendor type
     * @private
     */
    static async _getTypeSummary(type) {
        try {
            const result = await Vendor.getVendors({
                type,
                limit: 1
            });

            const stats = await Vendor.getVendorStats();

            return {
                type,
                total: stats.total_vendors,
                active: stats.active_vendors,
                verified: stats.verified_vendors
            };
        } catch (error) {
            return {
                type,
                error: 'Unable to fetch summary'
            };
        }
    }

    /**
     * Check if vendor has related records
     * @private
     */
    static async _checkRelatedRecords(id) {
        // For now, return false (no related records)
        return false;
    }
}

module.exports = VendorService;