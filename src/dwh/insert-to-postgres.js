// insert-to-postgres.js
const { Client } = require('pg');

exports.insertToPostgres = async (rows) => {
  const pg = new Client({
    connectionString: 'postgresql://dbmasteruser:dbmaster@ls-644e915cc7a6ba69ccf824a69cef04d45c847ed5.cps8g04q216q.ap-northeast-1.rds.amazonaws.com:5432/dwh',
    ssl: { rejectUnauthorized: false }  // ← 追加
  });
  await pg.connect();
  //   create logs table
  await pg.query(`
    CREATE TABLE IF NOT EXISTS logs (
      timestamp TIMESTAMP,
      message TEXT,
      level TEXT
    )
  `);
  for (const row of rows) {
    await pg.query('INSERT INTO logs (timestamp, message, level) VALUES ($1, $2, $3)', [row.timestamp, row.message, row.level]);
  }
  await pg.end();
};