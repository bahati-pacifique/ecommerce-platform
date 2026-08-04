const express = require('express');
const router = express.Router();

const ProductMetaController = require('../../../controllers/ProductMetaController');
const apiController = require('../controller/api.controller');

const { administration, session } = require('../../../middlewares/authGuards');

router.get('/categories/', apiController.getProductActiveCategories);
router.get('/families/', apiController.getProductActiveCategories);
router.get('/brands/', apiController.getActiveBrands);
router.get('/attributes/', apiController.getActiveAttributes);
router.get('/attributes-values/', apiController.getActiveAttributeValues);

module.exports = router;