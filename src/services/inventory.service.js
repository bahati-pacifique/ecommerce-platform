const InventoryModel = require("../models/inventory.model");

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
}

module.exports = InventoryService;