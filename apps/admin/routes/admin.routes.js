const express = require('express');
const router = express.Router();

const adminController = require('../controller/admin.controller');

const ProductMetaController = require('../../../controllers/ProductMetaController');
const VendorController = require('../../../controllers/vendors.controller');

const { administration, session } = require('../../../middlewares/authGuards');

router.get('/', session, adminController.home);
router.get('/dashboard', administration, adminController.renderDashboard);
router.post('/signout', adminController.signout);

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
router.post('/product-brands/', administration, ProductMetaController.createBrand);
router.get('/product-brands/', administration, ProductMetaController.getBrands);
router.get('/product-brands/:id', administration, ProductMetaController.getBrandById);
router.put('/product-brands/:id', administration, ProductMetaController.updateBrand);
router.patch('/product-brands/:id', administration, ProductMetaController.activateBrand);
router.patch('/product-brands/remove/:id', administration, ProductMetaController.softDeleteBrand);
router.delete('/product-brands/:id', administration, ProductMetaController.hardDeleteBrand);

            //Attributes
router.post('/attributes/', administration, ProductMetaController.createAttribute);
router.get('/attributes/', administration, ProductMetaController.getAttributes);
router.get('/attributes/:id', administration, ProductMetaController.getAttribute);
router.put('/attributes/:id', administration, ProductMetaController.updateAttribute);
router.patch('/attributes/:id', administration, ProductMetaController.activateAttribute);
router.patch('/attributes/remove/:id', administration, ProductMetaController.softDeleteAttribute);
router.delete('/attributes/:id', administration, ProductMetaController.hardDeleteAttribute);

            //Attributes values
router.post('/attribute-values/', administration, ProductMetaController.createAttributeValue);
router.get('/attribute-values/', administration, ProductMetaController.getAttributesValues);
router.get('/attribute-values/:id', administration, ProductMetaController.getAttributeValue);
router.put('/attribute-values/:id', administration, ProductMetaController.updateAttributeValue);
router.patch('/attribute-values/:id', administration, ProductMetaController.activateAttributeValue);
router.patch('/attribute-values/remove/:id', administration, ProductMetaController.softDeleteAttributeValue);
router.delete('/attribute-values/:id', administration, ProductMetaController.hardDeleteAttributeValue);

        //Vendors functionalities
router.patch('/vendors/v/:id', VendorController.updateVendorVerificationStatus);
router.patch('/vendors/s/:id', VendorController.updateVendorStatus);
router.get('/vendors/', VendorController.getVendors);
router.get('/vendor/applications', administration, adminController.renderBusinessApplications);
router.get('/vendor/applications/:reference_number', administration, adminController.renderBusinessApplications);

module.exports = router;