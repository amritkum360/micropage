// Script to check all websites in the database
const mongoose = require('mongoose');

async function checkAllWebsites() {
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

    // Find all websites
    const websites = await Website.find({});

    console.log('📊 Found', websites.length, 'websites total:');
    
    websites.forEach((website, index) => {
      console.log(`${index + 1}. Name: ${website.name}`);
      console.log(`   ID: ${website._id}`);
      console.log(`   Published: ${website.isPublished}`);
      console.log(`   Subdomain: ${website.data?.subdomain || 'none'}`);
      console.log(`   Custom Domain: ${website.data?.customDomain || 'none'}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

checkAllWebsites();
