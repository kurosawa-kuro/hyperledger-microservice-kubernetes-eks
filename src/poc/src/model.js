/**
 * model.js - データモデルとDB操作
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('./util');

// DB.jsonのパス設定
const DB_PATH = path.join(__dirname, '../database/db.json');

// サンプルユーザーID（疑似ユーザー）
const SAMPLE_USER_IDS = [
  { id: '101', name: '山田太郎', role: 'user' },
  { id: '102', name: '佐藤花子', role: 'admin' },
  { id: '103', name: '田中一郎', role: 'read-only-admin' },
  { id: '104', name: '加藤次郎', role: 'user' },
  { id: '105', name: '山本三郎', role: 'user' },
  { id: '106', name: '小林四郎', role: 'user' },
  { id: '107', name: '中村五郎', role: 'user' },
  { id: '108', name: '松本六郎', role: 'user' },
  { id: '109', name: '渡辺七郎', role: 'user' },
  { id: '110', name: '山田太郎', role: 'user' },
];

/**
 * db.jsonが存在しない場合、初期データで作成
 */
function initializeDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
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
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    logger.system('db_initialized', { path: DB_PATH });
  }
}

/**
 * DBデータ読み込み関数
 * @returns {Object} データベースの内容
 */
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error(error);
    return { users: [] };
  }
}

/**
 * DBデータ書き込み関数
 * @param {Object} data - 書き込むデータ
 * @returns {boolean} 書き込み成功の可否
 */
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

module.exports = {
  SAMPLE_USER_IDS,
  initializeDB,
  readDB,
  writeDB
}; 