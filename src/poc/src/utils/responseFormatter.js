/**
 * responseFormatter.js - APIレスポンス形式を標準化するユーティリティ
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

module.exports = responseFormatter; 