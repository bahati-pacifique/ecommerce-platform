const mockService = require('../../../src/services/DBMockService');

const { decodeAuthCookies } = require('../../../util/authTokens');
const { clearAuthentication, acceptsHtml } = require('../../../util/helpers');

const authServices = require('../../../src/services/auth.services');

const isProduction = process.env.NODE_ENV === 'production';

const sslUrlPrefix = isProduction ? 'https://' : 'http://';

const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

const domain = `${sslUrlPrefix}business.${process.env.DOMAIN}${portSuffix}`;
const authDomain = `${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}?r=${domain}/dashboard`;

const protocal = sslUrlPrefix;
const domainName = `${process.env.DOMAIN}${portSuffix}`;

async function businessHomePage(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Welcome to COCOCE business"
        })
    }

    return res.render('business', { message: "Welcome to COCOCE business", user, authDomain, domain });
}

async function businessVendorPricing(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Welcome to COCOCE business"
        })
    }

    return res.render('vendor_pricing', { message: "", user, authDomain, domain });
}

async function renderVendorCreation(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            ...(user && { user }),
            domain,
            authDomain,
            message: "Join hundreds of happy vendors"
        })
    }

    return res.render('business-registration', { message: "Join hundreds of happy vendors", domain, domainName, protocal, authDomain, ...(user && { user }) });
}

async function renderApplicationConfirmation(req, res) {
    const user = req.user || null;

    // if (!acceptsHtml(req)) {
    //     return res.json({
    //         ...(user && { user }),
    //         domain,
    //         authDomain,
    //         message: "Join hundreds of happy vendors"
    //     })
    // }

    return res.render('business-application-confirmation');
}

async function renderDashboard(req, res) {
    const user = req.user || null;

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Join hundreds of happy vendors"
        })
    }

    return res.render('business-dashboard',
        {
            user,
            message: "Join hundreds of happy vendors",
            protocal,
            domain: domainName

        });
}

async function renderApplicationReview(req, res) {
    
    const identifier = req.params.identifier;

    if (identifier) {
        req.session.applicationIdentifier = identifier;
        return res.redirect('/applications/')
    }

    const applicationIdentifier = req.session.applicationIdentifier || '';
    return res.render('business-application-review', { protocal, domainName, applicationIdentifier});
}


module.exports = {
    businessHomePage,
    renderVendorCreation,
    renderDashboard,
    businessVendorPricing,
    renderApplicationConfirmation,
    renderApplicationReview
}