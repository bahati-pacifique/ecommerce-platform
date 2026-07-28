const express = require('express');
const router = express.Router();

const adminController = require('../controller/admin.controller');

const ProductMetaController = require('../../../controllers/ProductMetaController');

const { administration, session } = require('../../../middlewares/authGuards');

router.get('/', session, adminController.home);
router.get('/dashboard', administration, adminController.renderDashboard);
router.post('/logout', adminController.logout);

/* ================================ Admin Product Meta routes ================================*/
router.get('/product-categories/', ProductMetaController.getProductCategories);
router.get('/product-categories/status', administration, ProductMetaController.getProductCategoriesByStatus);
router.get('/product-categories/:id', ProductMetaController.getProductCategory);

router.post('/product-categories/', administration, ProductMetaController.createProductCategory);
router.put('/product-categories/', administration, ProductMetaController.updatedProductCategory);
router.delete('/product-categories/remove/:id', administration, ProductMetaController.removeProductCategory);
router.delete('/product-categories/:id', administration, ProductMetaController.deleteProductCategory);

module.exports = router;