const { getDb } = require('./model');
const { logger } = require('./utils/logger');

// User services
const listUsers = async () => {
  try {
    const db = getDb();
    return db.get('users').value();
  } catch (error) {
    logger.error('Error in listUsers service:', error);
    throw error;
  }
};

const getUser = async (id) => {
  try {
    const db = getDb();
    return db.get('users').find({ id }).value();
  } catch (error) {
    logger.error(`Error in getUser service for id ${id}:`, error);
    throw error;
  }
};

const addUser = async (userData) => {
  try {
    const db = getDb();
    const id = Date.now().toString();
    const newUser = { id, ...userData };
    
    db.get('users').push(newUser).write();
    return newUser;
  } catch (error) {
    logger.error('Error in addUser service:', error);
    throw error;
  }
};

const updateUser = async (id, userData) => {
  try {
    const db = getDb();
    const user = db.get('users').find({ id });
    
    if (!user.value()) {
      return null;
    }
    
    const updatedUser = { ...user.value(), ...userData };
    user.assign(updatedUser).write();
    
    return updatedUser;
  } catch (error) {
    logger.error(`Error in updateUser service for id ${id}:`, error);
    throw error;
  }
};

const removeUser = async (id) => {
  try {
    const db = getDb();
    const user = db.get('users').find({ id }).value();
    
    if (!user) {
      return null;
    }
    
    db.get('users').remove({ id }).write();
    return true;
  } catch (error) {
    logger.error(`Error in removeUser service for id ${id}:`, error);
    throw error;
  }
};

module.exports = {
  listUsers,
  getUser,
  addUser,
  updateUser,
  removeUser
}; 