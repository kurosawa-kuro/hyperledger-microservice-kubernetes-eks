const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const { logger } = require('./utils/logger');
const { errorHandler } = require('./utils/responseFormatter');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3333;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Routes
app.use('/api', routes);


// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app; 