const express = require('express');
const router = express.Router();
const { 
  saveWebsite, 
  getWebsites, 
  getWebsite, 
  updateWebsite, 
  deleteWebsite, 
  publishWebsite, 
  unpublishWebsite,
  getPublishedWebsite,
  getWebsiteBySubdomain,
  getWebsiteByCustomDomain,
  setCustomDomain,
  removeCustomDomain,
  checkDomainDNS
} = require('../controllers/websiteController');
const { authenticateToken } = require('../middleware/auth');

// Save Website
router.post('/', authenticateToken, saveWebsite);

// Get User's Websites
router.get('/', authenticateToken, getWebsites);

// Get Published Website (Public) - This must come before /:id routes
router.get('/published/:id', getPublishedWebsite);

// Get Website by Subdomain (Public) - This must come before /:id routes
router.get('/subdomain/:subdomain', getWebsiteBySubdomain);

// Get Website by Custom Domain (Public) - This must come before /:id routes
router.get('/custom-domain/:domain', getWebsiteByCustomDomain);



// Get Single Website
router.get('/:id', authenticateToken, getWebsite);

// Update Website
router.put('/:id', authenticateToken, updateWebsite);

// Delete Website
router.delete('/:id', authenticateToken, deleteWebsite);

// Publish Website
router.post('/:id/publish', authenticateToken, publishWebsite);

// Unpublish Website
router.post('/:id/unpublish', authenticateToken, unpublishWebsite);

// Custom Domain Management
router.post('/:id/custom-domain', authenticateToken, setCustomDomain);
router.delete('/:id/custom-domain', authenticateToken, removeCustomDomain);

// Check Domain DNS Configuration
router.get('/dns/:domain', checkDomainDNS);

module.exports = router;
