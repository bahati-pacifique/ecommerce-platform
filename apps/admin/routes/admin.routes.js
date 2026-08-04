const express = require('express');
const router = express.Router();

const adminController = require('../controller/admin.controller');

const ProductMetaController = require('../../../controllers/ProductMetaController');

const { administration, session } = require('../../../middlewares/authGuards');

router.get('/', session, adminController.home);
router.get('/dashboard', administration, adminController.renderDashboard);
router.post('/logout', adminController.logout);

/* ================================ Batch insert ================================*/
router.post('/product-metas/batch/', ProductMetaController.batchInsert);


/* ================================ Admin Product Meta routes ================================*/

                    //================= Categories =============
router.get('/product-categories/', administration, ProductMetaController.getProductCategories);
router.post('/product-categories/', administration, ProductMetaController.createProductCategory);
router.get('/product-categories/:id', administration, ProductMetaController.getProductCategory);
router.put('/product-categories/:id', administration, ProductMetaController.updatedProductCategory);
router.patch('/product-categories/:id', administration, ProductMetaController.activateProductCategory);
router.patch('/product-categories/remove/:id', administration, ProductMetaController.removeProductCategory);
router.delete('/product-categories/:id', administration, ProductMetaController.deleteProductCategory);

                    //================= Families =============
router.post('/product-families/', administration, ProductMetaController.createProductFamily);
router.get('/product-families/', administration, ProductMetaController.getProductFamilies);
router.get('/product-families/:id', administration, ProductMetaController.getProductFamily);
router.put('/product-families/:id', administration, ProductMetaController.updateProductFamily);
router.patch('/product-families/:id', administration, ProductMetaController.activateProductFamily);
router.patch('/product-families/remove/:id', administration, ProductMetaController.removeProductFamily);
router.delete('/product-families/:id', administration, ProductMetaController.deleteProductFamily);

                    //================= Brands =============
router.post('/product-brands/', ProductMetaController.createBrand);
router.get('/product-brands/', ProductMetaController.getBrands);
router.get('/product-brands/:id', ProductMetaController.getBrandById);
router.put('/product-brands/:id', ProductMetaController.updateBrand);
router.patch('/product-brands/:id', ProductMetaController.activateBrand);
router.patch('/product-brands/remove/:id', ProductMetaController.softDeleteBrand);
router.delete('/product-brands/:id', ProductMetaController.hardDeleteBrand);

            //Attributes
router.post('/attributes/', ProductMetaController.createAttribute);
router.get('/attributes/', ProductMetaController.getAttributes);
router.get('/attributes/:id', ProductMetaController.getAttribute);
router.put('/attributes/:id', ProductMetaController.updateAttribute);
router.patch('/attributes/:id', ProductMetaController.activateAttribute);
router.patch('/attributes/remove/:id', ProductMetaController.softDeleteAttribute);
router.delete('/attributes/:id', ProductMetaController.hardDeleteAttribute);

            //Attributes values
router.post('/attribute-values/', ProductMetaController.createAttributeValue);
router.get('/attribute-values/', ProductMetaController.getAttributesValues);
router.get('/attribute-values/:id', ProductMetaController.getAttributeValue);
router.put('/attribute-values/:id', ProductMetaController.updateAttributeValue);
router.patch('/attribute-values/:id', ProductMetaController.activateAttributeValue);
router.patch('/attribute-values/remove/:id', ProductMetaController.softDeleteAttributeValue);
router.delete('/attribute-values/:id', ProductMetaController.hardDeleteAttributeValue);      

module.exports = router;