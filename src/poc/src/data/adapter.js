/**
 * adapter.js - データストアの抽象化レイヤー
 * 
 * このモジュールはデータアクセスを抽象化し、将来的にPrismaなど他のORMへの
 * 置き換えを容易にするためのインターフェースを提供します。
 */

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const logger = require('../utils/logger');

// 環境変数からデータベースのパスを取得するか、デフォルト値を使用
const DB_PATH = process.env.JSON_DB_PATH || path.join(__dirname, '../../database/db.json');
const adapter = new FileSync(DB_PATH);
const db = low(adapter);

/**
 * データベースを初期データで初期化
 * @param {Object} initialData - 初期データ
 */
function initializeDB(initialData = {}) {
  // DBの初期状態をセット
  db.defaults(initialData).write();
  logger.system('db_initialized', { path: DB_PATH });
}

/**
 * 全データベース状態を取得
 * @returns {Object} データベースの内容
 */
function getAll() {
  try {
    return db.getState();
  } catch (error) {
    logger.error(error);
    return {};
  }
}

/**
 * コレクションの全アイテムを取得
 * @param {string} collection - コレクション名
 * @returns {Array} コレクション内のアイテム配列（作成日時の新しい順にソート済み）
 */
function getCollection(collection) {
  try {
    const items = db.get(collection).value() || [];
    // createdAtフィールドがある場合、新しい順にソート
    return items.sort((a, b) => {
      // createdAtフィールドがある場合はそれを使用、ない場合は現在の順序を維持
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });
  } catch (error) {
    logger.error(error);
    return [];
  }
}

/**
 * コレクション内の特定アイテムを取得
 * @param {string} collection - コレクション名
 * @param {Function} predicate - 検索条件を指定する関数
 * @returns {Object|null} 該当するアイテム、存在しない場合はnull
 */
function getItem(collection, predicate) {
  try {
    return db.get(collection).find(predicate).value() || null;
  } catch (error) {
    logger.error(error);
    return null;
  }
}

/**
 * コレクションにアイテムを追加
 * @param {string} collection - コレクション名
 * @param {Object} item - 追加するアイテム
 * @returns {boolean} 操作成功の可否
 */
function addItem(collection, item) {
  try {
    db.get(collection).push(item).write();
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

/**
 * コレクション内のアイテムを更新
 * @param {string} collection - コレクション名
 * @param {Function} predicate - 更新対象を特定する関数
 * @param {Object} updates - 更新内容
 * @returns {boolean} 操作成功の可否
 */
function updateItem(collection, predicate, updates) {
  try {
    db.get(collection).find(predicate).assign(updates).write();
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

/**
 * コレクション内のアイテムを削除
 * @param {string} collection - コレクション名
 * @param {Function} predicate - 削除対象を特定する関数
 * @returns {boolean} 操作成功の可否
 */
function removeItem(collection, predicate) {
  try {
    db.get(collection).remove(predicate).write();
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

/**
 * コレクションをクリア
 * @param {string} collection - コレクション名
 * @returns {boolean} 操作成功の可否
 */
function clearCollection(collection) {
  try {
    const state = db.getState();
    state[collection] = [];
    db.setState(state).write();
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

/**
 * データベース全体を更新
 * @param {Object} data - 新しいデータベース状態
 * @returns {boolean} 操作成功の可否
 */
function setAll(data) {
  try {
    db.setState(data).write();
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

module.exports = {
  initializeDB,
  getAll,
  getCollection,
  getItem,
  addItem,
  updateItem,
  removeItem,
  clearCollection,
  setAll
}; 