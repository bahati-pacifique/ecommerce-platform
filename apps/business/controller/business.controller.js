const mockService = require('../../../src/services/DBMockService');

const { decodeAuthCookies } = require('../../../util/authTokens');
const { clearAuthentication, acceptsHtml } = require('../../../util/helpers');

const authServices = require('../../../src/services/auth.services');

async function businessHomePage(req, res) {
    const user = req.user || null;
    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Welcome to COCOCE business"
        })
    }

    return res.render('business', { user });
}

module.exports = {
    businessHomePage
}