
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Import configurations
const { PORT } = require('./config/config');
const { connectDB } = require('./config/database');

// Import models
const User = require('./models/User');

// Import routes
const authRoutes = require('./routes/auth');
const websiteRoutes = require('./routes/websites');
const subscriptionRoutes = require('./routes/subscriptions');
const domainRoutes = require('./routes/domains');
const aiRoutes = require('./routes/ai');
const domainManagerRoutes = require('./routes/domain-manager');
const sslRoutes = require('./routes/ssl');
// Vercel routes removed for VPS setup
// const vercelRoutes = require('./routes/vercel');

// Import middleware
const { authenticateToken } = require('./middleware/auth');


const app = express();

// Connect to database
connectDB();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_RCclHMZe83kwds',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'hQ8QPfuw4H3nWTHml0TSPvOd'
});


 
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create user-specific upload directory
    const userId = req.user?.userId || 'anonymous';
    const userUploadDir = path.join(uploadsDir, userId);
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }
    cb(null, userUploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload route
app.post('/api/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Debug authentication
    console.log('🔐 Upload route - Authentication debug:', {
      hasUser: !!req.user,
      userId: req.user?.userId,
      userEmail: req.user?.email,
      userObject: req.user
    });

    // Get user ID for proper path
    const userId = req.user?.userId || 'anonymous';
    
    // Get user's image limit from database
    let userImageLimit = 30; // Default limit
    try {
      const user = await User.findById(userId);
      if (user && user.imageLimit) {
        userImageLimit = user.imageLimit;
        console.log(`📊 User ${userId} has custom image limit: ${userImageLimit}`);
      } else {
        console.log(`📊 User ${userId} using default image limit: ${userImageLimit}`);
      }
    } catch (error) {
      console.error('❌ Error fetching user image limit:', error);
      // Continue with default limit
    }
    
    const userUploadDir = path.join(__dirname, 'uploads', userId);
    
    // Check if user directory exists and count images
    if (fs.existsSync(userUploadDir)) {
      const files = fs.readdirSync(userUploadDir);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });
      
      console.log(`📊 User ${userId} has ${imageFiles.length}/${userImageLimit} images`);
      
      if (imageFiles.length >= userImageLimit) {
        // Delete the uploaded file since limit is reached
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ 
          message: `Image limit reached. You can only upload ${userImageLimit} images. Please delete some images first.`,
          limit: userImageLimit,
          current: imageFiles.length
        });
      }
    }
    
    // Generate public URL for the uploaded file with user folder
    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${userId}/${req.file.filename}`;
    
    console.log('📁 Upload details:', {
      userId,
      filename: req.file.filename,
      host,
      protocol,
      fileUrl,
      filePath: req.file.path
    });
    
    res.json({
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        path: req.file.path,
        userId: userId
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// Get user's uploaded images
app.get('/api/user-images', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('🖼️ Fetching images for user:', userId);

    // Get user's image limit from database
    let userImageLimit = 30; // Default limit
    try {
      const user = await User.findById(userId);
      if (user && user.imageLimit) {
        userImageLimit = user.imageLimit;
        console.log(`📊 User ${userId} has custom image limit: ${userImageLimit}`);
      } else {
        console.log(`📊 User ${userId} using default image limit: ${userImageLimit}`);
      }
    } catch (error) {
      console.error('❌ Error fetching user image limit:', error);
      // Continue with default limit
    }

    // Get user's upload directory
    const userUploadDir = path.join(__dirname, 'uploads', userId);
    
    // Check if directory exists
    if (!fs.existsSync(userUploadDir)) {
      console.log('📁 User upload directory does not exist:', userUploadDir);
      return res.json({ 
        images: [],
        limit: userImageLimit,
        current: 0
      });
    }

    // Read directory contents
    const files = fs.readdirSync(userUploadDir);
    console.log('📁 Files in user directory:', files);

    // Filter for image files and create image data
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    });

    const images = imageFiles.map(file => {
      const filePath = path.join(userUploadDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        filename: file,
        originalName: file, // We don't store original name separately
        url: `${req.protocol}://${req.get('host')}/uploads/${userId}/${file}`,
        fileSize: stats.size,
        fileType: `image/${path.extname(file).slice(1)}`,
        uploadDate: stats.mtime,
        isServerImage: true
      };
    });

    // Sort by upload date (newest first)
    images.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    console.log(`✅ User images fetched successfully: ${images.length}/${userImageLimit} images`);

    res.json({ 
      images,
      count: images.length,
      userId: userId,
      limit: userImageLimit,
      current: images.length
    });

  } catch (error) {
    console.error('❌ Error fetching user images:', error);
    res.status(500).json({ 
      message: 'Failed to fetch images', 
      error: error.message 
    });
  }
});

