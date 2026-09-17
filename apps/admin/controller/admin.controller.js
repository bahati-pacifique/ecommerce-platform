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

async function home(req, res) {
    // try {
    //     await mockService.testConnection();
    // } catch (error) {
    //     console.log(error);
    // }

    const user = req.user;

    const isProduction = process.env.NODE_ENV === 'production';

    const auth_host = isProduction ? `https://auth.${process.env.DOMAIN}?r=https://admin.${process.env.DOMAIN}`
        : `http://auth.${process.env.DOMAIN}:${process.env.PORT}?r=http://admin.${process.env.DOMAIN}:${process.env.PORT}`;

    const dashboard_host = isProduction ? `https://admin.${process.env.DOMAIN}/dashboard`
        : `http://admin.${process.env.DOMAIN}:${process.env.PORT}/dashboard`;


    return res.render('index-admin', {
        auth_host,
        dashboard_host,
        message: '',
        user
    });
}

async function renderLoginPage(req, res) {
    res.render('auth', {})
}

async function renderAccountSelection(req, res) {
    res.render('account-selection', {})
}

async function renderDashboard(req, res) {

    //const isProduction = process.env.NODE_ENV === 'production';

    //const domain = process.env.DOMAIN;

    //const protocal = isProduction ? "https://" : "http://"
    //const port = isProduction ? '' : process.env.PORT;

    const user = req.user || {};
    

    res.render('dashboard', { user, protocal, domainName });
}

async function renderBusinessApplications(req, res) {
    const user = req.user;

    const referenceNumber = req.params.reference_number;

    if (referenceNumber) {
        req.session.referenceNumber = referenceNumber;
        return res.redirect('/vendor/applications');
    }

    if (req.session.referenceNumber) return res.render('vendor-applications', { protocal, domainName, user, referenceNumber: req.session.referenceNumber });
    return res.render('vendor-applications', { protocal, domainName, user });
}

async function signout(req, res) {

    const { accessToken } = decodeAuthCookies(req);

    if (accessToken) {
        const userAccount = accessToken.ac;
        await authServices.signout(userAccount);
    }

    clearAuthentication(res);

    if (acceptsHtml(req)) {
        return res.redirect('/');
    }

    return res.json({
        authenticated: false,
        redirectTo: '/'
    })

}

// const axios = require('axios');
// const fs = require('fs');
// const path = require('path');

// async function downloadImage() {
//     const url = 'https://res.cloudinary.com/dfv97pfcq/image/upload/v1717404221/cococe/cococe/p6nxkogue1wlimtlaohz.png';

//     const folder = '/var/www/cococe-storage/meta';
//     const fileName = 'image.png'; // or generate unique name
//     const filePath = path.join(folder, fileName);

//     // ensure folder exists
//     fs.mkdirSync(folder, { recursive: true });

//     const response = await axios({
//         url,
//         method: 'GET',
//         responseType: 'stream'
//     });

//     const writer = fs.createWriteStream(filePath);

//     response.data.pipe(writer);

//     return new Promise((resolve, reject) => {
//         writer.on('finish', () => {
//             resolve(filePath);
//         });

//         writer.on('error', reject);
//     });
// }

// usage



module.exports = {
    home,
    renderDashboard,
    renderBusinessApplications,
    renderLoginPage,
    renderAccountSelection,
    signout
}