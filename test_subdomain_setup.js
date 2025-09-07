const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Domain = require('./backend/models/Domain');
const Website = require('./backend/models/Website');

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

// Create test subdomain
const createTestSubdomain = async () => {
  try {
    await connectDB();
    
    // Check if amrit subdomain already exists
    const existingDomain = await Domain.findOne({ subdomain: 'amrit' });
    if (existingDomain) {
      console.log('✅ amrit subdomain already exists:', existingDomain);
      return;
    }
    
    // Create a test website first
    const testWebsite = new Website({
      userId: 'test-user-id',
      name: 'Amrit Test Website',
      data: {
        subdomain: 'amrit',
        title: 'Amrit\'s Website',
        description: 'Test website for amrit subdomain'
      },
      isPublished: true
    });
    
    await testWebsite.save();
    console.log('✅ Created test website:', testWebsite._id);
    
    // Create domain entry
    const testDomain = new Domain({
      userId: 'test-user-id',
      websiteId: testWebsite._id.toString(),
      name: 'Amrit Test Domain',
      subdomain: 'amrit',
      isPublished: true,
      publishedUrl: 'amrit.jirocash.com'
    });
    
    await testDomain.save();
    console.log('✅ Created test domain:', testDomain);
    
    console.log('🎉 Test subdomain setup complete!');
    console.log('Now you can test: http://amrit.localhost:3000');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the setup
createTestSubdomain();
