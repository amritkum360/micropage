const Website = require('../models/Website');
const dns = require('dns').promises;

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

    const websites = await Website.find({ userId }).sort({ updatedAt: -1 });
    
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
    console.log('Updating website with ID:', websiteId, 'for user:', userId);

    const website = await Website.findOneAndUpdate(
      { _id: websiteId, userId: userId },
      { 
        name, 
        data, 
        updatedAt: new Date() 
      },
      { new: true }
    );

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    res.json({
      message: 'Website updated successfully',
      website
    });

  } catch (error) {
    console.error('Update website error:', error);
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

module.exports = {
  saveWebsite,
  getWebsites,
  getWebsite,
  updateWebsite,
  deleteWebsite,
  publishWebsite,
  unpublishWebsite,
  getPublishedWebsite,
  checkDomainDNS
};
