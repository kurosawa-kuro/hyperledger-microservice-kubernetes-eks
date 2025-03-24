// 汎用ユーティリティ関数

// 指定された範囲の乱数を生成
const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// オブジェクトの深いコピーを作成
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// 文字列がメールアドレスの形式かチェック
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// オブジェクトが空かどうかチェック
const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

module.exports = {
  getRandomInt,
  deepClone,
  isValidEmail,
  isEmptyObject
}; 