const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const outputPath = path.join(__dirname, 'sample.json.gz');
const gzipStream = zlib.createGzip();
const fileStream = fs.createWriteStream(outputPath);

// GZIPストリームに書き出す
gzipStream.pipe(fileStream);

// ログ行を1行ずつJSON形式で書き込み
for (let i = 0; i < 5; i++) {
  const log = {
    timestamp: new Date().toISOString(),
    message: `Error event #${i}`,
    level: 'ERROR'
  };
  gzipStream.write(JSON.stringify(log) + '\n');
}

const infoLog = {
  timestamp: new Date().toISOString(),
  message: 'Something normal',
  level: 'INFO'
};
gzipStream.write(JSON.stringify(infoLog) + '\n');

// ストリームを閉じる
gzipStream.end(() => {
  console.log(`GZIP JSON log written to: ${outputPath}`);
});
