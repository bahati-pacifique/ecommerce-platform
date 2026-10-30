const InventoryModel = require("../models/inventory.model");
const { randomUId } = require("../../util/helpers");

class InventoryService {

    /**
     * Create inventory
     */
    static async createInventory({
        storeId,
        title,
        description,
        address,
        isDefault = false,
        status = "active",
        meta = {}
    }) {

        if (!storeId) {
            throw new Error("Store ID is required");
        }

        if (!title || !title.trim()) {
            throw new Error("Inventory title is required");
        }

        const inventory = await InventoryModel.createInventory({
            storeId,
            title: title.trim(),
            description: description?.trim() || null,
            address: address?.trim() || null,
            isDefault,
            status,
            meta
        });

        return inventory;
    }


    /**
     * Get inventory
     */
    static async getInventoryById(
        inventoryId,
        storeId
    ) {

        if (!inventoryId) {
            throw new Error("Inventory ID is required");
        }

        if (!storeId) {
            throw new Error("Store ID is required");
        }

        const inventory =
            await InventoryModel.getInventoryByIdAndStoreId(
                inventoryId,
                storeId
            );

        if (!inventory) {
            throw new Error("Inventory not found");
        }

        return inventory;
    }


    /**
     * Get paginated inventories
     */
    static async getInventoriesByStoreId(
        storeId,
        options = {}
    ) {

        if (!storeId) {
            throw new Error("Store ID is required");
        }

        let page = Number(options.page) || 1;
        let limit = Number(options.limit) || 20;

        page = Math.max(page, 1);
        limit = Math.min(Math.max(limit, 1), 100);

        return await InventoryModel.getInventoriesByStoreId(
            storeId,
            {
                ...options,
                page,
                limit
            }
        );
    }


    /**
     * Update inventory
     */
    static async updateInventory(
        inventoryId,
        storeId,
        fields
    ) {

        if (!inventoryId) {
            throw new Error("Inventory ID is required");
        }

        if (!storeId) {
            throw new Error("Store ID is required");
        }

        if (!fields || typeof fields !== "object") {
            throw new Error("Update fields are required");
        }

        if (
            fields.title !== undefined &&
            (!fields.title || !fields.title.trim())
        ) {
            throw new Error("Inventory title cannot be empty");
        }

        if (fields.title !== undefined) {
            fields.title = fields.title.trim();
        }

        const inventory =
            await InventoryModel.updateInventoryDynamicFields(
                inventoryId,
                storeId,
                fields
            );

        if (!inventory) {
            throw new Error(
                "Inventory not found or no valid fields were provided"
            );
        }

        return inventory;
    }


    /**
     * Change inventory status
     */
    static async setInventoryStatus(
        inventoryId,
        storeId,
        status
    ) {

        if (!inventoryId) {
            throw new Error("Inventory ID is required");
        }

        if (!storeId) {
            throw new Error("Store ID is required");
        }

        if (!status) {
            throw new Error("Inventory status is required");
        }

        const inventory =
            await InventoryModel.setInventoryStatus(
                inventoryId,
                storeId,
                status
            );

        if (!inventory) {
            throw new Error("Inventory not found");
        }

        return inventory;
    }


    /**
     * Set default inventory
     */
    static async setDefaultInventory(
        inventoryId,
        storeId
    ) {

        if (!inventoryId) {
            throw new Error("Inventory ID is required");
        }

        if (!storeId) {
            throw new Error("Store ID is required");
        }

        const inventory =
            await InventoryModel.setDefaultInventory(
                inventoryId,
                storeId
            );

        if (!inventory) {
            throw new Error("Inventory not found");
        }

        return inventory;
    }


    /**
     * Delete inventory
     */
    static async deleteInventory(
        inventoryId,
        storeId
    ) {

        if (!inventoryId) {
            throw new Error("Inventory ID is required");
        }

        if (!storeId) {
            throw new Error("Store ID is required");
        }

        const inventory =
            await InventoryModel.deleteInventory(
                inventoryId,
                storeId
            );

        if (!inventory) {
            throw new Error("Inventory not found");
        }

        return inventory;
    }
    static async getInventoryVendorDashboardData(vendorId, lowStockThreshold) {
        return await InventoryModel.getInventoryVendorDashboardData(vendorId, lowStockThreshold)
    }


