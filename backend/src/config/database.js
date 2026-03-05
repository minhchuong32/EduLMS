const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'LMS_DB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('Connected to SQL Server');
  }
  return pool;
};

const query = async (queryString, params = {}) => {
  const pool = await getPool();
  const request = pool.request();
  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });
  return request.query(queryString);
};

const closePool = async () => {
  if (pool) {
    await pool.close();
    pool = null;
  }
};

module.exports = { sql, getPool, query, closePool, config };

// const { Pool } = require("pg");
// require("dotenv").config();

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
//   max: 10,
//   idleTimeoutMillis: 30000,
// });

// // query() hỗ trợ cả @param (cũ) và $1 (mới)
// const query = async (text, params = {}) => {
//   if (!params || Array.isArray(params)) {
//     return pool.query(text, params || []);
//   }
//   // Chuyển @key → $1, $2...
//   const keys = Object.keys(params);
//   let sql = text;
//   const values = [];
//   keys.forEach((key, i) => {
//     sql = sql.replace(new RegExp(`@${key}\\b`, "g"), `$${i + 1}`);
//     values.push(params[key]);
//   });
//   return pool.query(sql, values);
// };

// module.exports = { query, pool };
