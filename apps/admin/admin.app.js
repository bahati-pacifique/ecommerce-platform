const path = require('path');
const express = require('express');

const adminRoutes = require('./routes/admin.routes');

const errorMiddleware = require('../../middlewares/error.middleware');
const notFoundMiddleware = require('../../middlewares/notFound.middleware');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../views'));

app.use('/', adminRoutes);

app.use(errorMiddleware);
app.use(notFoundMiddleware);

module.exports = app;