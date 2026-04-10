const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL (PostgreSQL connection string).");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.PG_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
  max: parseInt(process.env.PG_POOL_MAX || "10", 10),
  idleTimeoutMillis: 30000,
});

const replaceNamedParams = (text, params) => {
  if (!params || Array.isArray(params)) {
    return { text, values: params || [] };
  }

  const keys = Object.keys(params);
  if (keys.length === 0) return { text, values: [] };

  let out = text;
  const values = [];
  keys.forEach((key, i) => {
    out = out.replace(new RegExp(`@${key}\\b`, "g"), `$${i + 1}`);
    values.push(params[key]);
  });
  return { text: out, values };
};

// Keep MSSQL-like return shape: { recordset, rowsAffected }
const query = async (text, params = {}, client = null) => {
  const { text: q, values } = replaceNamedParams(text, params);
  const runner = client || pool;
  const result = await runner.query(q, values);
  return { recordset: result.rows, rowsAffected: [result.rowCount] };
};

const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
};

const getPool = async () => pool;

const closePool = async () => pool.end();

module.exports = { pool, getPool, query, withTransaction, closePool };
