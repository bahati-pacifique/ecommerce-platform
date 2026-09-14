const db = require('../configs/db');

class StoreModel {

    /**
     * Create a new store.
     *
     * @param {string} vendorId
     * @param {Object} storeData
     * @returns {Promise<Object>}
     */
    static async createStore(vendorId, storeData) {

        const {
            name,
            slug,
            description = null,
            phone_number = null,
            email = null,
            physical_address = null,
            meta = {}
        } = storeData;

        const query = `
            INSERT INTO stores (
                vendor_id,
                name,
                slug,
                description,
                phone_number,
                email,
                physical_address,
                meta
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;

        console.log("meta", meta)

        const values = [
            vendorId,
            name,
            slug,
            description,
            phone_number,
            email,
            physical_address,
            meta
        ];

        const { rows } = await db.query(query, values);

        return rows[0];
    }


    /**
     * Dynamically update store fields.
     *
     * Only fields included in ALLOWED_FIELDS can be updated.
     *
     * @param {string} storeId
     * @param {Object} fields
     * @returns {Promise<Object|null>}
     */
    static async updateStoreDynamicFields(storeId, fields) {

        const ALLOWED_FIELDS = [
            'name',
            'slug',
            'description',
            'phone_number',
            'email',
            'physical_address',
            'meta'
        ];

        const updates = [];
        const values = [storeId];

        for (const [field, value] of Object.entries(fields)) {

            if (!ALLOWED_FIELDS.includes(field)) {
                continue;
            }

            values.push(value);

            updates.push(
                `${field} = $${values.length}`
            );
        }

        if (updates.length === 0) {
            return null;
        }

        updates.push('updated_at = NOW()');

        const query = `
            UPDATE stores
            SET ${updates.join(', ')}
            WHERE id = $1
            RETURNING *;
        `;

        const { rows } = await db.query(query, values);

        return rows[0] || null;
    }


    /**
     * Get a store by UUID, name, or slug.
     *
     * @param {string} identifier
     * @returns {Promise<Object|null>}
     */
    static async getStoreByIdOrName(identifier) {

        const query = `
            SELECT *
            FROM stores
            WHERE id::text = $1
               OR LOWER(name) = LOWER($1)
               OR LOWER(slug) = LOWER($1)
            LIMIT 1;
        `;

        const { rows } = await db.query(query, [identifier]);

        return rows[0] || null;
    }

    static async getStoreByIdOrNameOrSlug(identifier) {

        const query = `
        SELECT *
        FROM stores
        WHERE id::text = $1
           OR LOWER(name) = LOWER($1)
           OR LOWER(slug) = LOWER($1)
        LIMIT 1;
    `;

        const { rows } = await db.query(query, [identifier]);

        return rows[0] || null;
    }


    /**
     * Change store status.
     *
     * @param {string} storeId
     * @param {string} status
     * @returns {Promise<Object|null>}
     */
    static async setStoreStatus(storeId, status) {

        const query = `
            UPDATE stores
            SET
                status = $2,
                last_active = CASE
                    WHEN $2 = 'active' THEN NOW()
                    ELSE last_active
                END,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *;
        `;

        const { rows } = await db.query(query, [
            storeId,
            status
        ]);

        return rows[0] || null;
    }


    /**
     * Insert a store rating.
     *
     * NOTE:
     * This requires a separate store_ratings table.
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

        const query = `
            INSERT INTO store_ratings (
                store_id,
                user_id,
                rating,
                review
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;

        const values = [
            storeId,
            userId,
            rating,
            review
        ];

        const { rows } = await db.query(query, values);

        return rows[0];
    }


    /**
     * Get paginated stores belonging to a vendor.
     *
     * @param {string} vendorId
     * @param {number} page
     * @param {number} limit
     * @returns {Promise<Object>}
     */
    static async getPaginatedStoresByVendorId(
        vendorId,
        page = 1,
        limit = 20
    ) {

        const offset = (page - 1) * limit;

        const query = `
        SELECT
            s.id,
            s.vendor_id,
            s.name,
            s.slug,
            s.description,
            s.phone_number,
            s.email,
            s.physical_address,
            s.rating,
            s.meta,
            s.status,
            s.last_active,
            s.created_at,
            s.updated_at,

            COALESCE(l.total_listings, 0) AS total_listings,

            COALESCE(i.available_quantity, 0) AS available_quantity,

            COALESCE(o.total_orders, 0) AS total_orders

        FROM stores s

        /* --------------------------------
         * Total active listings
         * -------------------------------- */
        LEFT JOIN (
            SELECT
                store_id,
                COUNT(*) AS total_listings
            FROM listings
            WHERE status = 'active'
            GROUP BY store_id
        ) l
            ON l.store_id = s.id

        /* --------------------------------
         * Available inventory quantity
         * -------------------------------- */
        LEFT JOIN (
            SELECT
                inv.store_id,
                SUM(
                    GREATEST(
                        ii.quantity - ii.reserved,
                        0
                    )
                ) AS available_quantity
            FROM inventories inv
            JOIN inventory_items ii
                ON ii.inventory_id = inv.id
            WHERE inv.status = 'active'
              AND ii.status = 'in_stock'
            GROUP BY inv.store_id
        ) i
            ON i.store_id = s.id

        /* --------------------------------
         * Total orders
         * -------------------------------- */
        LEFT JOIN (
            SELECT
                store_id,
                COUNT(*) AS total_orders
            FROM store_orders
            GROUP BY store_id
        ) o
            ON o.store_id = s.id

        WHERE s.vendor_id = $1

        ORDER BY s.created_at DESC

        LIMIT $2
        OFFSET $3
    `;

        const countQuery = `
        SELECT COUNT(*) AS total
        FROM stores
        WHERE vendor_id = $1
    `;

        const [storesResult, countResult] = await Promise.all([
            db.query(query, [
                vendorId,
                limit,
                offset
            ]),

            db.query(countQuery, [
                vendorId
            ])
        ]);

        const totalStores = Number(
            countResult.rows[0].total
        );

        const totalPages = Math.ceil(
            totalStores / limit
        );

        return {
            stores: storesResult.rows,

            pagination: {
                page: Number(page),
                limit: Number(limit),
                totalStores,
                totalPages,
                hasNextPage: Number(page) < totalPages,
                hasPrevPage: Number(page) > 1
            }
        };
    }

    /**
     * Get all stores with pagination and optional filters.
     *
     * Supported filters:
     * - vendor_id
     * - status
     * - search
     *
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    static async getAllPaginatedStoresBy(options = {}) {

        let {
            vendor_id = null,
            status = null,
            search = null,
            page = 1,
            limit = 20
        } = options;

        page = Math.max(Number(page) || 1, 1);

        limit = Math.min(
            Math.max(Number(limit) || 20, 1),
            100
        );

        const offset = (page - 1) * limit;

        const conditions = [];
        const values = [];

        /*
         * Vendor filter
         */
        if (vendor_id) {
            values.push(vendor_id);

            conditions.push(
                `vendor_id = $${values.length}`
            );
        }

        /*
         * Status filter
         */
        if (status) {
            values.push(status);

            conditions.push(
                `status = $${values.length}`
            );
        }

        /*
         * Search by store name or slug
         */
        if (search) {
            values.push(`%${search}%`);

            conditions.push(`
                (
                    name ILIKE $${values.length}
                    OR slug ILIKE $${values.length}
                )
            `);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        /*
         * Count
         */
        const countQuery = `
            SELECT COUNT(*)::int AS total
            FROM stores
            ${whereClause};
        `;

        /*
         * Data
         */
        const dataValues = [
            ...values,
            limit,
            offset
        ];

        const storesQuery = `
            SELECT *
            FROM stores
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${dataValues.length - 1}
            OFFSET $${dataValues.length};
        `;

        const [countResult, storesResult] = await Promise.all([
            db.query(countQuery, values),
            db.query(storesQuery, dataValues)
        ]);

        const totalStores = countResult.rows[0].total;
        const totalPages = Math.ceil(totalStores / limit);

        return {
            stores: storesResult.rows,
            paginations: {
                page,
                limit,
                totalStores,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };
    }

    static async setLastActive(storeId) {
        const { rows } = db.query(`UPDATE stores SET last_active = NOW() WHERE id = $1 RETURNING *`, [storeId]);

        return rows[0] ?? null;
    }
}

module.exports = StoreModel;