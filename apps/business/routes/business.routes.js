const express = require('express');
const router = express.Router();

const businessController = require('../controller/business.controller');

const { dashboard, session, business, vendorBusinessRegister } = require('../../../middlewares/authGuards');

router.get('/', session, businessController.businessHomePage);
router.get('/dashboard', business, businessController.renderDashboard);
router.get('/register', vendorBusinessRegister, businessController.renderVendorCreation);
router.get('/pricing', vendorBusinessRegister, businessController.businessVendorPricing);
// router.get('/application-confirmation', businessController.renderApplicationConfirmation); //Switched to modal
router.get('/applications/:identifier', businessController.renderApplicationReview);
router.get('/applications/', businessController.renderApplicationReview);

module.exports = router;