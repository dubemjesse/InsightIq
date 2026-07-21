const { Client: PgClient } = require('pg');
const mysql = require('mysql2/promise');
const { DatabaseSync } = require('node:sqlite');
const { ApiError } = require('../middleware/errorHandler');
const { decrypt } = require('../utils/crypto');

const CONNECT_TIMEOUT_MS = 8000;

/** Naive guard: only SELECT/CTE statements, single statement, no obvious mutations. */
const WRITE_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|ATTACH|PRAGMA|REPLACE)\b/i;

function assertReadOnlyQuery(sql) {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  if (trimmed.includes(';')) {
    throw new ApiError(400, 'Only a single SQL statement is allowed.');
  }
  if (!/^(SELECT|WITH)\b/i.test(trimmed)) {
    throw new ApiError(400, 'Only SELECT queries are allowed.');
  }
  if (WRITE_KEYWORDS.test(trimmed)) {
    throw new ApiError(400, 'Query contains a disallowed keyword.');
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Postgres
// ---------------------------------------------------------------------------

async function withPgClient(connectionInfo, fn) {
  const client = new PgClient({
    host: connectionInfo.host,
    port: connectionInfo.port || 5432,
    database: connectionInfo.database,
    user: connectionInfo.user,
    password: connectionInfo.password,
    ssl: connectionInfo.ssl ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function introspectPostgres(connectionInfo) {
  return withPgClient(connectionInfo, async (client) => {
    const { rows } = await client.query(`
      SELECT c.table_name, c.column_name, c.data_type
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_name = c.table_name AND t.table_schema = c.table_schema
      WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name, c.ordinal_position
    `);
    return groupColumnsByTable(rows, 'table_name', 'column_name', 'data_type');
  });
}

async function runPostgresQuery(connectionInfo, sql) {
  return withPgClient(connectionInfo, async (client) => {
    const result = await client.query(sql);
    return { rows: result.rows, columns: result.fields.map((f) => f.name) };
  });
}

// ---------------------------------------------------------------------------
// MySQL
// ---------------------------------------------------------------------------

async function withMysqlConnection(connectionInfo, fn) {
  const connection = await mysql.createConnection({
    host: connectionInfo.host,
    port: connectionInfo.port || 3306,
    database: connectionInfo.database,
    user: connectionInfo.user,
    password: connectionInfo.password,
    connectTimeout: CONNECT_TIMEOUT_MS,
  });
  try {
    return await fn(connection);
  } finally {
    await connection.end();
  }
}

async function introspectMysql(connectionInfo) {
  return withMysqlConnection(connectionInfo, async (connection) => {
    const [rows] = await connection.query(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = ?
       ORDER BY table_name, ordinal_position`,
      [connectionInfo.database]
    );
    return groupColumnsByTable(rows, 'table_name', 'column_name', 'data_type');
  });
}

async function runMysqlQuery(connectionInfo, sql) {
  return withMysqlConnection(connectionInfo, async (connection) => {
    const [rows, fields] = await connection.query(sql);
    return { rows, columns: fields.map((f) => f.name) };
  });
}

// ---------------------------------------------------------------------------
// SQLite (also used for materialized CSV/Excel uploads — see fileImport.service.js)
// ---------------------------------------------------------------------------

function introspectSqlite(filePath) {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all();

    return tables.map(({ name }) => {
      const columns = db.prepare(`PRAGMA table_info(${quoteIdentifier(name)})`).all();
      return {
        name,
        columns: columns.map((c) => ({ name: c.name, type: c.type || 'TEXT' })),
      };
    });
  } finally {
    db.close();
  }
}

function runSqliteQuery(filePath, sql) {
  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all();
    const columns = rows.length > 0 ? Object.keys(rows[0]) : (stmt.columns?.() ?? []);
    return { rows, columns };
  } finally {
    db.close();
  }
}

function quoteIdentifier(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function groupColumnsByTable(rows, tableKey, columnKey, typeKey) {
  const byTable = new Map();
  for (const row of rows) {
    const tableName = row[tableKey];
    if (!byTable.has(tableName)) byTable.set(tableName, []);
    byTable.get(tableName).push({ name: row[columnKey], type: row[typeKey] });
  }
  return Array.from(byTable, ([name, columns]) => ({ name, columns }));
}

// ---------------------------------------------------------------------------
// Public, type-dispatching API
// ---------------------------------------------------------------------------

/** Tests a live DB connection and returns its introspected schema. Throws ApiError on failure. */
async function testAndIntrospect(type, connectionInfo) {
  try {
    if (type === 'POSTGRES') return await introspectPostgres(connectionInfo);
    if (type === 'MYSQL') return await introspectMysql(connectionInfo);
    throw new ApiError(400, `Unsupported connection type: ${type}`);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(400, `Could not connect: ${err.message}`);
  }
}

/** Runs a read-only query against any supported data source and returns { rows, columns }. */
async function runQuery(dataSource, sql) {
  const safeSql = assertReadOnlyQuery(sql);

  if (dataSource.type === 'POSTGRES') {
    return runPostgresQuery(decryptConnectionInfo(dataSource), safeSql);
  }
  if (dataSource.type === 'MYSQL') {
    return runMysqlQuery(decryptConnectionInfo(dataSource), safeSql);
  }
  if (['SQLITE', 'CSV', 'EXCEL'].includes(dataSource.type)) {
    return runSqliteQuery(dataSource.filePath, safeSql);
  }
  throw new ApiError(400, `Unsupported data source type: ${dataSource.type}`);
}

function decryptConnectionInfo(dataSource) {
  return decrypt(dataSource.connectionInfo);
}

module.exports = {
  testAndIntrospect,
  introspectSqlite,
  runQuery,
  assertReadOnlyQuery,
};
