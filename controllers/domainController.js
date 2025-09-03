const Domain = require('../models/Domain');

// Save Domain
const saveDomain = async (req, res) => {
  try {
    const { websiteId, name, subdomain, customDomain } = req.body;
    const userId = req.user.userId;

    // Validate custom domain if provided
    if (customDomain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(customDomain)) {
        return res.status(400).json({
          message: 'Invalid custom domain format. Please enter a valid domain name (e.g., example.com)'
        });
      }
    }

    // MongoDB storage only
    // Check if subdomain is already taken
    if (subdomain) {
      const existingDomain = await Domain.findOne({ subdomain });
      if (existingDomain) {
        return res.status(409).json({
          message: 'Subdomain already taken'
        });
      }
    }

    // Check if custom domain is already taken
    if (customDomain) {
      const existingDomain = await Domain.findOne({ customDomain });
      if (existingDomain) {
        return res.status(409).json({
          message: 'Custom domain already taken'
        });
      }
    }

    const domain = new Domain({
      userId,
      websiteId,
      name,
      subdomain: subdomain || null,
      customDomain: customDomain || null
    });

    await domain.save();

    res.status(201).json({
      message: 'Domain saved successfully',
      domain
    });
  } catch (error) {
    console.error('Save domain error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Domains for User
const getDomains = async (req, res) => {
  try {
    const userId = req.user.userId;
    const domains = await Domain.find({ userId });
    res.json(domains);
  } catch (error) {
    console.error('Get domains error:', error);
    res.status(500).json({
      message: 'Failed to get domains',
      error: error.message
    });
  }
};

// Update Domain
const updateDomain = async (req, res) => {
  try {
    const { websiteId, name, subdomain, customDomain } = req.body;
    const domainId = req.params.id;
    const userId = req.user.userId;

    // Validate custom domain if provided
    if (customDomain) {
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(customDomain)) {
        return res.status(400).json({
          message: 'Invalid custom domain format. Please enter a valid domain name (e.g., example.com)'
        });
      }
    }

    // MongoDB storage only
    // Check if subdomain is already taken by another domain
    if (subdomain) {
      const existingDomain = await Domain.findOne({ 
        subdomain, 
        _id: { $ne: domainId } 
      });
      if (existingDomain) {
        return res.status(409).json({
          message: 'Subdomain already taken'
        });
      }
    }

    // Check if custom domain is already taken by another domain
    if (customDomain) {
      const existingDomain = await Domain.findOne({ 
        customDomain, 
        _id: { $ne: domainId } 
      });
      if (existingDomain) {
        return res.status(409).json({
          message: 'Custom domain already taken'
        });
      }
    }

    const updatedDomain = await Domain.findOneAndUpdate(
      { _id: domainId, userId },
      {
        name: name || undefined,
        subdomain: subdomain !== undefined ? subdomain : undefined,
        customDomain: customDomain !== undefined ? customDomain : undefined,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedDomain) {
      return res.status(404).json({
        message: 'Domain not found'
      });
    }

    res.json({
      message: 'Domain updated successfully',
      domain: updatedDomain
    });
  } catch (error) {
    console.error('Update domain error:', error);
    res.status(500).json({
      message: 'Failed to update domain',
      error: error.message
    });
  }
};

// Publish Domain
const publishDomain = async (req, res) => {
  try {
    const domainId = req.params.id;
    const userId = req.user.userId;

    const domain = await Domain.findOne({ _id: domainId, userId });
    
    if (!domain) {
      return res.status(404).json({
        message: 'Domain not found'
      });
    }

    if (!domain.subdomain && !domain.customDomain) {
      return res.status(400).json({
        message: 'No subdomain or custom domain configured'
      });
    }

    const publishedUrl = domain.customDomain || `${domain.subdomain}.jirocash.com`;
    
    domain.publishedUrl = publishedUrl;
    domain.isPublished = true;
    domain.updatedAt = Date.now();
    
    await domain.save();

    res.json({
      message: 'Domain published successfully',
      publishedUrl
    });
  } catch (error) {
    console.error('Publish domain error:', error);
    res.status(500).json({
      message: 'Failed to publish domain',
      error: error.message
    });
  }
};

// Unpublish Domain
const unpublishDomain = async (req, res) => {
  try {
    const domainId = req.params.id;
    const userId = req.user.userId;

    const updatedDomain = await Domain.findOneAndUpdate(
      { _id: domainId, userId },
      {
        publishedUrl: null,
        isPublished: false,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedDomain) {
      return res.status(404).json({
        message: 'Domain not found'
      });
    }

    res.json({
      message: 'Domain unpublished successfully'
    });
  } catch (error) {
    console.error('Unpublish domain error:', error);
    res.status(500).json({
      message: 'Failed to unpublish domain',
      error: error.message
    });
  }
};

// Check Subdomain Availability
const checkSubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userId = req.user.userId;

    if (!subdomain) {
      return res.status(400).json({
        message: 'Subdomain is required'
      });
    }

    const cleanSubdomain = subdomain.trim().toLowerCase();
    
    // Basic subdomain validation
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]?$/;
    if (!subdomainRegex.test(cleanSubdomain)) {
      return res.status(400).json({
        available: false,
        message: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens. Cannot start or end with hyphen.'
      });
    }

    // Check if subdomain is already taken by another user
    const existingDomain = await Domain.findOne({ 
      subdomain: cleanSubdomain,
      userId: { $ne: userId }
    });
    
    res.json({
      available: !existingDomain,
      message: existingDomain ? 'Subdomain already taken' : 'Subdomain available'
    });
  } catch (error) {
    console.error('Check subdomain error:', error);
    res.status(500).json({
      message: 'Failed to check subdomain',
      error: error.message
    });
  }
};

// Delete Domain
const deleteDomain = async (req, res) => {
  try {
    const domainId = req.params.id;
    const userId = req.user.userId;

    const deletedDomain = await Domain.findOneAndDelete({ _id: domainId, userId });
    
    if (!deletedDomain) {
      return res.status(404).json({
        message: 'Domain not found'
      });
    }

    res.json({
      message: 'Domain deleted successfully'
    });
  } catch (error) {
    console.error('Delete domain error:', error);
    res.status(500).json({
      message: 'Failed to delete domain',
      error: error.message
    });
  }
};

module.exports = {
  saveDomain,
  getDomains,
  updateDomain,
  publishDomain,
  unpublishDomain,
  checkSubdomain,
  deleteDomain
};
