// load-parquet-from-s3.js
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = '/tmp/file.parquet';

exports.downloadParquetFromS3 = async () => {
  const s3 = new S3Client({ region: 'ap-northeast-1' });
  const res = await s3.send(new GetObjectCommand({ Bucket: 'trace-logs-0323', Key: 'logs/sample.parquet' }));
  const stream = fs.createWriteStream(path);
  await new Promise((resolve, reject) => {
    res.Body.pipe(stream);
    res.Body.on('end', resolve);
    res.Body.on('error', reject);
  });
  return path;
};