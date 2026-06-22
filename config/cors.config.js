const allowedOrigins = [
    'https://cococe.rw',
    'https://www.cococe.rw',
    'https://admin.cococe.rw',
    'https://api.cococe.rw',
    'https://cococe.onrender.com'
];

module.exports = {
    origin: function (origin, callback) {

        if (!origin || origin === 'null') {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },

    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Origin',
        'X-App-Package'
    ],
    exposedHeaders: ['Authorization'],
    optionsSuccessStatus: 200
};