const fs = require('fs');
const parquet = require('parquetjs-lite');

(async () => {
  const schema = new parquet.ParquetSchema({
    timestamp: { type: 'TIMESTAMP_MILLIS' },
    message: { type: 'UTF8' },
    level: { type: 'UTF8' }
  });

  const writer = await parquet.ParquetWriter.openFile(schema, 'sample.parquet');

  for (let i = 0; i < 5; i++) {
    await writer.appendRow({
      timestamp: new Date(),
      message: `Error event #${i}`,
      level: 'ERROR'
    });
  }

  await writer.appendRow({
    timestamp: new Date(),
    message: 'Something normal',
    level: 'INFO'
  });

  await writer.close();
})();
