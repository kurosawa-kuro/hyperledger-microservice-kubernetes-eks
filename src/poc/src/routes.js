/**
 * routes.js - ルーティング定義
 */

const express = require('express');
const { systemController, userController, demoController } = require('./controllers');

// ルーターの作成
const router = express.Router();

/**
 * システム関連ルート
 */
/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: システム健全性の確認
 *     description: システムの状態を確認するヘルスチェックエンドポイント
 *     tags: [System]
 *     responses:
 *       200:
 *         description: システムは正常に動作しています
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: healthy
 *                     uptime:
 *                       type: number
 *                       example: 3600
 *                 message:
 *                   type: string
 *                   example: System is healthy
 *                 requestId:
 *                   type: string
 *                   example: req_1623456789_abc123
 */
// ヘルスチェックエンドポイント
router.get('/api/system/health', systemController.checkHealth);

/**
 * @swagger
 * /api/system/load-test:
 *   get:
 *     summary: 負荷テスト実行
 *     description: システムの負荷テストを実行します
 *     tags: [System]
 *     parameters:
 *       - in: query
 *         name: cpu
 *         schema:
 *           type: integer
 *         description: CPU負荷の強度（0-100）
 *       - in: query
 *         name: memory
 *         schema:
 *           type: integer
 *         description: メモリ負荷のMB数
 *       - in: query
 *         name: disk
 *         schema:
 *           type: integer
 *         description: ディスク操作回数
 *       - in: query
 *         name: delay
 *         schema:
 *           type: integer
 *         description: 応答遅延（ミリ秒）
 *     responses:
 *       200:
 *         description: 負荷テスト実行結果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *                 requestId:
 *                   type: string
 */
// 負荷テストエンドポイント
router.get('/api/system/load-test', systemController.executeLoadTest);

// 下位互換性のためのリダイレクト
router.get('/health', (req, res) => {
  res.redirect('/api/system/health');
});

/**
 * ユーザー関連ルート
 */
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: ユーザー一覧取得
 *     description: 全ユーザーの一覧を取得します
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: ユーザー一覧
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                 message:
 *                   type: string
 *                 requestId:
 *                   type: string
 */
// ユーザー一覧取得API
router.get('/api/users', userController.listUsers);

/**
 * @swagger
 * /api/users/count:
 *   get:
 *     summary: ユーザー数取得
 *     description: 登録ユーザーの総数を取得します
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: ユーザー数
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                 message:
 *                   type: string
 *                 requestId:
 *                   type: string
 */
// ユーザー数取得API
router.get('/api/users/count', userController.countUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: ユーザー詳細取得
 *     description: 指定されたIDのユーザー詳細を取得します
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ユーザーID
 *     responses:
 *       200:
 *         description: ユーザー詳細
 *       404:
 *         description: ユーザーが見つかりません
 */
// ユーザー詳細取得API
router.get('/api/users/:id', userController.getUser);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: ユーザー作成
 *     description: 新しいユーザーを作成します
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: ユーザーが作成されました
 *       400:
 *         description: 無効なリクエスト
 */
// ユーザー作成API
router.post('/api/users', userController.createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: ユーザー更新
 *     description: 指定されたIDのユーザー情報を完全に更新します
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ユーザーID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: ユーザーが更新されました
 *       404:
 *         description: ユーザーが見つかりません
 *       400:
 *         description: 無効なリクエスト
 */
// ユーザー更新API
router.put('/api/users/:id', userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: ユーザー部分更新
 *     description: 指定されたIDのユーザー情報を部分的に更新します
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ユーザーID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: ユーザーが更新されました
 *       404:
 *         description: ユーザーが見つかりません
 */
// ユーザー部分更新API
router.patch('/api/users/:id', userController.modifyUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: ユーザー削除
 *     description: 指定されたIDのユーザーを削除します
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ユーザーID
 *     responses:
 *       200:
 *         description: ユーザーが削除されました
 *       404:
 *         description: ユーザーが見つかりません
 */
// ユーザー削除API
router.delete('/api/users/:id', userController.removeUser);

/**
 * @swagger
 * /api/users:
 *   delete:
 *     summary: 全ユーザー削除
 *     description: すべてのユーザーを削除します
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: すべてのユーザーが削除されました
 */
// 全ユーザー削除API
router.delete('/api/users', userController.clearUsers);

/**
 * デモ関連ルート
 */
/**
 * @swagger
 * /api/demo/random-user:
 *   get:
 *     summary: ランダムユーザー取得
 *     description: ランダムにユーザーを1件取得します
 *     tags: [Demo]
 *     responses:
 *       200:
 *         description: ランダムユーザー
 */
// サンプルユーザーIDランダム取得API
router.get('/api/demo/random-user', demoController.getRandomUser);

/**
 * @swagger
 * /api/demo/greeting:
 *   get:
 *     summary: 挨拶メッセージ取得
 *     description: 挨拶メッセージを取得します
 *     tags: [Demo]
 *     responses:
 *       200:
 *         description: 挨拶メッセージ
 */
// 挨拶API
router.get('/api/demo/greeting', demoController.getGreeting);

// 下位互換性のためのリダイレクト
router.get('/hello', (req, res) => {
  res.redirect('/api/demo/greeting');
});

/**
 * @swagger
 * /api/demo/error:
 *   get:
 *     summary: エラーシミュレーション
 *     description: エラーを発生させるテスト用エンドポイント
 *     tags: [Demo]
 *     responses:
 *       500:
 *         description: サーバーエラー
 */
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