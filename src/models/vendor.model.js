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


// ============================================================
// ENUM VALUES
// ============================================================

const VENDOR_TYPES = [
    'retailer',
    'wholesaler',
    'distributor',
    'manufacturer',
    'supplier',
    'dealer'
];

const VENDOR_CATEGORIES = [
    'internal',
    'external',
    'preferred',
    'standard'
];

const VERIFICATION_STATUSES = [
    'pending',
    'verified',
    'rejected',
    'suspended'
];

const STATUSES = [
    'active',
    'inactive',
    'disabled',
    'deleted'
];

const APPLICATION_STATUSES = [
    'under_review',
    'missing_requirement',
    'approved',
    'rejected'
];


// ============================================================
// VENDOR MODEL
// ============================================================

class Vendor {


    // ========================================================
    // VENDOR APPLICATIONS
    // ========================================================

    /**
     * Submit a new vendor application.
     *
     * @param {Object} data
     * @param {string} data.userId
     * @param {string} data.businessName
     * @param {string|null} data.businessAddress
     * @param {string|null} data.tinNumber
     * @param {string|null} data.vatNumber
     * @param {string|null} data.taxRegistered
     * @param {string|null} data.taxCountry
     * @param {string} data.type
     * @param {string} data.category
     *
     * @returns {Promise<Object>} Created application
     */
    static async submitVendorApplication({
        userId,
        businessName,
        businessAddress = null,
        tinNumber = null,
        vatNumber = null,
        taxRegistered = null,
        taxCountry = null,
        type = 'retailer',
        category = 'internal'
    }) {

        if (!userId) {
            throw new Error('User ID is required');
        }

        if (!businessName?.trim()) {
            throw new Error('Business name is required');
        }

        if (!VENDOR_TYPES.includes(type)) {
            throw new Error(
                `Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`
            );
        }

        if (!VENDOR_CATEGORIES.includes(category)) {
            throw new Error(
                `Invalid vendor category. Must be one of: ${VENDOR_CATEGORIES.join(', ')}`
            );
        }

        const query = `
            INSERT INTO vendor_applications (
                user_id,
                business_name,
                business_address,
                tin_number,
                vat_number,
                tax_registered,
                tax_country,
                type,
                category,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                'under_review'
            )
            RETURNING *
        `;

        const values = [
            userId,
            businessName.trim(),
            businessAddress,
            tinNumber,
            vatNumber,
            taxRegistered,
            taxCountry,
            type,
            category
        ];

        try {

            const result = await db.query(query, values);

            return result.rows[0];

        } catch (error) {

            if (error.code === '23505') {
                throw new Error(
                    'A vendor application already exists for this user'
                );
            }

            if (error.code === '23503') {
                throw new Error('User not found');
            }

            throw error;
        }
    }


    /**
     * Get vendor application by ID.
     *
     * @param {string} id
     * @param {Object} options
     * @param {boolean} options.includeUser
     *
     * @returns {Promise<Object|null>}
     */
    static async getVendorApplicationById(
        id,
        { includeUser = false } = {}
    ) {

        if (!id) {
            throw new Error('Application ID is required');
        }

        const query = includeUser
            ? `
                SELECT
                    va.*,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.avatar_url
                FROM vendor_applications va
                LEFT JOIN users u
                    ON va.user_id = u.id
                WHERE va.id = $1
            `
            : `
                SELECT va.*
                FROM vendor_applications va
                WHERE va.id = $1
            `;

        const result = await db.query(query, [id]);

        return result.rows[0] || null;
    }

    /**
 * Get vendor application by ID or reference number.
 *
 * @param {string} identifier
 * @param {Object} options
 * @param {boolean} options.includeUser
 *
 * @returns {Promise<Object|null>}
 */
    static async getVendorApplication(
        identifier,
        { includeUser = false } = {}
    ) {
        if (!identifier) {
            throw new Error('Application ID or reference number is required');
        }

        const isUUID =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
                .test(identifier);

        const column = isUUID ? 'va.id' : 'va.reference_number';

        const query = includeUser
            ? `
                SELECT
                    va.id,
                    va.business_name,
                    va.reference_number,
                    INITCAP(REPLACE(va.status, '_', ' ')) AS status_label,
                    va.submitted_at,
                    u.id AS applicant_id,
                    u.email,
                    CONCAT_WS(' ', u.f_name, u.l_name) AS names
                FROM vendor_applications va
                LEFT JOIN users u
                    ON va.user_id = u.id
                WHERE ${column} = $1
            `
            : `
                SELECT va.*
                FROM vendor_applications va
                WHERE ${column} = $1
            `;

        const result = await db.query(query, [identifier]);

        return result.rows[0] || null;
    }


