const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  saveDomain, 
  getDomains, 
  updateDomain, 
  // publishDomain,    // NOT USED IN FRONTEND
  // unpublishDomain,  // NOT USED IN FRONTEND
  checkSubdomain, 
  checkCustomDomain,
  // deleteDomain      // NOT USED IN FRONTEND
} = require('../controllers/domainController');

// Save Domain
router.post('/', authenticateToken, saveDomain);

// Get Domains for User
router.get('/', authenticateToken, getDomains);

// Update Domain
router.put('/:id', authenticateToken, updateDomain);

// Publish Domain - NOT USED IN FRONTEND
// router.post('/:id/publish', authenticateToken, publishDomain);

// Unpublish Domain - NOT USED IN FRONTEND
// router.post('/:id/unpublish', authenticateToken, unpublishDomain);

// Check Subdomain Availability
router.get('/check-subdomain/:subdomain', authenticateToken, checkSubdomain);

// Check Custom Domain Availability
router.get('/check-custom-domain/:domain', authenticateToken, checkCustomDomain);

// Delete Domain - NOT USED IN FRONTEND
// router.delete('/:id', authenticateToken, deleteDomain);

module.exports = router;
