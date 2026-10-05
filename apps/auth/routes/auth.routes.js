const express = require('express');
const router = express.Router();

const authGuards = require('../../../middlewares/authGuards');
const authController = require('../controller/auth.controller');

router.get('/', authGuards.checkAuthentication, authController.renderLoginPage);
router.get('/privacy', authGuards.session, authController.renderAuthPrivacy);
router.get('/terms', authGuards.session, authController.renderAuthTerms);
router.post('/login', authController.login);
router.get('/account-selection', authGuards.accountValidation, authController.renderAccountSelection)
router.post('/authenticate', authController.accountLogin);

router.post('/signout', authController.signout);

module.exports = router;