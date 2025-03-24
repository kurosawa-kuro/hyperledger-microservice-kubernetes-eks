/**
 * app.js - アプリケーションのメインエントリーポイント
 */

const express = require('express');
const logger = require('./utils/logger');  // パスを更新
const routes = require('./routes');  // ファイル名を更新
const { demoController } = require('./controllers');  // ファイル名を更新
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

// ポート設定（環境変数から取得するか、デフォルト値を使用）
const PORT = process.env.PORT || 3333;

// Swaggerの設定
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Express API',
      version: '1.0.0',
      description: 'Express API with Swagger documentation',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes.js', './src/controllers.js'], // Swaggerドキュメントを生成するファイル
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);


// Expressアプリケーションの作成
const app = express();

// CORS設定
app.use(cors());

// Swagger UIの設定
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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

// DB初期化処理を削除（別スクリプトで実行する）

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

// サーバー起動
app.listen(PORT, () => {
  logger.system('server_started', { port: PORT });
});
