/**
 * model.js - データモデルとDB操作 (Lowdb版)
 */

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const logger = require('./utils/logger');

// DB.jsonのパス設定
const DB_PATH = path.join(__dirname, '../database/db.json');
const adapter = new FileSync(DB_PATH);
const db = low(adapter);

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
  // DBの初期状態をセット
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
    ]
  }).write();
  
  logger.system('db_initialized', { path: DB_PATH });
}

/**
 * DBデータ読み込み関数
 * @returns {Object} データベースの内容
 */
function readDB() {
  try {
    return db.getState();
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
    // データ全体を置き換える
    db.setState(data).write();
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

// 自動初期化を削除（専用スクリプトから明示的に呼び出すようにする）

module.exports = {
  SAMPLE_USER_IDS,
  initializeDB,
  readDB,
  writeDB
}; 