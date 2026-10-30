const express = require('express');
const router = express.Router();


const businessController = require('../controller/business.controller');

const { dashboard, session, business, vendorBusinessRegister } = require('../../../middlewares/authGuards');
const { getProductWithVariants } = require('../../../src/models/product.model');

router.get('/stores/docs/terms', session, businessController.renderTerms);
router.get('/docs/attributes-registry-terms', session, businessController.renderAttributeRegistryTerms);
router.get('/docs/marketplace-terms', session, businessController.renderMarketplacePolicy);
router.get('/docs/catalog-policy', session, businessController.renderCatalogPolicy);
router.get('/docs/catalog-terms', session, businessController.renderCatalogTerms);

router.get('/', session, businessController.businessHomePage);
router.get('/dashboard', business, businessController.redirectedToDashboard);
router.get('/inventories/:vendor/new-inventory', business, businessController.renderInvontoryForm);
router.get('/:vendor/dashboard', business, businessController.renderDashboard);

router.get('/stores/:vendorId/create', business, businessController.renderStoreCreation);

router.get('/stores/:storeId/dashboard/', business, businessController.renderStoreDashboardWelcome);
router.get('/stores/:storeId/dashboard/home', business, businessController.renderStoreDashboard);
router.get('/stores/:storeId/dashboard/orders', business, businessController.renderStoreOrders);
router.get('/stores/:storeId/dashboard/inventory', business, businessController.renderStoreInventory);
router.get('/stores/:storeId/dashboard/listings', business, businessController.renderStoreListing);
router.get('/stores/:storeId/dashboard/products', business, businessController.renderStoreProducts);
router.get('/stores/:storeId/dashboard/followers', business, businessController.renderStoreFollowers);

router.get('/stores/:storeId/listings/search', business, businessController.searchListingByStore);

router.get('/inventories/:inventoryId/:storeId/', business, businessController.renderInventoryHome);
router.get('/inventories/:inventoryId/:storeId/overview', business, businessController.renderInventoryOverview);
router.get('/inventories/:inventoryId/:storeId/units', business, businessController.renderInventoryUnit);
router.get('/inventories/:inventoryId/:storeId/units/search', business, businessController.searchUnit);

router.post('/inventories/:inventoryId/:storeId/add-item', business, businessController.insertInventoryUnit);
router.post('/inventories/:inventoryId/:storeId/items', business, businessController.createInventoryItem);

router.get('/inventories/units/:storeId/:unitId', business, businessController.getItemUnit);
router.patch('/inventories/units/:unitId/:inventoryId/:storeId/transfer', business, businessController.transferUnit);

router.get('/stores/:storeId/data/analytics', businessController.getStoreDashboardAnalytics);
router.get('/stores/:storeId/data/product-listing/analytics', business, businessController.getStoreListingProductAnalytics);
router.get('/stores/:storeId/data/product-listing/inventories', business, businessController.getInventoriesByStoreId);
router.get('/stores/:storeId/data/dashboard', business, businessController.getStoreDashboard);

// router.get('/stores/:vendorId/:storeId', business, businessController.renderVendorStorePage);
router.get('/register', vendorBusinessRegister, businessController.renderVendorCreation);
router.get('/pricing', businessController.businessVendorPricing);
// router.get('/application-confirmation', businessController.renderApplicationConfirmation); //Switched to modal
router.get('/applications/:identifier', businessController.renderApplicationReview);
router.get('/applications/', businessController.renderApplicationReview);

router.get('/cataloging/product', business, businessController.renderProductCataloging);
router.post('/cataloging/product', business, businessController.insertProductCatalog);

router.get('/products/catalog/', business, businessController.renderProductCatalog);
router.get('/products/catalog/list', businessController.getPaginatedProductsCatalog);
router.get('/products/catalog/s', businessController.deepSearchProductsCatalog);
router.post('/products/catalog/s', businessController.searchProductByImage);
router.get('/products/catalog/:id', businessController.getProductById);

router.get('/products/:productId/variants', business, businessController.getProductVariants);

router.get('/cataloging/listing/:storeId/new', business, businessController.renderListingcataloging);
router.post('/cataloging/listing/:storeId/', business, businessController.insertNewList);

router.get('/messages', business, businessController.renderMessages);
router.get('/notifications', business, businessController.renderNotifications);

module.exports = router;