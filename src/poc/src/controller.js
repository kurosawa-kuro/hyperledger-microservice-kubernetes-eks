/**
 * controller.js - リクエスト処理とレスポンス生成
 */

const { systemService, userService, demoService } = require('./service');
const { responseFormatter } = require('./util');
const logger = require('./logger');

/**
 * システム関連コントローラー
 */
const systemController = {
  /**
   * ヘルスチェック
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  checkHealth(req, res) {
    try {
      logger.system('health_check_requested', { endpoint: '/api/system/health' }, req.requestId);
      const healthData = systemService.getHealth();
      res.status(200).json(responseFormatter.health(healthData.status, healthData, req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Health check failed', 500, null, req.requestId));
    }
  },

  /**
   * 負荷テスト
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  async executeLoadTest(req, res) {
    try {
      // パラメータ取得（デフォルト値あり）
      const cpuLoad = parseInt(req.query.cpu) || 0;      // CPU負荷の強度 (0-100)
      const memoryLoad = parseInt(req.query.memory) || 0; // メモリ負荷のMB数
      const diskOps = parseInt(req.query.disk) || 0;     // ディスク操作回数
      const delay = parseInt(req.query.delay) || 0;      // 応答遅延（ミリ秒）
      
      logger.system('load_test_requested', { 
        endpoint: '/api/system/load-test',
        params: { cpuLoad, memoryLoad, diskOps, delay }
      }, req.requestId);

      // 負荷テスト実行
      const result = await systemService.executeLoadTest(
        { cpuLoad, memoryLoad, diskOps, delay },
        req.requestId
      );
      
      res.status(200).json(responseFormatter.success(
        result, 
        'Load test executed successfully', 
        req.requestId
      ));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Load test failed', 500, null, req.requestId));
    }
  }
};

/**
 * ユーザー関連コントローラー
 */
const userController = {
  /**
   * ユーザー一覧取得
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  listUsers(req, res) {
    try {
      const users = userService.listUsers();
      logger.action('list_users', { count: users.length }, req.requestId);
      res.status(200).json(responseFormatter.success(users, 'Users fetched successfully', req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Failed to fetch users', 500, null, req.requestId));
    }
  },

  /**
   * ユーザー数取得
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  countUsers(req, res) {
    try {
      const count = userService.countUsers();
      logger.action('count_users', { count }, req.requestId);
      res.status(200).json(responseFormatter.success({ count }, 'User count fetched successfully', req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Failed to count users', 500, null, req.requestId));
    }
  },

  /**
   * ユーザー詳細取得
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  getUser(req, res) {
    try {
      const userId = req.params.id;
      const user = userService.getUser(userId);
      
      if (!user) {
        logger.action('get_user_not_found', { userId }, req.requestId);
        return res.status(404).json(responseFormatter.error('User not found', 404, null, req.requestId));
      }
      
      logger.action('get_user', { userId, success: true }, req.requestId);
      res.status(200).json(responseFormatter.success(user, 'User fetched successfully', req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Failed to fetch user', 500, null, req.requestId));
    }
  },

  /**
   * ユーザー作成
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  createUser(req, res) {
    try {
      const result = userService.createUser(req.body);
      
      if (!result.success) {
        logger.action('create_user_failed', { reason: result.message }, req.requestId);
        return res.status(result.statusCode).json(responseFormatter.error(result.message, result.statusCode, null, req.requestId));
      }
      
      logger.action('create_user_success', { userId: result.user.id }, req.requestId);
      res.status(201).json(responseFormatter.success(result.user, 'User created successfully', req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Failed to create user', 500, null, req.requestId));
    }
  },

  /**
   * ユーザー更新（PUT）
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  updateUser(req, res) {
    try {
      const userId = req.params.id;
      const result = userService.updateUser(userId, req.body);
      
      if (!result.success) {
        logger.action('update_user_failed', { userId, reason: result.message }, req.requestId);
        return res.status(result.statusCode).json(responseFormatter.error(result.message, result.statusCode, null, req.requestId));
      }
      
      logger.action('update_user_success', { userId }, req.requestId);
      res.status(200).json(responseFormatter.success(result.user, 'User updated successfully', req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Failed to update user', 500, null, req.requestId));
    }
  },

  /**
   * ユーザー部分更新（PATCH）
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  modifyUser(req, res) {
    try {
      const userId = req.params.id;
      const result = userService.modifyUser(userId, req.body);
      
      if (!result.success) {
        logger.action('modify_user_failed', { userId, reason: result.message }, req.requestId);
        return res.status(result.statusCode).json(responseFormatter.error(result.message, result.statusCode, null, req.requestId));
      }
      
      logger.action('modify_user_success', { userId }, req.requestId);
      res.status(200).json(responseFormatter.success(result.user, 'User modified successfully', req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Failed to modify user', 500, null, req.requestId));
    }
  },

  /**
   * ユーザー削除
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  removeUser(req, res) {
    try {
      const userId = req.params.id;
      const result = userService.removeUser(userId);
      
      if (!result.success) {
        logger.action('remove_user_failed', { userId, reason: result.message }, req.requestId);
        return res.status(result.statusCode).json(responseFormatter.error(result.message, result.statusCode, null, req.requestId));
      }
      
      logger.action('remove_user_success', { userId }, req.requestId);
      res.status(200).json(responseFormatter.success(null, 'User removed successfully', req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Failed to remove user', 500, null, req.requestId));
    }
  },

  /**
   * 全ユーザー削除
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  clearUsers(req, res) {
    try {
      const result = userService.clearUsers();
      
      if (!result.success) {
        logger.action('clear_users_failed', { reason: result.message }, req.requestId);
        return res.status(result.statusCode).json(responseFormatter.error(result.message, result.statusCode, null, req.requestId));
      }
      
      logger.action('clear_users', { count: result.count }, req.requestId);
      res.status(200).json(responseFormatter.success(null, `All users cleared (${result.count})`, req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Failed to clear users', 500, null, req.requestId));
    }
  }
};

/**
 * デモ関連コントローラー
 */
const demoController = {
  /**
   * ランダムユーザー取得
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  getRandomUser(req, res) {
    try {
      const randomUser = demoService.getRandomUser();
      logger.action('get_random_user', { userId: randomUser.id }, req.requestId);
      res.status(200).json(responseFormatter.success(randomUser, 'Random user fetched successfully', req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Failed to fetch random user', 500, null, req.requestId));
    }
  },

  /**
   * 挨拶メッセージ取得
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  getGreeting(req, res) {
    try {
      const greeting = demoService.getGreeting();
      logger.action('get_greeting', { page: 'demo' }, req.requestId);
      res.status(200).json(responseFormatter.success(greeting, 'Greeting fetched successfully', req.requestId));
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error('Greeting failed', 500, null, req.requestId));
    }
  },

  /**
   * エラーシミュレーション
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  simulateError(req, res) {
    try {
      logger.action('simulate_error', { endpoint: '/api/demo/error' }, req.requestId);
      demoService.simulateError();
    } catch (error) {
      logger.error(error, req);
      res.status(500).json(responseFormatter.error(error.message, 500, null, req.requestId));
    }
  },

  /**
   * 存在しないルートへのアクセス処理
   * @param {Object} req - リクエストオブジェクト
   * @param {Object} res - レスポンスオブジェクト
   */
  notFound(req, res) {
    logger.action('route_not_found', { path: req.originalUrl }, req.requestId);
    res.status(404).json(responseFormatter.error('Route not found', 404, null, req.requestId));
  }
};

module.exports = {
  systemController,
  userController,
  demoController
}; 