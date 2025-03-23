/**
 * util.js - 共通ユーティリティ関数
 */

/**
 * Common logging utility function
 * Outputs structured logs in JSON format
 * @param {Object} logData - Log data object with type field
 */
const logger = {
  log(logData) {
    const formattedLog = {
      ...logData,
      timestamp: new Date().toISOString()
    };
    
    const jsonLog = JSON.stringify(formattedLog);
    
    if (logData.type === 'error') {
      console.error(jsonLog);
    } else {
      console.log(jsonLog);
    }
  },
  
  access(req) {
    this.log({
      type: 'access',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  },
  
  system(event, details = {}, requestId = null) {
    this.log({
      type: 'system',
      requestId,
      event,
      details
    });
  },
  
  action(event, details = {}, requestId = null) {
    this.log({
      type: 'action',
      requestId,
      event,
      details
    });
  },
  
  error(err, req = null) {
    const errorData = {
      type: 'error',
      message: err.message,
      stack: err.stack
    };
    
    if (req) {
      errorData.requestId = req.requestId;
      errorData.method = req.method;
      errorData.path = req.originalUrl || req.url;
    }
    
    this.log(errorData);
  }
};

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
  logger,
  responseFormatter,
  getRandomSampleUserId
}; 