const vercelService = require('../../src/services/vercelService');

// Check Vercel configuration status
const checkVercelConfig = async (req, res) => {
  try {
    console.log('🔍 Backend: Checking Vercel configuration');

    const configStatus = vercelService.getConfigStatus();
    
    res.json({
      message: 'Vercel configuration status',
      config: configStatus
    });

  } catch (error) {
    console.error('❌ Backend: Error checking Vercel config:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all custom domains from Vercel
const getVercelDomains = async (req, res) => {
  try {
    console.log('🔍 Backend: Fetching Vercel domains');

    if (!vercelService.isConfigured()) {
      return res.status(400).json({
        message: 'Vercel service is not configured. Please set VERCEL_API_TOKEN and VERCEL_PROJECT_ID environment variables.'
      });
    }

    const result = await vercelService.getCustomDomains();
    
    if (result.success) {
      res.json({
        message: 'Vercel domains fetched successfully',
        domains: result.domains
      });
    } else {
      res.status(500).json({
        message: 'Failed to fetch Vercel domains',
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Backend: Error fetching Vercel domains:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get domain status from Vercel
const getDomainStatus = async (req, res) => {
  try {
    const { domain } = req.params;
    console.log('🔍 Backend: Checking domain status for:', domain);

    if (!domain) {
      return res.status(400).json({
        message: 'Domain is required'
      });
    }

    if (!vercelService.isConfigured()) {
      return res.status(400).json({
        message: 'Vercel service is not configured. Please set VERCEL_API_TOKEN and VERCEL_PROJECT_ID environment variables.'
      });
    }

    const result = await vercelService.getDomainStatus(domain);
    
    if (result.success) {
      res.json({
        message: 'Domain status fetched successfully',
        domain: result.domain,
        status: result.status,
        verification: result.verification,
        data: result.data
      });
    } else {
      res.status(500).json({
        message: 'Failed to fetch domain status',
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Backend: Error fetching domain status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manually add domain to Vercel (for testing/admin purposes)
const addDomainToVercel = async (req, res) => {
  try {
    const { domain } = req.body;
    console.log('🔍 Backend: Manually adding domain to Vercel:', domain);

    if (!domain) {
      return res.status(400).json({
        message: 'Domain is required'
      });
    }

    if (!vercelService.isConfigured()) {
      return res.status(400).json({
        message: 'Vercel service is not configured. Please set VERCEL_API_TOKEN and VERCEL_PROJECT_ID environment variables.'
      });
    }

    const result = await vercelService.addCustomDomain(domain);
    
    if (result.success) {
      res.json({
        message: 'Domain added to Vercel successfully',
        domain: result.domain,
        status: result.status,
        verification: result.verification,
        data: result.data
      });
    } else {
      res.status(500).json({
        message: 'Failed to add domain to Vercel',
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Backend: Error adding domain to Vercel:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manually remove domain from Vercel (for testing/admin purposes)
const removeDomainFromVercel = async (req, res) => {
  try {
    const { domain } = req.body;
    console.log('🔍 Backend: Manually removing domain from Vercel:', domain);

    if (!domain) {
      return res.status(400).json({
        message: 'Domain is required'
      });
    }

    if (!vercelService.isConfigured()) {
      return res.status(400).json({
        message: 'Vercel service is not configured. Please set VERCEL_API_TOKEN and VERCEL_PROJECT_ID environment variables.'
      });
    }

    const result = await vercelService.removeCustomDomain(domain);
    
    if (result.success) {
      res.json({
        message: 'Domain removed from Vercel successfully',
        domain: result.domain
      });
    } else {
      res.status(500).json({
        message: 'Failed to remove domain from Vercel',
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Backend: Error removing domain from Vercel:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  checkVercelConfig,
  getVercelDomains,
  getDomainStatus,
  addDomainToVercel,
  removeDomainFromVercel
};
