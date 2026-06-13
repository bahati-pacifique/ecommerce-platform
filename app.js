const express = require('express');
const app = express();

const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');

const maxmind = require('maxmind');

const session = require('express-session');

const mainRoutes = require('./routes/main.routes');

app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

require('dotenv').config();

const allowedOrigins = [
  'https://cococe.onrender.com',
  'https://cococe.rw'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin === "null") {
      callback(null, true);  // Allow requests with no origin (server-origin requests) SSR
    }
    // Allow requests from specified origins
    else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));  // Block other requests
    }
  },
  credentials: true,  // Allow credentials (cookies, authorization headers)
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],  // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-App-Package'],  // Allowed headers
  exposedHeaders: ['Authorization'],  // Expose any headers that clients might need
  optionsSuccessStatus: 200  // For legacy browser support
}));

app.use((err, req, res, next) => {

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      status: "forbidden",
      code: "POLICY_VIOLATION",
      message: "Failed — Unknown source",
      // details: process.env.NODE_ENV === 'development' ? {
      //   attemptedOrigin: req.headers.origin || "null",
      //   allowedOrigins: allowedOrigins,
      //   hint: "Add your origin to allowedOrigins array"
      // } : undefined
      details: "Access blocked: Unknown source!"
    });
  }
  next(err); // Pass other errors to default handler
});

app.set('trust proxy', true); //When running behind a proxy (Nginx),

const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(cookieParser());

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com/",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com",
        "https://cdn.jsdelivr.net/npm/bootstrap", // Bootstrap JS via jsDelivr
        "https://cdn.jsdelivr.net/npm/bootstrap-icons",
        "https://code.jquery.com/",
        "https://cdn.quilljs.com/",
        "https://fonts.googleapis.com/"
      ],
      "style-src": [
        "'self'",
        "'unsafe-inline'", //For Bootstrap 5 modals
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net/npm/bootstrap",
        "https://cdn.tailwindcss.com/",
        "https://cdn.lineicons.com/",
        "https://cdn.quilljs.com/",
        "https://fonts.googleapis.com/"
      ],
      "font-src": [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net/",
        "https://cdn.lineicons.com/"
      ],
      "img-src": [
        "'self'",
        "https://res.cloudinary.com",
        " https://upload.wikimedia.org",
        "https://images.unsplash.com/",
        "https://picsum.photos/",
        "https://fastly.picsum.photos/",
        "data:"
      ]
    }
  }
}));

//================ Middleware ==========================

app.use(express.json());

//================== Routes ============================

app.use('/', mainRoutes);

app.use((req, res, next) => {

  const type = req.accepts(['html', 'json']);

  if (type === 'json') {
    return res.status(404).json({
      success: false,
      message: 'Page Not Found',
    });
  }

  return res.status(404).redirect('/')
});

module.exports = app;