const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(express.json());

// ルート設定
// トップページにアクセスでhealth
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'API is running correctly'
  });
});

// helloにアクセスでhello-world
app.get('/hello', (req, res) => {
  res.status(200).json({
    message: 'Hello World'
  });
});

// errorにアクセスでerror
app.get('/error', (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This is an error response'
  });
});

// 存在しないエンドポイント用のフォールバック
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
