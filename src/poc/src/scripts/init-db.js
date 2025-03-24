/**
 * init-db.js - データベース初期化スクリプト
 * 
 * 使用方法: node src/scripts/init-db.js
 */

const { initializeDB } = require('../model');
const logger = require('../logger');

console.log('データベース初期化を開始します...');

// DB初期化実行
initializeDB();

console.log('データベース初期化が完了しました。'); 