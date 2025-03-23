const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// サンプルユーザーID（疑似ユーザー）
const SAMPLE_USER_IDS = [
  { id: '101', name: '山田太郎', role: 'user' },
  { id: '102', name: '佐藤花子', role: 'admin' },
  { id: '103', name: '田中一郎', role: 'read-only-admin' },
  { id: '104', name: '加藤次郎', role: 'user' },
  { id: '105', name: '山本三郎', role: 'user' },
  { id: '106', name: '小林四郎', role: 'user' },
  { id: '107', name: '中村五郎', role: 'user' },
  { id: '108', name: '松本六郎', role: 'user' },
  { id: '109', name: '渡辺七郎', role: 'user' },
  { id: '110', name: '山田太郎', role: 'user' },
];

// ランダムなサンプルユーザーIDを取得する関数
function getRandomSampleUserId() {
  const randomIndex = Math.floor(Math.random() * SAMPLE_USER_IDS.length);
  return SAMPLE_USER_IDS[randomIndex];
}

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

// db.jsonのパス設定
const DB_PATH = path.join(__dirname, 'db.json');

// db.jsonが存在しない場合、初期データで作成
function initializeDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          id: '1',
          email: 'user@example.com',
          password: 'password',
          name: 'DefaultUser'
        },
        {
          id: '2',
          email: 'admin@example.com',
          password: 'password',
          name: 'SystemAdmin'
        }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    logger.system('db_initialized', { path: DB_PATH });
  }
}

// DBデータ読み込み関数
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error(error);
    return { users: [] };
  }
}

// DBデータ書き込み関数
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    logger.error(error);
    return false;
  }
}

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

// DB初期化実行
initializeDB();

// アクセスログ用ミドルウェア
app.use((req, res, next) => {
  logger.access(req);
  next();
});

// システム関連エンドポイント
// ヘルスチェックエンドポイント
app.get('/api/system/health', (req, res) => {
  try {
    logger.system('health_check_requested', { endpoint: '/api/system/health' }, req.requestId);
    res.status(200).json(responseFormatter.health('healthy', { node_version: process.version }, req.requestId));
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Health check failed', 500, null, req.requestId));
  }
});

// 負荷テストエンドポイント
app.get('/api/system/load-test', (req, res) => {
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
    
    // CPU負荷シミュレーション
    if (cpuLoad > 0) {
      const startTime = Date.now();
      // CPU負荷が高いほど計算を長く実行
      const duration = Math.min(cpuLoad * 100, 10000); // 最大10秒間
      
      while (Date.now() - startTime < duration) {
        // CPUを使用する演算を実行
        Math.random() * Math.random() * Math.random();
      }
      
      logger.system('cpu_load_completed', { duration: Date.now() - startTime }, req.requestId);
    }
    
    // メモリ負荷シミュレーション
    let memoryArray = null;
    if (memoryLoad > 0) {
      const memSize = Math.min(memoryLoad, 500); // 最大500MB
      try {
        // 指定サイズのメモリを確保（1MBあたり約1024*1024バイト）
        memoryArray = Buffer.alloc(memSize * 1024 * 1024);
        // データを書き込む（確実にメモリが確保されるようにする）
        for (let i = 0; i < memoryArray.length; i += 1024 * 1024) {
          memoryArray[i] = 1;
        }
        logger.system('memory_allocated', { sizeMB: memSize }, req.requestId);
      } catch (error) {
        logger.error(error, req);
      }
    }
    
    // ディスクI/Oシミュレーション
    if (diskOps > 0) {
      const tempFilePath = path.join(__dirname, 'temp_load_test.txt');
      const opCount = Math.min(diskOps, 1000); // 最大1000回
      
      for (let i = 0; i < opCount; i++) {
        // ファイルへの書き込みと読み込み
        fs.writeFileSync(tempFilePath, `Load test data ${i}`, 'utf8');
        fs.readFileSync(tempFilePath, 'utf8');
      }
      
      // 一時ファイルを削除
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      logger.system('disk_ops_completed', { operations: opCount }, req.requestId);
    }
    
    // 応答遅延シミュレーション
    if (delay > 0) {
      const delayMs = Math.min(delay, 30000); // 最大30秒
      setTimeout(() => {
        // メモリ解放
        if (memoryArray) {
          memoryArray = null;
        }
        
        // 応答を返す
        res.status(200).json(responseFormatter.success(
          { 
            cpuLoad, 
            memoryLoad, 
            diskOps, 
            delay: delayMs,
            message: 'Load test completed' 
          }, 
          'Load test executed successfully', 
          req.requestId
        ));
      }, delayMs);
    } else {
      // メモリ解放
      if (memoryArray) {
        memoryArray = null;
      }
      
      // 即時応答
      res.status(200).json(responseFormatter.success(
        { 
          cpuLoad, 
          memoryLoad, 
          diskOps, 
          delay,
          message: 'Load test completed' 
        }, 
        'Load test executed successfully', 
        req.requestId
      ));
    }
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Load test failed', 500, null, req.requestId));
  }
});

