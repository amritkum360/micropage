require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
