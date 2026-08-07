/*
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
        REFERENCES users(id)
        ON DELETE RESTRICT,

    business_name VARCHAR(155) NOT NULL,
    business_address TEXT,

    tin_number VARCHAR(100),
    vat_number VARCHAR(100),
    tax_registered VARCHAR(100),
    tax_country VARCHAR(50),

    type vendor_type NOT NULL DEFAULT 'retailer',
    category vendor_category NOT NULL DEFAULT 'internal',

    verification_status vendor_verification_status
        NOT NULL DEFAULT 'pending',

    status status NOT NULL DEFAULT 'active',

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    last_active TIMESTAMPTZ
);
*/

const db = require('../configs/db');

const VENDOR_TYPES = ['retailer', 'wholesaler', 'distributor', 'manufacturer', 'supplier', 'dealer'];
const VENDOR_CATEGORIES = ['internal', 'external', 'preferred', 'standard'];
const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected', 'suspended'];
const STATUSES = ['active', 'inactive', 'disabled', 'deleted'];

class Vendor {
    /**
     * Create a new vendor
     * @param {Object} data - Vendor data
     * @param {string} data.userId - User ID (UUID)
     * @param {string} data.businessName - Business name
     * @param {string} data.businessAddress - Business address
     * @param {string} data.tinNumber - TIN number
     * @param {string} data.vatNumber - VAT number
     * @param {string} data.taxRegistered - Tax registration status
     * @param {string} data.taxCountry - Tax country
     * @param {string} data.type - Vendor type (retailer, wholesaler, etc.)
     * @param {string} data.category - Vendor category (internal, external, etc.)
     * @param {string} data.verificationStatus - Verification status
     * @param {string} data.status - Vendor status
     * @returns {Promise<Object>} Created vendor
     */
    static async createVendor({
        userId,
        businessName,
        businessAddress = null,
        tinNumber = null,
        vatNumber = null,
        taxRegistered = null,
        taxCountry = null,
        type = 'retailer',
        category = 'internal',
        verificationStatus = 'pending',
        status = 'active'
    }) {
        // Validate required fields
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (!businessName) {
            throw new Error('Business name is required');
        }

        // Validate enum values
        if (!VENDOR_TYPES.includes(type)) {
            throw new Error(`Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`);
        }
        if (!VENDOR_CATEGORIES.includes(category)) {
            throw new Error(`Invalid vendor category. Must be one of: ${VENDOR_CATEGORIES.join(', ')}`);
        }
        if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
            throw new Error(`Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
        }
        if (!STATUSES.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${STATUSES.join(', ')}`);
        }

        const query = `
            INSERT INTO vendors (
                user_id,
                business_name,
                business_address,
                tin_number,
                vat_number,
                tax_registered,
                tax_country,
                type,
                category,
                verification_status,
                status,
                joined_at,
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            RETURNING *
        `;

        const values = [
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
        ];

