// Script to check the specific website that was returned by the API
const mongoose = require('mongoose');

async function checkSpecificWebsite() {
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

    // Check the specific website ID that was returned by the API
    const websiteId = '68bd957fa9afcb1c332ba085';
    const website = await Website.findById(websiteId);

    if (website) {
      console.log('✅ Found website with ID:', websiteId);
      console.log('   Name:', website.name);
      console.log('   Published:', website.isPublished);
      console.log('   Subdomain:', website.data?.subdomain || 'none');
      console.log('   Custom Domain:', website.data?.customDomain || 'none');
      console.log('   Full data.customDomain:', JSON.stringify(website.data?.customDomain));
    } else {
      console.log('❌ No website found with ID:', websiteId);
    }

    // Also check if there are any websites with hyfreefire.com
    const websitesWithDomain = await Website.find({
      'data.customDomain': 'hyfreefire.com'
    });

    console.log('📊 Websites with hyfreefire.com:', websitesWithDomain.length);
    websitesWithDomain.forEach((w, i) => {
      console.log(`${i + 1}. ID: ${w._id}, Name: ${w.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

checkSpecificWebsite();
