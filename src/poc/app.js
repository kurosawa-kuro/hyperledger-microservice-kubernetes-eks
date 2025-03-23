const express = require('express');
const app = express();

// アクセスログ用ミドルウェア
app.use((req, res, next) => {
  const accessLog = {
    type: 'access',
    method: req.method,
    path: req.originalUrl || req.url,
    timestamp: new Date().toISOString()
  };
  console.log(JSON.stringify(accessLog));
  next();
});

// レスポンスフォーマット関数
const formatResponse = {
  success(data, message = 'Success') {
    return {
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString()
    };
  },
  health(message = 'Server is healthy') {
    return {
      status: 'healthy',
      message,
      timestamp: new Date().toISOString()
    };
  }
};

// ヘルスチェックエンドポイント
app.get('/', (req, res) => {
  try {
    // ヘルスチェック用のJSONレスポンスを返す
    res.status(200).json(formatResponse.health());
    
    // システム操作ログの記録
    const actionLog = {
      type: 'system',
      event: 'health_check_accessed',
      details: { endpoint: '/' },
      timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(actionLog));
  } catch (error) {
    const errorLog = {
      type: 'error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    console.error(JSON.stringify(errorLog));
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// サンプルルート定義
app.get('/hello', (req, res) => {
  // 何らかの処理（ここでは単純にレスポンスを返す）
  res.send('Hello, world!');
  // ユーザーアクションログの記録（例: ユーザーがボタンをクリックしてこのAPIが呼ばれたと想定）
  const actionLog = {
    type: 'action',
    event: 'user_clicked_button',        // イベント名（例）
    details: { page: 'hello' },          // 詳細情報（例としてページ名を記録）
    timestamp: new Date().toISOString()
  };
  console.log(JSON.stringify(actionLog));
});

// エラー発生を意図したルート（動作確認用）
app.get('/cause-error', (req, res) => {
  // わざとエラーを投げる
  throw new Error('Something went wrong!');
});

// エラーハンドリングミドルウェア（必ず最後に定義）
app.use((err, req, res, next) => {
  const errorLog = {
    type: 'error',
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  };
  console.error(JSON.stringify(errorLog));   // エラーログはstderrへ
  res.status(500).send('Internal Server Error');
});

// ポート3000でサーバ起動
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
