const path = require('path');
const express = require('express');
const authRoutes = require('./routes/auth.routes');

const errorMiddleware = require('../../middlewares/error.middleware');
const notFoundMiddleware = require('../../middlewares/notFound.middleware');

const app = express();

const requireJson = (req, res, next) => {
  if (!req.is('json')) {
    return res.status(415).json({ error: 'Sorry, Only application/json request are accepted' });
  }
  next();
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../views'));

app.use('/', authRoutes);

app.use(errorMiddleware);
app.use(notFoundMiddleware);

module.exports = app;