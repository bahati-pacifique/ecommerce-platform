require('dotenv').config();

const express = require('express');
const app = express();

const path = require('path');

const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');

const corsConfig = require('./config/cors.config');
const helmetConfig = require('./config/helmet.config');
const sessionConfig = require('./config/session.config');
const uploadConfig = require('./config/upload.config');

const vhost = require('vhost');

const mainApp = require('./apps/main/main.app');
const adminApp = require('./apps/admin/admin.app');

app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(fileUpload(uploadConfig));

app.use(express.static(
    path.join(__dirname, 'public')
));

app.use(cors(corsConfig));

app.use(cookieParser());

app.use(helmet(helmetConfig));

app.use(session(sessionConfig));

const isProduction = process.env.NODE_ENV === 'production';

// app.use(vhost('cococe.rw', mainApp));
// app.use(vhost('admin.cococe.rw', adminApp));
// app.use(vhost('localhost', mainApp));
// app.use(vhost('admin.localhost', adminApp));

if (isProduction) {
    app.use((req, res, next) => {
        if (req.hostname === 'www.cococe.rw') {
            return res.redirect(301, `https://cococe.rw${req.originalUrl}`);
        }
        next();
    });

    app.use(vhost('cococe.rw', mainApp));
    app.use(vhost('admin.cococe.rw', adminApp));
} else {
    app.use(vhost('localhost', mainApp));
    app.use(vhost('admin.localhost', adminApp));
}

if (!isProduction) {
    //For localhost exposure (certain routes) to public i.e Like when using ngrok for testing purpose
    const mainRoutes = require('./apps/main/routes/main.routes');
    app.use('/', mainRoutes)
    const adminRoutes = require('./apps/admin/routes/admin.routes');
    app.use('/admin', adminRoutes)
}

module.exports = app;