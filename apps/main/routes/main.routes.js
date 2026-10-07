const express = require('express');
const router = express.Router();

const mainController = require('../controller/main.controller');
const { session } = require('../../../middlewares/authGuards');

router.get('/', session, mainController.renderLaunchPage);
router.post('/logout', mainController.signout);

router.post('/upload', mainController.uploadProductImage);

router.get('/upload', (req, res) => {
    res.render('test-upload')
});

router.get('/docs/cookie-terms', session, mainController.renderCookieTerms);
router.get('/faqs', session, mainController.renderFaqs);

module.exports = router;