// 下位互換性のためのリダイレクト
app.get('/health', (req, res) => {
  res.redirect('/api/system/health');
});

// ルートパスも同様にヘルスチェックとして動作
app.get('/', (req, res) => {
  res.redirect('/api/system/health');
});

// サンプルユーザーIDランダム取得API
app.get('/api/demo/random-user', (req, res) => {
  try {
    const randomUser = getRandomSampleUserId();
    logger.action('get_random_user', { userId: randomUser.id }, req.requestId);
    res.status(200).json(responseFormatter.success(randomUser, 'Random user fetched successfully', req.requestId));
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Failed to fetch random user', 500, null, req.requestId));
  }
});

// ユーザー関連エンドポイント
// ユーザー一覧取得API
app.get('/api/users', (req, res) => {
  try {
    const db = readDB();
    logger.action('list_users', { count: db.users.length }, req.requestId);
    res.status(200).json(responseFormatter.success(db.users, 'Users fetched successfully', req.requestId));
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Failed to fetch users', 500, null, req.requestId));
  }
});

// ユーザー数取得API
app.get('/api/users/count', (req, res) => {
  try {
    const db = readDB();
    const count = db.users.length;
    
    logger.action('count_users', { count }, req.requestId);
    res.status(200).json(responseFormatter.success({ count }, 'User count fetched successfully', req.requestId));
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Failed to count users', 500, null, req.requestId));
  }
});

// ユーザー詳細取得API
app.get('/api/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const db = readDB();
    const user = db.users.find(u => u.id === userId);
    
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
});

// ユーザー作成API
app.post('/api/users', (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    // 入力バリデーション
    if (!email || !name || !password) {
      logger.action('create_user_validation_failed', { 
        missing: [
          !email ? 'email' : null,
          !name ? 'name' : null, 
          !password ? 'password' : null
        ].filter(Boolean) 
      }, req.requestId);
      return res.status(400).json(responseFormatter.error('Missing required fields', 400, null, req.requestId));
    }
    
    const db = readDB();
    
    // メールアドレスの重複チェック
    if (db.users.some(u => u.email === email)) {
      logger.action('create_user_duplicate_email', { email }, req.requestId);
      return res.status(409).json(responseFormatter.error('Email already exists', 409, null, req.requestId));
    }
    
    // 新規ユーザー作成
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      password,
      createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    
    if (writeDB(db)) {
      logger.action('create_user_success', { userId: newUser.id }, req.requestId);
      res.status(201).json(responseFormatter.success(newUser, 'User created successfully', req.requestId));
    } else {
      throw new Error('Failed to write to database');
    }
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Failed to create user', 500, null, req.requestId));
  }
});

// ユーザー更新API
app.put('/api/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const { email, name, password } = req.body;
    
    // 少なくとも1つのフィールドが必要
    if (!email && !name && !password) {
      logger.action('update_user_no_fields', { userId }, req.requestId);
      return res.status(400).json(responseFormatter.error('No fields to update', 400, null, req.requestId));
    }
    
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      logger.action('update_user_not_found', { userId }, req.requestId);
      return res.status(404).json(responseFormatter.error('User not found', 404, null, req.requestId));
    }
    
    // メールアドレス重複チェック（変更する場合のみ）
    if (email && email !== db.users[userIndex].email && 
        db.users.some(u => u.id !== userId && u.email === email)) {
      logger.action('update_user_duplicate_email', { userId, email }, req.requestId);
      return res.status(409).json(responseFormatter.error('Email already exists', 409, null, req.requestId));
    }
    
    // ユーザー情報更新
    const updatedUser = {
      ...db.users[userIndex],
      ...(email && { email }),
      ...(name && { name }),
      ...(password && { password }),
      updatedAt: new Date().toISOString()
    };
    
    db.users[userIndex] = updatedUser;
    
    if (writeDB(db)) {
      logger.action('update_user_success', { userId }, req.requestId);
      res.status(200).json(responseFormatter.success(updatedUser, 'User updated successfully', req.requestId));
    } else {
      throw new Error('Failed to write to database');
    }
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Failed to update user', 500, null, req.requestId));
  }
});

