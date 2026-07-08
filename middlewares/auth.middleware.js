const jwt = require('jsonwebtoken');

// const logServices = require('../services/auditLog.services');

const sessionModel = require('../src/models/session.model');
const { v4: uuidv4 } = require("uuid");

const {
    clearAuthentication,
    deny401,
    deny403,
    success200,
    acceptsHtml
} = require('../util/helpers');

const {
    signAccessToken,
    signRefreshToken,
    signRedirect,
    decodeRedirect,
    setAuthCookies,
    normalizeUA,
    decodeAccessToken,
    decodeRefreshToken,
    hashToken,
    decodeAuthCookies,
    sameNetwork,
    allowRedirect
} = require('../util/authTokens');

const authServices = require('../src/services/auth.services');
const { email } = require('../util/validator');

// function checkAuthentication({ acceptedTypes } = {}) {

//     return async function (req, res, next) {

//         const isProduction = process.env.NODE_ENV === 'production';

//         const sslUrlPrefix = isProduction ? 'https://' : 'http://';

//         const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

//         const redirectPayload = decodeRedirect(req.cookies.r);

//         const redirect = redirectPayload?.redirectTo || req.session.redirectTo || req.query.r || `${sslUrlPrefix}${process.env.DOMAIN}`;

//         const accessToken = req.cookies.uac_t;
//         const refreshToken = req.cookies.c_t;

//         const ua = normalizeUA(req.get('User-Agent'));
//         const ip = req.ip;

//         /* =======================
//            1) CHECK ACCESS TOKEN
//         ======================== */

//         if (accessToken) {
//             try {
//                 const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

//                 if (decoded.ua !== ua || !sameNetwork(decoded.ip, ip)) {

//                     //TODO implement: Log activity
//                     clearAuthentication(res);
//                     req.session.message = 'Please log in to continue';
//                     if (acceptsHtml(req)) {
//                         return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}`)
//                     } else {
//                         return res.status(401).json({
//                             authenticated: false,
//                             success: false,
//                             message: 'Please login to continue',
//                             redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}`
//                         })
//                     }
//                     //return deny401(req, res, { message: 'Login to continue' });
//                 }

//                 req.auth = {
//                     userId: decoded.u_id,
//                     accountId: decoded.ac,
//                     accountType: decoded.ac_type,
//                     name: decoded.name,
//                 };

//                 if (acceptedTypes && !acceptedTypes.includes(req.auth.accountType)) {
//                     return deny403(req, res, { message: 'Login to continue' });
//                 }

//                 return next();
//             } catch (err) {
//                 // access expired → fall through to refresh
//                 console.error(err)
//             }
//         }

//         /* =======================
//            2) REFRESH TOKEN
//         ======================== */
//         if (!refreshToken) {
//             clearAuthentication(res);
//             req.session.message = 'Please log in to continue';
//             if (acceptsHtml(req)) {
//                 return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}`)
//             } else {
//                 return res.status(401).json({
//                     authenticated: false,
//                     success: false,
//                     message: 'Please login to continue',
//                     redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}`
//                 })
//             }
//             return deny401(req, res, { message: 'Please login to continue' });
//         }

//         let refreshDecoded;
//         try {
//             refreshDecoded = jwt.verify(
//                 refreshToken,
//                 process.env.JWT_SECRET_2
//             );
//         } catch {
//             clearAuthentication(res);
//             return deny401(req, res, { message: 'Login to continue' });
//         }

//         if (
//             refreshDecoded.ua !== ua ||
//             !sameNetwork(refreshDecoded.ip, ip)
//         ) {
//             //TODO implement: Log activity
//             clearAuthentication(res);
//             return deny401(req, res, { message: 'Login to continue' });
//         }

//         let stored;
//         try {
//             stored = await sessionModel.findOne(
//                 refreshDecoded.userId,
//                 refreshDecoded.jti,
//                 hashToken(refreshToken)
//             );
//         } catch {
//             clearAuthentication(res);
//             return deny401(req, res, { message: 'Login to continue' });
//         }

