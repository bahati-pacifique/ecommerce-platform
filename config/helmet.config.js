module.exports = {
    contentSecurityPolicy: {
        useDefaults: true,

        directives: {

            upgradeInsecureRequests: null,

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
                "https://cdn.quilljs.com",
                "https://cdn.jsdelivr.net"
            ],

            "font-src": [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com",
                "https://cdn.jsdelivr.net",
                "https://cdn.lineicons.com"
            ],

            "img-src": [
                "'self'",
                "https://res.cloudinary.com",
                "https://upload.wikimedia.org",
                "https://images.unsplash.com",
                "https://picsum.photos",
                "https://fastly.picsum.photos",
                "https://cdn.cococe.rw",
                "data:"
            ],
            "media-src": [
                "'self'",
                "https://www.w3schools.com"
            ],
            "frame-src": [
                "'self'",
                'https://youtube.com',
                'https://youtube.com',
                'https://youtube-nocookie.com',
                'https://youtube-nocookie.com'
            ]
        }
    }
};