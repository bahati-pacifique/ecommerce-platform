// module.exports = {
//     contentSecurityPolicy: {
//         useDefaults: true,

//         directives: {

//             upgradeInsecureRequests: null,

//             "script-src": [
//                 "'self'",
//                 "'unsafe-inline'",
//                 "https://cdn.tailwindcss.com",
//                 "https://cdn.jsdelivr.net",
//                 "https://cdnjs.cloudflare.com",
//                 "https://unpkg.com",
//                 "https://code.jquery.com",
//                 "https://cdn.quilljs.com",
//                 "https://fonts.googleapis.com"
//             ],

//             "style-src": [
//                 "'self'",
//                 "'unsafe-inline'",
//                 "https://cdn.jsdelivr.net",
//                 "https://cdnjs.cloudflare.com",
//                 "https://unpkg.com",
//                 "https://fonts.googleapis.com",
//                 "https://cdn.lineicons.com",
//                 "https://cdn.quilljs.com",
//                 "https://cdn.jsdelivr.net"
//             ],

//             "font-src": [
//                 "'self'",
//                 "https://fonts.gstatic.com",
//                 "https://cdnjs.cloudflare.com",
//                 "https://cdn.jsdelivr.net",
//                 "https://cdn.lineicons.com"
//             ],

//             "img-src": [
//                 "'self'",
//                 "https://res.cloudinary.com",
//                 "https://upload.wikimedia.org",
//                 "https://images.unsplash.com",
//                 "https://picsum.photos",
//                 "https://fastly.picsum.photos",
//                 "https://cdn.cococe.rw",
//                 "data:"
//             ],
//             "media-src": [
//                 "'self'",
//                 "https://www.w3schools.com"
//             ],
//             "frame-src": [
//                 "'self'",
//                 'https://youtube.com',
//                 'https://youtube.com',
//                 'https://youtube-nocookie.com',
//                 'https://youtube-nocookie.com'
//             ]
//         }
//     }
// };

const { DOMAIN, PORT, NODE_ENV } = process.env;

const isProduction = NODE_ENV === "production";
const protocol = isProduction ? "https" : "http";
const wsProtocol = isProduction ? "wss" : "ws";

const domain = isProduction ? `${protocol}://*.${DOMAIN}` : `${protocol}://*.${DOMAIN}:${PORT}`;
const domainWithPort = `${protocol}://*.${DOMAIN}:${PORT}`;
const wsDomainWithPort = `${wsProtocol}://*.${DOMAIN}:${PORT}`;

module.exports = {
    contentSecurityPolicy: {
        useDefaults: true,

        directives: {
            upgradeInsecureRequests: isProduction ? [] : null,

            "default-src": [
                "'self'"
            ],

            "connect-src": [
                "'self'",
                "https://cdn.cococe.rw",
                isProduction ? domain : domainWithPort,
                isProduction ? `${wsProtocol}://*.${DOMAIN}` : wsDomainWithPort
            ],

            "script-src": [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.tailwindcss.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://unpkg.com",
                "https://code.jquery.com",
                "https://cdn.quilljs.com",
                "https://fonts.googleapis.com"
            ],

            "style-src": [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://unpkg.com",
                "https://fonts.googleapis.com",
                "https://cdn.lineicons.com",
                "https://cdn.quilljs.com"
            ],

            "font-src": [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com",
                "https://cdn.jsdelivr.net",
                "https://cdn.lineicons.com"
            ],

            // "img-src": [
            //     "'self'",
            //     "data:",
            //     isProduction ? domain : domainWithPort,
            //     "https://res.cloudinary.com",
            //     "https://upload.wikimedia.org",
            //     "https://images.unsplash.com",
            //     "https://picsum.photos",
            //     "https://fastly.picsum.photos",
            //     "https://cdn.cococe.rw"
            // ],

            "img-src": [
                "'self'",
                "*",
                "data:",
                "blob:"
            ],

            "media-src": [
                "'self'",
                "https://www.w3schools.com"
            ],

            "frame-src": [
                "'self'",
                "https://youtube.com",
                "https://youtube-nocookie.com"
            ],

            "form-action": [
                "'self'", 
                domain
            ],
        }
    }
};