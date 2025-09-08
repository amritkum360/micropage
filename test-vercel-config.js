/**
 * Test Vercel configuration in backend
 */

require('dotenv').config();

console.log('🧪 Testing Vercel Configuration in Backend...\n');

// Check environment variables
console.log('🔧 Environment Variables:');
console.log('VERCEL_API_TOKEN:', process.env.VERCEL_API_TOKEN ? '✅ Set' : '❌ Not set');
console.log('VERCEL_PROJECT_ID:', process.env.VERCEL_PROJECT_ID ? '✅ Set' : '❌ Not set');

// Debug: Show actual values (first few characters only)
if (process.env.VERCEL_API_TOKEN) {
  console.log('Token preview:', process.env.VERCEL_API_TOKEN.substring(0, 10) + '...');
}
if (process.env.VERCEL_PROJECT_ID) {
  console.log('Project ID preview:', process.env.VERCEL_PROJECT_ID.substring(0, 10) + '...');
}

if (process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID) {
  console.log('\n✅ Vercel credentials are configured');
  
  // Test Vercel service
  try {
    const vercelService = require('../src/services/vercelService');
    console.log('✅ Vercel service imported successfully');
    
    const configStatus = vercelService.getConfigStatus();
    console.log('\n📊 Configuration Status:', JSON.stringify(configStatus, null, 2));
    
    if (configStatus.isConfigured) {
      console.log('\n🎉 Vercel integration is ready!');
      console.log('Now when you add custom domains through frontend, they will be added to Vercel automatically.');
    } else {
      console.log('\n❌ Vercel service is not configured properly');
    }
    
  } catch (error) {
    console.error('❌ Error importing Vercel service:', error.message);
  }
} else {
  console.log('\n❌ Vercel credentials are not configured');
  console.log('Please check your .env file');
}
