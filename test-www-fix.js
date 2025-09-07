// Test script to verify www domain fix
const mongoose = require('mongoose');

async function testWwwFix() {
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

    // Test the lookup logic
    const domain = 'www.hyfreefire.com';
    console.log('🔍 Testing domain lookup for:', domain);

    // Find website by custom domain (handle both www and non-www versions)
    let website = await Website.findOne({
      'data.customDomain': domain,
      isPublished: true
    });

    console.log('📊 Direct lookup result:', !!website);

    // If not found and domain starts with www, try without www
    if (!website && domain.startsWith('www.')) {
      const domainWithoutWww = domain.substring(4); // Remove 'www.'
      console.log('🔄 Trying without www:', domainWithoutWww);
      website = await Website.findOne({
        'data.customDomain': domainWithoutWww,
        isPublished: true
      });
      console.log('📊 Lookup without www result:', !!website);
    }

    if (website) {
      console.log('✅ Website found!');
      console.log('📄 Website name:', website.name);
      console.log('🌐 Custom domain:', website.data.customDomain);
      console.log('🚀 Published:', website.isPublished);
    } else {
      console.log('❌ No website found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

testWwwFix();
