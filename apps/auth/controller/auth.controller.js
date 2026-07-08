const AuthServices = require('../../../src/services/auth.services');
const { v4: uuidv4 } = require("uuid");
const {
    setPreauth,
    signPreAuth,
    signAccessToken,
    signRefreshToken,
    decodePreauthToken,
    sameNetwork,
    normalizeUA,
    setAuthCookies,
    decodeAuthCookies,
    allowRedirect,
    signRedirect,
    decodeRedirect
} = require('../../../util/authTokens');

const {
    acceptsHtml,
    clearAuthentication,
    safeRedirectPath,
    isSameOrigin,
    deny401,
    deny403
} = require('../../../util/helpers');

// function isAllowedHost(hostname) {
//     return (
//         hostname.endsWith(".genilabs.com") ||
//         hostname.endsWith(".genilabs.local")
//     );
// }

// function isAllowedRedirect(redirectUrl) {
//     try {
//         const url = new URL(redirectUrl);

//         return (
//             (url.protocol === "https:" || url.protocol === "http:") &&
//             isAllowedHost(url.hostname)
//         );
//     } catch {
//         return false;
//     }
// }

// function renderLoginPage(req, res) {

//     console.log(req)

//     const redirect = req.query.r || process.env.DOMAIN;
//     const isProduction = process.env.NODE_ENV === 'production';

//     //Implemented in implemented in middleware, but better let do a double protection
//     if (!allowRedirect(redirect)) {

//         const redirectTo = isProduction ? `https://${process.env.DOMAIN}` : `http://${process.env.DOMAIN}:${process.env.PORT}`;

//         if (acceptsHtml(req)) {
//             return res.redirect(redirectTo);
//         }

//         return res.json({
//             success: false,
//             authenticated: false,
//             message: 'Unknown host'
//         });

//     }

//     req.session.redirectTo = redirect;

//     if (acceptsHtml(req)) return res.redirect(``);

//     return res.json({
//         redirectTo: redirect,
//         message: 'Access is secured',
//         redirectTo: '/'
//     })
// }

function renderLoginPage(req, res) {

    
    const sessionMsg = req.session.message;
    delete req.session.message;
    //delete req.session.redirectTo;

    console.log(req.session)

    const redirectPayload = decodeRedirect(req.cookies.r);

    const redirect = req.query.r;

    const isProduction = process.env.NODE_ENV === 'production';

    const sslUrlPrefix = isProduction ? 'https://' : 'http://';
    const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

    if (redirect) {
        if (!allowRedirect(redirect)) {
            return res.redirect(`${sslUrlPrefix}${process.env.DOMAIN}${portSuffix}`);
            //return res.status(400).send("Invalid redirect");
        }

        const rPayload = {
            redirectTo: redirect
        }

        const redirectToken = signRedirect(rPayload);
        res.cookie('r', redirectToken);

        // Store in session
        req.session.redirectTo = redirect;

        // Redirect to clean URL
        return res.redirect("/");
    }

    const redirectTo = redirectPayload?.redirectTo || req.session.redirectTo || `${sslUrlPrefix}${process.env.DOMAIN}${portSuffix}`;

    let homeImageUrl = '/images/logos/administration.png';

    let heroMessage = `<h2 class="text-2xl text-gray-500 leading-tight pl-8">
              <span class="flex items-center gap-2">Reliable Services. <span class="text-3xl text-black">Seamless Quality.</span></span>
              <span class="text-brand">Securely</span> Trusted.
            </h2>`;


    if (!redirectTo.includes('admin')) {
        homeImageUrl = '/images/logos/cococe.png';
        heroMessage = `<h2 class="text-2xl text-gray-500 leading-tight pl-8">
              <span class="flex items-center gap-2">The home of <span class="text-3xl text-brand">Digital World</span></span>
              <div class="bg-brand max-w-[140px] min-h-[4px] rounded-full mt-3"></div> 
            </h2>`;
    }

    return res.render("auth", {
        message: sessionMsg || '',
        referer: redirectTo,
        logo: homeImageUrl,
        heroMessage
    });
}

