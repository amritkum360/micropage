const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Domain = require('./models/Domain');
const Website = require('./models/Website');
const User = require('./models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/micropage');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test subdomain functionality
const testSubdomain = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Testing subdomain functionality...');
    
    // Find a user with websites
    const user = await User.findOne({}).populate('websites');
    if (!user) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log('👤 Found user:', user.fullName, user.email);
    
    // Find a published website
    const website = await Website.findOne({ 
      userId: user._id,
      isPublished: true 
    });
    
    if (!website) {
      console.log('❌ No published websites found for user');
      return;
    }
    
    console.log('🌐 Found published website:', website.name, 'ID:', website._id);
    
    // Check if domain already exists
    let domain = await Domain.findOne({ 
      websiteId: website._id.toString(),
      isPublished: true 
    });
    
    if (!domain) {
      // Create a test domain
      const subdomain = user.fullName.toLowerCase().replace(/\s+/g, '');
      domain = new Domain({
        userId: user._id.toString(),
        websiteId: website._id.toString(),
        name: website.name,
        subdomain: subdomain,
        isPublished: true,
        publishedUrl: `https://${subdomain}.jirocash.com`
      });
      
      await domain.save();
      console.log('✅ Created test domain:', domain.subdomain, 'for website:', website.name);
    } else {
      console.log('✅ Found existing domain:', domain.subdomain, 'for website:', website.name);
    }
    
    // Test the subdomain lookup
    console.log('\n🧪 Testing subdomain lookup...');
    const testDomain = await Domain.findOne({ 
      subdomain: domain.subdomain,
      isPublished: true 
    });
    
    if (testDomain) {
      console.log('✅ Subdomain lookup successful:', testDomain.subdomain);
      console.log('📋 Domain details:', {
        subdomain: testDomain.subdomain,
        websiteId: testDomain.websiteId,
        name: testDomain.name,
        isPublished: testDomain.isPublished
      });
      
      // Test website lookup
      const testWebsite = await Website.findOne({
        _id: testDomain.websiteId,
        isPublished: true
      });
      
      if (testWebsite) {
        console.log('✅ Website lookup successful:', testWebsite.name);
        console.log('📋 Website details:', {
          id: testWebsite._id,
          name: testWebsite.name,
          isPublished: testWebsite.isPublished,
          hasData: !!testWebsite.data
        });
        
        console.log('\n🎉 Subdomain functionality test PASSED!');
        console.log(`🌐 Your website should be accessible at: https://${testDomain.subdomain}.jirocash.com`);
        console.log(`📱 Or locally at: http://${testDomain.subdomain}.localhost:3000`);
      } else {
        console.log('❌ Website lookup failed');
      }
    } else {
      console.log('❌ Subdomain lookup failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the test
testSubdomain();