    /**
     * Approve a vendor application and create the vendor.
     *
     * The application update and vendor creation are performed
     * inside the same transaction.
     *
     * @param {Object} data
     * @param {string} data.applicationId
     * @param {string} data.reviewerId
     *
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

        const client = await db.connect();

        try {

            await client.query('BEGIN');


            // ------------------------------------------------
            // Get and lock application
            // ------------------------------------------------

            const applicationResult = await client.query(`
                SELECT *
                FROM vendor_applications
                WHERE id = $1
                FOR UPDATE
            `, [applicationId]);

            if (applicationResult.rows.length === 0) {
                throw new Error('Vendor application not found');
            }

            const application = applicationResult.rows[0];


            // ------------------------------------------------
            // Application must be under review
            // ------------------------------------------------

            if (application.status !== 'under_review') {
                throw new Error(
                    `Application cannot be approved because its current status is "${application.status}".`
                );
            }


            // ------------------------------------------------
            // Make sure the user isn't already a vendor
            // ------------------------------------------------

            const existingVendor = await client.query(`
                SELECT id
                FROM vendors
                WHERE user_id = $1
                LIMIT 1
            `, [application.user_id]);

            if (existingVendor.rows.length > 0) {
                throw new Error(
                    'A vendor already exists for this user'
                );
            }


            // ------------------------------------------------
            // Create vendor
            // ------------------------------------------------

            const vendorResult = await client.query(`
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
                    updated_at
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    'verified',
                    'active',
                    NOW(),
                    NOW()
                )
                RETURNING *
            `, [
                application.user_id,
                application.business_name,
                application.business_address,
                application.tin_number,
                application.vat_number,
                application.tax_registered,
                application.tax_country,
                application.type,
                application.category
            ]);

            const vendor = vendorResult.rows[0];


            // ------------------------------------------------
            // Mark application as approved
            // ------------------------------------------------

            const updatedApplicationResult = await client.query(`
                UPDATE vendor_applications
                SET
                    status = 'approved',
                    reviewed_by = $1,
                    reviewed_at = NOW(),
                    updated_at = NOW(),
                    rejection_reason = NULL
                WHERE id = $2
                RETURNING *
            `, [
                reviewerId,
                application.id
            ]);


            await client.query('COMMIT');


            return {
                application: updatedApplicationResult.rows[0],
                vendor
            };

        } catch (error) {

            await client.query('ROLLBACK');

            throw error;

        } finally {

            client.release();
        }
    }

    /**
 * Get a vendor application by user ID.
 *
 * @param {string} userId - User ID (UUID)
 * @param {Object} options - Query options
 * @param {boolean} options.includeUser - Include user details
 * @returns {Promise<Object|null>} Vendor application or null
 */
    static async getPendingVendorApplicationByUserId(
        userId,
        { includeUser = false } = {}
    ) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        let query;

        if (includeUser) {
            query = `
            SELECT
                va.*,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.avatar_url
            FROM vendor_applications va
            LEFT JOIN users u
                ON va.user_id = u.id
            WHERE va.user_id = $1
            ORDER BY va.submitted_at DESC
            LIMIT 1
        `;
        } else {
            query = `
            SELECT *
            FROM vendor_applications
            WHERE user_id = $1
            ORDER BY submitted_at DESC
            LIMIT 1
        `;
        }

        const result = await db.query(query, [userId]);

