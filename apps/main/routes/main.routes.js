const express = require('express');
const router = express.Router();

const mainController = require('../../../controllers/main.controller');

router.get('/', mainController.renderLaunchPage);

router.post('/upload', mainController.uploadProductImage);

router.get('/upload', (req, res) => {
    res.render('test-upload')
});

module.exports = router;