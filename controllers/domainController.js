const Domain = require('../models/Domain');
const Website = require('../models/Website');

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
    // Check if subdomain is already taken in websites collection
    if (subdomain) {
      const existingWebsite = await Website.findOne({ 'data.subdomain': subdomain });
      if (existingWebsite) {
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

    const domainData = {
      userId,
      websiteId,
      name
    };

    // Only add subdomain if it's provided and not empty
    if (subdomain && subdomain.trim()) {
      domainData.subdomain = subdomain.trim();
    }

    // Only add customDomain if it's provided and not empty
    if (customDomain && customDomain.trim()) {
      domainData.customDomain = customDomain.trim();
    }

    const domain = new Domain(domainData);

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
    // Check if subdomain is already taken by another website
    if (subdomain) {
      const existingWebsite = await Website.findOne({ 
        'data.subdomain': subdomain,
        _id: { $ne: websiteId } 
      });
      if (existingWebsite) {
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

    const updateData = {
      updatedAt: Date.now()
    };

    // Only update name if provided
    if (name) {
      updateData.name = name;
    }

    // Only update subdomain if provided and not empty
    if (subdomain && subdomain.trim()) {
      updateData.subdomain = subdomain.trim();
    } else if (subdomain === '') {
      // If empty string is provided, remove the subdomain field
      updateData.$unset = { subdomain: 1 };
    }

    // Only update customDomain if provided and not empty
    if (customDomain && customDomain.trim()) {
      updateData.customDomain = customDomain.trim();
    } else if (customDomain === '') {
      // If empty string is provided, remove the customDomain field
      if (!updateData.$unset) {
        updateData.$unset = {};
      }
      updateData.$unset.customDomain = 1;
    }

    const updatedDomain = await Domain.findOneAndUpdate(
      { _id: domainId, userId },
      updateData,
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

    console.log('🔍 Checking subdomain availability:', { subdomain, userId });

    if (!subdomain) {
      console.log('❌ No subdomain provided');
      return res.status(400).json({
        available: false,
        message: 'Subdomain is required'
      });
    }

    const cleanSubdomain = subdomain.trim().toLowerCase();
    console.log('🧹 Cleaned subdomain:', cleanSubdomain);
    
    // Basic subdomain validation
    const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]?$/;
    if (!subdomainRegex.test(cleanSubdomain)) {
      console.log('❌ Invalid subdomain format:', cleanSubdomain);
      return res.status(400).json({
        available: false,
        message: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens. Cannot start or end with hyphen.'
      });
    }

    // Check if subdomain is already taken by another user in websites collection
    console.log('🔍 Searching for existing website with subdomain:', cleanSubdomain);
    const existingWebsite = await Website.findOne({ 
      'data.subdomain': cleanSubdomain,
      userId: { $ne: userId }
    });
    
    console.log('📊 Existing website found:', !!existingWebsite);
    
    const result = {
      available: !existingWebsite,
      message: existingWebsite ? 'Subdomain already taken' : 'Subdomain available'
    };
    
    console.log('✅ Subdomain check result:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Check subdomain error:', error);
    res.status(500).json({
      available: false,
      message: 'Failed to check subdomain',
      error: error.message
    });
  }
};

// Check Custom Domain Availability
const checkCustomDomain = async (req, res) => {
  try {
    const { domain } = req.params;
    const userId = req.user.userId;

    console.log('🔍 Checking custom domain availability:', { domain, userId });

    if (!domain) {
      console.log('❌ No custom domain provided');
      return res.status(400).json({
        available: false,
        message: 'Custom domain is required'
      });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({
        available: false,
        message: 'Invalid domain format. Please enter a valid domain name (e.g., example.com)'
      });
    }

    // Create domain variations to check (www and non-www versions)
    const domainVariations = [domain];
    
    // Add www version if domain doesn't start with www
    if (!domain.startsWith('www.')) {
      domainVariations.push(`www.${domain}`);
    }
    
    // Add non-www version if domain starts with www
    if (domain.startsWith('www.')) {
      domainVariations.push(domain.substring(4));
    }

    console.log('🔍 Checking domain variations:', domainVariations);

    // Check if custom domain is already taken in websites collection
    const existingWebsite = await Website.findOne({ 
      'data.customDomain': { $in: domainVariations },
      userId: { $ne: userId } // Exclude current user's websites
    });
    
    if (existingWebsite) {
      console.log('❌ Custom domain already taken by website:', existingWebsite._id);
      return res.json({
        available: false,
        message: `This domain (or its www/non-www version) is already in use by another website`,
        conflictingDomain: existingWebsite.data.customDomain,
        conflictingWebsiteId: existingWebsite._id
      });
    }

    // Check if custom domain is already taken in domains collection
    const existingDomain = await Domain.findOne({ 
      customDomain: { $in: domainVariations }
    });
    
    if (existingDomain) {
      console.log('❌ Custom domain already taken by domain:', existingDomain._id);
      return res.json({
        available: false,
        message: `This domain (or its www/non-www version) is already in use by another website`,
        conflictingDomain: existingDomain.customDomain,
        conflictingDomainId: existingDomain._id
      });
    }

    console.log('✅ Custom domain is available');
    return res.json({
      available: true,
      message: 'Custom domain is available'
    });

  } catch (error) {
    console.error('Check custom domain error:', error);
    res.status(500).json({
      available: false,
      message: 'Failed to check custom domain availability',
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
  checkCustomDomain,
  deleteDomain
};
