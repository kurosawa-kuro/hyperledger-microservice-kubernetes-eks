/**
 * util.js - 共通ユーティリティ関数
 */

// 循環参照を避けるためloggerの直接インポートを削除
// const logger = require('./logger');

// responseFormatterをインポート
const responseFormatter = require('./responseFormatter');

/**
 * Common response formatter
 */

// ランダムなサンプルユーザーIDを取得する関数
function getRandomSampleUserId(userIds) {
  const randomIndex = Math.floor(Math.random() * userIds.length);
  return userIds[randomIndex];
}

module.exports = {
  // loggerの再エクスポートを削除
  responseFormatter,
  getRandomSampleUserId
}; 