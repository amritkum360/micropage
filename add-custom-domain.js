// Script to add custom domain to Dr Amrit Kumar's website
const mongoose = require('mongoose');

async function addCustomDomain() {
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

    // Update Dr Amrit Kumar's website with custom domain
    const websiteId = '68bd6a711bb60d77afad7c97';
    const result = await Website.updateOne(
      { _id: websiteId },
      { 
        $set: { 
          'data.customDomain': 'hyfreefire.com',
          updatedAt: new Date()
        }
      }
    );

    console.log('📊 Update result:', result);

    if (result.modifiedCount > 0) {
      console.log('✅ Custom domain added successfully!');
      
      // Verify the update
      const updatedWebsite = await Website.findById(websiteId);
      console.log('🌐 Custom Domain:', updatedWebsite.data.customDomain);
      console.log('🚀 Published:', updatedWebsite.isPublished);
    } else {
      console.log('❌ No website found or already updated');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

addCustomDomain();
