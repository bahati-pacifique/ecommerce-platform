const { acceptsHtml } = require('../../../util/helpers');
const VendorService = require('../../../src/services/vendor.services');
const StoreService = require('../../../src/services/store.services');

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

    return res.render('business', { message: "Welcome to COCOCE business", user, authDomain, domain, protocal, domainName });
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

    return res.render('business-application-confirmation', user);
}

function redirectedToDashboard(req, res) {

    const user = req.user;

    const vendorId = user?.vendor?.id;

    if (acceptsHtml(req)) {
        res.redirect(`/${vendorId.replaceAll('-', '')}/dashboard`)
    }
}

async function renderDashboard(req, res) {
    const user = req.user || null;

    const vendorParam = req.params.vendor;

    if (!user || !user.vendor) {
        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    if (String(user.vendor.id).replaceAll('-', '') !== String(vendorParam)) {
        //TODO log activity
        //User attempt to access page without owning or having the vendor id stated
        console.log(`User attempt to access page without owning or having the vendor id stated from ip Add. ${req.ip}`)
        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    if (!acceptsHtml(req)) {
        return res.json({
            user,
            message: "Join hundreds of happy vendors"
        })
    }

    //Update lastActive
    try {
        await VendorService.updateLastActive(user.vendor.id);
        console.log(`Vendor ${user.vendor?.business_name} active status updated`);
    } catch (error) {
        console.log('updatind vendor last active:', error)
    }

    return res.render('business-dashboard',
        {
            user,
            protocal,
            domainName
        });
}

async function renderApplicationReview(req, res) {

    const identifier = req.params.identifier;

    if (identifier) {
        req.session.applicationIdentifier = identifier;
        return res.redirect('/applications/')
    }

    const applicationIdentifier = req.session.applicationIdentifier || '';
    return res.render('business-application-review', { protocal, domainName, applicationIdentifier });
}

async function renderStoreCreation(req, res) {
    const user = req.user;
    const vendorParamId = req.params.vendorId;

    if (!user || !user.vendor) {
        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    if (String(user.vendor.id).replaceAll('-', '') !== String(vendorParamId)) {
        //TODO log activity
        //User attempt to access page without owning or having the vendor id stated

        return res.redirect(`${protocal}/business.${domainName}/`);
    }

    //const vendor = await VendorService.getVendorByUserId(user.userId || user.user_id || user.id, { includeUser: false });
    return res.render('store-creation', { user, protocal, domainName });
}

async function renderTerms(req, res) {
    const user = req.user;
    return res.render('store-terms', { user, protocal, domainName });
}

async function renderStoreDashboard(req, res) {
    const user = req.user;
    return res.render('store-dashboard', { user, protocal, domainName });
}

async function renderInvontoryForm(req, res) {
    const vendorId = req.params.vendor;

    const user = req.user;

    if (user.vendor?.id.replaceAll('-', '') !== vendorId) {
        //Invalid session and id
        return res.redirect('/');
    }

    const { stores } = await StoreService.getPaginatedStoresByVendorId(user.vendor.id);

    console.log(stores);

    return res.render('inventory-form', { user, protocal, domainName, stores });
}


module.exports = {
    businessHomePage,
    renderVendorCreation,
    renderDashboard,
    businessVendorPricing,
    renderApplicationConfirmation,
    renderApplicationReview,
    renderStoreCreation,
    renderTerms,
    redirectedToDashboard,
    renderStoreDashboard,
    renderInvontoryForm
}