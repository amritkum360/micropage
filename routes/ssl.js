const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requestSSL, getSSLRequests, getSSLStatus } = require('../controllers/sslController');

// Request SSL Certificate
router.post('/request', authenticateToken, requestSSL);

// Get SSL requests for user
router.get('/requests', authenticateToken, getSSLRequests);

// Get SSL status for domain
router.get('/status/:domain', authenticateToken, getSSLStatus);

module.exports = router;
