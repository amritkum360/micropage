// Script to check what custom domains exist in the database
const mongoose = require('mongoose');

async function checkDomains() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/micropage');
    console.log('✅ Connected to MongoDB');

    // Define Website schema
    const websiteSchema = new mongoose.Schema({
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      data: Object,
      isPublished: Boolean,
      publishedUrl: String,
      createdAt: Date,
      updatedAt: Date
    });

    const Website = mongoose.model('Website', websiteSchema);

    // Find all websites with custom domains
    const websites = await Website.find({
      'data.customDomain': { $exists: true }
    });

    console.log('📊 Found', websites.length, 'websites with custom domains:');
    
    websites.forEach((website, index) => {
      console.log(`${index + 1}. Name: ${website.name}`);
      console.log(`   Custom Domain: ${website.data.customDomain}`);
      console.log(`   Published: ${website.isPublished}`);
      console.log(`   ID: ${website._id}`);
      console.log('---');
    });

    // Also check for the specific domain
    const specificWebsite = await Website.findOne({
      'data.customDomain': 'hyfreefire.com'
    });

    if (specificWebsite) {
      console.log('✅ Found website with hyfreefire.com:');
      console.log('   Name:', specificWebsite.name);
      console.log('   Published:', specificWebsite.isPublished);
    } else {
      console.log('❌ No website found with hyfreefire.com');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

checkDomains();
