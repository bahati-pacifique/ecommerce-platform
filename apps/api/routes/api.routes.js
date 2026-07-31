const express = require('express');
const router = express.Router();

const ProductMetaController = require('../../../controllers/ProductMetaController');
const apiController = require('../controller/api.controller');

const { administration, session } = require('../../../middlewares/authGuards');

router.get('/categories/', apiController.getProductActiveCategories);
router.get('/families/', apiController.getProductActiveCategories);

module.exports = router;