// Delete image route
app.delete('/api/upload/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user?.userId || 'anonymous';
    
    // Construct file path
    const filePath = path.join(__dirname, 'uploads', userId, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    console.log(`🗑️ Image deleted: ${filename} for user ${userId}`);
    
    res.json({ 
      message: 'Image deleted successfully',
      filename: filename
    });
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({ message: 'Failed to delete image' });
  }
});

// Admin route to update user image limit
app.put('/api/admin/user/:userId/image-limit', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageLimit } = req.body;
    
    // Basic validation
    if (!imageLimit || imageLimit < 1 || imageLimit > 1000) {
      return res.status(400).json({ 
        message: 'Image limit must be between 1 and 1000' 
      });
    }
    
    // Update user's image limit
    const user = await User.findByIdAndUpdate(
      userId,
      { imageLimit: parseInt(imageLimit) },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`📊 Updated image limit for user ${userId}: ${imageLimit}`);
    
    res.json({
      message: 'Image limit updated successfully',
      userId: userId,
      imageLimit: user.imageLimit
    });
    
  } catch (error) {
    console.error('❌ Error updating image limit:', error);
    res.status(500).json({ 
      message: 'Failed to update image limit',
      error: error.message 
    });
  }
});

//rendertemplate 

// Add this function to backend server.js



// Razorpay Payment Routes

/**
 * Create a new payment order
 */
app.post('/api/razorpay/order', async (req, res) => {
  try {
    console.log('💳 Creating Razorpay order:', req.body);
    
    const { amount, currency, receipt, notes } = req.body;
    
    if (!amount || !currency) {
      return res.status(400).json({ 
        error: 'Amount and currency are required' 
      });
    }

    const options = {
      amount: amount, // Amount in paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {}
    };

    const order = await razorpay.orders.create(options);
    
    if (!order) {
      return res.status(500).json({ error: 'Failed to create order' });
    }

    console.log('✅ Razorpay order created:', order);
    
    // Store order in MongoDB
    const Payment = require('./models/Payment');
    const payment = new Payment({
      razorpayOrderId: order.id,
      amount: amount,
      currency: currency,
      receipt: receipt,
      notes: notes,
      status: 'created'
    });
    
    await payment.save();
    console.log('💾 Payment record saved to MongoDB:', payment._id);

    res.json({
      success: true,
      order: order,
      localOrderId: payment._id
    });

  } catch (error) {
    console.error('❌ Order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      message: error.message 
    });
  }
});

/**
 * Validate payment signature
 */