async function login(req, res) {
    try {
        const { username, email, password, originalUrl = '/', referer } = req.body;

        const result = await AuthServices.login(username, email, req.ip, password, req.get('User-Agent'));

        if (!result.success) {
            const errorStatus = result.status;

            if (errorStatus === 'PREAUTH_ERROR') {
                return deny401(req, res, { message: 'Failed — Something Went Wrong', originalUrl: '/login' })
            }

            return deny401(req, res, { message: result.message || 'Invalid Credentials', });
        }

        const { user, preauth } = result;

        const preauthJwtId = uuidv4();

        const preAuthPayload = {
            userId: user.id,
            preAuthId: preauth.id,
            jti: preauthJwtId,
            ua: normalizeUA(req.get('User-Agent')),
            ip: req.ip,
            originalUrl,
            step: 'account-selection'
        };

        const p_auth = signPreAuth(preAuthPayload);

        const isProduction = process.env.NODE_ENV === 'production';

        setPreauth(res, p_auth, isProduction);

        if (acceptsHtml(req)) {
            req.session.originalUrl = originalUrl;
            return res.redirect('/account-selection');
        }

        return res.json({
            success: true,
            authenticated: false,
            originalUrl,
            redirectTo: '/account-selection',
            step: 'account-selection',
            message: 'Please Select Account To Tontinue'
        });


    } catch (error) {
        return deny401(req, res, { message: error.message || 'Something Went Wrong' })
    }
}

async function renderAccountSelection(req, res) {
    if (!req.cookies.p_auth) {
        if (acceptsHtml(req)) {
            return res.redirect('/');
        } else {
            return res.json({
                success: false,
                authenticated: false,
                message: 'Please login to continue'
            })
        }
    }

    const preAuth = decodePreauthToken(req.cookies.p_auth);

    if (!preAuth.userId) {
        clearAuthentication(res);
        if (acceptsHtml(req)) {
            return res.redirect('/');
        } else {
            return res.json({
                success: false,
                authenticated: false,
                message: 'Please login to continue'
            })
        }
    }

    let accountsData;
    let username = '';

    try {

        const accounts = await AuthServices.getUserAccounts(preAuth.userId);

        username = accounts[0]?.username || '';

        accountsData = accounts?.map(acc => ({
            id: acc.user_account_id,
            account_id: acc.account_id,
            type: acc.account_category,
            code: acc.code,
            title: acc.account_title,
            description: acc.description,
        })) || [];

        if (acceptsHtml(req)) return res.render('account-selection',
            {
                message: accountsData?.length > 0
                    ? 'Select account to signin'
                    : 'Sorry, You do not have an account.',
                accounts: accountsData,
                username,
                originalUrl: preAuth.originalUrl
            }
        );

        return res.json({
            success: true,
            authenticated: false,
            accounts: accountsData,
            username,
            originalUrl: preAuth.originalUrl,
            message: accountsData.length > 0 ? 'Select account to signin with' : 'Sorry, You do have an account.\nPlease contact our support team'
        })


    } catch (error) {
        if (acceptsHtml(req)) return safeRedirectPath('/login',)
        return res.status(500).json({
            success: false,
            message: 'Sorry — Something went wrong'
        });
    }

}