        try {
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new Error('A vendor with this user ID already exists');
            }
            if (error.code === '23503') { // Foreign key violation
                throw new Error('User not found');
            }
            throw error;
        }
    }

    /**
     * Get vendor by ID
     * @param {string} id - Vendor ID (UUID)
     * @param {Object} options - Query options
     * @param {boolean} options.includeUser - Include user details
     * @returns {Promise<Object>} Vendor object
     */
    static async getVendorById(id, { includeUser = false } = {}) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        let query = `
            SELECT v.*
            FROM vendors v
            WHERE v.id = $1
        `;

        if (includeUser) {
            query = `
                SELECT v.*, 
                       u.email, 
                       u.first_name, 
                       u.last_name,
                       u.phone,
                       u.avatar_url
                FROM vendors v
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.id = $1
            `;
        }

        try {
            const result = await db.query(query, [id]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get vendor by user ID
     * @param {string} userId - User ID (UUID)
     * @param {Object} options - Query options
     * @param {boolean} options.includeUser - Include user details
     * @returns {Promise<Object>} Vendor object
     */
    static async getVendorByUserId(userId, { includeUser = false } = {}) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        let query = `
            SELECT v.*
            FROM vendors v
            WHERE v.user_id = $1
        `;

        if (includeUser) {
            query = `
                SELECT v.*, 
                       u.email, 
                       u.first_name, 
                       u.last_name,
                       u.phone,
                       u.avatar_url
                FROM vendors v
                LEFT JOIN users u ON v.user_id = u.id
                WHERE v.user_id = $1
            `;
        }

        try {
            const result = await db.query(query, [userId]);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get all vendors with pagination and filters
     * @param {Object} options - Query options
     * @param {number} options.page - Page number
     * @param {number} options.limit - Items per page
     * @param {string} options.type - Filter by vendor type
     * @param {string} options.category - Filter by vendor category
     * @param {string} options.verificationStatus - Filter by verification status
     * @param {string} options.status - Filter by status
     * @param {string} options.search - Search term for business name, TIN, VAT
     * @param {boolean} options.includeUser - Include user details
     * @param {string} options.sortBy - Sort field
     * @param {string} options.sortOrder - Sort order (ASC/DESC)
     * @returns {Promise<Object>} Vendors with pagination data
     */
    static async getVendors({
        page = 1,
        limit = 20,
        type = null,
        category = null,
        verificationStatus = null,
        status = null,
        search = null,
        includeUser = false,
        sortBy = 'last_active',
        sortOrder = 'DESC'
    } = {}) {
        // Validate page and limit
        const offset = (page - 1) * limit;
        const validSortFields = ['business_name', 'type', 'status', 'verification_status', 'last_active', 'updated_at', 'joined_at'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'last_active';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let conditions = [];
        let values = [];
        let paramIndex = 1;

        // Build conditions
        if (type) {
            if (!VENDOR_TYPES.includes(type)) {
                throw new Error(`Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`);
            }
            conditions.push(`v.type = $${paramIndex++}`);
            values.push(type);
        }

        if (category) {
            if (!VENDOR_CATEGORIES.includes(category)) {
                throw new Error(`Invalid vendor category. Must be one of: ${VENDOR_CATEGORIES.join(', ')}`);
            }
            conditions.push(`v.category = $${paramIndex++}`);
            values.push(category);
        }

        if (verificationStatus) {
            if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
                throw new Error(`Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
            }
            conditions.push(`v.verification_status = $${paramIndex++}`);
            values.push(verificationStatus);
        }

        if (status) {
            if (!STATUSES.includes(status)) {
                throw new Error(`Invalid status. Must be one of: ${STATUSES.join(', ')}`);
            }
            conditions.push(`v.status = $${paramIndex++}`);
            values.push(status);
        }

        // Store search pattern for later use
        let searchPattern = null;
        if (search) {
            conditions.push(`(
            v.business_name ILIKE $${paramIndex++} OR
            v.tin_number ILIKE $${paramIndex++} OR
            v.vat_number ILIKE $${paramIndex++}
        )`);
            searchPattern = `%${search}%`;
            values.push(searchPattern, searchPattern, searchPattern);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Build select fields
        const selectFields = includeUser ? `
        v.*,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.avatar_url
    ` : 'v.*';

        // Build the main query with parameters
        const queryValues = [...values, limit, offset];
        const query = `
        SELECT ${selectFields}
        FROM vendors v
        ${includeUser ? 'LEFT JOIN users u ON v.user_id = u.id' : ''}
        ${whereClause}
        ORDER BY v.${sortField} ${order}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        const countConditions = conditions.slice(); // Copy conditions
        const countValues = [...values]; // Copy values

        // Remove the search patterns from the count query values
        // We need to pass the same parameters but without the LIMIT/OFFSET ones
        let countParamIndex = 1;
        let countConditionsArray = [];
        let countValuesArray = [];

        // Rebuild conditions for count query with new parameter indexes
        if (type) {
            countConditionsArray.push(`v.type = $${countParamIndex++}`);
            countValuesArray.push(type);
        }
        if (category) {
            countConditionsArray.push(`v.category = $${countParamIndex++}`);
            countValuesArray.push(category);
        }
        if (verificationStatus) {
            countConditionsArray.push(`v.verification_status = $${countParamIndex++}`);
            countValuesArray.push(verificationStatus);
        }
        if (status) {
            countConditionsArray.push(`v.status = $${countParamIndex++}`);
            countValuesArray.push(status);
        }
        if (search) {
            countConditionsArray.push(`(
            v.business_name ILIKE $${countParamIndex++} OR
            v.tin_number ILIKE $${countParamIndex++} OR
            v.vat_number ILIKE $${countParamIndex++}
        )`);
            countValuesArray.push(searchPattern, searchPattern, searchPattern);
        }

        const countWhereClause = countConditionsArray.length > 0 ? `WHERE ${countConditionsArray.join(' AND ')}` : '';

        const countQuery = `
        SELECT COUNT(*) as total
        FROM vendors v
        ${countWhereClause}
    `;

        try {
            // Execute both queries
            const [result, countResult] = await Promise.all([
                db.query(query, queryValues),
                db.query(countQuery, countValuesArray)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            return {
                vendors: result.rows,
                pagination: {
                    total,
                    totalPages,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            console.error('getVendors error:', error);
            throw error;
        }
    }

    /**
     * Update vendor
     * @param {string} id - Vendor ID (UUID)
     * @param {Object} data - Update data
     * @param {string} data.businessName - Business name
     * @param {string} data.businessAddress - Business address
     * @param {string} data.tinNumber - TIN number
     * @param {string} data.vatNumber - VAT number
     * @param {string} data.taxRegistered - Tax registration status
     * @param {string} data.taxCountry - Tax country
     * @param {string} data.type - Vendor type
     * @param {string} data.category - Vendor category
     * @param {string} data.verificationStatus - Verification status
     * @param {string} data.status - Vendor status
     * @returns {Promise<Object>} Updated vendor
     */
    static async updateVendor(id, data) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

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
        } = data;

        // Validate enum values if provided
        if (type && !VENDOR_TYPES.includes(type)) {
            throw new Error(`Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`);
        }
        if (category && !VENDOR_CATEGORIES.includes(category)) {
            throw new Error(`Invalid vendor category. Must be one of: ${VENDOR_CATEGORIES.join(', ')}`);
        }
        if (verificationStatus && !VERIFICATION_STATUSES.includes(verificationStatus)) {
            throw new Error(`Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
        }
        if (status && !STATUSES.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${STATUSES.join(', ')}`);
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (businessName !== undefined) {
            updates.push(`business_name = $${paramIndex++}`);
            values.push(businessName);
        }
        if (businessAddress !== undefined) {
            updates.push(`business_address = $${paramIndex++}`);
            values.push(businessAddress);
        }
        if (tinNumber !== undefined) {
            updates.push(`tin_number = $${paramIndex++}`);
            values.push(tinNumber);
        }
        if (vatNumber !== undefined) {
            updates.push(`vat_number = $${paramIndex++}`);
            values.push(vatNumber);
        }
        if (taxRegistered !== undefined) {
            updates.push(`tax_registered = $${paramIndex++}`);
            values.push(taxRegistered);
        }
        if (taxCountry !== undefined) {
            updates.push(`tax_country = $${paramIndex++}`);
            values.push(taxCountry);
        }
        if (type !== undefined) {
            updates.push(`type = $${paramIndex++}`);
            values.push(type);
        }
        if (category !== undefined) {
            updates.push(`category = $${paramIndex++}`);
            values.push(category);
        }
        if (verificationStatus !== undefined) {
            updates.push(`verification_status = $${paramIndex++}`);
            values.push(verificationStatus);
        }
        if (status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(status);
        }

        if (updates.length === 0) {
            throw new Error('No fields to update');
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
            UPDATE vendors
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        try {
            const result = await db.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Vendor not found');
            }
            return result.rows[0];
        } catch (error) {
            if (error.code === '23505') {
                throw new Error('A vendor with this user ID already exists');
            }
            throw error;
        }
    }

    /**
     * Update vendor's verification status
     * @param {string} id - Vendor ID (UUID)
     * @param {string} verificationStatus - New verification status
     * @param {string} reason - Optional reason for status change
     * @returns {Promise<Object>} Updated vendor
     */
    static async updateVerificationStatus(id, verificationStatus, reason = null) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
            throw new Error(`Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
        }

        const query = `
            UPDATE vendors
            SET verification_status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        try {
            const result = await db.query(query, [verificationStatus, id]);
            if (result.rows.length === 0) {
                throw new Error('Vendor not found');
            }
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update vendor's status
     * @param {string} id - Vendor ID (UUID)
     * @param {string} status - New status
     * @returns {Promise<Object>} Updated vendor
     */
    static async updateVendorStatus(id, status) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!STATUSES.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${STATUSES.join(', ')}`);
        }

        const query = `
            UPDATE vendors
            SET status = $1
            WHERE id = $2
            RETURNING *
        `;

        try {
            const result = await db.query(query, [status, id]);
            if (result.rows.length === 0) {
                throw new Error('Vendor not found');
            }
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete vendor (soft delete - sets status to 'inactive')
     * @param {string} id - Vendor ID (UUID)
     * @returns {Promise<Object>} Deleted vendor
     */
    static async deleteVendor(id) {
        return this.updateVendorStatus(id, 'inactive');
    }

    /**
     * Permanently remove vendor from database
     * @param {string} id - Vendor ID (UUID)
     * @returns {Promise<boolean>} True if deleted
     */
    static async removeVendor(id) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        const query = `
            DELETE FROM vendors
            WHERE id = $1
            RETURNING id
        `;

        try {
            const result = await db.query(query, [id]);
            if (result.rows.length === 0) {
                throw new Error('Vendor not found');
            }
            return true;
        } catch (error) {
            if (error.code === '23503') { // Foreign key violation
                throw new Error('Cannot delete vendor with existing related records');
            }
            throw error;
        }
    }

    /**
     * Update vendor's last active timestamp
     * @param {string} id - Vendor ID (UUID)
     * @returns {Promise<Object>} Updated vendor
     */
    static async updateLastActive(id) {
        if (!id) {
            throw new Error('Vendor ID is required');
        }

        const query = `
            UPDATE vendors
            SET last_active = NOW()
            WHERE id = $1
            RETURNING *
        `;

        try {
            const result = await db.query(query, [id]);
            if (result.rows.length === 0) {
                throw new Error('Vendor not found');
            }
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Check if a vendor exists by user ID
     * @param {string} userId - User ID (UUID)
     * @returns {Promise<boolean>} True if vendor exists
     */
    static async vendorExistsByUserId(userId) {
        if (!userId) {
            return false;
        }

        const query = `
            SELECT EXISTS(
                SELECT 1 FROM vendors WHERE user_id = $1
            ) as exists
        `;

        try {
            const result = await db.query(query, [userId]);
            return result.rows[0].exists;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get vendors by type
     * @param {string} type - Vendor type
     * @param {Object} options - Query options
     * @param {number} options.limit - Items per page
     * @param {number} options.page - Page number
     * @returns {Promise<Object>} Vendors with pagination
     */
    static async getVendorsByType(type, { limit = 20, page = 1 } = {}) {
        return this.getVendors({
            type,
            limit,
            page
        });
    }

    /**
     * Get vendors by verification status
     * @param {string} verificationStatus - Verification status
     * @param {Object} options - Query options
     * @param {number} options.limit - Items per page
     * @param {number} options.page - Page number
     * @returns {Promise<Object>} Vendors with pagination
     */
    static async getVendorsByVerificationStatus(verificationStatus, { limit = 20, page = 1 } = {}) {
        return this.getVendors({
            verificationStatus,
            limit,
            page
        });
    }

    /**
     * Get vendor statistics
     * @returns {Promise<Object>} Vendor statistics
     */
    static async getVendorStats() {
        const query = `
            SELECT 
                COUNT(*) as total_vendors,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_vendors,
                COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_vendors,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_vendors,
                COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_vendors,
                COUNT(CASE WHEN verification_status = 'pending' THEN 1 END) as pending_verification,
                COUNT(CASE WHEN verification_status = 'rejected' THEN 1 END) as rejected_vendors,
                COUNT(CASE WHEN verification_status = 'suspended' THEN 1 END) as suspended_vendors,
                COUNT(DISTINCT type) as vendor_types,
                COUNT(DISTINCT category) as vendor_categories
            FROM vendors
        `;

        try {
            const result = await db.query(query);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Search vendors by business name
     * @param {string} searchTerm - Search term
     * @param {Object} options - Query options
     * @param {number} options.limit - Items per page
     * @param {number} options.page - Page number
     * @returns {Promise<Object>} Vendors with pagination
     */
    static async searchVendors(searchTerm, { limit = 20, page = 1 } = {}) {
        return this.getVendors({
            search: searchTerm,
            limit,
            page
        });
    }
}

// Export enum constants for use in routes/controllers
module.exports = {
    Vendor,
    VENDOR_TYPES,
    VENDOR_CATEGORIES,
    VERIFICATION_STATUSES,
    STATUSES
};