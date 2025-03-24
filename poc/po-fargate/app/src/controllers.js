const services = require('./services');
const { logger } = require('./utils/logger');
const { formatResponse } = require('./utils/responseFormatter');

// User controllers
const listUsers = async (req, res, next) => {
  try {
    const users = await services.listUsers();
    return formatResponse(res, 200, users);
  } catch (error) {
    logger.error('Error listing users:', error);
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await services.getUser(id);
    
    if (!user) {
      return formatResponse(res, 404, { message: 'User not found' });
    }
    
    return formatResponse(res, 200, user);
  } catch (error) {
    logger.error(`Error getting user with id ${req.params.id}:`, error);
    next(error);
  }
};

const addUser = async (req, res, next) => {
  try {
    const userData = req.body;
    const newUser = await services.addUser(userData);
    return formatResponse(res, 201, newUser);
  } catch (error) {
    logger.error('Error adding user:', error);
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    
    const updatedUser = await services.updateUser(id, userData);
    
    if (!updatedUser) {
      return formatResponse(res, 404, { message: 'User not found' });
    }
    
    return formatResponse(res, 200, updatedUser);
  } catch (error) {
    logger.error(`Error updating user with id ${req.params.id}:`, error);
    next(error);
  }
};

const removeUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await services.removeUser(id);
    
    if (!result) {
      return formatResponse(res, 404, { message: 'User not found' });
    }
    
    return formatResponse(res, 204);
  } catch (error) {
    logger.error(`Error removing user with id ${req.params.id}:`, error);
    next(error);
  }
};

module.exports = {
  listUsers,
  getUser,
  addUser,
  updateUser,
  removeUser
}; 