        return result.rows[0] ?? null;
    }


    /**
     * Update vendor application status.
     *
     * @param {Object} data
     * @param {string} data.applicationId
     * @param {string} data.status
     * @param {string} data.reviewerId
     * @param {string|null} data.rejectionReason
     *
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

        if (
            status === 'rejected' &&
            !rejectionReason?.trim()
        ) {
            throw new Error(
                'A rejection reason is required when rejecting an application'
            );
        }

        if (status !== 'rejected') {
            rejectionReason = null;
        }

        const query = `
            UPDATE vendor_applications
            SET
                status = $1,
                reviewed_by = $2,
                reviewed_at = NOW(),
                rejection_reason = $3
            WHERE id = $4
            RETURNING *
        `;

        const values = [
            status,
            reviewerId,
            rejectionReason,
            applicationId
        ];

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            throw new Error('Vendor application not found');
        }

        return result.rows[0];
    }


    /**
     * Get vendor applications with pagination and filters.
     *
     * @param {Object} options
     * @param {number} options.page
     * @param {number} options.limit
     * @param {string|null} options.type
     * @param {string|null} options.category
     * @param {string|null} options.status
     * @param {string|null} options.search
     * @param {boolean} options.includeUser
     * @param {string} options.sortBy
     * @param {string} options.sortOrder
     *
     * @returns {Promise<Object>}
     */
    static async getVendorApplications({
        page = 1,
        limit = 20,
        type = null,
        category = null,
        status = null,
        search = null,
        includeUser = false,
        sortBy = 'created_at',
        sortOrder = 'DESC'
    } = {}) {

        page = Math.max(parseInt(page) || 1, 1);

        limit = Math.min(
            Math.max(parseInt(limit) || 20, 1),
            100
        );

        const offset = (page - 1) * limit;

        const validSortFields = [
            'business_name',
            'type',
            'category',
            'status',
            'created_at',
            'updated_at',
            'reviewed_at'
        ];

        const sortField = validSortFields.includes(sortBy)
            ? sortBy
            : 'created_at';

        const order =
            String(sortOrder).toUpperCase() === 'ASC'
                ? 'ASC'
                : 'DESC';

        const conditions = [];
        const values = [];

        let paramIndex = 1;


        // ----------------------------------------------------
        // Type filter
        // ----------------------------------------------------

        if (type) {

            if (!VENDOR_TYPES.includes(type)) {
                throw new Error(
                    `Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`
                );
            }

            conditions.push(`va.type = $${paramIndex++}`);
            values.push(type);
        }


        // ----------------------------------------------------
        // Category filter
        // ----------------------------------------------------

        if (category) {

            if (!VENDOR_CATEGORIES.includes(category)) {
                throw new Error(
                    `Invalid vendor category. Must be one of: ${VENDOR_CATEGORIES.join(', ')}`
                );
            }

            conditions.push(`va.category = $${paramIndex++}`);
            values.push(category);
        }


        // ----------------------------------------------------
        // Application status filter
        // ----------------------------------------------------

        if (status) {

            if (!APPLICATION_STATUSES.includes(status)) {
                throw new Error(
                    `Invalid application status. Must be one of: ${APPLICATION_STATUSES.join(', ')}`
                );
            }

            conditions.push(`va.status = $${paramIndex++}`);
            values.push(status);
        }


        // ----------------------------------------------------
        // Search
        // ----------------------------------------------------

        if (search?.trim()) {

            const searchPattern = `%${search.trim()}%`;

            conditions.push(`
                (
                    va.business_name ILIKE $${paramIndex}
                    OR va.tin_number ILIKE $${paramIndex + 1}
                    OR va.vat_number ILIKE $${paramIndex + 2}
                )
            `);

            values.push(
                searchPattern,
                searchPattern,
                searchPattern
            );

            paramIndex += 3;
        }


        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';


        // ----------------------------------------------------
        // Select fields
        // ----------------------------------------------------

        const selectFields = includeUser
            ? `
                va.*,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.avatar_url
            `
            : 'va.*';


        // ----------------------------------------------------
        // Main query
        // ----------------------------------------------------

        const query = `
            SELECT ${selectFields}
            FROM vendor_applications va
            ${includeUser
                ? 'LEFT JOIN users u ON va.user_id = u.id'
                : ''
            }
            ${whereClause}
            ORDER BY va.${sortField} ${order}
            LIMIT $${paramIndex}
            OFFSET $${paramIndex + 1}
        `;

        const queryValues = [
            ...values,
            limit,
            offset
        ];


        // ----------------------------------------------------
        // Count query
        // ----------------------------------------------------

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM vendor_applications va
            ${whereClause}
        `;


        try {

            const [
                result,
                countResult
            ] = await Promise.all([
                db.query(query, queryValues),
                db.query(countQuery, values)
            ]);

            const total = parseInt(
                countResult.rows[0].total,
                10
            );

            const totalPages = Math.ceil(total / limit);

            return {
                applications: result.rows,

                pagination: {
                    total,
                    totalPages,
                    page,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {

            console.error(
                'getVendorApplications() error:',
                error
            );

            throw error;
        }
    }


    // ========================================================
    // VENDORS
    // ========================================================

    /**
     * Get vendor by ID.
     *
     * @param {string} id
     * @param {Object} options
     * @param {boolean} options.includeUser
     *
     * @returns {Promise<Object|null>}
     */
    static async getVendorById(
        id,
        { includeUser = false } = {}
    ) {

        if (!id) {
            throw new Error('Vendor ID is required');
        }

        const query = includeUser
            ? `
                SELECT
                    v.*,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.avatar_url
                FROM vendors v
                LEFT JOIN users u
                    ON v.user_id = u.id
                WHERE v.id = $1
            `
            : `
                SELECT v.*
                FROM vendors v
                WHERE v.id = $1
            `;

        const result = await db.query(query, [id]);

        return result.rows[0] || null;
    }


    /**
     * Get vendor by user ID.
     *
     * @param {string} userId
     * @param {Object} options
     * @param {boolean} options.includeUser
     *
     * @returns {Promise<Object|null>}
     */
    static async getVendorByUserId(
        userId,
        { includeUser = false } = {}
    ) {

        if (!userId) {
            throw new Error('User ID is required');
        }

        const query = includeUser
            ? `
                SELECT
                    v.*,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.avatar_url
                FROM vendors v
                LEFT JOIN users u
                    ON v.user_id = u.id
                WHERE v.user_id = $1
            `
            : `
                SELECT v.*
                FROM vendors v
                WHERE v.user_id = $1
            `;

        const result = await db.query(query, [userId]);

        return result.rows[0] || null;
    }


    /**
     * Get vendors with pagination and filters.
     *
     * @param {Object} options
     * @returns {Promise<Object>}
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

        page = Math.max(parseInt(page) || 1, 1);

        limit = Math.min(
            Math.max(parseInt(limit) || 20, 1),
            100
        );

        const offset = (page - 1) * limit;

        const validSortFields = [
            'business_name',
            'type',
            'category',
            'status',
            'verification_status',
            'last_active',
            'updated_at',
            'joined_at'
        ];

        const sortField = validSortFields.includes(sortBy)
            ? sortBy
            : 'last_active';

        const order =
            String(sortOrder).toUpperCase() === 'ASC'
                ? 'ASC'
                : 'DESC';

        const conditions = [];
        const values = [];

        let paramIndex = 1;


        // ----------------------------------------------------
        // Type
        // ----------------------------------------------------

        if (type) {

            if (!VENDOR_TYPES.includes(type)) {
                throw new Error(
                    `Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`
                );
            }

            conditions.push(`v.type = $${paramIndex++}`);
            values.push(type);
        }


        // ----------------------------------------------------
        // Category
        // ----------------------------------------------------

        if (category) {

            if (!VENDOR_CATEGORIES.includes(category)) {
                throw new Error(
                    `Invalid vendor category. Must be one of: ${VENDOR_CATEGORIES.join(', ')}`
                );
            }

            conditions.push(`v.category = $${paramIndex++}`);
            values.push(category);
        }


        // ----------------------------------------------------
        // Verification status
        // ----------------------------------------------------

        if (verificationStatus) {

            if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
                throw new Error(
                    `Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`
                );
            }

            conditions.push(
                `v.verification_status = $${paramIndex++}`
            );

            values.push(verificationStatus);
        }


        // ----------------------------------------------------
        // Vendor status
        // ----------------------------------------------------

        if (status) {

            if (!STATUSES.includes(status)) {
                throw new Error(
                    `Invalid vendor status. Must be one of: ${STATUSES.join(', ')}`
                );
            }

            conditions.push(`v.status = $${paramIndex++}`);
            values.push(status);
        }


        // ----------------------------------------------------
        // Search
        // ----------------------------------------------------

        if (search?.trim()) {

            const searchPattern = `%${search.trim()}%`;

            conditions.push(`
                (
                    v.business_name ILIKE $${paramIndex}
                    OR v.tin_number ILIKE $${paramIndex + 1}
                    OR v.vat_number ILIKE $${paramIndex + 2}
                )
            `);

            values.push(
                searchPattern,
                searchPattern,
                searchPattern
            );

            paramIndex += 3;
        }


        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';


        // ----------------------------------------------------
        // Select fields
        // ----------------------------------------------------

        const selectFields = includeUser
            ? `
                v.*,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.avatar_url
            `
            : 'v.*';


        // ----------------------------------------------------
        // Main query
        // ----------------------------------------------------

        const query = `
            SELECT ${selectFields}
            FROM vendors v
            ${includeUser
                ? 'LEFT JOIN users u ON v.user_id = u.id'
                : ''
            }
            ${whereClause}
            ORDER BY v.${sortField} ${order}
            LIMIT $${paramIndex}
            OFFSET $${paramIndex + 1}
        `;

        const queryValues = [
            ...values,
            limit,
            offset
        ];


        // ----------------------------------------------------
        // Count query
        // ----------------------------------------------------

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM vendors v
            ${whereClause}
        `;


        try {

            const [
                result,
                countResult
            ] = await Promise.all([
                db.query(query, queryValues),
                db.query(countQuery, values)
            ]);

            const total = parseInt(
                countResult.rows[0].total,
                10
            );

            const totalPages = Math.ceil(total / limit);

            return {
                vendors: result.rows,

                pagination: {
                    total,
                    totalPages,
                    page,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };

        } catch (error) {

            console.error(
                'getVendors error:',
                error
            );

            throw error;
        }
    }


    /**
     * Update vendor.
     *
     * @param {string} id
     * @param {Object} data
     *
     * @returns {Promise<Object>}
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


        if (
            type !== undefined &&
            !VENDOR_TYPES.includes(type)
        ) {
            throw new Error(
                `Invalid vendor type. Must be one of: ${VENDOR_TYPES.join(', ')}`
            );
        }


        if (
            category !== undefined &&
            !VENDOR_CATEGORIES.includes(category)
        ) {
            throw new Error(
                `Invalid vendor category. Must be one of: ${VENDOR_CATEGORIES.join(', ')}`
            );
        }


        if (
            verificationStatus !== undefined &&
            !VERIFICATION_STATUSES.includes(verificationStatus)
        ) {
            throw new Error(
                `Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`
            );
        }


        if (
            status !== undefined &&
            !STATUSES.includes(status)
        ) {
            throw new Error(
                `Invalid vendor status. Must be one of: ${STATUSES.join(', ')}`
            );
        }


        const fields = [
            ['businessName', 'business_name'],
            ['businessAddress', 'business_address'],
            ['tinNumber', 'tin_number'],
            ['vatNumber', 'vat_number'],
            ['taxRegistered', 'tax_registered'],
            ['taxCountry', 'tax_country'],
            ['type', 'type'],
            ['category', 'category'],
            ['verificationStatus', 'verification_status'],
            ['status', 'status']
        ];

        const updates = [];
        const values = [];

        let paramIndex = 1;


        for (const [property, column] of fields) {

            if (data[property] !== undefined) {

                updates.push(
                    `${column} = $${paramIndex++}`
                );

                values.push(data[property]);
            }
        }


        if (updates.length === 0) {
            throw new Error('No fields to update');
        }


        updates.push('updated_at = NOW()');

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
                throw new Error(
                    'A vendor with this user ID already exists'
                );
            }

            throw error;
        }
    }


    /**
     * Update vendor verification status.
     *
     * @param {string} id
     * @param {string} verificationStatus
     *
     * @returns {Promise<Object>}
     */
    static async updateVerificationStatus(
        id,
        verificationStatus
    ) {

        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!VERIFICATION_STATUSES.includes(verificationStatus)) {
            throw new Error(
                `Invalid verification status. Must be one of: ${VERIFICATION_STATUSES.join(', ')}`
            );
        }

        const query = `
            UPDATE vendors
            SET
                verification_status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        const result = await db.query(
            query,
            [verificationStatus, id]
        );

        if (result.rows.length === 0) {
            throw new Error('Vendor not found');
        }

        return result.rows[0];
    }


    /**
     * Update vendor status.
     *
     * @param {string} id
     * @param {string} status
     *
     * @returns {Promise<Object>}
     */
    static async updateVendorStatus(id, status) {

        if (!id) {
            throw new Error('Vendor ID is required');
        }

        if (!STATUSES.includes(status)) {
            throw new Error(
                `Invalid vendor status. Must be one of: ${STATUSES.join(', ')}`
            );
        }

        const query = `
            UPDATE vendors
            SET
                status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `;

        const result = await db.query(
            query,
            [status, id]
        );

        if (result.rows.length === 0) {
            throw new Error('Vendor not found');
        }

        return result.rows[0];
    }


    /**
     * Soft delete vendor.
     *
     * @param {string} id
     *
     * @returns {Promise<Object>}
     */
    static async deleteVendor(id) {

        return this.updateVendorStatus(
            id,
            'inactive'
        );
    }


    /**
     * Permanently remove vendor.
     *
     * @param {string} id
     *
     * @returns {Promise<boolean>}
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

            const result = await db.query(
                query,
                [id]
            );

            if (result.rows.length === 0) {
                throw new Error('Vendor not found');
            }

            return true;

        } catch (error) {

            if (error.code === '23503') {
                throw new Error(
                    'Cannot delete vendor with existing related records'
                );
            }

            throw error;
        }
    }


    /**
     * Update vendor last active timestamp.
     *
     * @param {string} id
     *
     * @returns {Promise<Object>}
     */
    static async updateLastActive(id) {

        if (!id) {
            throw new Error('Vendor ID is required');
        }

        const query = `
            UPDATE vendors
            SET
                last_active = NOW()
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(
            query,
            [id]
        );

        if (result.rows.length === 0) {
            throw new Error('Vendor not found');
        }

        return result.rows[0];
    }


    /**
     * Check whether a vendor exists for a user.
     *
     * @param {string} userId
     *
     * @returns {Promise<boolean>}
     */
    static async vendorExistsByUserId(userId) {

        if (!userId) {
            return false;
        }

        const query = `
            SELECT EXISTS (
                SELECT 1
                FROM vendors
                WHERE user_id = $1
            ) AS exists
        `;

        const result = await db.query(
            query,
            [userId]
        );

        return result.rows[0].exists;
    }


    /**
     * Get vendors by type.
     *
     * @param {string} type
     * @param {Object} options
     *
     * @returns {Promise<Object>}
     */
    static async getVendorsByType(
        type,
        { limit = 20, page = 1 } = {}
    ) {

        return this.getVendors({
            type,
            limit,
            page
        });
    }


    /**
     * Get vendors by verification status.
     *
     * @param {string} verificationStatus
     * @param {Object} options
     *
     * @returns {Promise<Object>}
     */
    static async getVendorsByVerificationStatus(
        verificationStatus,
        { limit = 20, page = 1 } = {}
    ) {

        return this.getVendors({
            verificationStatus,
            limit,
            page
        });
    }


    /**
     * Get vendor statistics.
     *
     * @returns {Promise<Object>}
     */
    static async getVendorStats() {

        const query = `
            SELECT
                COUNT(*) AS total_vendors,

                COUNT(*) FILTER (
                    WHERE status = 'active'
                ) AS active_vendors,

                COUNT(*) FILTER (
                    WHERE status = 'inactive'
                ) AS inactive_vendors,

                COUNT(*) FILTER (
                    WHERE status = 'disabled'
                ) AS disabled_vendors,

                COUNT(*) FILTER (
                    WHERE status = 'deleted'
                ) AS deleted_vendors,

                COUNT(*) FILTER (
                    WHERE verification_status = 'verified'
                ) AS verified_vendors,

                COUNT(*) FILTER (
                    WHERE verification_status = 'pending'
                ) AS pending_verification,

                COUNT(*) FILTER (
                    WHERE verification_status = 'rejected'
                ) AS rejected_vendors,

                COUNT(*) FILTER (
                    WHERE verification_status = 'suspended'
                ) AS suspended_vendors,

                COUNT(DISTINCT type) AS vendor_types,

                COUNT(DISTINCT category) AS vendor_categories

            FROM vendors
        `;

        const result = await db.query(query);

        return result.rows[0];
    }


    /**
     * Search vendors by business name, TIN or VAT.
     *
     * @param {string} searchTerm
     * @param {Object} options
     *
     * @returns {Promise<Object>}
     */
    static async searchVendors(
        searchTerm,
        { limit = 20, page = 1 } = {}
    ) {

        return this.getVendors({
            search: searchTerm,
            limit,
            page
        });
    }

    /**
     * This function check if business can be used by another business applicant
     * @param {string} username to look for
     * @returns false if the username already exist or true if it does not exist (Can be used by another user)
     */
    static async checkBusinessUsernameAvailable(username) {
        const { rows } = await db.query(`
                SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)
            `, [username]);

        return rows.length === 0;
    }
}

module.exports = {
    Vendor,
    VENDOR_TYPES,
    VENDOR_CATEGORIES,
    VERIFICATION_STATUSES,
    STATUSES,
    APPLICATION_STATUSES
};