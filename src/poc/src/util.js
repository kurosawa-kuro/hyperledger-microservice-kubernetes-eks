/**
 * util.js - 共通ユーティリティ関数
 */

// 循環参照を避けるためloggerの直接インポートを削除
// const logger = require('./logger');

/**
 * Common response formatter
 */
const responseFormatter = {
  success(data = null, message = 'Success', requestId = null) {
    return {
      success: true,
      message,
      data,
      requestId,
      timestamp: new Date().toISOString()
    };
  },
  
  error(message = 'Internal Server Error', statusCode = 500, details = null, requestId = null) {
    return {
      success: false,
      message,
      statusCode,
      details,
      requestId,
      timestamp: new Date().toISOString()
    };
  },
  
  health(status = 'healthy', details = {}, requestId = null) {
    return {
      status,
      requestId,
      timestamp: new Date().toISOString(),
      details
    };
  }
};

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