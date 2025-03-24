/**
 * model.js - データモデルとDB操作の共通インターフェース
 * 
 * このモジュールはデータアクセスの抽象レイヤーを提供し、
 * 将来的にPrismaなどのORMに移行する際の変更を最小限に抑えます。
 */

const logger = require('./utils/logger');
const dataAdapter = require('./data/adapter');

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

// データベース初期データ
const DEFAULT_DB_DATA = {
  users: [
    {
      id: '1',
      email: 'user@example.com',
      password: 'password',
      name: 'DefaultUser',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      email: 'admin@example.com',
      password: 'password',
      name: 'SystemAdmin',
      createdAt: new Date().toISOString()
    }
  ]
};

/**
 * db.jsonが存在しない場合、初期データで作成
 */
function initializeDB() {
  dataAdapter.initializeDB(DEFAULT_DB_DATA);
}

/**
 * DBデータ読み込み関数
 * @returns {Object} データベースの内容
 */
function readDB() {
  return dataAdapter.getAll();
}

/**
 * DBデータ書き込み関数
 * @param {Object} data - 書き込むデータ
 * @returns {boolean} 書き込み成功の可否
 */
function writeDB(data) {
  return dataAdapter.setAll(data);
}

/**
 * エンティティ別のデータアクセス関数 - ユーザー
 */
const userModel = {
  /**
   * 全ユーザーを取得
   * @returns {Array} ユーザーリスト
   */
  findAll() {
    return dataAdapter.getCollection('users');
  },

  /**
   * 特定のユーザーを取得
   * @param {string} id - ユーザーID
   * @returns {Object|null} ユーザー情報
   */
  findById(id) {
    return dataAdapter.getItem('users', user => user.id === id);
  },

  /**
   * メールアドレスでユーザーを検索
   * @param {string} email - メールアドレス
   * @returns {Object|null} ユーザー情報
   */
  findByEmail(email) {
    return dataAdapter.getItem('users', user => user.email === email);
  },

  /**
   * 条件に一致するユーザーが存在するか確認
   * @param {Function} predicate - 検索条件
   * @returns {boolean} 存在する場合はtrue
   */
  exists(predicate) {
    const users = dataAdapter.getCollection('users');
    return users.some(predicate);
  },

  /**
   * 新規ユーザーを作成
   * @param {Object} userData - ユーザーデータ
   * @returns {Object} 作成されたユーザー
   */
  create(userData) {
    const newUser = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    
    if (dataAdapter.addItem('users', newUser)) {
      return newUser;
    }
    return null;
  },

  /**
   * ユーザーを更新
   * @param {string} id - ユーザーID
   * @param {Object} updates - 更新データ
   * @returns {Object|null} 更新されたユーザー
   */
  update(id, updates) {
    const user = this.findById(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    if (dataAdapter.updateItem('users', u => u.id === id, updatedUser)) {
      return updatedUser;
    }
    return null;
  },

  /**
   * ユーザーを削除
   * @param {string} id - ユーザーID
   * @returns {boolean} 成功した場合はtrue
   */
  delete(id) {
    return dataAdapter.removeItem('users', user => user.id === id);
  },

  /**
   * 全ユーザーを削除
   * @returns {boolean} 成功した場合はtrue
   */
  deleteAll() {
    return dataAdapter.clearCollection('users');
  },

  /**
   * ユーザー数を取得
   * @returns {number} ユーザー数
   */
  count() {
    const users = dataAdapter.getCollection('users');
    return users.length;
  }
};

module.exports = {
  SAMPLE_USER_IDS,
  initializeDB,
  readDB,
  writeDB,
  userModel
}; 