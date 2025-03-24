const { logger } = require('./logger');

// レスポンスフォーマッター
const formatResponse = (res, statusCode, data = null) => {
  if (data === null) {
    return res.status(statusCode).end();
  }
  
  return res.status(statusCode).json(data);
};

// エラーハンドラー
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  // デフォルトのエラーレスポンス
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  return res.status(statusCode).json({
    error: {
      message,
      status: statusCode
    }
  });
};

module.exports = {
  formatResponse,
  errorHandler
}; 