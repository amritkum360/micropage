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

// Check subdomain database
const checkSubdomainDB = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Checking subdomain database...');
    
    // Get all domains
    const domains = await Domain.find({});
    console.log('📊 Total domains in database:', domains.length);
    
    if (domains.length > 0) {
      console.log('\n📋 All domains:');
      domains.forEach((domain, index) => {
        console.log(`${index + 1}. Subdomain: ${domain.subdomain}, Website ID: ${domain.websiteId}, Published: ${domain.isPublished}`);
      });
    }
    
    // Get all published domains
    const publishedDomains = await Domain.find({ isPublished: true });
    console.log('\n✅ Published domains:', publishedDomains.length);
    
    if (publishedDomains.length > 0) {
      console.log('\n📋 Published domains:');
      publishedDomains.forEach((domain, index) => {
        console.log(`${index + 1}. Subdomain: ${domain.subdomain}, Website ID: ${domain.websiteId}`);
      });
    }
    
    // Check for amritkumars specifically
    const amritkumarsDomain = await Domain.findOne({ subdomain: 'amritkumars' });
    if (amritkumarsDomain) {
      console.log('\n🎯 Found amritkumars domain:', amritkumarsDomain);
    } else {
      console.log('\n❌ amritkumars domain not found');
    }
    
    // Get all websites
    const websites = await Website.find({});
    console.log('\n📊 Total websites in database:', websites.length);
    
    const publishedWebsites = await Website.find({ isPublished: true });
    console.log('✅ Published websites:', publishedWebsites.length);
    
    if (publishedWebsites.length > 0) {
      console.log('\n📋 Published websites:');
      publishedWebsites.forEach((website, index) => {
        console.log(`${index + 1}. ID: ${website._id}, Name: ${website.name}, User: ${website.userId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the check
checkSubdomainDB();
