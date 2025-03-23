/**
 * route.js - ルーティング定義
 */

const express = require('express');
const { systemController, userController, demoController } = require('./controller');

// ルーターの作成
const router = express.Router();

/**
 * システム関連ルート
 */
// ヘルスチェックエンドポイント
router.get('/api/system/health', systemController.checkHealth);

// 負荷テストエンドポイント
router.get('/api/system/load-test', systemController.executeLoadTest);

// 下位互換性のためのリダイレクト
router.get('/health', (req, res) => {
  res.redirect('/api/system/health');
});

/**
 * ユーザー関連ルート
 */
// ユーザー一覧取得API
router.get('/api/users', userController.listUsers);

// ユーザー数取得API
router.get('/api/users/count', userController.countUsers);

// ユーザー詳細取得API
router.get('/api/users/:id', userController.getUser);

// ユーザー作成API
router.post('/api/users', userController.createUser);

// ユーザー更新API
router.put('/api/users/:id', userController.updateUser);

// ユーザー部分更新API
router.patch('/api/users/:id', userController.modifyUser);

// ユーザー削除API
router.delete('/api/users/:id', userController.removeUser);

// 全ユーザー削除API
router.delete('/api/users', userController.clearUsers);

/**
 * デモ関連ルート
 */
// サンプルユーザーIDランダム取得API
router.get('/api/demo/random-user', demoController.getRandomUser);

// 挨拶API
router.get('/api/demo/greeting', demoController.getGreeting);

// 下位互換性のためのリダイレクト
router.get('/hello', (req, res) => {
  res.redirect('/api/demo/greeting');
});

// エラーシミュレーションAPI
router.get('/api/demo/error', demoController.simulateError);

// 下位互換性のためのリダイレクト
router.get('/cause-error', (req, res) => {
  res.redirect('/api/demo/error');
});

// ルートパスも同様にヘルスチェックとして動作
router.get('/', (req, res) => {
  res.redirect('/api/system/health');
});

module.exports = router; 