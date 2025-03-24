const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

// データベースファイルのパス
const dbPath = path.join(__dirname, '../../database/db.json');


// デフォルトのデータ
const defaultData = {
  users: [
    {
      id: '1',
      email: 'user@example.com',
      password: 'password',
      name: 'DefaultUser'
    },
    {
      id: '2',
      email: 'admin@example.com',
      password: 'password',
      name: 'SystemAdmin'
    }
  ],
  roles: [
    { name: 'user', description: 'Regular user role' },
    { name: 'admin', description: 'Administrator role' },
    { name: 'read-only-admin', description: 'Read-only administrator role' }
  ]
};

// データベースを初期化
const initDb = () => {
  try {
    // データベースディレクトリがなければ作成
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Created database directory: ${dbDir}`);
    }
    
    // データベースファイルを作成
    fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
    logger.info(`Database initialized successfully at ${dbPath}`);
  } catch (error) {
    logger.error('Error initializing database:', error);
    process.exit(1);
  }
};

// スクリプト実行
initDb(); 