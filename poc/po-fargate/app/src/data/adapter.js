const { getDb } = require('../model');
const { logger } = require('../utils/logger');

// データベースアダプターのメソッド
// 将来的に別のデータストアに置き換える際に利用

// 全てのエンティティを取得
const findAll = (collection) => {
  try {
    const db = getDb();
    return db.get(collection).value();
  } catch (error) {
    logger.error(`Error in findAll for collection ${collection}:`, error);
    throw error;
  }
};

// IDでエンティティを検索
const findById = (collection, id) => {
  try {
    const db = getDb();
    return db.get(collection).find({ id }).value();
  } catch (error) {
    logger.error(`Error in findById for collection ${collection} and id ${id}:`, error);
    throw error;
  }
};

// 条件に一致するエンティティを検索
const findBy = (collection, query) => {
  try {
    const db = getDb();
    return db.get(collection).filter(query).value();
  } catch (error) {
    logger.error(`Error in findBy for collection ${collection}:`, error);
    throw error;
  }
};

// 新しいエンティティを作成
const create = (collection, data) => {
  try {
    const db = getDb();
    const id = data.id || Date.now().toString();
    const entity = { id, ...data };
    
    db.get(collection).push(entity).write();
    return entity;
  } catch (error) {
    logger.error(`Error in create for collection ${collection}:`, error);
    throw error;
  }
};

// エンティティを更新
const update = (collection, id, data) => {
  try {
    const db = getDb();
    const entity = db.get(collection).find({ id });
    
    if (!entity.value()) {
      return null;
    }
    
    const updatedEntity = { ...entity.value(), ...data };
    entity.assign(updatedEntity).write();
    
    return updatedEntity;
  } catch (error) {
    logger.error(`Error in update for collection ${collection} and id ${id}:`, error);
    throw error;
  }
};

// エンティティを削除
const remove = (collection, id) => {
  try {
    const db = getDb();
    const entity = db.get(collection).find({ id }).value();
    
    if (!entity) {
      return false;
    }
    
    db.get(collection).remove({ id }).write();
    return true;
  } catch (error) {
    logger.error(`Error in remove for collection ${collection} and id ${id}:`, error);
    throw error;
  }
};

module.exports = {
  findAll,
  findById,
  findBy,
  create,
  update,
  remove
}; 