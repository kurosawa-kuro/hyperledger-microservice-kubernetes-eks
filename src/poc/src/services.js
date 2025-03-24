/**
 * services.js - ビジネスロジック層 (Lowdb対応版)
 */

const { readDB, writeDB, SAMPLE_USER_IDS } = require('./model');
const { responseFormatter, getRandomSampleUserId } = require('./utils/util');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * システム関連サービス
 */
const systemService = {
  /**
   * ヘルスチェック情報を取得
   * @returns {Object} ヘルスチェック情報
   */
  getHealth() {
    return {
      status: 'healthy',
      node_version: process.version
    };
  },

  /**
   * 負荷テスト実行
   * @param {Object} options - 負荷テストオプション
   * @param {number} options.cpuLoad - CPU負荷の強度 (0-100)
   * @param {number} options.memoryLoad - メモリ負荷のMB数
   * @param {number} options.diskOps - ディスク操作回数
   * @param {number} options.delay - 応答遅延（ミリ秒）
   * @param {string} requestId - リクエストID
   * @returns {Object} テスト結果
   */
  async executeLoadTest(options, requestId) {
    const { cpuLoad = 0, memoryLoad = 0, diskOps = 0, delay = 0 } = options;
    let memoryArray = null;

    // CPU負荷シミュレーション
    if (cpuLoad > 0) {
      const startTime = Date.now();
      // CPU負荷が高いほど計算を長く実行
      const duration = Math.min(cpuLoad * 100, 10000); // 最大10秒間
      
      while (Date.now() - startTime < duration) {
        // CPUを使用する演算を実行
        Math.random() * Math.random() * Math.random();
      }
      
      logger.system('cpu_load_completed', { duration: Date.now() - startTime }, requestId);
    }
    
    // メモリ負荷シミュレーション
    if (memoryLoad > 0) {
      const memSize = Math.min(memoryLoad, 500); // 最大500MB
      try {
        // 指定サイズのメモリを確保（1MBあたり約1024*1024バイト）
        memoryArray = Buffer.alloc(memSize * 1024 * 1024);
        // データを書き込む（確実にメモリが確保されるようにする）
        for (let i = 0; i < memoryArray.length; i += 1024 * 1024) {
          memoryArray[i] = 1;
        }
        logger.system('memory_allocated', { sizeMB: memSize }, requestId);
      } catch (error) {
        logger.error(error);
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
      
      logger.system('disk_ops_completed', { operations: opCount }, requestId);
    }
    
    // 応答遅延シミュレーション
    if (delay > 0) {
      const delayMs = Math.min(delay, 30000); // 最大30秒
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    // メモリ解放
    if (memoryArray) {
      memoryArray = null;
    }
    
    return { 
      cpuLoad, 
      memoryLoad, 
      diskOps, 
      delay: Math.min(delay, 30000),
      message: 'Load test completed' 
    };
  }
};

/**
 * ユーザー関連サービス
 */
const userService = {
  /**
   * 全ユーザーリスト取得
   * @returns {Array} ユーザーリスト
   */
  listUsers() {
    const db = readDB();
    return db.users;
  },

  /**
   * ユーザー数取得
   * @returns {number} ユーザー数
   */
  countUsers() {
    const db = readDB();
    return db.users.length;
  },

  /**
   * ユーザー詳細取得
   * @param {string} userId - ユーザーID
   * @returns {Object|null} ユーザー情報、存在しない場合はnull
   */
  getUser(userId) {
    const db = readDB();
    return db.users.find(u => u.id === userId) || null;
  },

  /**
   * ユーザー作成
   * @param {Object} userData - ユーザーデータ
   * @returns {Object} 作成されたユーザー情報と結果ステータス
   */
  createUser(userData) {
    const { email, name, password } = userData;
    
    // 入力バリデーション
    if (!email || !name || !password) {
      return { 
        success: false, 
        statusCode: 400, 
        message: 'Missing required fields',
        missing: [
          !email ? 'email' : null,
          !name ? 'name' : null, 
          !password ? 'password' : null
        ].filter(Boolean)
      };
    }
    
    const db = readDB();
    
    // メールアドレスの重複チェック
    if (db.users.some(u => u.email === email)) {
      return { 
        success: false, 
        statusCode: 409, 
        message: 'Email already exists',
        email 
      };
    }
    
    // 新規ユーザー作成
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      password,
      createdAt: new Date().toISOString()
    };
    
    // ユーザー追加
    db.users.push(newUser);
    
    if (writeDB(db)) {
      return { success: true, user: newUser };
    } else {
      return { success: false, statusCode: 500, message: 'Failed to write to database' };
    }
  },

  /**
   * ユーザー更新（PUT）
   * @param {string} userId - ユーザーID
   * @param {Object} userData - 更新データ
   * @returns {Object} 更新結果
   */
  updateUser(userId, userData) {
    const { email, name, password } = userData;
    
    // 少なくとも1つのフィールドが必要
    if (!email && !name && !password) {
      return { success: false, statusCode: 400, message: 'No fields to update' };
    }
    
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, statusCode: 404, message: 'User not found' };
    }
    
    // メールアドレス重複チェック（変更する場合のみ）
    if (email && email !== db.users[userIndex].email && 
        db.users.some(u => u.id !== userId && u.email === email)) {
      return { success: false, statusCode: 409, message: 'Email already exists' };
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
      return { success: true, user: updatedUser };
    } else {
      return { success: false, statusCode: 500, message: 'Failed to write to database' };
    }
  },

  /**
   * ユーザー部分更新（PATCH）
   * @param {string} userId - ユーザーID
   * @param {Object} updates - 更新データ
   * @returns {Object} 更新結果
   */
  modifyUser(userId, updates) {
    // 更新するフィールドがあるか確認
    if (!updates || Object.keys(updates).length === 0) {
      return { success: false, statusCode: 400, message: 'No fields to update' };
    }
    
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, statusCode: 404, message: 'User not found' };
    }
    
    // メールアドレス重複チェック（変更する場合のみ）
    if (updates.email && updates.email !== db.users[userIndex].email && 
        db.users.some(u => u.id !== userId && u.email === updates.email)) {
      return { success: false, statusCode: 409, message: 'Email already exists' };
    }
    
    // ユーザー情報更新
    const updatedUser = {
      ...db.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    db.users[userIndex] = updatedUser;
    
    if (writeDB(db)) {
      return { success: true, user: updatedUser };
    } else {
      return { success: false, statusCode: 500, message: 'Failed to write to database' };
    }
  },

  /**
   * ユーザー削除
   * @param {string} userId - ユーザーID
   * @returns {Object} 削除結果
   */
  removeUser(userId) {
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, statusCode: 404, message: 'User not found' };
    }
    
    // ユーザー削除
    db.users.splice(userIndex, 1);
    
    if (writeDB(db)) {
      return { success: true };
    } else {
      return { success: false, statusCode: 500, message: 'Failed to write to database' };
    }
  },

  /**
   * 全ユーザー削除
   * @returns {Object} 削除結果
   */
  clearUsers() {
    const db = readDB();
    const userCount = db.users.length;
    
    // ユーザーリストをクリア
    db.users = [];
    
    if (writeDB(db)) {
      return { success: true, count: userCount };
    } else {
      return { success: false, statusCode: 500, message: 'Failed to write to database' };
    }
  }
};

/**
 * デモ関連サービス
 */
const demoService = {
  /**
   * ランダムユーザー取得
   * @returns {Object} ランダムユーザー
   */
  getRandomUser() {
    return getRandomSampleUserId(SAMPLE_USER_IDS);
  },

  /**
   * 挨拶メッセージ取得
   * @returns {Object} 挨拶メッセージ
   */
  getGreeting() {
    return { greeting: 'Hello, world!' };
  },

  /**
   * エラーシミュレーション
   * @throws {Error} シミュレートされたエラー
   */
  simulateError() {
    throw new Error('Simulated error for testing');
  }
};

module.exports = {
  systemService,
  userService,
  demoService
}; 