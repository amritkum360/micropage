const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  checkVercelConfig,
  getVercelDomains,
  getDomainStatus,
  addDomainToVercel,
  removeDomainFromVercel
} = require('../controllers/vercelController');

// All routes require authentication
router.use(authenticateToken);

// Check Vercel configuration status
router.get('/config', checkVercelConfig);

// Get all custom domains from Vercel
router.get('/domains', getVercelDomains);

// Get domain status from Vercel
router.get('/domains/:domain/status', getDomainStatus);

// Manually add domain to Vercel (for testing/admin purposes)
router.post('/domains', addDomainToVercel);

// Manually remove domain from Vercel (for testing/admin purposes)
router.delete('/domains', removeDomainFromVercel);

module.exports = router;
