const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const businessRoutes = require('./routes/business.routes');

const errorMiddleware = require('../../middlewares/error.middleware');
const notFoundMiddleware = require('../../middlewares/notFound.middleware');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../views'));
app.use(expressLayouts);
app.set('layout', 'store-center');

app.use((req, res, next) => {
  res.locals.layout = false;   // default: no layout
  next();
});

app.use('/', businessRoutes);

app.use(errorMiddleware);
app.use(notFoundMiddleware);

module.exports = app;