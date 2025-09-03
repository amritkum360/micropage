const mongoose = require('mongoose');

// Use the same connection string as in the main app
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/micropage';

async function migrateUsers() {
  try {
    console.log('🔧 Starting User Migration...');
    console.log('🔗 Connecting to:', MONGODB_URI);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get the User model
    const User = require('./models/User');
    
    // Find all users
    const users = await User.find({});
    console.log(`👥 Found ${users.length} users in database`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      console.log(`\n🔍 Checking user: ${user.email}`);
      console.log(`   Current phone: ${user.phone || 'MISSING'}`);
      console.log(`   Current fullName: ${user.fullName || 'MISSING'}`);
      
      let needsUpdate = false;
      const updateData = {};
      
      // Check if phone is missing
      if (!user.phone) {
        updateData.phone = '9999999999'; // Default phone
        needsUpdate = true;
        console.log('   ➕ Adding default phone: 9999999999');
      }
      
      // Check if fullName is missing
      if (!user.fullName) {
        // Extract name from email or use default
        const emailName = user.email.split('@')[0];
        updateData.fullName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        needsUpdate = true;
        console.log(`   ➕ Adding fullName: ${updateData.fullName}`);
      }
      
      if (needsUpdate) {
        try {
          await User.findByIdAndUpdate(user._id, updateData);
          updatedCount++;
          console.log('   ✅ User updated successfully');
        } catch (updateError) {
          console.error(`   ❌ Failed to update user:`, updateError.message);
        }
      } else {
        console.log('   ℹ️  User already has all required fields');
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total users: ${users.length}`);
    console.log(`✅ Updated users: ${updatedCount}`);
    console.log(`ℹ️  No changes needed: ${users.length - updatedCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateUsers();
