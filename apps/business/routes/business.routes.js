const express = require('express');
const router = express.Router();

const businessController = require('../controller/business.controller');

router.get('/', businessController.businessHomePage);

module.exports = router;