async function accountLogin(req, res) {

    const { accountId, originalUrl } = req.body;

    const preauthToken = req.cookies.p_auth;
    const redirectPayload = decodeRedirect(req.cookies.r);
    const isProduction = process.env.NODE_ENV === 'production';
    const sslUrlPrefix = isProduction ? 'https://' : 'http://';

    const portSuffix = isProduction ? '' : `:${process.env.PORT}`;
    const redirectTo = redirectPayload.redirectTo || `${sslUrlPrefix}${process.env.DOMAIN}${portSuffix}`;

    if (!accountId || !preauthToken) {
        clearAuthentication(res);
        if (acceptsHtml(req)) {
            req.session.message = 'Please login to continue'
            return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}`)
        } else {
            return res.status(401).json({
                authenticated: false,
                success: false,
                message: 'Please login to continue',
                redirectTo
            })
        }
    }

    try {
        const preauth = decodePreauthToken(preauthToken);

        if (!preauth) {

            clearAuthentication(res);
            if (acceptsHtml(req)) {
                req.session.message = 'Please login to continue'
                return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}`)
            } else {
                return res.status(401).json({
                    authenticated: false,
                    success: false,
                    message: 'Please login to continue',
                    redirectTo
                });
            }
            // return deny401(req, res, { message: 'Please login to continue', originalUrl });
        }

        const userAgent = normalizeUA(req.get('User-Agent'));
        const preauthAgent = preauth.ua;
        const userIp = req.ip;

        if (preauthAgent !== userAgent) {
            //TODO implement: Log activity
            if (acceptsHtml(req)) {
                req.session.message = 'Suspicious Activity Detected'
                return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}`)
            } else {
                return res.status(401).json({
                    authenticated: false,
                    success: false,
                    message: 'Suspicious Activity Detected',
                    redirectTo
                })
            }
            // return deny403(req, res, {
            //     message: 'Suspicious Activity Detected',
            //     originalUrl
            // });
        }

        const result = await AuthServices.validateLogin(
            preauth.preAuthId,
            preauth.userId,
            accountId,
            req
        );


        if (!result.success) {

            req.session.message = result.message || 'Failed — Unable to authenticate';
            if (acceptsHtml(req)) {
                return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}`)
            } else {
                return res.status(401).json({
                    authenticated: false,
                    success: false,
                    message: result.message || 'Failed — Unable to authenticate',
                    redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}`
                })
            }
            //return deny401(req, res, { message: result.message, originalUrl: '/login' });
        }

        // ---- AUTH SUCCESS ----
        const accessTokenJwtId = uuidv4();

        const accessToken = signAccessToken({
            jwtId: accessTokenJwtId,
            u_id: result.userAccount.user_id,
            ac: result.userAccount.user_account_id,
            a_id: result.userAccount.account_id,
            account_code: result.userAccount.account_code,
            ac_type: result.userAccount.account_category,
            ac_title: result.userAccount.account_title,
            role: result.userAccount.role,
            username: result.userAccount.username,
            email: result.userAccount.email,
            name: result.userAccount.names,
            phone_number: result.userAccount.phone_number,
            ip: userIp,
            ua: userAgent
        });

        const refreshTokenJwtId = uuidv4();

        const refreshToken = signRefreshToken({
            jwtId: refreshTokenJwtId,
            userId: result.userAccount.user_id,
            accountId: result.userAccount.user_account_id,
            ip: userIp,
            ua: userAgent
        });

        setAuthCookies(res, accessToken, refreshToken);

        const sessionPayload = {
            userAccount: result.userAccount.user_account_id,
            refreshToken: refreshToken,
            jwtId: refreshTokenJwtId,
            ipAddress: req.ip,
            userAgent: normalizeUA(req.get('User-Agent'))
        }

        await AuthServices.createSession(sessionPayload);

        const redirectTo = safeRedirectPath(preauth.originalUrl);

        if (acceptsHtml(req)) {
            return res.redirect(redirectTo || '/');
        }

        return res.json({
            success: true,
            authenticated: true,
            redirectTo,
            user: {
                session: result.userAccount.account_type,
                title: result.userAccount.account_title,
                role: result.userAccount.role,
                username: result.userAccount.username,
                email: result.userAccount.email,
                name: `${result.userAccount.f_name} ${result.userAccount.l_name}`
            }
        });

    } catch (err) {
        console.error(err);
        clearAuthentication(res);

        if (acceptsHtml(req)) {
            req.session.message = result.message || 'Failed — Something went wrong'
            return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}`)
        } else {
            return res.status(401).json({
                authenticated: false,
                success: false,
                message: 'Failed — Something went wrong',
                redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}`
            })
        }
        // return deny401(req, res, { message: 'Login failed' })

    }
};

module.exports = {
    renderLoginPage,
    renderAccountSelection,
    login,
    accountLogin
}