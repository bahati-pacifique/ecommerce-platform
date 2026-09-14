const InventoryService = require("../src/services/inventory.service");

class InventoryController {

    /**
     * Create a new inventory for the current store
     *
     * POST /inventories
     */
    static async createInventory(req, res) {

        try {

            const storeId = req.body.store_id;

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: "Store ID is required"
                });
            }

            const {
                title,
                description,
                address,
                is_default,
                status,
                meta
            } = req.body;

            const inventory = await InventoryService.createInventory({
                storeId,
                title,
                description,
                address,
                isDefault: is_default,
                status,
                meta
            });

            return res.status(201).json({
                success: true,
                message: "Inventory created successfully",
                data: inventory
            });

        } catch (error) {

            console.error("CREATE_INVENTORY_ERROR:", error);

            let message = `Failed — Internal Error`
            if (error.code === '23505') message = 'This inventory or default one already exists for this store';

            return res.status(400).json({
                success: false,
                message: message
            });
        }
    }


    /**
     * Get inventory by ID
     *
     * GET /inventories/:id
     */
    static async getInventoryById(req, res) {

        try {

            const inventoryId = req.params.id;
            const storeId = req.user?.store?.id || req.query.store_id;

            if (!inventoryId) {
                return res.status(400).json({
                    success: false,
                    message: "Inventory ID is required"
                });
            }

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: "Store ID is required"
                });
            }

            const inventory = await InventoryService.getInventoryById(
                inventoryId,
                storeId
            );

            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory not found"
                });
            }

            return res.status(200).json({
                success: true,
                data: inventory
            });

        } catch (error) {

            console.error("GET_INVENTORY_ERROR:", error);

            return res.status(400).json({
                success: false,
                message: error.message || "Failed to retrieve inventory"
            });
        }
    }


    /**
     * Get paginated inventories belonging to a store
     *
     * GET /stores/:storeId/inventories
     */
    static async getInventoriesByStoreId(req, res) {

        try {

            const storeId =
                req.user?.store?.id ||
                req.params.storeId ||
                req.query.store_id;

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: "Store ID is required"
                });
            }

            const {
                page = 1,
                limit = 20,
                status = null,
                search = null
            } = req.query;

            const result =
                await InventoryService.getInventoriesByStoreId(
                    storeId,
                    {
                        page,
                        limit,
                        status,
                        search
                    }
                );

            return res.status(200).json({
                success: true,
                data: result.rows,
                pagination: result.pagination
            });

        } catch (error) {

            console.error("GET_STORE_INVENTORIES_ERROR:", error);

            let message = 'Failed — Internal Error'
            if (error.code === '22P02') message = 'Invalid store id'
            return res.status(400).json({
                success: false,
                message
            });
        }
    }


    /**
     * Update inventory
     *
     * PATCH /inventories/:id
     */
    static async updateInventory(req, res) {

        try {

            const inventoryId = req.params.id;
            const storeId = req.user?.store?.id || req.body.store_id;

            if (!inventoryId) {
                return res.status(400).json({
                    success: false,
                    message: "Inventory ID is required"
                });
            }

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: "Store ID is required"
                });
            }

            const {
                title,
                description,
                address,
                is_default,
                status,
                meta
            } = req.body;

            const fields = {};

            if (title !== undefined) {
                fields.title = title;
            }

            if (description !== undefined) {
                fields.description = description;
            }

            if (address !== undefined) {
                fields.address = address;
            }

            if (is_default !== undefined) {
                fields.is_default = is_default;
            }

            if (status !== undefined) {
                fields.status = status;
            }

            if (meta !== undefined) {
                fields.meta = meta;
            }

            if (Object.keys(fields).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No fields provided for update"
                });
            }

            const inventory =
                await InventoryService.updateInventory(
                    inventoryId,
                    storeId,
                    fields
                );

            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Inventory updated successfully",
                data: inventory
            });

        } catch (error) {

            console.error("UPDATE_INVENTORY_ERROR:", error);

            return res.status(400).json({
                success: false,
                message: error.message || "Failed to update inventory"
            });
        }
    }


    /**
     * Change inventory status
     *
     * PATCH /inventories/:id/status
     */
    static async setInventoryStatus(req, res) {

        try {

            const inventoryId = req.params.id;
            const storeId = req.user?.store?.id || req.body.store_id;
            const { status } = req.body;

            if (!inventoryId) {
                return res.status(400).json({
                    success: false,
                    message: "Inventory ID is required"
                });
            }

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: "Store ID is required"
                });
            }

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: "Status is required"
                });
            }

            const inventory =
                await InventoryService.setInventoryStatus(
                    inventoryId,
                    storeId,
                    status
                );

            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Inventory status updated successfully",
                data: inventory
            });

        } catch (error) {

            console.error("SET_INVENTORY_STATUS_ERROR:", error);

            return res.status(400).json({
                success: false,
                message: error.message || "Failed to update inventory status"
            });
        }
    }


    /**
     * Set inventory as the store's default inventory
     *
     * PATCH /inventories/:id/default
     */
    static async setDefaultInventory(req, res) {

        try {

            const inventoryId = req.params.id;
            const storeId = req.user?.store?.id || req.body.store_id;

            if (!inventoryId) {
                return res.status(400).json({
                    success: false,
                    message: "Inventory ID is required"
                });
            }

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: "Store ID is required"
                });
            }

            const inventory =
                await InventoryService.setDefaultInventory(
                    inventoryId,
                    storeId
                );

            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Default inventory updated successfully",
                data: inventory
            });

        } catch (error) {

            console.error("SET_DEFAULT_INVENTORY_ERROR:", error);

            return res.status(400).json({
                success: false,
                message: error.message || "Failed to set default inventory"
            });
        }
    }


    /**
     * Delete inventory
     *
     * DELETE /inventories/:id
     */
    static async deleteInventory(req, res) {

        try {

            const inventoryId = req.params.id;
            const storeId = req.user?.store?.id || req.body.store_id;

            if (!inventoryId) {
                return res.status(400).json({
                    success: false,
                    message: "Inventory ID is required"
                });
            }

            if (!storeId) {
                return res.status(400).json({
                    success: false,
                    message: "Store ID is required"
                });
            }

            const inventory =
                await InventoryService.deleteInventory(
                    inventoryId,
                    storeId
                );

            if (!inventory) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Inventory deleted successfully",
                data: inventory
            });

        } catch (error) {

            console.error("DELETE_INVENTORY_ERROR:", error);

            return res.status(400).json({
                success: false,
                message: error.message || "Failed to delete inventory"
            });
        }
    }

    static async getInventoryVendorDashboardData(req, res) {
        try {
            
            const vendorId = req.user?.vendor?.id || req.query.vendor_id;

            if (!vendorId) {
                return res.status(400).json({message: 'Vendor id is required'})
            }

            const result = await InventoryService.getInventoryVendorDashboardData(vendorId, 3);

            return res.json(result);
        } catch (error) {
            console.log('getInventoryVendorDashboardData()', error);
            let message = 'Failed get Inventory data — Internal Error';
            if (error.code === '22P02') message = 'Invalid vendor id';
            return res.status(500).json({
                message
            });
        }
    }
}

module.exports = InventoryController;