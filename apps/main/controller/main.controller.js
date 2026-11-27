const path = require('path');

const storage = require('../../../src/configs/storage.config');
const { logout } = require('../../../src/services/auth.services');
const { clearAuthentication, acceptsHtml } = require('../../../util/helpers');
const authServices = require('../../../src/services/auth.services');

const MainService = require('../service/main.services');

const {
    navLinks,
    heroSlides,
    categores,
    featuredProducts,
    dealProducts,
    brands,
    benefits
} = require('../../../src/configs/mockups-data');

const isProduction = process.env.NODE_ENV === 'production';

const sslUrlPrefix = isProduction ? 'https://' : 'http://';

const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

const domain = `${sslUrlPrefix}business.${process.env.DOMAIN}${portSuffix}`;
const authDomain = `${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}?r=${domain}/dashboard`;

const protocal = sslUrlPrefix;
const domainName = `${process.env.DOMAIN}${portSuffix}`;

function renderLaunchPage(req, res) {

    const isProduction = process.env.NODE_ENV === 'production';
    const domain = process.env.DOMAIN;

    const sslUrlPrefix = isProduction ? 'https://' : 'http://';
    const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

    const authDOMAIN = `${sslUrlPrefix}auth.${domain}${portSuffix}`;

    const user = req.user;

    if (req.accepts('html')) {
        return res.render('maintenance-mode', { user, protocal, domain, layout: false })
    }

    if (req.accepts('json')) {
        return res.json({
            message: `COCOCE - We're comming soon`
        });
    }
}

async function renderMain(req, res) {

    const { listingPage = 1, listingLimit = 100, brandsPage = 1, brandsLimit = 21, onSalePage= 1, onSaleLimit= 35 } = req.query;
    
    const categories = await MainService.getCategories();
    const heroProducts = await MainService.getLatestHeroProductCatalog();
    const productCategoriesImages = await MainService.getProductCategoryImages();
    const homeListings = await MainService.getLandingListingsPaginated({page: listingPage, limit: listingLimit});
    const homeBrands = await MainService.getLandingPaginatedBrands({page: brandsPage, limit: brandsLimit});
    const homeListingsOnSale = await MainService.getHomeListingsOnSale({page: onSalePage, limit: onSaleLimit});

    console.log(homeListingsOnSale);

    return res.render('partials/main/home', {
        layout: 'main',
        title: 'COCOCE — Technology for the Way You Live',
        description: 'Shop laptops, computers, gaming products, accessories and more at COCOCE.',
        cartCount: 0,
        categories,
        productCategoriesImages,
        heroProducts,
        homeListings,
        homeListingsOnSale,
        dealProducts,
        homeBrands,
        benefits,
        pageScripts: ['/scripts/main/hero.js', '/scripts/main/products.js', '/scripts/main/deals.js'],
        protocal,
        domainName
    });
}

function renderCookieTerms(req, res) {
    res.render('cookie-terms', { layout: false, protocal, domainName });
}

function renderFaqs(req, res) {
    const user = req.user ?? null;

    return res.render('faqs', { layout: false, user, protocal, domainName });
}

const uploadProductImage = async (req, res) => {

    const image = req.files.file;

    const fileName =
        `${Date.now()}-${image.name}`;

    const destination =
        path.join(
            storage.images,
            'products',
            fileName
        );

    await image.mv(destination);

    return res.json({
        success: true,
        imagePath: `products/${fileName}`
    });
};



const signout = async (req, res) => {
    try {
        const userAccount = req.user.userAccount;
        await authServices.logout(userAccount);
        clearAuthentication(res);
        if (acceptsHtml(req)) {
            res.redirect('/')
        }
        else {
            res.json({
                success: true,
                authenticated: false
            })
        }
    } catch (error) {
        console.log(error);
        clearAuthentication(res);
        if (acceptsHtml(req)) {
            req.session.message = 'Something went wrong';
            res.redirect('/')
        } else {
            res.status(500).json({
                success: false,
                message: 'Something Went Wrong'
            })
        }
    }
}

module.exports = {
    renderLaunchPage,
    renderCookieTerms,
    renderMain,
    renderFaqs,
    uploadProductImage,
    signout
}