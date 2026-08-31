const express = require('express');
const router = express.Router();

const ProductMetaController = require('../../../controllers/ProductMetaController');
const VendorController = require('../../../controllers/vendors.controller')
const apiController = require('../controller/api.controller');

const { administration, session, dashboard } = require('../../../middlewares/authGuards');

router.get('/users/user-account', apiController.getRandomUserByAccountCategory);

router.get('/categories/', apiController.getProductActiveCategories);
router.get('/families/', apiController.getProductActiveCategories);
router.get('/brands/', apiController.getActiveBrands);

router.get('/users/check-username', apiController.checkUsername);

router.get('/attributes/', dashboard, apiController.getActiveAttributes);
router.get('/attributes-values/', dashboard, apiController.getActiveAttributeValues);
router.post('/test-send-email/', apiController.testSendEmail);
router.post('/test-mz-email/', apiController.testMaizleEmail);

router.post('/business/vendor-application', apiController.submitVendorApplication);
router.get('/business/check-businessname', apiController.checkBusinessUsername);
router.get('/business/applications/:identifier', apiController.checkVendorApplication);


module.exports = router;