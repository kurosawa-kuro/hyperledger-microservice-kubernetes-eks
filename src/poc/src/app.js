/**
 * app.js - アプリケーションのメインエントリーポイント
 */

const express = require('express');
const { logger } = require('./util');
const { initializeDB } = require('./model');
const routes = require('./route');
const { demoController } = require('./controller');

// Expressアプリケーションの作成
const app = express();

// ボディパーサーの設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// リクエストID生成ミドルウェア
app.use((req, res, next) => {
  // Unix時間 + ランダム文字列でリクエストIDを生成
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  req.requestId = `req_${timestamp}_${random}`;
  
  // レスポンスヘッダーにリクエストIDを設定
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// DB初期化実行
initializeDB();

// アクセスログ用ミドルウェア
app.use((req, res, next) => {
  logger.access(req);
  next();
});

// ルーティング設定
app.use(routes);

// 存在しないルートへのアクセス処理
app.use(demoController.notFound);

// グローバルエラーハンドリングミドルウェア（必ず最後に定義）
app.use((err, req, res, next) => {
  logger.error(err, req);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    statusCode: 500,
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
});

// ポート設定（環境変数から取得するか、デフォルト3001を使用）
const PORT = process.env.PORT || 3001;

// サーバー起動
app.listen(PORT, () => {
  logger.system('server_started', { port: PORT });
});
