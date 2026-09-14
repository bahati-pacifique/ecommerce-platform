const {
    Vendor,
    VENDOR_TYPES,
    VENDOR_CATEGORIES,
    VERIFICATION_STATUSES,
    STATUSES,
    APPLICATION_STATUSES
} = require('../models/vendor.model');

class VendorService {

    // ============================================================
    // VENDOR APPLICATIONS
    // ============================================================

    /**
     * Submit a new vendor application.
     *
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    static async submitVendorApplication(data) {
        const {
            userId,
            businessName,
            businessAddress,
            tinNumber,
            vatNumber,
            taxRegistered,
            taxCountry,
            type = 'retailer',
            category = 'internal'
        } = data;

        if (!userId) {
            throw new Error('User ID is required');
        }

        if (!businessName?.trim()) {
            throw new Error('Business name is required');
        }

        // A user should not submit another application
        // if they already have an active vendor.
        const existingVendor =
            await Vendor.vendorExistsByUserId(userId);

        if (existingVendor) {
            throw new Error(
                'This user already has a vendor account'
            );
        }

        // Prevent duplicate pending applications.
        const existingApplication =
            await Vendor.getPendingVendorApplicationByUserId(userId);

        if (existingApplication) {
            throw new Error(
                'This user already has a vendor application under review'
            );
        }else{
            console.log("User has no pend application")
        }

        return Vendor.submitVendorApplication({
            userId,
            businessName: businessName.trim(),
            businessAddress,
            tinNumber,
            vatNumber,
            taxRegistered,
            taxCountry,
            type,
            category
        });
    }


    /**
     * Get a vendor application by ID.
     *
     * @param {string} applicationId
     * @param {Object} options
     * @returns {Promise<Object|null>}
     */
    static async getVendorApplication(
        identifier,
        { includeUser = false } = {}
    ) {
        return Vendor.getVendorApplication(
            identifier,
            { includeUser }
        );
    }


