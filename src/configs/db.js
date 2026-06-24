const { Pool } = require('pg');
require('dotenv').config();

const { types } = require('pg');

//Keep date naturally, do not cast to Js format
types.setTypeParser(1082, val => val);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_SECRET,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;