app.post('/api/razorpay/validate', async (req, res) => {
  try {
    console.log('🔍 Validating payment:', req.body);
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        error: 'Missing payment parameters' 
      });
    }

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    console.log('🔐 Signature verification details:', {
      body: body,
      keySecret: 'Hardcoded',
      keySecretLength: 32
    });
    
    const expectedSignature = crypto
      .createHmac('sha256', 'hQ8QPfuw4H3nWTHml0TSPvOd')
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Invalid signature:', { expected: expectedSignature, received: razorpay_signature });
      return res.status(400).json({ 
        error: 'Transaction is not legitimate!',
        message: 'Payment signature validation failed'
      });
    }

    console.log('✅ Payment validation successful');
    
    // Update payment status in MongoDB
    const Payment = require('./models/Payment');
    let paymentData = null;
    
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (payment) {
      payment.status = 'completed';
      payment.paymentId = razorpay_payment_id;
      payment.completedAt = new Date();
      await payment.save();
      paymentData = payment;
      console.log('💾 Payment status updated in MongoDB:', payment._id);
    }

            // Create subscription after successful payment
        if (paymentData && paymentData.notes) {
          try {
            const { userId, plan, days } = paymentData.notes;
            
            console.log('🔍 Payment notes received:', paymentData.notes);
            console.log('🔍 User ID type:', typeof userId, 'Value:', userId);
            
                        if (userId && days) {
              console.log('🎯 Processing subscription for user:', userId, 'with days:', days);
              
              // Validate userId is a valid MongoDB ObjectId
              if (!mongoose.Types.ObjectId.isValid(userId)) {
                console.error('❌ Invalid userId format:', userId);
                throw new Error(`Invalid user ID format: ${userId}`);
              }
              
              // Check if user already has an active subscription
              let existingSubscription = null;
              try {
                const Subscription = require('./models/Subscription');
                existingSubscription = await Subscription.findOne({
                  userId: userId,
                  status: 'active'
                });
                
                if (existingSubscription) {
                  console.log('🔍 Found existing subscription:', existingSubscription._id);
                } else {
                  console.log('🔍 No existing subscription found for user:', userId);
                }
              } catch (dbError) {
                console.error('❌ Error checking existing subscription:', dbError);
                throw new Error('Failed to check existing subscription');
              }
          
          if (existingSubscription) {
            // Extend existing subscription
            console.log('🔄 Extending existing subscription:', existingSubscription._id);
            
            const currentExpiry = new Date(existingSubscription.expiresAt);
            const newExpiry = new Date(currentExpiry);
            newExpiry.setDate(newExpiry.getDate() + parseInt(days));
            
            existingSubscription.expiresAt = newExpiry;
            existingSubscription.updatedAt = new Date();
            existingSubscription.duration = `${Math.ceil((newExpiry - new Date(existingSubscription.startDate)) / (1000 * 60 * 60 * 24 * 30))}month`;
            
            await existingSubscription.save();
            
            console.log('✅ Subscription extended successfully. New expiry:', newExpiry);
            console.log('📅 Duration updated to:', existingSubscription.duration);
            
          } else {
            // Create new subscription
            console.log('🆕 Creating new subscription for user:', userId);
            
            // Calculate expiry date
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(days));
            
            // Create subscription object
            const subscription = {
              userId: userId,
              plan: 'publish', // Always use 'publish' for website publishing
              duration: `${Math.ceil(days / 30)}month`,
              status: 'active',
              startDate: new Date(),
              expiresAt: expiresAt,
              price: paymentData.amount / 100, // Convert from paise to rupees
              paymentId: razorpay_payment_id,
              orderId: razorpay_order_id,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            // Save subscription to MongoDB
            try {
              console.log('💾 Attempting to save subscription to MongoDB:', subscription);
              
              const Subscription = require('./models/Subscription');
              const dbSubscription = new Subscription(subscription);
              await dbSubscription.save();
              
              console.log('✅ New subscription saved to MongoDB:', dbSubscription._id);
              console.log('📅 Expiry date:', dbSubscription.expiresAt);
              
            } catch (dbError) {
              console.error('❌ Failed to save subscription to MongoDB:', dbError);
              console.error('❌ Subscription object that failed:', subscription);
              throw new Error('Failed to save subscription to database');
            }
          }
        }
      } catch (error) {
        console.error('❌ Error processing subscription:', error);
        // Re-throw the error to prevent payment validation from succeeding
        throw error;
      }
    }

    // Log the final response
    console.log('✅ Payment validation completed successfully');
    console.log('📤 Sending response to frontend:', {
      success: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });

    // Also log the subscription that was created
    if (paymentData && paymentData.notes && paymentData.notes.userId) {
      try {
        const Subscription = require('./models/Subscription');
        const latestSubscription = await Subscription.findOne({
          userId: paymentData.notes.userId,
          status: 'active'
        }).sort({ createdAt: -1 });
        
        if (latestSubscription) {
          console.log('🎯 Latest subscription found after payment:', {
            id: latestSubscription._id,
            userId: latestSubscription.userId,
            status: latestSubscription.status,
            expiresAt: latestSubscription.expiresAt
          });
        } else {
          console.log('⚠️ No subscription found after payment for user:', paymentData.notes.userId);
        }
      } catch (error) {
        console.error('❌ Error checking subscription after payment:', error);
      }
    }

    res.json({
      success: true,
      message: 'Payment validated successfully',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

  } catch (error) {
    console.error('❌ Payment validation error:', error);
    res.status(500).json({ 
      error: 'Payment validation failed',
      message: error.message 
    });
  }
});

/**
 * Get payment status
 */
app.get('/api/razorpay/payment/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const Payment = require('./models/Payment');
    const payment = await Payment.findById(orderId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      success: true,
      payment: payment
    });

  } catch (error) {
    console.error('❌ Get payment error:', error);
    res.status(500).json({ 
      error: 'Failed to get payment',
      message: error.message 
    });
  }
});

/**
 * Get all payments for a user
 */
app.get('/api/razorpay/payments', async (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    console.log('🔍 Get payments request for userId:', userId);
    
    const Payment = require('./models/Payment');
    const userPayments = await Payment.find({
      'notes.userId': userId
    }).sort({ createdAt: -1 });

    console.log('💰 Found payments for user:', userPayments.length);
    if (userPayments.length > 0) {
      console.log('📊 Payment details:', userPayments.map(p => ({
        id: p._id,
        amount: p.amount,
        status: p.status,
        notes: p.notes
      })));
    }

    res.json({
      success: true,
      payments: userPayments
    });

  } catch (error) {
    console.error('❌ Get payments error:', error);
    res.status(500).json({ 
      error: 'Failed to get payments',
      message: error.message 
    });
  }
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/domain-manager', domainManagerRoutes);
app.use('/api/ssl', sslRoutes);
// Vercel routes removed for VPS setup
// app.use('/api/vercel', vercelRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    services: {
      database: 'Connected',
      razorpay: 'Ready',
      fileUpload: 'Active'
    }
  });
});

