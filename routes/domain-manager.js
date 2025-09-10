const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const NginxDomainManager = require('../scripts/nginx-domain-manager');

const nginxManager = new NginxDomainManager();

// Setup universal nginx config (admin only)
router.post('/setup-nginx', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin (you can add admin check here)
    const isAdmin = req.user.role === 'admin' || req.user.email === 'admin@aboutwebsite.in';
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    console.log('🔧 Setting up universal nginx config...');
    const success = await nginxManager.createUniversalConfig();
    
    if (success) {
      res.json({
        success: true,
        message: 'Universal nginx config setup complete! All custom domains will now work automatically.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to setup nginx config'
      });
    }
  } catch (error) {
    console.error('Nginx setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during nginx setup'
    });
  }
});

// Test custom domain
router.post('/test-domain', authenticateToken, async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domain is required'
      });
    }

    console.log(`🧪 Testing custom domain: ${domain}`);
    const result = await nginxManager.testCustomDomain(domain);
    
    res.json({
      success: result.success,
      domain: domain,
      response: result.response,
      error: result.error
    });
  } catch (error) {
    console.error('Domain test error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during domain test'
    });
  }
});

// Get system status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const [nginxStatus, backendStatus] = await Promise.all([
      nginxManager.getNginxStatus(),
      nginxManager.checkBackend()
    ]);
    
    res.json({
      success: true,
      nginx: nginxStatus,
      backend: backendStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during status check'
    });
  }
});

module.exports = router;
