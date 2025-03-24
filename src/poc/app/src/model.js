const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const { logger } = require('./utils/logger');


// データベースファイルのパス
const dbPath = path.join(__dirname, '../database/db.json');

// データベース接続を初期化
let db;

const initDb = () => {
  try {
    const adapter = new FileSync(dbPath);
    db = low(adapter);
    
    // デフォルトのデータ構造を設定
    db.defaults({
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
    }).write();
    
    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
};

const getDb = () => {
  if (!db) {
    return initDb();
  }
  return db;
};

module.exports = {
  initDb,
  getDb
}; 