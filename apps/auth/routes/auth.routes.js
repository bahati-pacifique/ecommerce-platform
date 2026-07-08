const express = require('express');
const router = express.Router();

const authGuards = require('../../../middlewares/authGuards');
const authController = require('../controller/auth.controller');

router.get('/', authGuards.checkAuthentication, authController.renderLoginPage);
//router.get('/login', authGuards.checkAuthentication, authController.renderLoginPage);
router.post('/login', authController.login);
router.get('/account-selection', authGuards.accountValidation, authController.renderAccountSelection)
router.post('/authenticate', authController.accountLogin);

module.exports = router;