// Debug endpoint to check subscription status immediately
app.get('/api/debug/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const Subscription = require('./models/Subscription');
    
    const subscription = await Subscription.findOne({
      userId: userId,
      status: 'active'
    }).sort({ createdAt: -1 });
    
    res.json({
      userId,
      hasSubscription: !!subscription,
      subscription: subscription,
      allSubscriptions: await Subscription.find({ userId }).sort({ createdAt: -1 })
    });
  } catch (error) {
    console.error('Debug subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check all payments in database
app.get('/api/debug/payments', async (req, res) => {
  try {
    const Payment = require('./models/Payment');
    const allPayments = await Payment.find({}).sort({ createdAt: -1 });
    
    console.log('🔍 Debug: All payments in database:', allPayments.length);
    
    res.json({
      totalPayments: allPayments.length,
      payments: allPayments.map(p => ({
        id: p._id,
        amount: p.amount,
        status: p.status,
        notes: p.notes,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Custom domain catch-all handler for VPS setup
app.get('*', async (req, res) => {
  try {
    // Get the hostname from the request
    const hostname = req.get('host');
    console.log('🌐 Catch-all route - Hostname:', hostname);
    
    // Skip if it's the main domain or localhost
    // Skip if it's the main domain or localhost - let nginx handle it
if (hostname === 'aboutwebsite.in' ||
    hostname === 'www.aboutwebsite.in' ||
    hostname === 'localhost' ||
    hostname.startsWith('localhost:')) {
  console.log('🏠 Main domain request, skipping - nginx will handle');
  return res.status(404).send('Main domain handled by nginx');
}
    
    // This is a custom domain request - find the website
    console.log('🔍 Custom domain request for:', hostname);
    
    const Website = require('./models/Website');
    
    // Find website by custom domain (handle both www and non-www versions)
    let website = await Website.findOne({
      'data.customDomain': hostname,
      isPublished: true
    });
    
    // If not found and domain starts with www, try without www
    if (!website && hostname.startsWith('www.')) {
      const domainWithoutWww = hostname.substring(4);
      website = await Website.findOne({
        'data.customDomain': domainWithoutWww,
        isPublished: true
      });
    }
    
    // If not found and domain doesn't start with www, try with www
    if (!website && !hostname.startsWith('www.')) {
      const domainWithWww = `www.${hostname}`;
      website = await Website.findOne({
        'data.customDomain': domainWithWww,
        isPublished: true
      });
    }
    
    if (website) {
      console.log('✅ Found website for custom domain:', hostname);
      
      // Check if user has active subscription
      const Subscription = require('./models/Subscription');
      const subscription = await Subscription.findOne({
        userId: website.userId,
        status: 'active'
      });
      
      if (!subscription) {
        console.log('❌ No active subscription for website:', website._id);
        return res.status(403).send(`
          <html>
            <head><title>Website Unavailable</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Website Temporarily Unavailable</h1>
              <p>This website is currently unavailable due to an expired subscription.</p>
              <p>Please contact the website owner.</p>
            </body>
          </html>
        `);
      }
      
      // Check if subscription has expired
      const now = new Date();
      const expiryDate = new Date(subscription.expiresAt);
      
      if (now > expiryDate) {
        console.log('❌ Subscription expired for website:', website._id);
        return res.status(403).send(`
          <html>
            <head><title>Website Unavailable</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Website Temporarily Unavailable</h1>
              <p>This website is currently unavailable due to an expired subscription.</p>
              <p>Please contact the website owner.</p>
            </body>
          </html>
        `);
      }
      
      // Return the website data as JSON for the frontend to render
      // Render the website using template
  return res.json(website);
    } else {
      console.log('❌ No website found for custom domain:', hostname);
      return res.status(404).send(`
        <html>
          <head><title>Website Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Website Not Found</h1>
            <p>The website for <strong>${hostname}</strong> could not be found.</p>
            <p>Please check the domain configuration or contact the website owner.</p>
          </body>
        </html>
      `);
    }
    
  } catch (error) {
    console.error('❌ Error in catch-all route:', error);
    return res.status(500).send(`
      <html>
        <head><title>Server Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Server Error</h1>
          <p>An error occurred while loading the website.</p>
          <p>Please try again later.</p>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💳 Razorpay integration ready`);
  console.log(`📁 File uploads enabled`);
  console.log(`🔐 Payment validation active`);
});
