const express = require('express');
const router = express.Router();

const ProductMetaController = require('../../../controllers/ProductMetaController');
//const VendorController = require('../../../controllers/vendors.controller')
const apiController = require('../controller/api.controller');
const StoreController = require('../../../controllers/store.controller');
const InventoryController = require('../../../controllers/inventory.controller');
const BusinessController = require('../../business/controller/business.controller');
//const BusinessController = require('../../business/controller/business.controller')

const { administration, session, dashboard, business } = require('../../../middlewares/authGuards');
//const VendorService = require('../../../src/services/vendor.services');

router.get('/users/user-account', apiController.getRandomUserByAccountCategory);

router.get('/categories/', apiController.getProductActiveCategories);
router.get('/categories/p', dashboard, apiController.getProductActiveCategoriesPaginated);
router.get('/categories/s', dashboard, apiController.searchCategories);
router.get('/categories/:status', dashboard, apiController.getProductCategoriesPaginated);

router.get('/families/', apiController.getProductActiveFamilies);
router.get('/families/active', business, apiController.getProductFamilies);
router.get('/families/s', dashboard, apiController.searchFamilies);
router.get('/families/r/:status', business, apiController.getProductFamiliesPaginatedRequested);

router.get('/brands/', apiController.getActiveBrands);

router.post('/meta/categories/insert', business, ProductMetaController.insertProductCategory);
router.post('/meta/families/insert', business, ProductMetaController.insertProductFamily);
router.post('/meta/brands', business, ProductMetaController.insertBrand);
router.post('/meta/attribute', business, ProductMetaController.insertAttribute);

router.get('/users/check-username', apiController.checkUsername);
router.post('/users/profile/profile-upload', dashboard, apiController.uploadUserProfileAvatar);
router.delete('/users/profile/profile-avatar', dashboard, apiController.removeUserProfileImage);

router.get('/attributes/', dashboard, apiController.getActiveAttributes);
router.get('/attributes-values/', dashboard, apiController.getActiveAttributeValues);
router.post('/test-send-email/', apiController.testSendEmail);
router.post('/test-mz-email/', apiController.testMaizleEmail);

router.post('/business/vendor-application', apiController.submitVendorApplication);
router.put('/business/vendor-application/deny/:id', dashboard, apiController.rejectBusinessApplication);
router.get('/business/check-businessname', apiController.checkBusinessUsername);
router.get('/business/applications/', apiController.getBusinessApplications);
router.get('/business/applications/:identifier', apiController.checkVendorApplication);
router.post('/business/applications/:id/approve', administration, apiController.approveBusinessApplication);

router.get('/business/stores/:identifier', StoreController.checkStore);

router.post('/business/stores/', business, StoreController.createStore);
router.get('/business/stores', business, StoreController.getPaginatedStoresByVendorId);
router.get('/business/store/:id', business, StoreController.getVendorStore);
router.put('/business/store/:id', business, StoreController.updateStore);
router.put('/business/store/active-status/:id', business, StoreController.setStoreLastActive);
router.patch('/business/store/:id', business, StoreController.setStoreStatus);

router.post('/business/inventories/', business, InventoryController.createInventory);
router.get('/business/:storeId/inventories/', InventoryController.getInventoriesByStoreId);
router.get('/business/inventories/:id', InventoryController.getInventoryById);
router.patch('/business/:storeId/inventories/', business, InventoryController.updateInventory);
router.patch('/business/inventories/:id/default', business, InventoryController.setDefaultInventory);
router.get('/business/inventories/:id/status', business, InventoryController.setInventoryStatus);

router.get('/inventory/data/vendor', business, InventoryController.getInventoryVendorDashboardData);
router.get('/vendor/data/orders', business, BusinessController.getVendorOrderDashboard)

//router.delete('/business/inventories/:id', business, InventoryController.deleteInventory);

router.put('/business/profile', business, apiController.updateVendorProfile);


module.exports = router;