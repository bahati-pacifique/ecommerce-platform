const db = require("../configs/db");

class InventoryModel {

    /**
     * Create a new inventory
     */
    static async createInventory({
        storeId,
        title,
        description = null,
        address = null,
        isDefault = false,
        status = "active",
        meta = {}
    }) {

        const query = `
            INSERT INTO inventories (
                store_id,
                title,
                description,
                address,
                is_default,
                status,
                meta
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;

        const values = [
            storeId,
            title,
            description,
            address,
            isDefault,
            status,
            meta
        ];

        const { rows } = await db.query(query, values);

        return rows[0];
    }


    /**
     * Get inventory by ID
     */
    static async getInventoryById(inventoryId) {

        const query = `
            SELECT
                i.*
            FROM inventories i
            WHERE i.id = $1;
        `;

        const { rows } = await db.query(query, [inventoryId]);

        return rows[0] || null;
    }


    /**
     * Get inventory by ID while ensuring it belongs
     * to the specified store.
     */
    static async getInventoryByIdAndStoreId(
        inventoryId,
        storeId
    ) {

        const query = `
            SELECT
                i.*
            FROM inventories i
            WHERE i.id = $1
              AND i.store_id = $2;
        `;

        const { rows } = await db.query(
            query,
            [inventoryId, storeId]
        );

        return rows[0] || null;
    }


    /**
     * Get all inventories belonging to a store
     */
    static async getInventoriesByStoreId(
        storeId,
        {
            page = 1,
            limit = 20,
            status = null,
            search = null
        } = {}
    ) {

        const offset = (page - 1) * limit;

        const values = [storeId];
        const conditions = [
            `i.store_id = $1`
        ];

        let parameterIndex = 2;

        if (status) {

            conditions.push(
                `i.status = $${parameterIndex}`
            );

            values.push(status);
            parameterIndex++;
        }

        if (search) {

            conditions.push(`
                (
                    i.title ILIKE $${parameterIndex}
                    OR i.description ILIKE $${parameterIndex}
                    OR i.address ILIKE $${parameterIndex}
                )
            `);

            values.push(`%${search}%`);
            parameterIndex++;
        }

        const whereClause = conditions.join(" AND ");

        const countQuery = `
            SELECT COUNT(*)::INTEGER AS total
            FROM inventories i
            WHERE ${whereClause};
        `;

        const dataQuery = `
            SELECT
                i.*
            FROM inventories i
            WHERE ${whereClause}
            ORDER BY
                i.is_default DESC,
                i.created_at DESC
            LIMIT $${parameterIndex}
            OFFSET $${parameterIndex + 1};
        `;

        values.push(limit);
        values.push(offset);

        const [countResult, dataResult] = await Promise.all([
            db.query(
                countQuery,
                values.slice(0, parameterIndex - 1)
            ),
            db.query(
                dataQuery,
                values
            )
        ]);

        const total = countResult.rows[0].total;

        return {
            rows: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }


    /**
     * Update inventory fields dynamically
     */
    static async updateInventoryDynamicFields(
        inventoryId,
        storeId,
        fields
    ) {

        const allowedFields = [
            "title",
            "description",
            "address",
            "is_default",
            "status",
            "meta"
        ];

        const updates = [];
        const values = [];

        let parameterIndex = 1;

        for (const [field, value] of Object.entries(fields)) {

            if (!allowedFields.includes(field)) {
                continue;
            }

            updates.push(
                `${field} = $${parameterIndex}`
            );

            values.push(value);
            parameterIndex++;
        }

        if (updates.length === 0) {
            return null;
        }

        updates.push(`updated_at = NOW()`);

        values.push(inventoryId);
        values.push(storeId);

        const query = `
            UPDATE inventories
            SET ${updates.join(", ")}
            WHERE id = $${parameterIndex}
              AND store_id = $${parameterIndex + 1}
            RETURNING *;
        `;

        const { rows } = await db.query(
            query,
            values
        );

        return rows[0] || null;
    }


    /**
     * Set inventory status
     */
    static async setInventoryStatus(
        inventoryId,
        storeId,
        status
    ) {

        const query = `
            UPDATE inventories
            SET
                status = $1,
                updated_at = NOW()
            WHERE id = $2
              AND store_id = $3
            RETURNING *;
        `;

        const { rows } = await db.query(
            query,
            [status, inventoryId, storeId]
        );

        return rows[0] || null;
    }


    /**
     * Set an inventory as the default inventory
     */
    static async setDefaultInventory(
        inventoryId,
        storeId
    ) {

        const client = await db.connect();

        try {

            await client.query("BEGIN");

            /*
             * Remove the current default inventory.
             */
            await client.query(
                `
                    UPDATE inventories
                    SET
                        is_default = FALSE,
                        updated_at = NOW()
                    WHERE store_id = $1
                      AND is_default = TRUE
                      AND id <> $2;
                `,
                [storeId, inventoryId]
            );

            /*
             * Set the requested inventory as default.
             */
            const result = await client.query(
                `
                    UPDATE inventories
                    SET
                        is_default = TRUE,
                        updated_at = NOW()
                    WHERE id = $1
                      AND store_id = $2
                    RETURNING *;
                `,
                [inventoryId, storeId]
            );

            await client.query("COMMIT");

            return result.rows[0] || null;

        } catch (error) {

            await client.query("ROLLBACK");
            throw error;

        } finally {

            client.release();
        }
    }


    /**
     * Delete inventory
     *
     * This is normally not recommended once the inventory
     * contains inventory items/history.
     */
    static async deleteInventory(
        inventoryId,
        storeId
    ) {

        const query = `
            DELETE FROM inventories
            WHERE id = $1
              AND store_id = $2
            RETURNING *;
        `;

        const { rows } = await db.query(
            query,
            [inventoryId, storeId]
        );

        return rows[0] || null;
    }

    // /**
    //  * Get inventory dashboard data for a vendor
    //  *
    //  * Does not require a store ID.
    //  * Aggregates inventory across all stores owned by the vendor.
    //  *
    //  * @param {string} vendorId
    //  * @param {number} lowStockThreshold
    //  * @returns {Promise<Object>}
    //  */
    // static async getInventoryVendorDashboardData(
    //     vendorId,
    //     lowStockThreshold = 5
    // ) {

    //     const query = `
    //     WITH vendor_stores AS (
    //         SELECT id
    //         FROM stores
    //         WHERE vendor_id = $1
    //     ),

    //     inventory_stats AS (
    //         SELECT
    //             COUNT(DISTINCT i.id) AS total_inventories,

    //             COUNT(DISTINCT i.id) FILTER (
    //                 WHERE i.status = 'active'
    //             ) AS active_inventories,

    //             COUNT(DISTINCT i.id) FILTER (
    //                 WHERE i.status <> 'active'
    //             ) AS inactive_inventories,

    //             COUNT(DISTINCT i.id) FILTER (
    //                 WHERE i.is_default = TRUE
    //             ) AS default_inventories

    //         FROM inventories i

    //         INNER JOIN vendor_stores vs
    //             ON vs.id = i.store_id
    //     ),

    //     stock_stats AS (
    //         SELECT
    //             COUNT(DISTINCT ii.id) AS total_inventory_items,

    //             COALESCE(
    //                 SUM(ii.quantity),
    //                 0
    //             ) AS total_quantity,

    //             COALESCE(
    //                 SUM(ii.reserved),
    //                 0
    //             ) AS total_reserved,

    //             COALESCE(
    //                 SUM(ii.quantity - ii.reserved),
    //                 0
    //             ) AS total_available,

    //             COUNT(DISTINCT ii.id) FILTER (
    //                 WHERE ii.quantity = 0
    //             ) AS out_of_stock_items,

    //             COUNT(DISTINCT ii.id) FILTER (
    //                 WHERE ii.quantity > 0
    //                 AND (ii.quantity - ii.reserved) <= $2
    //             ) AS low_stock_items

    //         FROM inventory_items ii

    //         INNER JOIN inventories i
    //             ON i.id = ii.inventory_id

    //         INNER JOIN vendor_stores vs
    //             ON vs.id = i.store_id
    //     ),

    //     unit_stats AS (
    //         SELECT
    //             COUNT(DISTINCT iu.id) AS total_units,

    //             COUNT(DISTINCT iu.id) FILTER (
    //                 WHERE iu.status = 'available'
    //             ) AS available_units,

    //             COUNT(DISTINCT iu.id) FILTER (
    //                 WHERE iu.status = 'sold'
    //             ) AS sold_units

    //         FROM inventory_units iu

    //         INNER JOIN inventory_items ii
    //             ON ii.id = iu.inventory_item_id

    //         INNER JOIN inventories i
    //             ON i.id = ii.inventory_id

    //         INNER JOIN vendor_stores vs
    //             ON vs.id = i.store_id
    //     ),

    //     transaction_stats AS (
    //         SELECT
    //             COUNT(DISTINCT it.id) AS total_transactions,

    //             COUNT(DISTINCT it.id) FILTER (
    //                 WHERE it.created_at >= NOW() - INTERVAL '24 hours'
    //             ) AS transactions_last_24_hours,

    //             COUNT(DISTINCT it.id) FILTER (
    //                 WHERE it.created_at >= NOW() - INTERVAL '7 days'
    //             ) AS transactions_last_7_days

    //         FROM inventory_transactions it

    //         INNER JOIN inventory_items ii
    //             ON ii.id = it.inventory_item_id

    //         INNER JOIN inventories i
    //             ON i.id = ii.inventory_id

    //         INNER JOIN vendor_stores vs
    //             ON vs.id = i.store_id
    //     )

    //     SELECT
    //         json_build_object(

    //             'inventories',
    //             json_build_object(
    //                 'total', inventory_stats.total_inventories,
    //                 'active', inventory_stats.active_inventories,
    //                 'inactive', inventory_stats.inactive_inventories,
    //                 'default', inventory_stats.default_inventories
    //             ),

    //             'stock',
    //             json_build_object(
    //                 'total_items', stock_stats.total_inventory_items,
    //                 'total_quantity', stock_stats.total_quantity,
    //                 'total_reserved', stock_stats.total_reserved,
    //                 'total_available', stock_stats.total_available,
    //                 'low_stock', stock_stats.low_stock_items,
    //                 'out_of_stock', stock_stats.out_of_stock_items
    //             ),

    //             'units',
    //             json_build_object(
    //                 'total', unit_stats.total_units,
    //                 'available', unit_stats.available_units,
    //                 'sold', unit_stats.sold_units
    //             ),

    //             'transactions',
    //             json_build_object(
    //                 'total', transaction_stats.total_transactions,
    //                 'last_24_hours',
    //                     transaction_stats.transactions_last_24_hours,
    //                 'last_7_days',
    //                     transaction_stats.transactions_last_7_days
    //             )

    //         ) AS dashboard

    //     FROM inventory_stats
    //     CROSS JOIN stock_stats
    //     CROSS JOIN unit_stats
    //     CROSS JOIN transaction_stats;
    // `;

    //     const values = [
    //         vendorId,
    //         lowStockThreshold
    //     ];

    //     const { rows } = await db.query(
    //         query,
    //         values
    //     );

    //     return rows[0]?.dashboard || {
    //         inventories: {
    //             total: 0,
    //             active: 0,
    //             inactive: 0,
    //             default: 0
    //         },

    //         stock: {
    //             total_items: 0,
    //             total_quantity: 0,
    //             total_reserved: 0,
    //             total_available: 0,
    //             low_stock: 0,
    //             out_of_stock: 0
    //         },

    //         units: {
    //             total: 0,
    //             available: 0,
    //             sold: 0
    //         },

    //         transactions: {
    //             total: 0,
    //             last_24_hours: 0,
    //             last_7_days: 0
    //         }
    //     };
    // }

    /**
    * Get inventory dashboard data for a vendor
    *
    * Does not require a store ID.
    * Aggregates inventory across all stores owned by the vendor.
    *
    * @param {string} vendorId
    * @param {number} lowStockThreshold
    * @returns {Promise<Object>}
    */
    static async getInventoryVendorDashboardData(
        vendorId,
        lowStockThreshold = 5
    ) {

        const query = `
        WITH inventory_stats AS (

            SELECT
                COUNT(DISTINCT i.id) AS total_inventories,

                COUNT(DISTINCT i.id) FILTER (
                    WHERE i.status = 'active'
                ) AS active_inventories,

                COUNT(DISTINCT i.id) FILTER (
                    WHERE i.status <> 'active'
                ) AS inactive_inventories,

                COUNT(DISTINCT i.id) FILTER (
                    WHERE i.is_default = TRUE
                ) AS default_inventories

            FROM inventories i

            INNER JOIN stores s
                ON s.id = i.store_id

            WHERE s.vendor_id = $1
        ),


        stock_stats AS (

            SELECT
                COUNT(DISTINCT ii.id) AS total_inventory_items,

                COALESCE(
                    SUM(ii.quantity),
                    0
                ) AS total_quantity,

                COALESCE(
                    SUM(ii.reserved),
                    0
                ) AS total_reserved,

                COALESCE(
                    SUM(ii.quantity - ii.reserved),
                    0
                ) AS total_available,

                COUNT(DISTINCT ii.id) FILTER (
                    WHERE ii.quantity = 0
                ) AS out_of_stock_items,

                COUNT(DISTINCT ii.id) FILTER (
                    WHERE ii.quantity > 0
                    AND (ii.quantity - ii.reserved) <= $2
                ) AS low_stock_items

            FROM inventory_items ii

            INNER JOIN inventories i
                ON i.id = ii.inventory_id

            INNER JOIN stores s
                ON s.id = i.store_id

            WHERE s.vendor_id = $1
        ),


        unit_stats AS (

            SELECT
                COUNT(DISTINCT iu.id) AS total_units,

                COUNT(DISTINCT iu.id) FILTER (
                    WHERE iu.status = 'available'
                ) AS available_units,

                COUNT(DISTINCT iu.id) FILTER (
                    WHERE iu.status = 'sold'
                ) AS sold_units

            FROM inventory_units iu

            INNER JOIN inventory_items ii
                ON ii.id = iu.inventory_item_id

            INNER JOIN inventories i
                ON i.id = ii.inventory_id

            INNER JOIN stores s
                ON s.id = i.store_id

            WHERE s.vendor_id = $1
        ),


        transaction_stats AS (

            SELECT
                COUNT(DISTINCT it.id) AS total_transactions,

                COUNT(DISTINCT it.id) FILTER (
                    WHERE it.created_at >= NOW() - INTERVAL '24 hours'
                ) AS transactions_last_24_hours,

                COUNT(DISTINCT it.id) FILTER (
                    WHERE it.created_at >= NOW() - INTERVAL '7 days'
                ) AS transactions_last_7_days

            FROM inventory_transactions it

            INNER JOIN inventory_items ii
                ON ii.id = it.inventory_item_id

            INNER JOIN inventories i
                ON i.id = ii.inventory_id

            INNER JOIN stores s
                ON s.id = i.store_id

            WHERE s.vendor_id = $1
        ),


        inventory_list AS (

            SELECT
                i.id AS inventory_id,

                i.title,

                i.store_id,

                s.name AS store_name,

                i.is_default,

                i.status,

                COUNT(DISTINCT ii.id) AS total_items,

                COALESCE(
                    SUM(ii.quantity),
                    0
                ) AS total_quantity,

                COALESCE(
                    SUM(ii.reserved),
                    0
                ) AS total_reserved,

                COALESCE(
                    SUM(ii.quantity - ii.reserved),
                    0
                ) AS total_available,

                COUNT(DISTINCT ii.id) FILTER (
                    WHERE ii.quantity > 0
                    AND (ii.quantity - ii.reserved) <= $2
                ) AS low_stock,

                COUNT(DISTINCT ii.id) FILTER (
                    WHERE ii.quantity = 0
                ) AS out_of_stock

            FROM inventories i

            INNER JOIN stores s
                ON s.id = i.store_id

            LEFT JOIN inventory_items ii
                ON ii.inventory_id = i.id

            WHERE s.vendor_id = $1

            GROUP BY
                i.id,
                i.title,
                i.store_id,
                s.name,
                i.is_default,
                i.status,
                i.created_at

            ORDER BY
                i.is_default DESC,
                i.created_at DESC
        )


        SELECT
            json_build_object(

                'inventories',
                json_build_object(
                    'total',
                        inventory_stats.total_inventories,

                    'active',
                        inventory_stats.active_inventories,

                    'inactive',
                        inventory_stats.inactive_inventories,

                    'default',
                        inventory_stats.default_inventories
                ),


                'stock',
                json_build_object(
                    'total_items',
                        stock_stats.total_inventory_items,

                    'total_quantity',
                        stock_stats.total_quantity,

                    'total_reserved',
                        stock_stats.total_reserved,

                    'total_available',
                        stock_stats.total_available,

                    'low_stock',
                        stock_stats.low_stock_items,

                    'out_of_stock',
                        stock_stats.out_of_stock_items
                ),


                'units',
                json_build_object(
                    'total',
                        unit_stats.total_units,

                    'available',
                        unit_stats.available_units,

                    'sold',
                        unit_stats.sold_units
                ),


                'transactions',
                json_build_object(
                    'total',
                        transaction_stats.total_transactions,

                    'last_24_hours',
                        transaction_stats.transactions_last_24_hours,

                    'last_7_days',
                        transaction_stats.transactions_last_7_days
                ),


                'inventory_list',
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(

                                'id',
                                    il.inventory_id,

                                'title',
                                    il.title,

                                'store_id',
                                    il.store_id,

                                'store_name',
                                    il.store_name,

                                'is_default',
                                    il.is_default,

                                'status',
                                    il.status,

                                'total_items',
                                    il.total_items,

                                'total_quantity',
                                    il.total_quantity,

                                'total_reserved',
                                    il.total_reserved,

                                'total_available',
                                    il.total_available,

                                'low_stock',
                                    il.low_stock,

                                'out_of_stock',
                                    il.out_of_stock
                            )
                        )
                        FROM inventory_list il
                    ),
                    '[]'::json
                )

            ) AS dashboard

        FROM inventory_stats

        CROSS JOIN stock_stats

        CROSS JOIN unit_stats

        CROSS JOIN transaction_stats;
    `;


        const values = [
            vendorId,
            lowStockThreshold
        ];


        const { rows } = await db.query(
            query,
            values
        );


        return rows[0]?.dashboard || {

            inventories: {
                total: 0,
                active: 0,
                inactive: 0,
                default: 0
            },

            stock: {
                total_items: 0,
                total_quantity: 0,
                total_reserved: 0,
                total_available: 0,
                low_stock: 0,
                out_of_stock: 0
            },

            units: {
                total: 0,
                available: 0,
                sold: 0
            },

            transactions: {
                total: 0,
                last_24_hours: 0,
                last_7_days: 0
            },

            inventory_list: []
        };
    }


    /**
    * Get inventory dashboard data for a store
    *
    * @param {string} storeId
    * @param {number} lowStockThreshold
    * @returns {Promise<Object>}
    */
    static async getInventoryDashboardData(
        storeId,
        lowStockThreshold = 5
    ) {

        const query = `
        WITH inventory_stats AS (
            SELECT
                COUNT(*) AS total_inventories,

                COUNT(*) FILTER (
                    WHERE status = 'active'
                ) AS active_inventories,

                COUNT(*) FILTER (
                    WHERE status <> 'active'
                ) AS inactive_inventories,

                COUNT(*) FILTER (
                    WHERE is_default = TRUE
                ) AS default_inventories

            FROM inventories
            WHERE store_id = $1
        ),

        stock_stats AS (
            SELECT
                COUNT(DISTINCT ii.id) AS total_inventory_items,

                COALESCE(
                    SUM(ii.quantity),
                    0
                ) AS total_quantity,

                COALESCE(
                    SUM(ii.reserved),
                    0
                ) AS total_reserved,

                COALESCE(
                    SUM(ii.quantity - ii.reserved),
                    0
                ) AS total_available,

                COUNT(*) FILTER (
                    WHERE ii.quantity = 0
                ) AS out_of_stock_items,

                COUNT(*) FILTER (
                    WHERE ii.quantity > 0
                    AND (ii.quantity - ii.reserved) <= $2
                ) AS low_stock_items

            FROM inventory_items ii

            INNER JOIN inventories i
                ON i.id = ii.inventory_id

            WHERE i.store_id = $1
        ),

        unit_stats AS (
            SELECT
                COUNT(iu.id) AS total_units,

                COUNT(iu.id) FILTER (
                    WHERE iu.status = 'available'
                ) AS available_units,

                COUNT(iu.id) FILTER (
                    WHERE iu.status = 'sold'
                ) AS sold_units

            FROM inventory_units iu

            INNER JOIN inventory_items ii
                ON ii.id = iu.inventory_item_id

            INNER JOIN inventories i
                ON i.id = ii.inventory_id

            WHERE i.store_id = $1
        ),

        transaction_stats AS (
            SELECT
                COUNT(it.id) AS total_transactions,

                COUNT(it.id) FILTER (
                    WHERE it.created_at >= NOW() - INTERVAL '24 hours'
                ) AS transactions_last_24_hours,

                COUNT(it.id) FILTER (
                    WHERE it.created_at >= NOW() - INTERVAL '7 days'
                ) AS transactions_last_7_days

            FROM inventory_transactions it

            INNER JOIN inventory_items ii
                ON ii.id = it.inventory_item_id

            INNER JOIN inventories i
                ON i.id = ii.inventory_id

            WHERE i.store_id = $1
        )

        SELECT
            json_build_object(

                'inventories',
                json_build_object(
                    'total',
                    inventory_stats.total_inventories,

                    'active',
                    inventory_stats.active_inventories,

                    'inactive',
                    inventory_stats.inactive_inventories,

                    'default',
                    inventory_stats.default_inventories
                ),

                'stock',
                json_build_object(
                    'total_items',
                    stock_stats.total_inventory_items,

                    'total_quantity',
                    stock_stats.total_quantity,

                    'total_reserved',
                    stock_stats.total_reserved,

                    'total_available',
                    stock_stats.total_available,

                    'low_stock',
                    stock_stats.low_stock_items,

                    'out_of_stock',
                    stock_stats.out_of_stock_items
                ),

                'units',
                json_build_object(
                    'total',
                    unit_stats.total_units,

                    'available',
                    unit_stats.available_units,

                    'sold',
                    unit_stats.sold_units
                ),

                'transactions',
                json_build_object(
                    'total',
                    transaction_stats.total_transactions,

                    'last_24_hours',
                    transaction_stats.transactions_last_24_hours,

                    'last_7_days',
                    transaction_stats.transactions_last_7_days
                )

            ) AS dashboard

        FROM inventory_stats
        CROSS JOIN stock_stats
        CROSS JOIN unit_stats
        CROSS JOIN transaction_stats;
    `;

        const values = [
            storeId,
            lowStockThreshold
        ];

        const { rows } = await pool.query(
            query,
            values
        );

        return rows[0]?.dashboard || {
            inventories: {
                total: 0,
                active: 0,
                inactive: 0,
                default: 0
            },

            stock: {
                total_items: 0,
                total_quantity: 0,
                total_reserved: 0,
                total_available: 0,
                low_stock: 0,
                out_of_stock: 0
            },

            units: {
                total: 0,
                available: 0,
                sold: 0
            },

            transactions: {
                total: 0,
                last_24_hours: 0,
                last_7_days: 0
            }
        };
    }

    //========================== INVENTORY CORE FUNCTIONALITIES ==========================

    //============================= INVENTORY ITEM ========================================

    /**
     * Get a single inventory (location) by ID, scoped to a store.
     * Returns null if the inventory doesn't exist OR doesn't belong to the store.
     */
    static async findInventoryByStoreId(storeId, inventoryId) {
        const { rows } = await db.query(`
            SELECT
            id,
            store_id,
            title,
            description,
            address,
            is_default,
            status,
            meta,
            created_at,
            updated_at
            FROM inventories
            WHERE id = $1 AND store_id = $2
        `, [inventoryId, storeId]);

        return rows[0] || null;
    }

    // static async listInventoriesByStore(storeId, { status = 'active' } = {}) {
    //     const { rows: data } = await db.query(`
    //         SELECT
    //         i.id, i.title, i.address, i.is_default, i.status,
    //         COALESCE(stats.item_records, 0) AS item_records,
    //         COALESCE(stats.total_units, 0) AS total_units,
    //         COALESCE(stats.available_units, 0) AS available_units,
    //         COALESCE(stats.reserved_units, 0) AS reserved_units,
    //         COALESCE(stats.low_stock_items, 0) AS low_stock_items,
    //         COALESCE(stats.out_of_stock_items, 0) AS out_of_stock_items
    //         FROM inventories i
    //         LEFT JOIN LATERAL (...aggregates...) stats ON TRUE
    //         WHERE i.store_id = $1
    //         AND i.status = $2::status
    //         ORDER BY i.is_default DESC, i.title ASC
    //     `, [storeId, status]);

    //     return data;
    // }

    static async listInventoriesByStore(
        storeId,
        { status = 'active' } = {}
    ) {
        const { rows: data } = await db.query(`
        SELECT
            i.id,
            i.title,
            i.address,
            i.is_default,
            i.status,

            COALESCE(stats.item_records, 0)::int
                AS item_records,

            COALESCE(stats.total_units, 0)::int
                AS total_units,

            COALESCE(stats.available_units, 0)::int
                AS available_units,

            COALESCE(stats.reserved_units, 0)::int
                AS reserved_units,

            COALESCE(stats.low_stock_items, 0)::int
                AS low_stock_items,

            COALESCE(stats.out_of_stock_items, 0)::int
                AS out_of_stock_items

        FROM inventories i

        LEFT JOIN LATERAL (
            SELECT
                COUNT(*)::int AS item_records,

                COALESCE(SUM(
                    CASE
                        WHEN ii.tracking_mode = 'bulk'
                        THEN ii.quantity
                        ELSE unit_stats.total_units
                    END
                ), 0)::int AS total_units,

                COALESCE(SUM(
                    CASE
                        WHEN ii.tracking_mode = 'bulk'
                        THEN ii.reserved
                        ELSE unit_stats.reserved_units
                    END
                ), 0)::int AS reserved_units,

                COALESCE(SUM(
                    CASE
                        WHEN ii.tracking_mode = 'bulk'
                        THEN ii.quantity - ii.reserved
                        ELSE unit_stats.available_units
                    END
                ), 0)::int AS available_units,

                COUNT(*) FILTER (
                    WHERE ii.status = 'low_stock'
                )::int AS low_stock_items,

                COUNT(*) FILTER (
                    WHERE ii.status = 'out_of_stock'
                )::int AS out_of_stock_items

            FROM inventory_items ii

            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*) FILTER (
                        WHERE iu.status IN (
                            'available',
                            'reserved',
                            'sold'
                        )
                    )::int AS total_units,

                    COUNT(*) FILTER (
                        WHERE iu.status = 'reserved'
                    )::int AS reserved_units,

                    COUNT(*) FILTER (
                        WHERE iu.status = 'available'
                    )::int AS available_units

                FROM inventory_units iu
                WHERE iu.inventory_item_id = ii.id
            ) unit_stats ON TRUE

            WHERE ii.inventory_id = i.id
        ) stats ON TRUE

        WHERE i.store_id = $1
          AND i.status = $2::status

        ORDER BY i.is_default DESC, i.title ASC
    `, [storeId, status]);

        return data;
    }

    //No longer used due to tracking_mode introduced
    // static async getStats(inventoryId) {

    //     const { rows: [stats] } = await db.query(`
    //         SELECT
    //         COUNT(*)::int AS item_records,
    //         COALESCE(SUM(quantity), 0)::int AS total_units,
    //         COALESCE(SUM(reserved), 0)::int AS reserved_units,
    //         COALESCE(SUM(quantity - reserved), 0)::int AS available_units,
    //         COUNT(*) FILTER (WHERE status = 'low_stock')::int AS low_stock_items,
    //         COUNT(*) FILTER (WHERE status = 'out_of_stock')::int AS out_of_stock_items
    //         FROM inventory_items
    //         WHERE inventory_id = $1
    //     `, [inventoryId]);

    //     return stats;
    // }

    static async getStats(inventoryId) {
        const { rows: [stats] } = await db.query(`
        SELECT
            COUNT(*)::int AS item_records,

            COALESCE(SUM(
                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN ii.quantity
                    ELSE unit_stats.total_units
                END
            ), 0)::int AS total_units,

            COALESCE(SUM(
                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN ii.reserved
                    ELSE unit_stats.reserved_units
                END
            ), 0)::int AS reserved_units,

            COALESCE(SUM(
                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN ii.quantity - ii.reserved
                    ELSE unit_stats.available_units
                END
            ), 0)::int AS available_units,

            COUNT(*) FILTER (
                WHERE ii.status = 'low_stock'
            )::int AS low_stock_items,

            COUNT(*) FILTER (
                WHERE ii.status = 'out_of_stock'
            )::int AS out_of_stock_items

            FROM inventory_items ii

            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*) FILTER (
                        WHERE iu.status IN ('available', 'reserved', 'sold')
                    )::int AS total_units,

                    COUNT(*) FILTER (
                        WHERE iu.status = 'reserved'
                    )::int AS reserved_units,

                    COUNT(*) FILTER (
                        WHERE iu.status = 'available'
                    )::int AS available_units

                FROM inventory_units iu
                WHERE iu.inventory_item_id = ii.id
            ) unit_stats ON TRUE

        WHERE ii.inventory_id = $1
    `, [inventoryId]);

        return stats;
    }

    // /**
    //  * List items in an inventory, with optional search / filter / sort.
    //  */
    // static async listByInventory(inventoryId, {
    //     page = 1,
    //     limit = 20,
    //     search = '',
    //     status = '',
    //     sort = 'updated_desc',
    // } = {}) {
    //     const where = ['ii.inventory_id = $1'];
    //     const params = [inventoryId];

    //     if (search) {
    //         params.push(`%${search}%`);
    //         where.push(`(l.title ILIKE $${params.length} OR ii.batch_number ILIKE $${params.length})`);
    //     }

    //     if (status) {
    //         params.push(status);
    //         where.push(`ii.status = $${params.length}::inventory_status`);
    //     }

    //     const ORDER = {
    //         updated_desc: 'ii.updated_at DESC NULLS LAST, ii.created_at DESC',
    //         updated_asc: 'ii.updated_at ASC NULLS LAST',
    //         title_asc: 'l.title ASC',
    //         title_desc: 'l.title DESC',
    //         quantity_asc: 'ii.quantity ASC',
    //         quantity_desc: 'ii.quantity DESC',
    //         available_asc: '(ii.quantity - ii.reserved) ASC',
    //         available_desc: '(ii.quantity - ii.reserved) DESC',
    //     };
    //     const orderBy = ORDER[sort] || ORDER.updated_desc;

    //     const offset = (page - 1) * limit;

    //     const { rows } = await db.query(`
    //             SELECT
    //             ii.id,
    //             ii.inventory_id,
    //             ii.listing_id,
    //             ii.quantity,
    //             ii.reserved,
    //             (ii.quantity - ii.reserved) AS available,
    //             ii.batch_number,
    //             ii.mfg_at,
    //             ii.expires_at,
    //             ii.status,
    //             ii.created_at,
    //             ii.updated_at,
    //             l.title AS listing_title,
    //             l.condition,
    //             (SELECT storage_key FROM listing_variants_media lvm WHERE lvm.listing_variant_id = lvs.id AND is_primary = TRUE) AS listing_image,
    //             (SELECT sku FROM product_variants WHERE id = lvs.product_variant_id) AS listing_sku
    //             FROM inventory_items ii
    //             JOIN listings l ON l.id = ii.listing_id
    //             JOIN listing_variants lvs ON lvs.listing_id = l.id 
    //             WHERE ${where.join(' AND ')}
    //             ORDER BY ${orderBy}
    //             LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    //         `, [...params, limit, offset]);

    //     const { rows: [{ count }] } = await db.query(`
    //             SELECT COUNT(*)::int AS count
    //             FROM inventory_items ii
    //             JOIN listings l ON l.id = ii.listing_id
    //             WHERE ${where.join(' AND ')}
    //         `, params);

    //     return {
    //         data: rows,
    //         total: count,
    //         page,
    //         limit,
    //         totalPages: Math.max(1, Math.ceil(count / limit)),
    //         hasNextPage: offset + limit < count,
    //         hasPreviousPage: page > 1,
    //     };
    // }

    /**
 * List items in an inventory, with optional search / filter / sort.
 */
    static async listByInventory(inventoryId, {
        page = 1,
        limit = 20,
        search = '',
        status = '',
        sort = 'updated_desc',
    } = {}) {
        const where = ['ii.inventory_id = $1'];
        const params = [inventoryId];

        // Search by listing title, SKU, or batch number.
        if (search) {
            params.push(`%${search}%`);

            const p = `$${params.length}`;

            where.push(`(
            l.title ILIKE ${p}
            OR lv.sku ILIKE ${p}
            OR ii.batch_number ILIKE ${p}
        )`);
        }

        // Filter by inventory item status.
        if (status) {
            params.push(status);
            where.push(`ii.status = $${params.length}::inventory_status`);
        }

        // Whitelisted sorting options.
        const ORDER = {
            updated_desc: 'ii.updated_at DESC NULLS LAST, ii.created_at DESC',
            updated_asc: 'ii.updated_at ASC NULLS LAST, ii.created_at ASC',
            title_asc: 'l.title ASC',
            title_desc: 'l.title DESC',
            quantity_asc: 'stock.total_units ASC',
            quantity_desc: 'stock.total_units DESC',
            available_asc: 'stock.available_units ASC',
            available_desc: 'stock.available_units DESC',
        };

        const orderBy = ORDER[sort] || ORDER.updated_desc;
        const offset = (page - 1) * limit;

        const { rows } = await db.query(`
        SELECT
            ii.id,
            ii.inventory_id,
            ii.listing_variant_id,
            ii.tracking_mode,

            ii.quantity,
            ii.reserved,

            stock.total_units,
            stock.reserved_units,
            stock.available_units,

            stock.available_units AS available,

            ii.batch_number,
            ii.mfg_at,
            ii.expires_at,
            ii.status,
            ii.created_at,
            ii.updated_at,

            l.id AS listing_id,
            l.title AS listing_title,
            l.condition AS listing_condition,

            lv.sku AS listing_sku,
            lv.product_variant_id,

            (
                SELECT lvm.storage_key
                FROM listing_variants_media lvm
                WHERE lvm.listing_variant_id = lv.id
                  AND lvm.is_primary = TRUE
                LIMIT 1
            ) AS listing_image

        FROM inventory_items ii

        JOIN listing_variants lv
            ON lv.id = ii.listing_variant_id

        JOIN listings l
            ON l.id = lv.listing_id

        LEFT JOIN LATERAL (
            SELECT
                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN ii.quantity
                    ELSE COUNT(*) FILTER (
                        WHERE iu.status IN ('available', 'reserved')
                    )::int
                END AS total_units,

                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN ii.reserved
                    ELSE COUNT(*) FILTER (
                        WHERE iu.status = 'reserved'
                    )::int
                END AS reserved_units,

                CASE
                    WHEN ii.tracking_mode = 'bulk'
                    THEN ii.quantity - ii.reserved
                    ELSE COUNT(*) FILTER (
                        WHERE iu.status = 'available'
                    )::int
                END AS available_units

            FROM inventory_units iu
            WHERE iu.inventory_item_id = ii.id
        ) stock ON TRUE

        WHERE ${where.join(' AND ')}

        ORDER BY ${orderBy}

        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

        // Count matching inventory items for pagination.
        const { rows: [{ count }] } = await db.query(`
        SELECT COUNT(*)::int AS count

        FROM inventory_items ii

        JOIN listing_variants lv
            ON lv.id = ii.listing_variant_id

        JOIN listings l
            ON l.id = lv.listing_id

        WHERE ${where.join(' AND ')}
    `, params);

        const total = Number(count);

        return {
            data: rows,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            hasNextPage: offset + limit < total,
            hasPreviousPage: page > 1,
        };
    }

    /**
    * Find an item by ID, scoped to a store (via inventory - store).
    */
    static async findStoreItemById(storeId, itemId) {
        const { rows } = await db.query(`
        SELECT
        ii.*,
        (ii.quantity - ii.reserved) AS available,
        l.title AS listing_title,
        l.condition,
        l.product_id,
        l.product_variant_id,
        (SELECT image_url FROM listing_images WHERE listing_id = l.id ORDER BY position LIMIT 1) AS listing_image,
        (SELECT sku FROM product_variants WHERE id = l.product_variant_id) AS listing_sku,
        inv.id AS inventory_id_ref,
        inv.title AS inventory_title,
        inv.store_id
        FROM inventory_items ii
        JOIN listings l ON l.id = ii.listing_id
        JOIN inventories inv ON inv.id = ii.inventory_id
        WHERE ii.id = $1 AND inv.store_id = $2
    `, [itemId, storeId]);

        return rows[0] || null;
    }

    /**
     * Find an item by inventory + listing (used for upserts).
     */
    static async findByListing(inventoryId, listingId) {
        const { rows } = await db.query(`
        SELECT *
        FROM inventory_items
        WHERE inventory_id = $1 AND listing_id = $2
        LIMIT 1
    `, [inventoryId, listingId]);

        return rows[0] || null;
    }

    /**
    * Create a new inventory item.
    */
    static async insertInventoryItem(data) {

        const {
            inventoryId, listing_variant_id, tracking_mode, quantity = 0, reserved = 0,
            batchNumber = null, mfg_at = null, expires_at = null,
            status = 'in_stock',
        } = data;

        const { rows: [row] } = await db.query(`
            INSERT INTO inventory_items (
            inventory_id, listing_variant_id, tracking_mode, quantity, reserved,
            batch_number, mfg_at, expires_at, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [inventoryId, listing_variant_id, tracking_mode, quantity, reserved,
            batchNumber, mfg_at, expires_at, status
        ]);

        return row;
    }

    /**
    * Update an item's metadata (batch, dates, status).
    * Does NOT change quantity/reserved — those use dedicated methods.
    */
    static async updateInventoryItem(itemId, patch) {

        const allowed = [
            'batch_number',
            'mfg_at',
            'expires_at',
            'status'];

        const fields = [];
        const values = [];
        let i = 1;

        for (const key of allowed) {
            if (key in patch) {
                fields.push(`${key} = $${i++}`);
                values.push(patch[key]);
            }
        }

        if (!fields.length) return null;

        fields.push('updated_at = NOW()');
        values.push(itemId);

        const { rows: [row] } = await db.query(`
            UPDATE inventory_items
            SET ${fields.join(', ')}
            WHERE id = $${i}
            RETURNING *
        `, values);

        return row || null;
    }

    /**
     * Atomically reserve N units.
     * Returns null if insufficient available (prevents over-reservation).
     */
    async reserveInventoryItem(itemId, quantity) {
        const { rows: [row] } = await db.query(`
            UPDATE inventory_items
            SET reserved = reserved + $1,
                updated_at = NOW()
            WHERE id = $2
            AND (quantity - reserved) >= $1
            RETURNING id, quantity, reserved, (quantity - reserved) AS available
        `, [quantity, itemId]);

        return row || null;   // null = not enough available
    }

    /**
     * Atomically release (un-reserve) N units.
     * Never goes below 0.
     */
    static async releaseInventoryItem(itemId, quantity) {
        const { rows: [row] } = await db.query(`
            UPDATE inventory_items
            SET reserved = GREATEST(reserved - $1, 0),
                updated_at = NOW()
            WHERE id = $2
            RETURNING id, quantity, reserved, (quantity - reserved) AS available
        `, [quantity, itemId]);

        return row || null;
    }

    /**
     * Atomically adjust quantity by a delta (+ or -).
     * Auto-recomputes status based on new quantity.
     */
    static async adjustInventoryItemQuantity(itemId, delta) {
        const { rows: [row] } = await db.query(`
        UPDATE inventory_items
        SET quantity = GREATEST(quantity + $1, 0),
            status = CASE
            WHEN quantity + $1 <= 0 THEN 'out_of_stock'::inventory_status
            WHEN quantity + $1 <= 10 THEN 'low_stock'::inventory_status
            ELSE 'in_stock'::inventory_status
            END,
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, quantity, reserved, (quantity - reserved) AS available, status
    `, [delta, itemId]);

        return row || null;
    }

    /**
    * Delete an item.
    */
    static async removeInventoryItem(itemId) {
        const { rowCount } = await db.query(`
            DELETE FROM inventory_items WHERE id = $1
        `, [itemId]);

        return rowCount > 0;
    }


    //============================ INVENTORY UNIT FUNCTIONALITIES ===================

    /**
    * List units for an inventory item.
    */
    static async listByItem(itemId, { page = 1, limit = 50, status = '' } = {}) {
        const where = ['u.inventory_item_id = $1'];
        const params = [itemId];

        if (status) {
            params.push(status);
            where.push(`u.status = $${params.length}::inventory_unit_status`);
        }

        const offset = (page - 1) * limit;

        const { rows } = await db.query(`
            SELECT
            u.id,
            u.inventory_item_id,
            u.serial_number,
            u.barcode,
            u.imei,
            u.mac_address,
            u.status,
            u.condition,
            u.location_id,
            u.warranty_start_date,
            u.warranty_end_date,
            u.received_at,
            u.sold_at,
            u.meta,
            u.created_at,
            u.updated_at
            FROM inventory_units u
            WHERE ${where.join(' AND ')}
            ORDER BY u.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
            [...params, limit, offset]);

        const { rows: [{ count }] } = await db.query(`
            SELECT COUNT(*)::int AS count
            FROM inventory_units u
            WHERE ${where.join(' AND ')}
        `, params);

        return {
            rows,
            total: count,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(count / limit)),
        };
    }

    static async getStoreTotals(storeId) {
        const { rows: [totals] } = await db.query(`
            SELECT
            COUNT(DISTINCT i.id)::int AS location_count,
            COALESCE(SUM(ii.quantity), 0)::int AS total_units,
            COALESCE(SUM(ii.reserved), 0)::int AS reserved_units,
            COALESCE(SUM(ii.quantity - ii.reserved), 0)::int AS available_units,
            COUNT(ii.id) FILTER (WHERE ii.status = 'low_stock')::int AS low_stock_items,
            COUNT(ii.id) FILTER (WHERE ii.status = 'out_of_stock')::int AS out_of_stock_items
            FROM inventories i
            LEFT JOIN inventory_items ii ON ii.inventory_id = i.id
            WHERE i.store_id = $1
            AND i.status = 'active'
        `, [storeId]);

        return totals;
    }

    /**
    * Find a unit by ID.
    */
    static async findUnitById(unitId) {
        const { rows } = await db.query(`
            SELECT * FROM inventory_units WHERE id = $1
        `, [unitId]);

        return rows[0] || null;
    }

    // models/inventory-unit.model.js

    /**
     * Global unit search — serial, IMEI, barcode, MAC.
     *
     * @param {string} storeId - Required. Scopes all results to this store.
     * @param {string} query - Required. The search term (partial match).
     * @param {object} opts
     * @param {string} [opts.inventoryId] - Optional. Restrict results to one location.
     * @param {string} [opts.status] - Optional. Filter by unit status.
     * @param {number} [opts.limit=50] - Max results.
     */
    // static async searchUnit(storeId, query, { inventoryId = null, status = '', limit = 50 } = {}) {
    //     const params = [storeId, `%${query}%`];

    //     const where = [
    //         `inv.store_id = $1`,
    //         `(
    //             u.serial_number ILIKE $2
    //             OR u.imei ILIKE $2
    //             OR u.barcode ILIKE $2
    //             OR u.mac_address ILIKE $2
    //         )`,
    //     ];

    //     // Optional: scope to one inventory
    //     if (inventoryId) {
    //         params.push(inventoryId);
    //         where.push(`ii.inventory_id = $${params.length}`);
    //     }

    //     // Optional: filter by status
    //     if (status) {
    //         params.push(status);
    //         where.push(`u.status = $${params.length}::inventory_unit_status`);
    //     }

    //     params.push(limit);

    //     const { rows } = await db.query(`
    //         SELECT
    //         u.id,
    //         u.serial_number,
    //         u.imei,
    //         u.barcode,
    //         u.mac_address,
    //         u.status,
    //         u.condition,
    //         u.warranty_start_date,
    //         u.warranty_end_date,
    //         u.received_at,
    //         u.sold_at,
    //         inv.id AS location_id,
    //         inv.title AS location_title,
    //         l.id AS listing_id,
    //         l.title AS listing_title,
    //         (SELECT storage_key FROM listing_variants_media
    //         WHERE listing_variant_id = lv.id AND is_primary = TRUE) AS listing_image
    //         FROM inventory_units u
    //         JOIN inventory_items ii ON ii.id = u.inventory_item_id
    //         JOIN inventories inv ON inv.id = ii.inventory_id 
    //         JOIN listing_variants lv ON lv.id = ii.listing_variant_id 
    //         JOIN listings l ON l.id = lv.listing_id
    //         WHERE ${where.join(' AND ')}
    //         ORDER BY u.updated_at DESC NULLS LAST
    //         LIMIT $${params.length}
    //     `, params);

    //     return rows;
    // }

    static async searchUnit(
        storeId,
        query,
        { inventoryId = null, status = '', limit = 50 } = {}
    ) {
        const params = [storeId, `%${query}%`];

        const where = [
            `inv.store_id = $1`,
            `(
            u.serial_number ILIKE $2
            OR u.imei ILIKE $2
            OR u.barcode ILIKE $2
            OR u.mac_address ILIKE $2
        )`,
        ];

        // Optional: scope to a specific inventory.
        if (inventoryId) {
            params.push(inventoryId);
            where.push(`ii.inventory_id = $${params.length}`);
        }

        // Optional: filter by unit status.
        if (status) {
            params.push(status);
            where.push(`u.status = $${params.length}::inventory_unit_status`);
        }

        params.push(limit);

        const { rows } = await db.query(`
        SELECT
            u.id,
            u.serial_number,
            u.imei,
            u.barcode,
            u.mac_address,
            u.status,
            u.condition,
            u.received_at,
            u.sold_at,
            u.created_at,
            u.updated_at,
            u.meta,

            ii.id AS inventory_item_id,
            ii.inventory_id,

            inv.id AS location_id,
            inv.title AS location_title,

            l.id AS listing_id,
            l.title AS listing_title,

            lv.id AS listing_variant_id,
            lv.product_variant_id,
            lv.sku AS listing_sku,

            (
                SELECT lvm.storage_key
                FROM listing_variants_media lvm
                WHERE lvm.listing_variant_id = lv.id
                ORDER BY
                    lvm.is_primary DESC NULLS LAST,
                    lvm.id
                LIMIT 1
            ) AS listing_image,

            wr.id AS warranty_registration_id,
            wr.warranty_id,
            w.title AS warranty_title,
            w.provider AS warranty_provider,
            w.description AS warranty_description,
            w.duration_months AS warranty_months_duration,
            w.terms_url AS warranty_terms_url,
            w.status AS warranty_status,

            wr.starts_at AS unit_warranty_start,
            wr.expires_at AS unit_warranty_end,
            wr.status AS warranty_registration_status

        FROM inventory_units u

        JOIN inventory_items ii
            ON ii.id = u.inventory_item_id

        JOIN inventories inv
            ON inv.id = ii.inventory_id

        JOIN listing_variants lv
            ON lv.id = ii.listing_variant_id

        JOIN listings l
            ON l.id = lv.listing_id

        LEFT JOIN warranty_registrations wr
            ON wr.inventory_unit_id = u.id

        LEFT JOIN warranties w
            ON w.id = wr.warranty_id

        WHERE ${where.join(' AND ')}

        ORDER BY u.updated_at DESC NULLS LAST, u.id

        LIMIT $${params.length}
    `, params);

        return rows;
    }

    /**
     * Find a unit by a unique identifier (used to prevent duplicates).
     */
    static async findByUniqueId({ serialNumber, imei, barcode, macAddress }) {
        const conditions = [];
        const params = [];

        if (serialNumber) { params.push(serialNumber); conditions.push(`serial_number = $${params.length}`); }
        if (imei) { params.push(imei); conditions.push(`imei = $${params.length}`); }
        if (barcode) { params.push(barcode); conditions.push(`barcode = $${params.length}`); }
        if (macAddress) { params.push(macAddress); conditions.push(`mac_address = $${params.length}`); }

        if (!conditions.length) return null;

        const { rows } = await db.query(`
            SELECT * FROM inventory_units
            WHERE ${conditions.join(' OR ')}
            LIMIT 1
        `, params);

        return rows[0] || null;
    }

    /**
    * Create a new unit.
    */
    static async insertInventoryUnit(data) {
        const {
            inventoryItemId,
            serialNumber = null,
            barcode = null,
            imei = null,
            macAddress = null,
            status = 'available',
            condition = 'new',
            receivedAt = null,
            soldAt = null,
            meta = {}
        } = data;


        const { rows: [row] } = await db.query(`
            INSERT INTO inventory_units (
                inventory_item_id, serial_number, barcode, imei, mac_address,
                status, condition, received_at, sold_at, meta
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            inventoryItemId, serialNumber || null, barcode || null, imei || null, macAddress || null,
            status, condition, receivedAt || null, soldAt || null, meta,
        ]);

        return row;
    }

    /**
     * Bulk create units (for CSV import or bulk receive).
     */
    static async createMany(units) {
        if (!units.length) return [];

        // Build a multi-row insert
        const cols = [
            'inventory_item_id', 'serial_number', 'barcode', 'imei', 'mac_address',
            'status', 'condition', 'location_id',
            'warranty_start_date', 'warranty_end_date', 'received_at', 'meta',
        ];

        const values = [];
        const placeholders = units.map((u, i) => {
            const row = [
                u.inventoryItemId, u.serialNumber ?? null, u.barcode ?? null,
                u.imei ?? null, u.macAddress ?? null,
                u.status ?? 'available', u.condition ?? 'new', u.locationId ?? null,
                u.warrantyStartDate ?? null, u.warrantyEndDate ?? null,
                u.receivedAt ?? null, u.meta ?? {},
            ];
            values.push(...row);
            const base = i * cols.length;
            return `(${cols.map((_, j) => `$${base + j + 1}`).join(', ')})`;
        });

        const { rows } = await db.query(`
            INSERT INTO inventory_units (${cols.join(', ')})
            VALUES ${placeholders.join(', ')}
            RETURNING *
        `, values);

        return rows;
    }

    static async listUnitsByInventory(inventoryId, {
        page = 1,
        limit = 20,
        status = '',
        sort = 'recent',
    } = {}) {
        const params = [inventoryId];
        const where = ['ii.inventory_id = $1'];

        if (status) {
            params.push(status);
            where.push(`u.status = $${params.length}::inventory_unit_status`);
        }

        const ORDER = {
            recent: 'u.created_at DESC',
            serial_asc: 'u.serial_number ASC NULLS LAST',
            warranty: 'u.warranty_end_date ASC NULLS LAST',
        };
        const orderBy = ORDER[sort] || ORDER.recent;

        const offset = (page - 1) * limit;

        const { rows } = await db.query(`
            SELECT
            u.id,
            u.serial_number,
            u.imei,
            u.barcode,
            u.mac_address,
            u.status,
            u.condition,
            u.received_at,
            u.sold_at,
            i.title AS inventory_title,
            i.description AS inventory_description,
            u.inventory_item_id,
            ii.inventory_id,
            l.id AS listing_id,
            l.title AS listing_title,
            (SELECT storage_key FROM listing_variants_media
            WHERE listing_variant_id = lv.id) AS listing_image,
            w.title AS warranty_title,
            w.provider AS warranty_provider,
            w.description AS warranty_description,
            w.duration_months AS warranty_months_duration,
            w.terms_url AS warranty_terms_url,
            w.status AS warranty_status,
            w.updated_at AS warranty_updated_at,
            wr.starts_at AS unit_warrant_start,
            wr.expires_at AS unit_warrant_end
            FROM inventory_units u
            JOIN inventory_items ii ON ii.id = u.inventory_item_id
            JOIN inventories i ON i.id = ii.inventory_id
            JOIN listing_variants lv ON lv.id = ii.listing_variant_id
            JOIN listings l ON l.id = lv.listing_id 
            LEFT JOIN warranty_registrations wr ON wr.inventory_unit_id = u.id
            LEFT JOIN warranties w ON w.id = wr.warranty_id
            WHERE ${where.join(' AND ')}
            ORDER BY ${orderBy}
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        const { rows: [{ count }] } = await db.query(`
            SELECT COUNT(*)::int AS count
            FROM inventory_units u
            JOIN inventory_items ii ON ii.id = u.inventory_item_id
            WHERE ${where.join(' AND ')}
        `, params);

        return {
            units: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(count / limit)),
                hasNextPage: offset + limit < count,
                hasPreviousPage: page > 1,
            }
        };
    }

    /**
     * Update a unit's status / metadata.
     */
    static async update(unitId, patch) {
        const allowed = [
            'status', 'condition', 'location_id',
            'warranty_start_date', 'warranty_end_date',
            'sold_at', 'meta',
        ];
        const fields = [];
        const values = [];
        let i = 1;

        for (const key of allowed) {
            if (key in patch) {
                fields.push(`${key} = $${i++}`);
                values.push(patch[key]);
            }
        }

        if (!fields.length) return null;

        fields.push('updated_at = NOW()');
        values.push(unitId);

        const { rows: [row] } = await db.query(`
            UPDATE inventory_units
            SET ${fields.join(', ')}
            WHERE id = $${i}
            RETURNING *
        `, values);

        return row || null;
    }

    /**
     * Mark a unit as sold.
     */
    static async markSold(unitId) {
        const { rows: [row] } = await db.query(`
            UPDATE inventory_units
            SET status = 'sold', sold_at = NOW(), updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [unitId]);

        return row || null;
    }

    /**
    * Count units by status for an item.
    */
    static async countByStatus(itemId) {
        const { rows } = await db.query(`
            SELECT status, COUNT(*)::int AS count
            FROM inventory_units
            WHERE inventory_item_id = $1
            GROUP BY status
        `, [itemId]);

        return rows.reduce((acc, r) => ({ ...acc, [r.status]: r.count }), {});
    }

    //========================= INVENTORY TRANSACTIONS FUNCTIONALITIES ===========

    /**
     * List transactions for an item.
     */
    static async listTransactionByItem(itemId, { page = 1, limit = 50 } = {}) {
        const offset = (page - 1) * limit;

        const { rows } = await db.query(`
            SELECT
            t.id,
            t.inventory_item_id,
            t.quantity_change,
            t.type,
            t.reference_type,
            t.reference_id,
            t.notes,
            t.created_by,
            t.created_at,
            u.username AS created_by_name
            FROM inventory_transactions t
            LEFT JOIN users u ON u.id = t.created_by
            WHERE t.inventory_item_id = $1
            ORDER BY t.created_at DESC
            LIMIT $2 OFFSET $3
        `, [itemId, limit, offset]);

        const { rows: [{ count }] } = await db.query(`
            SELECT COUNT(*)::int AS count FROM inventory_transactions
            WHERE inventory_item_id = $1
        `, [itemId]);

        return { rows, total: count, page, limit };
    }

    /**
    * List transactions across a store.
    */
    static async listTransactionByStore(storeId, {
        page = 1,
        limit = 50,
        search = '',
        type = '',
        from = null,
        to = null,
    } = {}) {
        const where = ['inv.store_id = $1'];
        const params = [storeId];

        if (type) {
            params.push(type);
            where.push(`t.type = $${params.length}::inventory_transaction_type`);
        }

        if (from) {
            params.push(from);
            where.push(`t.created_at >= $${params.length}`);
        }

        if (to) {
            params.push(to);
            where.push(`t.created_at <= $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            where.push(`(t.notes ILIKE $${params.length} OR l.title ILIKE $${params.length})`);
        }

        const offset = (page - 1) * limit;

        const { rows } = await db.query(`
            SELECT
            t.id,
            t.inventory_item_id,
            t.quantity_change,
            t.type,
            t.reference_type,
            t.reference_id,
            t.notes,
            t.created_by,
            t.created_at,
            u.username AS created_by_name,
            l.title AS listing_title,
            inv.title  AS inventory_title
            FROM inventory_transactions t
            JOIN inventory_items ii ON ii.id = t.inventory_item_id
            JOIN inventories inv ON inv.id = ii.inventory_id
            JOIN listings l ON l.id = ii.listing_id
            LEFT JOIN users u ON u.id = t.created_by
            WHERE ${where.join(' AND ')}
            ORDER BY t.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `, [...params, limit, offset]);

        const { rows: [{ count }] } = await db.query(`
            SELECT COUNT(*)::int AS count
            FROM inventory_transactions t
            JOIN inventory_items ii ON ii.id = t.inventory_item_id
            JOIN inventories inv    ON inv.id = ii.inventory_id
            JOIN listings l         ON l.id = ii.listing_id
            WHERE ${where.join(' AND ')}
        `, params);

        return {
            rows,
            total: count,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(count / limit)),
            hasNextPage: offset + limit < count,
            hasPreviousPage: page > 1,
        };
    }

    /**
     * Create a transaction log entry.
     */
    static async createInventoryTransaction(data) {
        const {
            inventoryItemId,
            quantityChange,
            type,
            referenceType = null,
            referenceId = null,
            notes = null,
            createdBy = null,
        } = data;

        const { rows: [row] } = await db.query(`
            INSERT INTO inventory_transactions (
            inventory_item_id, quantity_change, type,
            reference_type, reference_id, notes, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            inventoryItemId, quantityChange, type,
            referenceType, referenceId, notes, createdBy,
        ]);

        return row;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INVENTORY SERVICE — IMPLEMENTATION ROADMAP
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // This service currently implements the CORE operations needed for a
    // store. The functions below cover ~80% of real-world usage:
    //
    //   ✅ Inventory locations (CRUD + stats)
    //   ✅ Inventory items (list, search, filter, sort)
    //   ✅ Manual quantity adjustments
    //   ✅ Reserve / release units
    //   ✅ Serialized unit tracking
    //   ✅ Transaction audit log
    //   ✅ Per-store and per-location reporting
    //
    // The remaining functionality is documented below as TODO. Each item is
    // implemented WHEN the operational pain appears, not before. Building features
    // ahead of real usage leads to unused code and maintenance burden.
    //
    // PRIORITY LEGEND:
    //    Blocking  — needed before taking orders in production
    //    Soon      — add within the first month of live operation
    //    Later     — add when the manual workaround becomes painful
    //    Optional  — add only if the business model requires it
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — ORDER → INVENTORY INTEGRATION
    // ───────────────────────────────────────────────────────────────────────────
    //
    // The single most important missing feature. Without it, stock counts drift
    // silently as orders come in. Staff must manually adjust quantities after
    // every order — workable at 5 orders/day, broken at 50.
    //
    // Functions to implement:
    //
    //   async function reserveForOrder({ orderId, items, createdBy }) {
    //     // For each item in the order:
    //     //   - Find the inventory item for (inventoryId, listingId)
    //     //   - Call InventoryItemModel.reserve(itemId, quantity, client)
    //     //   - If reserve returns null → throw INSUFFICIENT_STOCK
    //     //   - Log a 'reserved' transaction with reference to orderId
    //     // Wrap everything in a DB transaction — all-or-nothing.
    //   }
    //
    //   async function commitOrder({ orderId, createdBy }) {
    //     // Called when order status → 'shipped' or 'delivered'.
    //     // For each reservation tied to this order:
    //     //   - Decrement quantity: adjustQuantity(itemId, -quantity, client)
    //     //   - Release the reservation: release(itemId, quantity, client)
    //     //   - If tracking units: markSold(unitIds, client)
    //     //   - Log a 'sold' transaction
    //     // Wrap in transaction.
    //   }
    //
    //   async function releaseOrderReservation({ orderId, createdBy }) {
    //     // Called when order status → 'cancelled'.
    //     // For each reservation tied to this order:
    //     //   - Release: release(itemId, quantity, client)
    //     //   - Log a 'released' transaction
    //     // Wrap in transaction.
    //   }
    //
    // Integration points:
    //   - In OrderService.createOrder() → call reserveForOrder() after order is saved
    //   - In OrderService.shipOrder()    → call commitOrder()
    //   - In OrderService.cancelOrder()  → call releaseOrderReservation()
    //
    // When to build:
    //   Before accepting live orders from real customers.
    //
    // Effort estimate: 3–4 hours + order controller hooks.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — RETURNS HANDLING
    // ───────────────────────────────────────────────────────────────────────────
    //
    // When a customer returns a product, stock must go back up. Also need to
    // track whether the item is resellable or damaged.
    //
    // Function to implement:
    //
    //   async function receiveReturn({
    //     storeId, orderId, itemId, quantity,
    //     condition = 'new',   // 'new' | 'used' | 'damaged'
    //     resellable = true,
    //     createdBy,
    //   }) {
    //     // 1. Adjust quantity: adjustQuantity(itemId, +quantity, client)
    //     // 2. If serialized: markReturned(unitId, { orderId, condition }, client)
    //     //    Then either markAvailable() or markDamaged() based on 'resellable'
    //     // 3. Log a 'returned' transaction with condition in notes
    //     // Wrap in transaction.
    //   }
    //
    // Optional companion functions:
    //
    //   async function markReturnAsDamaged({ itemId, unitIds, notes, createdBy }) {
    //     // Bulk-mark units as damaged. Does NOT increment quantity.
    //   }
    //
    //   async function restockReturn({ itemId, quantity, createdBy }) {
    //     // Increment quantity after inspection confirms item is sellable.
    //   }
    //
    // Integration point:
    //   - In OrderService.receiveReturn() → call receiveReturn()
    //
    // When to build:
    //   When processing 3+ returns per week manually.
    //
    // Effort estimate: 2 hours + a "Return received" button on the order page.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — LOW STOCK / OUT OF STOCK ALERTS
    // ───────────────────────────────────────────────────────────────────────────
    //
    // Currently the dashboard shows low stock, but only if the user visits it.
    // Real stores need proactive alerts when items run low.
    //
    // Functions to implement:
    //
    //   async function listLowStock(storeId, { threshold, limit = 50 }) {
    //     // Return items where available <= threshold OR status = 'low_stock'.
    //   }
    //
    //   async function listOutOfStock(storeId, { limit = 50 }) {
    //     // Return items where status = 'out_of_stock'.
    //   }
    //
    //   async function countByStatus(storeId) {
    //     // Aggregate counts by status across all inventories.
    //     // Returns { in_stock: N, low_stock: N, out_of_stock: N, damaged: N, ... }
    //   }
    //
    // Optional — trigger notifications:
    //
    //   async function checkAndNotifyLowStock(storeId) {
    //     // Called by a cron job (daily/hourly).
    //     // 1. Query low stock items
    //     // 2. If any exist, email the vendor
    //     // 3. Track last_notified_at to avoid spam
    //   }
    //
    // Integration points:
    //   - Add a "Low stock" widget to the dashboard
    //   - Optional cron job: 0 */6 * * * (every 6 hours)
    //
    // When to build:
    //   When you've missed a restock because you didn't check the dashboard.
    //
    // Effort estimate: 1 hour for reads, +1 hour for notification job.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — WAREHOUSE-TO-WAREHOUSE TRANSFERS
    // ───────────────────────────────────────────────────────────────────────────
    //
    // When stock moves between physical locations, both sides need updating and
    // the movement needs an audit trail.
    //
    // Function to implement:
    //
    //   async function transferStock({
    //     storeId,
    //     fromInventoryId,
    //     toInventoryId,
    //     itemId,
    //     unitIds = [],       // for serialized items
    //     quantity = 0,       // for quantity-based items
    //     notes,
    //     createdBy,
    //   }) {
    //     // 1. Verify both inventories belong to store
    //     // 2. Verify source has enough available
    //     // 3. Decrement source item quantity
    //     // 4. Find or create destination item
    //     // 5. Increment destination item quantity
    //     // 6. If serialized: moveUnits(unitIds, toInventoryId, client)
    //     // 7. Log two transactions: 'transfer_out' and 'transfer_in'
    //     // Wrap in transaction.
    //   }
    //
    // Schema requirement:
    //   The inventory_transaction_type enum needs two new values:
    //     ALTER TYPE inventory_transaction_type ADD VALUE IF NOT EXISTS 'transfer_out';
    //     ALTER TYPE inventory_transaction_type ADD VALUE IF NOT EXISTS 'transfer_in';
    //
    // When to build:
    //   When you have 2+ warehouses AND do transfers more than once a week.
    //
    // Effort estimate: 3 hours + a "Move stock" button + modal.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — BULK OPERATIONS
    // ───────────────────────────────────────────────────────────────────────────
    //
    // When managing hundreds of items, one-at-a-time operations become painful.
    //
    // Functions to implement:
    //
    //   async function bulkAdjustQuantities(adjustments, createdBy) {
    //     // adjustments = [{ itemId, delta, notes }]
    //     // Single transaction, one UPDATE per item OR one multi-row UPDATE.
    //   }
    //
    //   async function bulkUpdateStatus(itemIds, status, createdBy) {
    //     // Mark many items as 'discontinued', 'damaged', etc.
    //   }
    //
    //   async function bulkReserve(items, reference, createdBy) {
    //     // Reserve multiple items for one order/reference.
    //   }
    //
    //   async function bulkMarkSold(unitIds, createdBy) {
    //     // Mark many units as sold in one query.
    //   }
    //
    // When to build:
    //   When bulk operations take more than 30 minutes of manual work.
    //
    // Effort estimate: 2 hours.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — CSV IMPORT / EXPORT
    // ───────────────────────────────────────────────────────────────────────────
    //
    // Useful for initial catalog loads and periodic reporting.
    //
    // Functions to implement:
    //
    //   async function importFromCsv({
    //     storeId, inventoryId, rows, createdBy,
    //   }) {
    //     // rows = [{ listing_id, quantity, batch_number, mfg_at, expires_at }]
    //     // 1. Validate each row (listing belongs to store)
    //     // 2. Upsert inventory_items
    //     // 3. Log a transaction per row
    //     // 4. Return summary: { created, updated, skipped, errors }
    //   }
    //
    //   async function exportToCsv({
    //     storeId, inventoryId, filters,
    //   }) {
    //     // Return a stream of CSV rows.
    //   }
    //
    // When to build:
    //   When adding 100+ products via UI becomes tedious.
    //
    // Effort estimate: 4 hours (CSV parsing + validation + bulk insert).
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — REPORTING & ANALYTICS
    // ───────────────────────────────────────────────────────────────────────────
    //
    // Business intelligence features. Valuable at scale, noise at small scale.
    //
    // Functions to implement:
    //
    //   async function getInventoryValue(storeId) {
    //     // SUM(quantity * listing_price) across all inventories.
    //   }
    //
    //   async function getTurnover(storeId, { period = '30d' }) {
    //     // (COGS / average inventory value) over the period.
    //   }
    //
    //   async function getAgingStock(storeId, { days = 90, limit = 50 }) {
    //     // Items held longer than N days without any sale.
    //   }
    //
    //   async function getDeadStock(storeId, { days = 180, limit = 50 }) {
    //     // Items with zero sales in N days.
    //   }
    //
    //   async function getMovementHistory(storeId, listingId, { period }) {
    //     // All transactions affecting a listing over the period.
    //   }
    //
    // When to build:
    //   When you have 6+ months of data AND a specific decision to make with it.
    //
    // Effort estimate: 2 hours each.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — STOCK TAKE / PHYSICAL COUNT
    // ───────────────────────────────────────────────────────────────────────────
    //
    // Formal workflow for reconciling physical stock with system stock.
    //
    // Functions to implement:
    //
    //   async function startCount({ storeId, inventoryId, createdBy }) {
    //     // Snapshot current quantities. Return count session ID.
    //   }
    //
    //   async function recordCount({ countId, itemId, countedQuantity, notes, createdBy }) {
    //     // Record physical count for one item.
    //   }
    //
    //   async function reconcileCount({ countId, createdBy }) {
    //     // Compute deltas between snapshot and actual.
    //     // Adjust quantities and log 'adjustment' transactions.
    //   }
    //
    // Schema requirement:
    //   New tables needed:
    //     inventory_counts (session metadata)
    //     inventory_count_items (per-item counts)
    //
    // When to build:
    //   When discrepancies between system and physical stock become common.
    //
    // Effort estimate: 6–8 hours (schema + service + UI).
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — WARRANTY & EXPIRY ALERTS
    // ───────────────────────────────────────────────────────────────────────────
    //
    // Only relevant if you sell products with warranties or expiry dates.
    //
    // Functions to implement:
    //
    //   async function listExpiringItems(storeId, { withinDays = 30, limit = 50 }) {
    //     // inventory_items where expires_at < NOW() + withinDays.
    //   }
    //
    //   async function listExpiringWarranties(storeId, { withinDays = 30, limit = 50 }) {
    //     // inventory_units where warranty_end_date < NOW() + withinDays
    //     // AND status = 'available'.
    //   }
    //
    //   async function listExpiredWarranties(storeId, { limit = 50 }) {
    //     // inventory_units with warranty_end_date < NOW() AND status = 'available'.
    //   }
    //
    // When to build:
    //   When you sell products where customers ask about warranty/expiry.
    //
    // Effort estimate: 2 hours + a widget on the dashboard.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — BATCH MANAGEMENT
    // ───────────────────────────────────────────────────────────────────────────
    //
    // Currently batch_number exists on inventory_items but no workflows use it.
    //
    // Functions to implement:
    //
    //   async function listBatches(storeId) {
    //     // Distinct batch numbers with counts and stock.
    //   }
    //
    //   async function listByBatch(storeId, batchNumber, { page, limit }) {
    //     // All items with this batch number.
    //   }
    //
    //   async function getBatchSummary(storeId, batchNumber) {
    //     // Total quantity, received date range, expiry range, status breakdown.
    //   }
    //
    // When to build:
    //   When products have real expiry dates (pharma, food, cosmetics).
    //
    // Effort estimate: 2 hours.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — UNIT LIFECYCLE HISTORY
    // ───────────────────────────────────────────────────────────────────────────
    //
    // Reconstructs the full journey of a serialized unit from received → sold.
    //
    // Function to implement:
    //
    //   async function getUnitHistory(unitId) {
    //     // Return timeline:
    //     //   - received (from inventory_units.received_at)
    //     //   - reserved (from inventory_transactions)
    //     //   - sold (from inventory_units.sold_at)
    //     //   - returned (from meta.returned_at)
    //     //   - any status changes
    //   }
    //
    // When to build:
    //   When customer support needs to trace a specific unit's journey.
    //
    // Effort estimate: 2 hours.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — SOFT DELETE FOR ITEMS
    // ───────────────────────────────────────────────────────────────────────────
    //
    // Currently items are hard-deleted via InventoryItemModel.remove().
    // Consider soft-delete for audit trail.
    //
    // Schema requirement:
    //   ALTER TABLE inventory_items ADD COLUMN deleted_at TIMESTAMPTZ;
    //   ALTER TABLE inventory_units ADD COLUMN deleted_at TIMESTAMPTZ;
    //
    // Functions to implement:
    //
    //   async function softDeleteItem(itemId, createdBy) {
    //     // Set deleted_at = NOW(), log a 'deleted' transaction.
    //   }
    //
    //   async function restoreItem(itemId, createdBy) {
    //     // Clear deleted_at, log a 'restored' transaction.
    //   }
    //
    // Query updates:
    //   Every read query needs `WHERE deleted_at IS NULL`.
    //
    // When to build:
    //   Only if you need to recover accidentally deleted items.
    //
    // Effort estimate: 2 hours + touches every read query.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — UNIT VALIDATION & DUPLICATE DETECTION
    // ───────────────────────────────────────────────────────────────────────────
    //
    // Before bulk-inserting units, check for duplicates and missing data.
    //
    // Functions to implement:
    //
    //   async function validateUnits(units) {
    //     // units = [{ serial_number, imei, barcode, mac_address }]
    //     // Returns { valid: [...], duplicates: [...], missing: [...] }
    //   }
    //
    //   async function findDuplicates(identifiers) {
    //     // identifiers = { serials: [...], imeis: [...], barcodes: [...] }
    //     // Return existing units in DB that match any identifier.
    //   }
    //
    // When to build:
    //   When bulk-importing units and data quality matters.
    //
    // Effort estimate: 2 hours.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    //  TODO — TRANSACTION FILTERING & REPORTING
    // ───────────────────────────────────────────────────────────────────────────
    //
    // The transaction log grows large. Add filters and summaries.
    //
    // Functions to implement:
    //
    //   async function listByUser(storeId, userId, { page, limit }) {
    //     // Transactions made by a specific user.
    //   }
    //
    //   async function countByType(storeId, { period }) {
    //     // { received: N, sold: N, adjusted: N, ... }
    //   }
    //
    //   async function dailySummary(storeId, { period = '30d' }) {
    //     // Per-day counts and net quantity changes.
    //   }
    //
    // When to build:
    //   When you need to answer "what happened yesterday?" without scrolling.
    //
    // Effort estimate: 3 hours.
    //
    // ═══════════════════════════════════════════════════════════════════════════
    //
    // IMPLEMENTATION ORDER — RECOMMENDED SEQUENCE
    // ───────────────────────────────────────────────────────────────────────────
    //
    //   1.  Order → inventory integration     (before live orders)
    //   2.  Low stock alerts                  (within month 1)
    //   3.  Returns handling                  (after first 3 returns)
    //   4.  Warehouse transfers               (when 2+ warehouses active)
    //   5.  Bulk operations                   (when manual is too slow)
    //   6.  CSV import/export                 (when onboarding >100 products)
    //   7.  Reporting                         (when you have 6+ months data)
    //   8.  Stock take                        (when discrepancies appear)
    //   9.  Warranty/expiry alerts            (when business model requires)
    //  10.  Batch management                  (when products have expiry)
    //  11.  Unit history                      (when support needs it)
    //  12.  Soft delete                       (when audit requires it)
    //  13.  Unit validation                   (when bulk importing units)
    //  14.  Transaction reporting             (when log gets large)
    //


    // ═══════════════════════════════════════════════════════════════════════════
    //
    // RULES OF THUMB
    // ───────────────────────────────────────────────────────────────────────────
    //
    //   • If a human can do it manually in < 5 minutes, don't automate yet.
    //   • If you're building for a scale you don't have, you're wasting time.
    //   • If a symptom hasn't appeared, the fix isn't needed yet.
    //   • Every "missing" feature has a workaround. Wait for it to hurt.
    //   • Build the 20% that delivers 80%. Ship. Learn. Then build the rest.
    //
    // ═══════════════════════════════════════════════════════════════════════════

}

module.exports = InventoryModel;