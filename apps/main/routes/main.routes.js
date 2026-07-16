const express = require('express');
const router = express.Router();

const mainController = require('../../../controllers/main.controller');
const { session } = require('../../../middlewares/authGuards')

router.get('/', session, mainController.renderLaunchPage);
router.post('/logout', mainController.signout);

router.post('/upload', mainController.uploadProductImage);

router.get('/upload', (req, res) => {
    res.render('test-upload')
});

module.exports = router;