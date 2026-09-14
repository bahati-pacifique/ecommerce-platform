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
}

module.exports = InventoryModel;