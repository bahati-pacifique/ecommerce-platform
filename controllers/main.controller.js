const path = require('path');

const storage = require('../src/configs/storage.config');
const console = require('console');
const { logout } = require('../src/services/auth.services');
const { clearAuthentication, acceptsHtml } = require('../util/helpers');
const authServices = require('../src/services/auth.services');

function renderLaunchPage(req, res) {

    const isProduction = process.env.NODE_ENV === 'production';
    const domain = process.env.DOMAIN;

    const sslUrlPrefix = isProduction ? 'https://' : 'http://';
    const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

    const authDOMAIN = `${sslUrlPrefix}auth.${domain}${portSuffix}`;

    const user = req.user;

    if (req.accepts('html')) {
        return res.render('maintenance-mode', { authDOMAIN, user })
    }

    if (req.accepts('json')) {
        return res.json({
            message: `COCOCE - We're comming soon`
        });
    }
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
    uploadProductImage,
    signout
}