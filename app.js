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

const adminMiddleware =
    require('./middlewares/admin.middleware');

const errorMiddleware =
    require('./middlewares/error.middleware');

const notFoundMiddleware =
    require('./middlewares/notFound.middleware');

const mainRoutes =
    require('./routes/main.routes');

const adminRoutes =
    require('./routes/admin.routes');

app.set('trust proxy', 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(fileUpload(uploadConfig));

app.use(express.static(
    path.join(__dirname, 'public')
));

app.set('view engine', 'ejs');
app.set('views',
    path.join(__dirname, 'views')
);

app.use(cors(corsConfig));

app.use(cookieParser());

app.use(helmet(helmetConfig));

app.use(session(sessionConfig));

// app.use((req, res, next) => {
//     const host = req.hostname;

//     if (host === 'admin.cococe.rw') {
//         return adminRouter(req, res, next);
//     }

//     next();
// });

app.use('/', mainRoutes);

const isProduction = process.env.NODE_ENV === 'production';

app.use('/admin', (req, res, next) => {
    if ((req.hostname !== process.env.ADMIN_HOST) && isProduction) {
        return res.status(404).send('Not Found');
    }

    next();
})

app.use(
    '/admin',
    adminRoutes
);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

module.exports = app;