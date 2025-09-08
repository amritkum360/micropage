const Website = require('../models/Website');
const dns = require('dns').promises;

// Import Vercel service for automatic domain management
const vercelService = require('../../src/services/vercelService');

// Save Website
const saveWebsite = async (req, res) => {
  try {
    const { name, data } = req.body;
    const userId = req.user.userId;

    // Check website limit
    let canCreate = true;
    let limit = 1; // Simple limit: 1 website per user
    let current = 0;

    // MongoDB storage only
    const websiteCount = await Website.countDocuments({ userId });
    current = websiteCount;
    canCreate = current < limit;

    if (!canCreate) {
      return res.status(403).json({
        message: `Website limit reached. You can only create ${limit} websites with your current plan.`,
        limit,
        current
      });
    }

    // MongoDB storage only
    const website = new Website({
      userId,
      name,
      data,
      updatedAt: new Date()
    });

    await website.save();

    res.status(201).json({
      message: 'Website saved successfully',
      website
    });

  } catch (error) {
    console.error('Save website error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get User's Websites
const getWebsites = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔍 Getting websites for userId:', userId);

    const websites = await Website.find({ userId }).sort({ updatedAt: -1 });
    console.log('📊 Found websites:', websites.length);
    console.log('📋 Website details:', websites.map(w => ({ id: w._id, name: w.name, isPublished: w.isPublished })));
    
    // Check subscription status and unpublish if expired
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({
      userId: userId,
      status: 'active'
    });
    
    if (!subscription) {
      // No active subscription, unpublish all websites
      for (let website of websites) {
        if (website.isPublished) {
          website.isPublished = false;
          website.publishedUrl = null;
          await website.save();
        }
      }
    } else {
      // Check if subscription has expired
      const now = new Date();
      const expiryDate = new Date(subscription.expiresAt);
      
      if (now > expiryDate) {
        // Subscription expired, unpublish all websites
        for (let website of websites) {
          if (website.isPublished) {
            website.isPublished = false;
            website.publishedUrl = null;
            await website.save();
          }
        }
      }
    }
    
    console.log('✅ Sending websites response:', websites.length, 'websites');
    res.json(websites);
  } catch (error) {
    console.error('Get websites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Single Website
const getWebsite = async (req, res) => {
  try {
    const websiteId = req.params.id;
    const userId = req.user.userId;
    console.log('Getting website with ID:', websiteId, 'for user:', userId);

    const website = await Website.findOne({
      _id: websiteId,
      userId: userId
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    res.json(website);
  } catch (error) {
    console.error('Get website error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Website
const updateWebsite = async (req, res) => {
  try {
    const { name, data } = req.body;
    const websiteId = req.params.id;
    const userId = req.user.userId;
    
    console.log('🔍 UpdateWebsite - Starting update process...');
    console.log('🔍 UpdateWebsite - Website ID:', websiteId);
    console.log('🔍 UpdateWebsite - User ID:', userId);
    console.log('🔍 UpdateWebsite - Name:', name);
    console.log('🔍 UpdateWebsite - Data:', JSON.stringify(data, null, 2));
    console.log('🔍 UpdateWebsite - Custom Domain in data:', data?.customDomain);

    // Convert userId to ObjectId if it's a string
    const mongoose = require('mongoose');
    const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
    
    console.log('🔍 UpdateWebsite - UserId type:', typeof userId);
    console.log('🔍 UpdateWebsite - UserId value:', userId);
    console.log('🔍 UpdateWebsite - UserId ObjectId:', userIdObjectId);

    // Get the current website first to compare
    const currentWebsite = await Website.findOne({ _id: websiteId, userId: userIdObjectId });
    if (currentWebsite) {
      console.log('🔍 UpdateWebsite - Current website data:', JSON.stringify(currentWebsite.data, null, 2));
    }

    const website = await Website.findOneAndUpdate(
      { _id: websiteId, userId: userIdObjectId },
      { 
        name, 
        data, 
        updatedAt: new Date() 
      },
      { new: true }
    );

    if (!website) {
      console.log('❌ UpdateWebsite - Website not found');
      return res.status(404).json({ message: 'Website not found' });
    }

    console.log('✅ UpdateWebsite - Website updated successfully');
    console.log('✅ UpdateWebsite - Updated website data:', JSON.stringify(website.data, null, 2));
    console.log('✅ UpdateWebsite - Custom Domain after update:', website.data?.customDomain);

    // Check if customDomain was added and add it to Vercel
    let vercelResult = null;
    if (data?.customDomain && data.customDomain !== currentWebsite?.data?.customDomain) {
      console.log('🔧 UpdateWebsite: Custom domain was added, checking Vercel configuration...');
      console.log('🔧 Vercel configured:', vercelService.isConfigured());
      console.log('🔧 Config status:', vercelService.getConfigStatus());
      
      if (vercelService.isConfigured()) {
        console.log('🌐 UpdateWebsite: Adding domain to Vercel project...');
        try {
          vercelResult = await vercelService.addCustomDomain(data.customDomain);
          console.log('🔧 Vercel result:', vercelResult);
          
          if (vercelResult.success) {
            console.log('✅ UpdateWebsite: Domain added to Vercel successfully');
          } else {
            console.warn('⚠️ UpdateWebsite: Failed to add domain to Vercel:', vercelResult.error);
            // Don't fail the request if Vercel fails, just log the warning
          }
        } catch (vercelError) {
          console.error('❌ UpdateWebsite: Vercel API error:', vercelError);
          vercelResult = {
            success: false,
            error: vercelError.message,
            domain: data.customDomain
          };
        }
      } else {
        console.log('⚠️ UpdateWebsite: Vercel service not configured, skipping automatic domain addition');
        console.log('⚠️ Missing environment variables: VERCEL_API_TOKEN, VERCEL_PROJECT_ID');
      }
    }

    res.json({
      message: 'Website updated successfully',
      website,
      vercel: vercelResult ? {
        success: vercelResult.success,
        status: vercelResult.status,
        verification: vercelResult.verification,
        error: vercelResult.error
      } : null
    });

  } catch (error) {
    console.error('❌ UpdateWebsite - Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete Website
const deleteWebsite = async (req, res) => {
  try {
    const websiteId = req.params.id;
    const userId = req.user.userId;
    console.log('Deleting website with ID:', websiteId, 'for user:', userId);

    const website = await Website.findOneAndDelete({
      _id: websiteId,
      userId: userId
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    res.json({ message: 'Website deleted successfully' });
  } catch (error) {
    console.error('Delete website error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Publish Website
const publishWebsite = async (req, res) => {
  try {
    const websiteId = req.params.id;
    const userId = req.user.userId;
    console.log('Publishing website with ID:', websiteId, 'for user:', userId);

    // Check if user has active subscription for publishing
    let hasSubscription = false;
    
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({
      userId: userId,
      status: 'active'
    });
    
    if (subscription) {
      // Check if subscription has expired
      const now = new Date();
      const expiryDate = new Date(subscription.expiresAt);
      hasSubscription = now <= expiryDate;
      
      // Mark as expired if needed
      if (!hasSubscription) {
        subscription.status = 'expired';
      }
    }

    if (!hasSubscription) {
      return res.status(403).json({ 
        message: 'Please subscribe to publish your website. Get 30 days of publishing for just ₹199!',
        requiresSubscription: true
      });
    }

    const website = await Website.findOne({
      _id: websiteId,
      userId: userId
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    website.isPublished = true;
    website.publishedUrl = `/published/${website._id}`;
    website.updatedAt = new Date();
    await website.save();

    res.json({
      message: 'Website published successfully',
      publishedUrl: website.publishedUrl
    });

  } catch (error) {
    console.error('Publish website error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unpublish Website
const unpublishWebsite = async (req, res) => {
  try {
    const websiteId = req.params.id;
    const userId = req.user.userId;
    console.log('Unpublishing website with ID:', websiteId, 'for user:', userId);

    const website = await Website.findOne({
      _id: websiteId,
      userId: userId
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    website.isPublished = false;
    website.publishedUrl = null;
    website.updatedAt = new Date();
    await website.save();

    res.json({
      message: 'Website unpublished successfully'
    });
  } catch (error) {
    console.error('Unpublish website error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



// Get Published Website (Public)
const getPublishedWebsite = async (req, res) => {
  try {
    const websiteId = req.params.id;
    console.log('Looking for published website with ID:', websiteId);

    const website = await Website.findOne({
      _id: websiteId,
      isPublished: true
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found or not published' });
    }

    // Check if user has active subscription
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({
      userId: website.userId,
      status: 'active'
    });
    
    if (!subscription) {
      return res.status(403).json({ message: 'Website is no longer published due to expired subscription' });
    }

    // Check if subscription has expired
    const now = new Date();
    const expiryDate = new Date(subscription.expiresAt);
    
    if (now > expiryDate) {
      return res.status(403).json({ message: 'Website is no longer published due to expired subscription' });
    }

    res.json(website);
  } catch (error) {
    console.error('Get published website error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check DNS configuration for custom domain
const checkDomainDNS = async (req, res) => {
  try {
    const { domain } = req.params;
    
    if (!domain) {
      return res.status(400).json({ message: 'Domain is required' });
    }

    // Check if domain resolves to Vercel nameservers
    // Support both legacy and current Vercel NS hostnames
    const expectedNameservers = [
      'ns1.vercel-dns.com',
      'ns2.vercel-dns.com'
    ];
    let dnsStatus = {
      configured: false,
      nameservers: [],
      message: ''
    };

    try {
      // Get nameservers for the domain
      const nameservers = await dns.resolveNs(domain);
      dnsStatus.nameservers = nameservers;
      
      // Check if any of the expected nameservers are present
      const lowerNameservers = nameservers.map(ns => ns.toLowerCase());
      const hasVercelNS = expectedNameservers.some(expected =>
        lowerNameservers.some(ns => ns.includes(expected.toLowerCase()))
      );
      
      dnsStatus.configured = hasVercelNS;
      dnsStatus.message = hasVercelNS 
        ? 'Domain is properly configured with Vercel nameservers'
        : 'Domain is not configured with Vercel nameservers';
        
    } catch (dnsError) {
      dnsStatus.message = 'Unable to resolve domain nameservers';
      console.error('DNS resolution error:', dnsError);
    }

    res.json({
      domain,
      dnsStatus
    });
    
  } catch (error) {
    console.error('Check domain DNS error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Website by Subdomain (Public)
const getWebsiteBySubdomain = async (req, res) => {
  try {
    const { subdomain } = req.params;
    console.log('🔍 Backend: Looking for website with subdomain:', subdomain);

    if (!subdomain) {
      return res.status(400).json({
        message: 'Subdomain is required'
      });
    }

    // Find website by subdomain
    const website = await Website.findOne({
      'data.subdomain': subdomain,
      isPublished: true // Only return published websites
    });

    console.log('📊 Backend: Website found:', !!website);

    if (!website) {
      console.log('❌ Backend: No published website found for subdomain:', subdomain);
      return res.status(404).json({
        message: 'Website not found or not published'
      });
    }

    console.log('✅ Backend: Returning website data for subdomain:', subdomain);
    res.json(website);

  } catch (error) {
    console.error('❌ Backend: Error fetching website by subdomain:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Website by Custom Domain (Public)
const getWebsiteByCustomDomain = async (req, res) => {
  try {
    const { domain } = req.params;
    console.log('🔍 Backend: Looking for website with custom domain:', domain);

    if (!domain) {
      return res.status(400).json({
        message: 'Domain is required'
      });
    }

    // Find website by custom domain (handle both www and non-www versions)
    let website = await Website.findOne({
      'data.customDomain': domain,
      isPublished: true // Only return published websites
    });

    // If not found and domain starts with www, try without www
    if (!website && domain.startsWith('www.')) {
      const domainWithoutWww = domain.substring(4); // Remove 'www.'
      website = await Website.findOne({
        'data.customDomain': domainWithoutWww,
        isPublished: true
      });
    }

    // If not found and domain doesn't start with www, try with www
    if (!website && !domain.startsWith('www.')) {
      const domainWithWww = `www.${domain}`;
      website = await Website.findOne({
        'data.customDomain': domainWithWww,
        isPublished: true
      });
    }

    console.log('📊 Backend: Website found:', !!website);

    if (!website) {
      console.log('❌ Backend: No published website found for custom domain:', domain);
      return res.status(404).json({
        message: 'Website not found or not published'
      });
    }

    console.log('✅ Backend: Returning website data for custom domain:', domain);
    res.json(website);

  } catch (error) {
    console.error('❌ Backend: Error fetching website by custom domain:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Set Custom Domain
const setCustomDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const { customDomain } = req.body;
    const userId = req.user.userId;

    console.log('🔍 Backend: Setting custom domain for website:', id, 'to:', customDomain);
    console.log('🔧 Backend: Environment variables check:');
    console.log('🔧 VERCEL_API_TOKEN:', process.env.VERCEL_API_TOKEN ? 'Set' : 'Not set');
    console.log('🔧 VERCEL_PROJECT_ID:', process.env.VERCEL_PROJECT_ID ? 'Set' : 'Not set');

    if (!customDomain) {
      return res.status(400).json({
        message: 'Custom domain is required'
      });
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(customDomain)) {
      return res.status(400).json({
        message: 'Invalid domain format'
      });
    }

    // Check if domain is already in use (handle both www and non-www versions)
    const domainVariations = [customDomain];
    
    // Add www version if domain doesn't start with www
    if (!customDomain.startsWith('www.')) {
      domainVariations.push(`www.${customDomain}`);
    }
    
    // Add non-www version if domain starts with www
    if (customDomain.startsWith('www.')) {
      domainVariations.push(customDomain.substring(4));
    }

    console.log('🔍 Checking domain variations:', domainVariations);

    const existingWebsite = await Website.findOne({
      'data.customDomain': { $in: domainVariations },
      _id: { $ne: id }
    });

    if (existingWebsite) {
      console.log('❌ Domain already in use by website:', existingWebsite._id);
      return res.status(400).json({
        message: 'This domain (or its www/non-www version) is already in use by another website',
        existingDomain: existingWebsite.data.customDomain,
        conflictingWebsiteId: existingWebsite._id
      });
    }

    console.log('✅ Domain is available for use');

    // Update website with custom domain
    const website = await Website.findOneAndUpdate(
      { _id: id, userId: userId },
      { 
        $set: { 
          'data.customDomain': customDomain,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!website) {
      return res.status(404).json({
        message: 'Website not found'
      });
    }

    // Add domain to Vercel project automatically
    let vercelResult = null;
    console.log('🔧 Backend: Checking Vercel configuration...');
    console.log('🔧 Vercel configured:', vercelService.isConfigured());
    console.log('🔧 Config status:', vercelService.getConfigStatus());
    
    if (vercelService.isConfigured()) {
      console.log('🌐 Backend: Adding domain to Vercel project...');
      try {
        vercelResult = await vercelService.addCustomDomain(customDomain);
        console.log('🔧 Vercel result:', vercelResult);
        
        if (vercelResult.success) {
          console.log('✅ Backend: Domain added to Vercel successfully');
        } else {
          console.warn('⚠️ Backend: Failed to add domain to Vercel:', vercelResult.error);
          // Don't fail the request if Vercel fails, just log the warning
        }
      } catch (vercelError) {
        console.error('❌ Backend: Vercel API error:', vercelError);
        vercelResult = {
          success: false,
          error: vercelError.message,
          domain: customDomain
        };
      }
    } else {
      console.log('⚠️ Backend: Vercel service not configured, skipping automatic domain addition');
      console.log('⚠️ Missing environment variables: VERCEL_API_TOKEN, VERCEL_PROJECT_ID');
    }

    console.log('✅ Backend: Custom domain set successfully');
    res.json({
      message: 'Custom domain set successfully',
      website,
      vercel: vercelResult ? {
        success: vercelResult.success,
        status: vercelResult.status,
        verification: vercelResult.verification,
        error: vercelResult.error
      } : null
    });

  } catch (error) {
    console.error('❌ Backend: Error setting custom domain:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove Custom Domain
const removeCustomDomain = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    console.log('🔍 Backend: Removing custom domain for website:', id);

    // Get the current website to find the domain to remove
    const currentWebsite = await Website.findOne({
      _id: id,
      userId: userId
    });

    if (!currentWebsite) {
      return res.status(404).json({
        message: 'Website not found'
      });
    }

    const domainToRemove = currentWebsite.data?.customDomain;

    // Update website to remove custom domain
    const website = await Website.findOneAndUpdate(
      { _id: id, userId: userId },
      { 
        $unset: { 'data.customDomain': 1 },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    // Remove domain from Vercel project automatically
    let vercelResult = null;
    if (domainToRemove && vercelService.isConfigured()) {
      console.log('🌐 Backend: Removing domain from Vercel project...');
      vercelResult = await vercelService.removeCustomDomain(domainToRemove);
      
      if (vercelResult.success) {
        console.log('✅ Backend: Domain removed from Vercel successfully');
      } else {
        console.warn('⚠️ Backend: Failed to remove domain from Vercel:', vercelResult.error);
        // Don't fail the request if Vercel fails, just log the warning
      }
    } else if (domainToRemove) {
      console.log('⚠️ Backend: Vercel service not configured, skipping automatic domain removal');
    }

    console.log('✅ Backend: Custom domain removed successfully');
    res.json({
      message: 'Custom domain removed successfully',
      website,
      vercel: vercelResult ? {
        success: vercelResult.success,
        error: vercelResult.error
      } : null
    });

  } catch (error) {
    console.error('❌ Backend: Error removing custom domain:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
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
};
