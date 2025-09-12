const SSLRequest = require('../models/SSLRequest');
const Website = require('../models/Website');

// Request SSL Certificate
const requestSSL = async (req, res) => {
  try {
    const { websiteId, domain } = req.body;
    const userId = req.user.userId || req.user.id;

    console.log('🔒 SSL Request - websiteId:', websiteId);
    console.log('🔒 SSL Request - domain:', domain);
    console.log('🔒 SSL Request - userId:', userId);

    if (!websiteId || !domain) {
      return res.status(400).json({ message: 'Website ID and domain are required' });
    }

    // Check if website exists first
    const website = await Website.findOne({ _id: websiteId });
    console.log('🔒 SSL Request - website found:', !!website);
    
    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    // Check if website belongs to user
    if (website.userId.toString() !== userId) {
      console.log('🔒 SSL Request - userId mismatch:', {
        websiteUserId: website.userId.toString(),
        requestUserId: userId
      });
      return res.status(403).json({ message: 'Access denied. Website does not belong to this user.' });
    }

    // Check if SSL request already exists for this domain
    const existingRequest = await SSLRequest.findOne({ 
      websiteId, 
      domain,
      status: { $in: ['pending', 'processing'] }
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'SSL request already exists for this domain' });
    }

    // Create new SSL request
    const sslRequest = new SSLRequest({
      userId,
      websiteId,
      domain,
      status: 'pending'
    });

    await sslRequest.save();

    console.log(`🔒 SSL request created for domain: ${domain} by user: ${userId}`);

    res.json({
      message: 'SSL certificate request submitted successfully',
      sslRequest: {
        id: sslRequest._id,
        domain: sslRequest.domain,
        status: sslRequest.status,
        requestedAt: sslRequest.requestedAt
      }
    });

  } catch (error) {
    console.error('SSL request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get SSL requests for user
const getSSLRequests = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const sslRequests = await SSLRequest.find({ userId })
      .populate('websiteId', 'name data.customDomain')
      .sort({ requestedAt: -1 });

    res.json(sslRequests);

  } catch (error) {
    console.error('Get SSL requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get SSL status for a specific domain
const getSSLStatus = async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user.userId || req.user.id;

    console.log('🔒 SSL Status Check - Function called');
    console.log('🔒 SSL Status Check - domain:', domain);
    console.log('🔒 SSL Status Check - userId:', userId);
    console.log('🔒 SSL Status Check - req.user:', req.user);

    // First, let's check if any SSL request exists for this domain
    const anySSLRequest = await SSLRequest.findOne({ domain });
    console.log('🔒 SSL Status Check - any SSL request for domain:', !!anySSLRequest);
    if (anySSLRequest) {
      console.log('🔒 SSL Status Check - any SSL request userId:', anySSLRequest.userId);
      console.log('🔒 SSL Status Check - any SSL request status:', anySSLRequest.status);
    }

    const sslRequest = await SSLRequest.findOne({ 
      domain, 
      userId,
      status: { $in: ['pending', 'processing', 'applied'] }
    });

    console.log('🔒 SSL Status Check - sslRequest found:', !!sslRequest);
    if (sslRequest) {
      console.log('🔒 SSL Status Check - sslRequest status:', sslRequest.status);
    }

    if (!sslRequest) {
      return res.json({ 
        hasRequest: false,
        status: null 
      });
    }

    res.json({
      hasRequest: true,
      status: sslRequest.status,
      requestedAt: sslRequest.requestedAt,
      appliedAt: sslRequest.appliedAt
    });

  } catch (error) {
    console.error('Get SSL status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  requestSSL,
  getSSLRequests,
  getSSLStatus
};
