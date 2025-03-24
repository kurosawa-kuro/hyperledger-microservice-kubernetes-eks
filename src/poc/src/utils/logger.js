/**
 * logger.js - ログユーティリティ
 * 
 * 構造化されたJSONフォーマットでのログ出力機能を提供します。
 * 各種ログタイプ（アクセス、システム、アクション、エラー）に対応しています。
 */

/**
 * ロガーオブジェクト
 * 各種ログタイプに応じたメソッドを提供
 */
const logger = {
  /**
   * 基本ログ出力関数
   * @param {Object} logData - ログデータ（typeフィールドを含む）
   */
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
  
  /**
   * アクセスログ出力
   * @param {Object} req - リクエストオブジェクト
   */
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
  
  /**
   * システムイベントログ出力
   * @param {string} event - イベント名
   * @param {Object} details - 詳細情報（オプション）
   * @param {string} requestId - リクエストID（オプション）
   */
  system(event, details = {}, requestId = null) {
    this.log({
      type: 'system',
      requestId,
      event,
      details
    });
  },
  
  /**
   * アクションイベントログ出力
   * @param {string} event - イベント名
   * @param {Object} details - 詳細情報（オプション）
   * @param {string} requestId - リクエストID（オプション）
   */
  action(event, details = {}, requestId = null) {
    this.log({
      type: 'action',
      requestId,
      event,
      details
    });
  },
  
  /**
   * エラーログ出力
   * @param {Error} err - エラーオブジェクト
   * @param {Object} req - リクエストオブジェクト（オプション）
   */
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

module.exports = logger; 