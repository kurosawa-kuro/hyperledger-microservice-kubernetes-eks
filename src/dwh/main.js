// main.js
const { downloadParquetFromS3 } = require('./load-parquet-from-s3');
const { runDuckDBQuery } = require('./transform-with-duckdb');
const { insertToPostgres } = require('./insert-to-postgres');

(async () => {
  const parquetFile = await downloadParquetFromS3();
  const rows = await runDuckDBQuery(parquetFile);
  console.log(`Processing ${rows.length} rows`);
  await insertToPostgres(rows);
})();