//         if (!stored || stored.expires_at < new Date()) {
//             clearAuthentication(res);
//             return deny401(req, res, { message: 'Login to continue' });
//         }

//         /* =======================
//            3) ISSUE NEW ACCESS
//         ======================== */
//         const newAccess = signAccessToken({
//             ac: refreshDecoded.accountId,
//             ac_type: refreshDecoded.accountType,
//             u_id: refreshDecoded.userId,
//             name: refreshDecoded.username,
//             ua,
//             ip,
//         });

//         setAuthCookies(res, {
//             accessToken: newAccess,
//             refreshToken,
//         });

//         req.auth = {
//             userId: refreshDecoded.userId,
//             accountId: refreshDecoded.accountId,
//             accountType: refreshDecoded.accountType,
//             name: refreshDecoded.username,
//         };

//         if (acceptedTypes && !acceptedTypes.includes(req.auth.accountType)) {
//             return deny403(req, res, { message: 'Login to continue' });
//         }

//         return next();
//     };
// }

function verifyPreAuth(req, res, next) {

    const preauthToken = req.cookies.p_auth;

    const ua = normalizeUA(req.get('User-Agent'));
    const ip = req.ip;

    if (!preauthToken) {
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

    let decoded;

    try {
        decoded = jwt.verify(preauthToken, process.env.JWT_SECRET);
    } catch (error) {
        console.error(error)
    }

    if (!decoded) {
        return acceptsHtml(req) ? res.redirect('/')
            :
            res.json({
                success: false,
                authenticated: false,
                message: 'Something went wrong — Please try to log in again'
            });
    }

    if (decoded.ua !== ua) {
        console.warn('UA IP verification failed');

        //Suspicious activity
        //TODO: Impl. Log activity

        req.session.message = 'Something behaved suspiciously — Please log in again'
        return acceptsHtml(req) ? res.redirect('/') : res.json({
            success: false,
            authenticated: false,
            message: 'We detect suspicious activity. Please loginto continue'
        });

    }

    next();

}

function authPass({ acceptedTypes }) {


    return async function (req, res, next) {

        const isProduction = process.env.NODE_ENV === 'production';

        const sslUrlPrefix = isProduction ? 'https://' : 'http://';

        const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

        const { accessToken, refreshToken } = decodeAuthCookies(req);

        if (accessToken) {
            const uaOk = accessToken.ua === normalizeUA(req.get('User-Agent'));

            if (!uaOk) {
                req.session.message = 'Some suspicious behaviour detected. Please log in to continue';
                if (acceptsHtml(req)) {
                    return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}`)
                } else {
                    return res.status(401).json({
                        authenticated: false,
                        success: false,
                        message: 'Please login to continue',
                        redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}`
                    })
                }
                //return deny401(req, res, { message: 'We detect suspicious activity. Please loginto continue' })
            }

            const user = {
                userId: accessToken.u_id,
                userAccount: accessToken.ac,
                type: accessToken.ac_type,
                role: accessToken.role,
                username: accessToken.username,
                email: accessToken.email,
                name: accessToken.name,
                phoneNumber: accessToken.phone_number
            }

            req.user = user;

            //Validate account type
            if (acceptedTypes && !acceptedTypes.includes(accessToken.ac_type)) {

                if (acceptsHtml(req)) {
                    return res.render('no-access', {
                        user,
                        title: 'Access Denied',
                        message: 'You do not have access to this page'
                    })
                    //return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}`)
                } else {
                    return res.status(401).json({
                        authenticated: false,
                        success: false,
                        message: 'Please login to continue',
                        redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}`
                    })
                }
                //return deny401(req, res, { message: 'Access Denied', details: 'Sorry, you do not have access to the requested page. Please login with valid account to continue' });
            }

            return next();
        }

        if (!refreshToken) {
            clearAuthentication(res);
            if (acceptsHtml(req)) {
                const to = `${sslUrlPrefix}${req.hostname}${portSuffix}${req.originalUrl}`;
                req.session.message = 'Please signin to continue';

                //Currently we're not using session database
                // req.session.save((err) => {
                //     if (err) return next(err);

                //     // This runs ONLY after the database is updated
                //     res.redirect('/dashboard');
                // });
                //console.log('TO: ', `${sslUrlPrefix}${req.hostname}${req.originalUrl}`)
                return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}?r=${to}`)
                //return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}`)
            } else {

                return res.status(401).json({
                    authenticated: false,
                    success: false,
                    message: 'Please login to continue',
                    redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}`
                })
            }
            //return deny401(req, res, { message: 'Please login to continue', originalUrl: req.originalUrl });
        }

        const userId = refreshToken.userId;
        const userAccount = refreshToken.accountId;
        const jwtId = refreshToken.jwtId;

        const uaOk = refreshToken.ua === normalizeUA(req.get('User-Agent'));

        if (!uaOk) {
            if (acceptsHtml(req)) {
                req.session.message = 'Please login to continue';
                return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}`)
                //return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}`)
            } else {

                return res.status(401).json({
                    authenticated: false,
                    success: false,
                    message: 'Please login to continue',
                    redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}`
                })
            }
            //return deny401(req, res, { message: 'Session Error — Login to continue' })
        }

        const rawRefreshToken = req.cookies.c_t;

        const validationResult = await authServices.sessionValidation({ userAccount, jwtId, rawRefreshToken, userId, ip: req.ip, ua: normalizeUA(req.get('User-Agent')) });

        if (!validationResult.success) {
            clearAuthentication(res);
            return deny403(req, res, { message: validationResult.message || 'Something went wrong' });
        }

        const user = validationResult.userAccount;
        const sessionId = validationResult.sessionId;

        if (!user) {
            clearAuthentication(res);
            return deny403(req, res, { message: validationResult.message || 'Something went wrong, please login' });
        }

        // if (acceptedTypes && !acceptedTypes.includes(user.account_type)) {
        //     req.session.message = 'etected. Please log in to continue';
        //     if (acceptsHtml(req)) {
        //         return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}`)
        //     } else {
        //         return res.status(401).json({
        //             authenticated: false,
        //             success: false,
        //             message: 'Please login to continue',
        //             redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}`
        //         })
        //     }
        //     //return deny401(req, res, { message: 'You do not have access to the requested page. Login with valid account' });
        // }

        if (acceptedTypes && !acceptedTypes.includes(user.account_category)) {

            console.log(acceptedTypes, user.account_category)

            if (acceptsHtml(req)) {
                return res.render('no-access', {
                    user,
                    title: 'Access Denied',
                    message: 'You do not have access to this page'
                })
                //return res.redirect(`${sslUrlPrefix}auth.${process.env.DOMAIN}${portSuffix}`)
            } else {
                return res.status(401).json({
                    authenticated: false,
                    success: false,
                    message: 'Please login to continue',
                    redirectTo: `${sslUrlPrefix}auth.${process.env.DOMAIN}`
                })
            }
            //return deny401(req, res, { message: 'Access Denied', details: 'Sorry, you do not have access to the requested page. Please login with valid account to continue' });
        }

        const accessTokenJwtId = uuidv4();

        const accessToken2 = signAccessToken({
            jwtId: accessTokenJwtId,
            u_id: user.user_id,
            ac: user.user_account_id,
            a_id: user.account_id,
            account_code: user.account_code,
            ac_type: user.account_category,
            ac_title: user.account_title,
            role: user.role,
            username: user.username,
            email: user.email,
            name: user.names,
            phone_number: user.phone_number,
            ip: req.ip,
            ua: normalizeUA(req.get('User-Agent'))
        });

        const refreshTokenJwtId = uuidv4();

        const refreshToken2 = signRefreshToken({
            jwtId: refreshTokenJwtId,
            userId: user.user_id,
            accountId: user.user_account_id,
            ip: req.ip,
            ua: normalizeUA(req.get('User-Agent'))
        });

        //Rotate session refresh token
        await authServices.rotateRefreshToken(sessionId, refreshTokenJwtId, refreshToken2);

        setAuthCookies(res, accessToken2, refreshToken2);

        req.user = {
            userId: user.u_id,
            userAccount: user.ac,
            type: user.ac_type,
            role: user.role,
            username: user.username,
            email: user.email,
            name: user.name,
            phoneNumber: user.phone_number
        }

        return next();
    }

}

/**
 * Fn attaches current request user account to the response
 * And rotate session
 * Does not block any activity
 * 
 */
async function passUser(req, res, next) {

    const isProduction = process.env.NODE_ENV === 'production';

    const sslUrlPrefix = isProduction ? 'https://' : 'http://';

    const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

    // const redirectPayload = decodeRedirect(req.cookies.r);

    // const redirect = redirectPayload?.redirectTo || req.session.redirectTo || req.query.r || `${sslUrlPrefix}${process.env.DOMAIN}`;

    const { accessToken, refreshToken } = decodeAuthCookies(req);

    if (accessToken) {
        const uaOk = accessToken.ua === normalizeUA(req.get('User-Agent'));

        if (!uaOk) {
            //TODO: Implement Log action

            req.user = null;
            return next();
        }

        const user = {
            username: accessToken.username,
            name: accessToken.name,
            user_account_id: accessToken.ac,
            account_type: accessToken.ac_type,
            account_code: accessToken.account_code,
            email: accessToken.email,
            userId: accessToken.u_id,
            phoneNumber: accessToken.phone_number
        }

        req.user = user;

        return next();

    } else if (refreshToken) {

        //Rotating session

        const userId = refreshToken.userId;
        const userAccount = refreshToken.accountId;
        const jwtId = refreshToken.jwtId;

        const uaOk = refreshToken.ua === normalizeUA(req.get('User-Agent'));

        if (!uaOk) {
            req.user = null;
            return next();
        }

        const rawRefreshToken = req.cookies.c_t;

        const validationResult = await authServices.sessionValidation({ userAccount, jwtId, rawRefreshToken, userId, ip: req.ip, ua: normalizeUA(req.get('User-Agent')) });

        if (!validationResult.success) {
            req.user = null;
            return next();
        }

        const user = validationResult.userAccount;
        const sessionId = validationResult.sessionId;

        if (!user) {
            req.user = null;
            return next();
        }

        const accessTokenJwtId = uuidv4();

        const accessToken2 = signAccessToken({
            jwtId: accessTokenJwtId,
            u_id: user.user_id,
            ac: user.user_account_id,
            a_id: user.account_id,
            account_code: user.account_code,
            ac_type: user.account_category,
            ac_title: user.account_title,
            role: user.role,
            username: user.username,
            email: user.email,
            name: user.names,
            phone_number: user.phone_number,
            ip: req.ip,
            ua: normalizeUA(req.get('User-Agent'))
        });

        const refreshTokenJwtId = uuidv4();

        const refreshToken2 = signRefreshToken({
            jwtId: refreshTokenJwtId,
            userId: user.user_id,
            accountId: user.user_account_id,
            ip: req.ip,
            ua: normalizeUA(req.get('User-Agent'))
        });

        //Rotate session refresh token
        await authServices.rotateRefreshToken(sessionId, refreshTokenJwtId, refreshToken2);

        setAuthCookies(res, accessToken2, refreshToken2);

        req.user = {
            userId: user.u_id,
            userAccount: user.ac,
            type: user.ac_type,
            role: user.role,
            username: user.username,
            email: user.email,
            name: user.name,
            phoneNumber: user.phone_number
        }

        return next();
    } else {
        req.user = null;
        return next();
    }
}

/**
 * 
 * This function validate if current request is authenticated before rendering signin/login page
 * If user is authenticated & originalUrl is from "login/signin" its passes the response to '/' home or redirectTo
 * 
 */
async function validateAuthentication(req, res, next) {

    const isProduction = process.env.NODE_ENV === 'production';

    const sslUrlPrefix = isProduction ? 'https://' : 'http://';

    const portSuffix = isProduction ? '' : `:${process.env.PORT}`;

    const redirectPayload = decodeRedirect(req.cookies.r);

    const redirect = redirectPayload?.redirectTo || req.session.redirectTo || req.query.r || `${sslUrlPrefix}${process.env.DOMAIN}`;

    if (!allowRedirect(redirect)) {

        const redirectTo = isProduction ? `https://${process.env.DOMAIN}` : `http://${process.env.DOMAIN}:${process.env.PORT}`;

        //TODO Implement: Log activity
        if (acceptsHtml(req)) {
            return res.redirect(redirectTo);
        }

        return res.json({
            success: false,
            authenticated: false,
            message: 'Unknown host'
        });

    }

    const { accessToken, refreshToken } = decodeAuthCookies(req);

    if (accessToken) {
        const uaOk = accessToken.ua === normalizeUA(req.get('User-Agent'));

        if (!uaOk) {
            req.user = null;
            return next();
        }

        const user = {
            username: accessToken.username,
            name: accessToken.name,
            user_account_id: accessToken.ac,
            account_type: accessToken.ac_type,
            account_code: accessToken.account_code,
            email: accessToken.email,
            userId: accessToken.u_id,
            phoneNumber: accessToken.phone_number
        }

        req.user = user;

        let to = redirect;

        if (!redirect) {
            if (isProduction) {
                to = `https://${process.env.DOMAIN}`;
            } else {
                to = `http://${process.env.DOMAIN}:${process.env.PORT}`;
            }
        }

        if (acceptsHtml(req)) {
            return res.redirect(to);
        }

        return res.json({
            success: true,
            authenticated: true,
            redirectTo: to
        });


    } else if (refreshToken) {
        //Rotate session

        const userId = refreshToken.userId;
        const userAccount = refreshToken.accountId;
        const jwtId = refreshToken.jwtId;

        const uaOk = refreshToken.ua === normalizeUA(req.get('User-Agent'));

        if (!uaOk) {
            req.user = null;
            return next();
        }

        const rawRefreshToken = req.cookies.c_t;

        const validationResult = await authServices.sessionValidation({ userAccount, jwtId, rawRefreshToken, userId, ip: req.ip, ua: normalizeUA(req.get('User-Agent')) });

        if (!validationResult.success) {
            req.user = null;
            return next();
        }

        const user = validationResult.userAccount;
        const sessionId = validationResult.sessionId;

        if (!user) {
            req.user = null;
            return next();
        }

        const accessTokenJwtId = uuidv4();

        const accessToken2 = signAccessToken({
            jwtId: accessTokenJwtId,
            u_id: user.user_id,
            ac: user.user_account_id,
            a_id: user.account_id,
            account_code: user.account_code,
            ac_type: user.account_category,
            ac_title: user.account_title,
            role: user.role,
            username: user.username,
            email: user.email,
            name: user.names,
            phone_number: user.phone_number,
            ip: req.ip,
            ua: normalizeUA(req.get('User-Agent'))
        });

        const refreshTokenJwtId = uuidv4();

        const refreshToken2 = signRefreshToken({
            jwtId: refreshTokenJwtId,
            userId: user.user_id,
            accountId: user.user_account_id,
            ip: req.ip,
            ua: normalizeUA(req.get('User-Agent'))
        });

        //Rotate session refresh token
        await authServices.rotateRefreshToken(sessionId, refreshTokenJwtId, refreshToken2);

        setAuthCookies(res, accessToken2, refreshToken2);

        req.user = {
            userId: user.u_id,
            userAccount: user.ac,
            type: user.ac_type,
            role: user.role,
            username: user.username,
            email: user.email,
            name: user.name,
            phoneNumber: user.phone_number
        }

        let to = redirect;

        if (!redirect) {
            if (isProduction) {
                to = `https://${process.env.DOMAIN}`;
            } else {
                to = `http://${process.env.DOMAIN}:${process.env.PORT}`;
            }
        }

        if (acceptsHtml(req)) return res.redirect(to);

        return res.status(200).json({
            success: true,
            authenticated: true,
            redirectTo: to
        });

    } else {
        req.user = null;

        return next();
    }
}

module.exports = { verifyPreAuth, authPass, passUser, validateAuthentication };