    /**
     * Get everything the inventory overview page needs.
     */
    static async getInventoryOverview(storeId) {
        const [locations, rawTotals] = await Promise.all([
            InventoryModel.listByStore(storeId),
            InventoryModel.getStoreTotals(storeId),
        ]);

        return {
            locations: locations.data.map(loc => this.#shapeLocation(loc)),
            totals: this.#shapeTotals(rawTotals),
        };
    }

    /**
     * Empty overview — for error fallback.
     */
    static emptyInventoryOverview() {
        return {
            locations: [],
            totals: {
                units: 0,
                available: 0,
                reserved: 0,
                low_stock: 0,
                out_of_stock: 0,
            },
        };
    }

    static async getInventoryDetail(storeId, inventoryId, opts = {}) {

        const location = await InventoryModel.findInventoryByStoreId(storeId, inventoryId);
        if (!location) return null;

        const [items, rawStats] = await Promise.all([
            InventoryModel.listByInventory(inventoryId, opts),
            InventoryModel.getStats(inventoryId),
        ]);

        const detailPayload = {
            location: {
                id: location.id,
                title: location.title,
                description: location.description,
                address: location.address,
                is_default: location.is_default,
                status: location.status,
                meta: location.meta,
            },
            items: items.data.map(this.#shapeItem),
            stats: {
                item_records: rawStats.item_records,
                total_units: rawStats.total_units,
                available_units: rawStats.available_units,
                reserved_units: rawStats.reserved_units,
                low_stock_items: rawStats.low_stock_items,
                out_of_stock_items: rawStats.out_of_stock_items,
            },
            pagination: {
                page: items.page,
                limit: items.limit,
                total: items.total,
                totalPages: items.totalPages,
                hasNextPage: items.hasNextPage,
                hasPreviousPage: items.hasPreviousPage,
            },
        };

        return detailPayload;
    }

    static async listUnitsByInventory(inventoryId, opts) {
        return await InventoryModel.listUnitsByInventory(inventoryId, opts);
    }

    static async getUnitById(unitId) {
        return await InventoryModel.getUnitById(unitId);
    }

    static async searchUnit(storeId, query, opts) {
        return await InventoryModel.searchUnit(storeId, query, opts);
    }

    /**
     * 
     * @param {*} payload 
     * {
            inventory_id, listing_id, quantity = 0, reserved = 0,
            batch_number = null, mfg_at = null, expires_at = null,
            status = 'in_stock',
        }
     *
     */
    static async insertItem(storeId, payload) {
        const inventory = await InventoryModel.findInventoryByStoreId(storeId, payload.inventoryId);
        if (!inventory) throw new Error('Store/Inventory verification failed');
        return await InventoryModel.insertInventoryItem(payload);
    }

    static async insertItemUnity(storeId, inventoryId, payload, user) {
        const inventory = await InventoryModel.findInventoryByStoreId(storeId, inventoryId);
        if (!inventory) throw new Error('Store/Inventory verification failed');

        const result = await InventoryModel.insertInventoryUnit(payload);

        if (result) {
            try {
                const transactionPayload = {
                    inventoryItemId: payload.inventoryItemId,
                    type: 'initial_stock',
                    quantityChange: 1,
                    reference_type: randomUId(),
                    notes: `Unit registration. Unit id: ${result.id}`,
                    createdBy: user?.id || null
                }

                await InventoryModel.createInventoryTransaction(transactionPayload);
            } catch (error) {
                console.log('Insert unit transaction failed', error);
            }
        }

        return result;
    }

    shapeLocation(loc) {
        return {
            id: loc.id,
            title: loc.title,
            description: loc.description,
            address: loc.address,
            is_default: loc.is_default,
            status: loc.status,
            meta: loc.meta,
        };
    }

    static #shapeItem(i) {
        return {
            id: i.id,
            listing: {
                title: i.listing_title,
                image: i.listing_image,
                sku: i.listing_sku,
            },
            tracking_mode: i.tracking_mode,
            quantity: i.quantity,
            reserved: i.reserved,
            available: i.available,
            batch_number: i.batch_number,
            status: i.status,
            updated_at: i.updated_at,
        };
    }
    static #shapeStats(s) {
        return {
            item_records: s.item_records,
            total_units: s.total_units,
            available_units: s.available_units,
            reserved_units: s.reserved_units,
            low_stock_items: s.low_stock_items,
            out_of_stock_items: s.out_of_stock_items,
        };
    }

    static #shapeUnit(u) {
        return {
            id: u.id,
            serial_number: u.serial_number,
            imei: u.imei,
            barcode: u.barcode,
            mac_address: u.mac_address,
            status: u.status,
            condition: u.condition,
            warranty_start_date: u.warranty_start_date,
            warranty_end_date: u.warranty_end_date,
            received_at: u.received_at,
            sold_at: u.sold_at,
        };
    }

    static #shapeTransaction(t) {
        return {
            id: t.id,
            quantity_change: t.quantity_change,
            type: t.type,
            reference_type: t.reference_type,
            reference_id: t.reference_id,
            notes: t.notes,
            created_by: t.created_by_name ? { name: t.created_by_name } : null,
            created_at: t.created_at,
            listing_title: t.listing_title,
            inventory_title: t.inventory_title,
        };
    }

    static #shapeLocation(loc) {
        return {
            id: loc.id,
            title: loc.title,
            description: loc.description,
            address: loc.address,
            is_default: loc.is_default,
            status: loc.status,
            meta: loc.meta,
            created_at: loc.created_at,
            updated_at: loc.updated_at,
            stats: {
                item_records: loc.item_records,
                total_units: loc.total_units,
                available_units: loc.available_units,
                reserved_units: loc.reserved_units,
                low_stock_items: loc.low_stock_items,
                out_of_stock_items: loc.out_of_stock_items,
                damaged_units: loc.damaged_units,
                returned_units: loc.returned_units,
            },
        };
    }

    // FIX 4: Made private as well since it's an internal shaper
    static #shapeTotals(t) {
        return {
            units: t.total_units || 0,
            available: t.available_units || 0,
            reserved: t.reserved_units || 0,
            low_stock: t.low_stock_items || 0,
            out_of_stock: t.out_of_stock_items || 0,
        };
    }
}

module.exports = InventoryService;