// ユーザー部分更新API
app.patch('/api/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    
    // 更新するフィールドがあるか確認
    if (!updates || Object.keys(updates).length === 0) {
      logger.action('modify_user_no_fields', { userId }, req.requestId);
      return res.status(400).json(responseFormatter.error('No fields to update', 400, null, req.requestId));
    }
    
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      logger.action('modify_user_not_found', { userId }, req.requestId);
      return res.status(404).json(responseFormatter.error('User not found', 404, null, req.requestId));
    }
    
    // メールアドレス重複チェック（変更する場合のみ）
    if (updates.email && updates.email !== db.users[userIndex].email && 
        db.users.some(u => u.id !== userId && u.email === updates.email)) {
      logger.action('modify_user_duplicate_email', { userId, email: updates.email }, req.requestId);
      return res.status(409).json(responseFormatter.error('Email already exists', 409, null, req.requestId));
    }
    
    // ユーザー情報更新
    const updatedUser = {
      ...db.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    db.users[userIndex] = updatedUser;
    
    if (writeDB(db)) {
      logger.action('modify_user_success', { userId }, req.requestId);
      res.status(200).json(responseFormatter.success(updatedUser, 'User modified successfully', req.requestId));
    } else {
      throw new Error('Failed to write to database');
    }
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Failed to modify user', 500, null, req.requestId));
  }
});

// ユーザー削除API
app.delete('/api/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      logger.action('remove_user_not_found', { userId }, req.requestId);
      return res.status(404).json(responseFormatter.error('User not found', 404, null, req.requestId));
    }
    
    // ユーザー削除
    db.users.splice(userIndex, 1);
    
    if (writeDB(db)) {
      logger.action('remove_user_success', { userId }, req.requestId);
      res.status(200).json(responseFormatter.success(null, 'User removed successfully', req.requestId));
    } else {
      throw new Error('Failed to write to database');
    }
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Failed to remove user', 500, null, req.requestId));
  }
});

// 全ユーザー削除API
app.delete('/api/users', (req, res) => {
  try {
    const db = readDB();
    const userCount = db.users.length;
    
    // ユーザーリストをクリア
    db.users = [];
    
    if (writeDB(db)) {
      logger.action('clear_users', { count: userCount }, req.requestId);
      res.status(200).json(responseFormatter.success(null, `All users cleared (${userCount})`, req.requestId));
    } else {
      throw new Error('Failed to write to database');
    }
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Failed to clear users', 500, null, req.requestId));
  }
});

// サンプル・デモエンドポイント
// 挨拶API
app.get('/api/demo/greeting', (req, res) => {
  try {
    logger.action('get_greeting', { page: 'demo' }, req.requestId);
    res.status(200).json(responseFormatter.success({ greeting: 'Hello, world!' }, 'Greeting fetched successfully', req.requestId));
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error('Greeting failed', 500, null, req.requestId));
  }
});

// 下位互換性のためのリダイレクト
app.get('/hello', (req, res) => {
  res.redirect('/api/demo/greeting');
});

// エラーシミュレーションAPI
app.get('/api/demo/error', (req, res) => {
  try {
    logger.action('simulate_error', { endpoint: '/api/demo/error' }, req.requestId);
    throw new Error('Simulated error for testing');
  } catch (error) {
    logger.error(error, req);
    res.status(500).json(responseFormatter.error(error.message, 500, null, req.requestId));
  }
});

// 下位互換性のためのリダイレクト
app.get('/cause-error', (req, res) => {
  res.redirect('/api/demo/error');
});

// 存在しないルートへのアクセス処理
app.use((req, res) => {
  logger.action('route_not_found', { path: req.originalUrl }, req.requestId);
  res.status(404).json(responseFormatter.error('Route not found', 404, null, req.requestId));
});

// グローバルエラーハンドリングミドルウェア（必ず最後に定義）
app.use((err, req, res, next) => {
  logger.error(err, req);
  res.status(500).json(responseFormatter.error('Internal Server Error', 500, null, req.requestId));
});

// ポート設定（環境変数から取得するか、デフォルト3001を使用）
const PORT = process.env.PORT || 3001;

// サーバー起動
app.listen(PORT, () => {
  logger.system('server_started', { port: PORT });
});
