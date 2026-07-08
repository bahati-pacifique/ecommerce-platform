const UAParser = require('ua-parser-js');

function acceptsHtml(req) {
  const acceptsHtml = req.accepts(['html', 'json']) === 'html';
  const isAjax = req.xhr || req.get('X-Requested-With') === 'XMLHttpRequest';

  return acceptsHtml && !isAjax;
}

function sameNetwork(ip1, ip2) {
  if (!ip1 || !ip2) return false;
  return ip1.split(".").slice(0, 3).join(".") === ip2.split(".").slice(0, 3).join(".");
}

function normalizeUA(userAgent) {
  if (!userAgent) return "UnknownClient";
  const parser = new UAParser(userAgent);
  const b = parser.getBrowser();
  const os = parser.getOS();
  return `${b.name || "UnknownBrowser"} ${b.major || "0"} | ${os.name || "UnknownOS"} ${os.version || "0"}`;
}

function deny401(req, res, { message = "Please login to continue", details, originalUrl = req.originalUrl } = {}) {
  if (acceptsHtml(req)) {
    return res.status(401).render("admin-login", { originalUrl, message, details });
  }
  return res.status(401).json(
    {
      authenticated: false,
      originalUrl: originalUrl || req.originalUrl,
      redirectTo: originalUrl || '/',
      success: false,
      loginRequired: true,
      message
    }
  );
}

function deny403(req, res, { message = "Access denied", details, originalUrl = req.originalUrl } = {}) {

  if (acceptsHtml(req)) {
    return res.status(403).render("admin-login", { originalUrl, message, details });
  }

  return res.status(403).json({ authenticated: false, originalUrl, success: false, message });
}

function deny500(req, res, { message = "Internal Server Error", details, originalUrl = req.originalUrl } = {}) {

  if (acceptsHtml(req)) {
    return res.status(500).render("admin-login", { originalUrl, message, details });
  }

  return res.status(403).json({ authenticated: false, originalUrl, success: false, message });
}

function success200(req, res, { originalUrl, username, message } = {}) {
  if (acceptsHtml(req)) {
    return res.redirect(req.originalUrl || '/')
  }
  return res.json({ authenticated: true, username, message });
}

function clearAuthentication(res) {

  const cookieOptions = {
    httpOnly: true,
    domain: process.env.DOMAIN,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax",
  };

  res.cookie('uac_t', '', { maxAge: 0, path: '/' });
  res.cookie('c_t', '', { maxAge: 0, path: '/' });
  res.cookie('p_auth', '', { maxAge: 0, path: '/' });

  res.clearCookie("uac_t", cookieOptions);
  res.clearCookie("c_t", cookieOptions);
  res.clearCookie("p_auth");

}

function isSameOrigin(req) {
  const source = req.get('origin') || req.get('referer');

  if (!source) return true;

  try {
    const sourceOrigin = new URL(source).origin;
    const targetOrigin = new URL(`${req.protocol}://${req.get('host')}`).origin;

    return sourceOrigin === targetOrigin;
  } catch {
    return false;
  }
}

function safeRedirectPath(path, fallback = '/') {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('://')
  ) {
    return fallback;
  }
  return path;
}


module.exports = {
  acceptsHtml,
  sameNetwork,
  normalizeUA,
  clearAuthentication,
  safeRedirectPath,
  success200,
  deny401,
  deny403,
  deny500,
  isSameOrigin
}