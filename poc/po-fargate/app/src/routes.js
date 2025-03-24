const express = require('express');
const controllers = require('./controllers');
const { logger } = require('./utils/logger');
const router = express.Router();

// User routes
router.get('/users', controllers.listUsers);
router.get('/users/:id', controllers.getUser);
router.post('/users', controllers.addUser);
router.put('/users/:id', controllers.updateUser);
router.delete('/users/:id', controllers.removeUser);

// Health check
router.get('/health', (req, res) => {
  logger.info('Health check successful');
  res.status(200).json({ status: 'UP' });
});

router.get('/error', (req, res) => {
  logger.error('Error test');
  res.status(500).json({ status: 'ERROR' });
});

module.exports = router; 