const express = require('express');
const router = express.Router();

const adminController = require('../controller/admin.controller');

const ProductMetaController = require('../../../controllers/ProductMetaController');

const { administration, session } = require('../../../middlewares/authGuards');

router.get('/', session, adminController.home);
router.get('/dashboard', administration, adminController.renderDashboard);
router.post('/logout', adminController.logout);

/* ================================ Admin Product Meta routes ================================*/

                    //================= Categories =============
router.get('/product-categories/', administration, ProductMetaController.getProductCategories);
router.get('/product-categories/:id', administration, ProductMetaController.getProductCategory);
router.post('/product-categories/', administration, ProductMetaController.createProductCategory);
router.put('/product-categories/:id', administration, ProductMetaController.updatedProductCategory);
router.patch('/product-categories/:id', administration, ProductMetaController.activateProductCategory);
router.patch('/product-categories/remove/:id', administration, ProductMetaController.removeProductCategory);
router.delete('/product-categories/:id', administration, ProductMetaController.deleteProductCategory);

                    //================= Families =============
router.post('/product-families/', ProductMetaController.createProductFamily);
router.get('/product-families/', ProductMetaController.getProductFamilies);
router.get('/product-families/:id', ProductMetaController.getProductFamily);
router.put('/product-families/:id', ProductMetaController.updateProductFamily);
router.patch('/product-families/:id', ProductMetaController.activateProductFamily);
router.patch('/product-families/remove/:id', ProductMetaController.removeProductFamily);
router.delete('/product-families/:id', ProductMetaController.deleteProductFamily);

module.exports = router;