    /**
     * Get the current user's vendor application.
     *
     * @param {string} userId
     * @param {Object} options
     * @returns {Promise<Object|null>}
     */
    static async getVendorApplicationByUserId(
        userId,
        { includeUser = false } = {}
    ) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        return Vendor.getVendorApplicationByUserId(
            userId,
            { includeUser }
        );
    }


    /**
     * Get vendor applications with filtering and pagination.
     *
     * @param {Object} options
     * {
        page = 1,
        limit = 20,
        type = null,
        category = null,
        status = null,
        search = null,
        includeUser = false,
        sortBy = 'created_at',
        sortOrder = 'DESC'
    }
     * @returns {Promise<Object>}
     */
    static async getVendorApplications(options = {}) {
        return Vendor.getVendorApplications(options);
    }


    /**
     * Review/update an application.
     *
     * This method is intended for statuses such as:
     * - under_review
     * - missing_requirement
     * - rejected
     *
     * Approval should go through approveVendorApplication()
     * because approval creates the vendor account.
     *
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    static async updateVendorApplicationStatus({
        applicationId,
        status,
        reviewerId,
        rejectionReason = null
    }) {
        if (!applicationId) {
            throw new Error('Application ID is required');
        }

        if (!reviewerId) {
            throw new Error('Reviewer ID is required');
        }

        if (!APPLICATION_STATUSES.includes(status)) {
            throw new Error(
                `Invalid application status. Must be one of: ${APPLICATION_STATUSES.join(', ')}`
            );
        }

        // Approval must use the transactional approval method.
        if (status === 'approved') {
            return this.approveVendorApplication({
                applicationId,
                reviewerId
            });
        }

        return Vendor.updateVendorApplicationStatus({
            applicationId,
            status,
            reviewerId,
            rejectionReason
        });
    }


    /**
     * Approve a vendor application.
     *
     * This creates the vendor and marks the application approved
     * inside one database transaction.
     *
     * @param {string} applicationId
     * @param {string} reviewerId
     * @returns {Promise<Object>}
     */
    static async approveVendorApplication({
        applicationId,
        reviewerId
    }) {
        if (!applicationId) {
            throw new Error('Application ID is required');
        }

        if (!reviewerId) {
            throw new Error('Reviewer ID is required');
        }

        return Vendor.approveVendorApplication({
            applicationId,
            reviewerId
        });
    }


    /**
     * Reject a vendor application.
     *
     * @param {string} applicationId
     * @param {string} reviewerId
     * @param {string} rejectionReason
     * @returns {Promise<Object>}
     */
    static async rejectVendorApplication({
        applicationId,
        reviewerId,
        rejectionReason
    }) {
        if (!rejectionReason?.trim()) {
            throw new Error(
                'A rejection reason is required'
            );
        }

        return Vendor.updateVendorApplicationStatus({
            applicationId,
            status: 'rejected',
            reviewerId,
            rejectionReason: rejectionReason.trim()
        });
    }


    /**
     * Mark an application as missing requirements.
     *
     * @param {string} applicationId
     * @param {string} reviewerId
     * @returns {Promise<Object>}
     */
    static async markApplicationMissingRequirement({
        applicationId,
        reviewerId
    }) {
        return Vendor.updateVendorApplicationStatus({
            applicationId,
            status: 'missing_requirement',
            reviewerId
        });
    }


    /**
     * Return an application to under review.
     *
     * @param {string} applicationId
     * @param {string} reviewerId
     * @returns {Promise<Object>}
     */
    static async returnApplicationToReview({
        applicationId,
        reviewerId
    }) {
        return Vendor.updateVendorApplicationStatus({
            applicationId,
            status: 'under_review',
            reviewerId
        });
    }


    // ============================================================
    // VENDORS
    // ============================================================

    /**
     * Get vendor by ID.
     *
     * @param {string} vendorId
     * @param {Object} options
     * @returns {Promise<Object|null>}
     */
    static async getVendorById(
        vendorId,
        { includeUser = false } = {}
    ) {
        return Vendor.getVendorById(
            vendorId,
            { includeUser }
        );
    }


    /**
     * Get vendor belonging to a user.
     *
     * @param {string} userId
     * @param {Object} options
     * @returns {Promise<Object|null>}
     */
    static async getVendorByUserId(
        userId,
        { includeUser = false } = {}
    ) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        return Vendor.getVendorByUserId(
            userId,
            { includeUser }
        );
    }


    /**
     * Get vendors with pagination and filtering.
     *
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    static async getVendors(options = {}) {
        return Vendor.getVendors(options);
    }


    /**
     * Get vendors by vendor type.
     *
     * @param {string} type
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    static async getVendorsByType(
        type,
        options = {}
    ) {
        if (!VENDOR_TYPES.includes(type)) {
            throw new Error(
                `Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`
            );
        }

        return Vendor.getVendorsByType(
            type,
            options
        );
    }


    /**
     * Get vendors by verification status.
     *
     * @param {string} verificationStatus
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    static async getVendorsByVerificationStatus(
        verificationStatus,
        options = {}
    ) {
        if (!VERIFICATION_STATUSES.includes(
            verificationStatus
        )) {
            throw new Error(
                `Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`
            );
        }

        return Vendor.getVendorsByVerificationStatus(
            verificationStatus,
            options
        );
    }


    /**
     * Search vendors.
     *
     * @param {string} searchTerm
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    static async searchVendors(
        searchTerm,
        options = {}
    ) {
        if (!searchTerm?.trim()) {
            throw new Error('Search term is required');
        }

        return Vendor.searchVendors(
            searchTerm.trim(),
            options
        );
    }


    /**
     * Update vendor information.
     *
     * @param {string} vendorId
     * @param {Object} data
     * @returns {Promise<Object>}
     */
    static async updateVendor(vendorId, data) {
        if (!vendorId) {
            throw new Error('Vendor ID is required');
        }

        if (!data || typeof data !== 'object') {
            throw new Error('Vendor data is required');
        }

        return Vendor.updateVendor(
            vendorId,
            data
        );
    }


    /**
     * Update vendor verification status.
     *
     * @param {string} vendorId
     * @param {string} verificationStatus
     * @returns {Promise<Object>}
     */
    static async updateVerificationStatus(
        vendorId,
        verificationStatus
    ) {
        if (!VERIFICATION_STATUSES.includes(
            verificationStatus
        )) {
            throw new Error(
                `Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`
            );
        }

        return Vendor.updateVerificationStatus(
            vendorId,
            verificationStatus
        );
    }


    /**
     * Activate/suspend/disable/etc. a vendor.
     *
     * @param {string} vendorId
     * @param {string} status
     * @returns {Promise<Object>}
     */
    static async updateVendorStatus(
        vendorId,
        status
    ) {
        if (!STATUSES.includes(status)) {
            throw new Error(
                `Invalid vendor status. Must be one of: ${STATUSES.join(', ')}`
            );
        }

        return Vendor.updateVendorStatus(
            vendorId,
            status
        );
    }


    /**
     * Soft-delete a vendor.
     *
     * @param {string} vendorId
     * @returns {Promise<Object>}
     */
    static async deleteVendor(vendorId) {
        if (!vendorId) {
            throw new Error('Vendor ID is required');
        }

        return Vendor.deleteVendor(vendorId);
    }


    /**
     * Permanently remove a vendor.
     *
     * This should normally be restricted to administrative/
     * maintenance operations.
     *
     * @param {string} vendorId
     * @returns {Promise<boolean>}
     */
    static async removeVendor(vendorId) {
        if (!vendorId) {
            throw new Error('Vendor ID is required');
        }

        return Vendor.removeVendor(vendorId);
    }


    /**
     * Update vendor activity timestamp.
     *
     * @param {string} vendorId
     * @returns {Promise<Object>}
     */
    static async updateLastActive(vendorId) {
        return Vendor.updateLastActive(vendorId);
    }


    /**
     * Check whether a user already has a vendor.
     *
     * @param {string} userId
     * @returns {Promise<boolean>}
     */
    static async vendorExistsByUserId(userId) {
        return Vendor.vendorExistsByUserId(userId);
    }


    /**
     * Get vendor statistics.
     *
     * @returns {Promise<Object>}
     */
    static async getVendorStats() {
        return Vendor.getVendorStats();
    }

    static async checkBusinessUsername(username){
        try {
            const isAvailable = await Vendor.checkBusinessUsernameAvailable(username);
            return isAvailable;
        } catch (error) {
            console.log("checkBusinessUsername(): ",error)
            return null;
        }
    }
}

module.exports = VendorService;