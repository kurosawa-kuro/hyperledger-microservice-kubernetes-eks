// transform-with-duckdb.js（DuckDB処理をローカルのPythonスクリプトに委譲）
const { spawn } = require('child_process');

exports.runDuckDBQuery = async (filepath) => {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', ['transform_duckdb.py', filepath]);
    let data = '';

    py.stdout.on('data', (chunk) => { data += chunk.toString(); });
    py.stderr.on('data', (err) => console.error('[Python stderr]', err.toString()));

    py.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Python exited with code ${code}`));
      try {
        const rows = JSON.parse(data);
        resolve(rows);
      } catch (e) {
        reject(e);
      }
    });
  });
};