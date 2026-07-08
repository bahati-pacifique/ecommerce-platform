const port = process.env.PORT;

const allowedOrigins = [
    'https://cococe.rw',
    'https://www.cococe.rw',
    'https://admin.cococe.rw',
    'https://api.cococe.rw',
    'https://auth.cococe.rw',
    'https://cococe.onrender.com',

    `http://localapp.com:${port}`,
    `http://admin.localapp.com:${port}`,
    `http://auth.localapp.com:${port}`,
    `http://api.localapp.com:${port}`,

    `http://localhost.com:${port}`,
    `http://admin.localhost.com:${port}`,
    `http://auth.localhost.com:${port}`,
    `http://api.localhost.com:${port}`
];

module.exports = {
    origin: function (origin, callback) {

        console.log(origin)

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