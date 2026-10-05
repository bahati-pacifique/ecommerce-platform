const express = require('express');
const router = express.Router();

const businessController = require('../controller/business.controller');

const { dashboard, session, business, vendorBusinessRegister } = require('../../../middlewares/authGuards');

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
router.get('/stores/:storeId/dashboard', business, businessController.renderStoreDashboard);
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

module.exports = router;