const express = require('express');
const router = express.Router();

const adminController = require('../controller/admin.controller');

const { administration, session } = require('../../../middlewares/authGuards');

router.get('/', session, adminController.home);
router.get('/dashboard', administration, adminController.renderDashboard);
router.post('/logout', adminController.logout);

module.exports = router;