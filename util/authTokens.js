// auth/tokens.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const UAParser = require('ua-parser-js');

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(payload) {

    const accessToken = jwt.sign(
        { ...payload },
        process.env.JWT_SECRET,
        { expiresIn: "45m" }
    );

    return accessToken;
}

function signRefreshToken(payload) {

    const refreshToken = jwt.sign(
        { ...payload },
        process.env.JWT_SECRET_2,
        { expiresIn: "7d" }
    );

    return refreshToken;
}

function signPreAuth(payload) {

    return jwt.sign(
        { ...payload },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
    );
}

function signRedirect(payload) {
    return jwt.sign(
        { ...payload },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
}

function decodeRedirect(redirectToken) {

    let payload;

    try {
        payload = jwt.verify(redirectToken, process.env.JWT_SECRET);
    } catch (error) {
        console.log(error);
    }
    return payload;
}

function decodeAccessToken(accessToken) {
    return jwt.verify(accessToken, process.env.JWT_SECRET);
}

function decodePreauthToken(preauthToken) {
    return jwt.verify(preauthToken, process.env.JWT_SECRET);
}

function decodeRefreshToken(refreshToken) {
    return jwt.verify(refreshToken, process.env.JWT_SECRET);
}

function setPreauth(res, preAuth, isProduction = false) {
    res.cookie('p_auth', preAuth, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 5 * 60 * 1000
    });
}

function setAuthCookies(res, accessToken, refreshToken) {
    if (!refreshToken || !accessToken) return;

    // Access token cookie
    res.cookie("uac_t", accessToken, {
        httpOnly: true,
        domain: process.env.DOMAIN,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
        maxAge: 15 * 60 * 1000
    });

    // Refresh token cookie (optionally restrict path)
    res.cookie("c_t", refreshToken, {
        httpOnly: true,
        domain: process.env.DOMAIN,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.clearCookie('p_auth');
}

function decodeAuthCookies(req) {

    const accessTokenCookie = req.cookies.uac_t;
    const refreshTokenCookie = req.cookies.c_t;

    let accessToken;
    let refreshToken;

    try {
        if (!accessTokenCookie) {
            accessToken = null;
        } else {
            accessToken = jwt.verify(accessTokenCookie, process.env.JWT_SECRET);
        }

    } catch (error) {
        //Error decoding accessToken
        console.log(error)
    }

    try {
        if (!refreshTokenCookie) {
            refreshToken = null;
        }
        else {
            refreshToken = jwt.verify(refreshTokenCookie, process.env.JWT_SECRET_2);
        }
    } catch (error) {
        //Error decoding refreshToken
        console.log(error)

    }

    return { accessToken, refreshToken }
}

function clearAuthCookies(res) {
    res.cookie('uac_t', '', { maxAge: 0, path: '/' });
    res.cookie('c_t', '', { maxAge: 0, path: '/' });
    res.cookie('p_auth', '', { maxAge: 0, path: '/' });

    res.clearCookie("uac_t");
    res.clearCookie("c_t");
    res.clearCookie('p_auth');
}

// function normalizeUA(userAgent) {
//     if (!userAgent) return 'UnknownClient';

//     if (/postman/i.test(userAgent)) return 'PostmanClient';
//     if (/curl/i.test(userAgent)) return 'CurlClient';
//     if (/axios|node|fetch/i.test(userAgent)) return 'NodeClient';
//     if (/android|iphone|mobile/i.test(userAgent)) return 'MobileClient';

//     const parser = new UAParser(userAgent);
//     const browser = parser.getBrowser();
//     const os = parser.getOS();

//     const browserName = browser.name || 'UnknownBrowser';
//     const browserMajor = browser.major || '0';
//     const osName = os.name || 'UnknownOS';
//     const osVersion = os.version || '0';

//     return `${browserName} ${browserMajor} | ${osName} ${osVersion}`;
// }

function normalizeUA(userAgent) {
    if (!userAgent) return 'UnknownClient';

    if (/postman/i.test(userAgent)) return 'PostmanClient';
    if (/curl/i.test(userAgent)) return 'CurlClient';
    if (/axios|node|fetch/i.test(userAgent)) return 'NodeClient';
    if (/android|iphone|mobile/i.test(userAgent)) return 'MobileClient';

    const parser = new UAParser(userAgent);
    const { name: browserName } = parser.getBrowser();
    const { name: osName } = parser.getOS();

    return `${browserName || 'UnknownBrowser'} | ${osName || 'UnknownOS'}`;
}

function sameNetwork(ip1, ip2) {
    if (!ip1 || !ip2) return false;
    return ip1.split('.').slice(0, 3).join('.') === ip2.split('.').slice(0, 3).join('.');
}

function isAllowedHost(hostname) {
    return (
        hostname.endsWith(process.env.DOMAIN)
    );
}

function allowRedirect(redirect) {
    try {
        const url = new URL(redirect);

        return (
            ["http:", "https:"].includes(url.protocol) &&
            (url.hostname === process.env.DOMAIN ||
                url.hostname.endsWith(`.${process.env.DOMAIN}`))
        );
    } catch (error) {
        return false;
    }
}

module.exports = {
    hashToken,
    signAccessToken,
    signRefreshToken,
    signPreAuth,
    signRedirect,
    decodeRedirect,
    decodeAuthCookies,
    decodeAccessToken,
    decodeRefreshToken,
    decodePreauthToken,
    setAuthCookies,
    setPreauth,
    clearAuthCookies,
    normalizeUA,
    allowRedirect,
    sameNetwork
};
