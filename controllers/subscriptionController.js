const Subscription = require('../models/Subscription');

// Base pricing configuration
const basePrice = 199; // Base price for 1 month
const baseDays = 30; // Base days for 1 month

// Calculate price based on duration
const calculatePrice = (months) => {
  const baseMonthlyPrice = basePrice;
  let totalPrice = baseMonthlyPrice * months;
  
  // Apply discounts for longer durations
  if (months >= 24) { // 2 years or more
    totalPrice = totalPrice * 0.7; // 30% discount
  } else if (months >= 12) { // 1 year or more
    totalPrice = totalPrice * 0.8; // 20% discount
  } else if (months >= 6) { // 6 months or more
    totalPrice = totalPrice * 0.85; // 15% discount
  } else if (months >= 3) { // 3 months or more
    totalPrice = totalPrice * 0.9; // 10% discount
  }
  
  return Math.round(totalPrice);
};

// Get subscription plans with dynamic pricing
const getSubscriptionPlans = (req, res) => {
  try {
    const plans = {};
    
    // Generate plans for different durations
    const durations = [
      { months: 1, name: '1 Month' },
      { months: 3, name: '3 Months' },
      { months: 6, name: '6 Months' },
      { months: 12, name: '1 Year' },
      { months: 24, name: '2 Years' }
    ];
    
    // Add custom durations (1-60 months)
    for (let months = 1; months <= 60; months++) {
      const key = `${months}month`;
      plans[key] = {
        name: months === 1 ? '1 Month' : `${months} Months`,
        price: calculatePrice(months),
        days: months * baseDays,
        months: months,
        originalPrice: basePrice * months, // Price without discount
        savings: Math.round((basePrice * months) - calculatePrice(months))
      };
    }
    
    res.json({
      plans: plans,
      basePrice: basePrice
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's subscription
const getUserSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    // MongoDB storage only
    console.log('🔍 Looking for subscription for userId:', userId);
    
    const subscription = await Subscription.findOne({
      userId: userId,
      status: 'active'
    });
    
    if (subscription) {
      console.log('✅ Found subscription in MongoDB:', subscription._id);
      
      // Check if subscription has expired
      const now = new Date();
      const expiryDate = new Date(subscription.expiresAt);
      
      if (now > expiryDate) {
        console.log('⏰ Subscription has expired, updating status');
        subscription.status = 'expired';
        await subscription.save();
        
        res.json({
          hasSubscription: false,
          subscription: null,
          message: 'Subscription has expired'
        });
      } else {
        console.log('✅ Subscription is active and valid');
        res.json({
          hasSubscription: true,
          subscription: subscription
        });
      }
    } else {
      console.log('❌ No subscription found in MongoDB');
      res.json({
        hasSubscription: false,
        subscription: null
      });
    }
  } catch (error) {
    console.error('Get user subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



// Create subscription (for testing without payment gateway)
const createSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { duration } = req.body;

    // Parse duration (e.g., "6month" -> 6 months)
    const months = parseInt(duration.replace('month', ''));
    
    if (!months || months < 1 || months > 60) {
      return res.status(400).json({ message: 'Invalid subscription duration. Must be between 1-60 months.' });
    }

    const planPrice = calculatePrice(months);
    const planDays = months * baseDays;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planDays);

    // MongoDB storage only
    const existingSubscription = await Subscription.findOne({
      userId: userId,
      status: 'active'
    });

    if (existingSubscription) {
      // Extend existing subscription by adding new days to current expiry
      const currentExpiry = new Date(existingSubscription.expiresAt);
      currentExpiry.setDate(currentExpiry.getDate() + planDays);
      
      existingSubscription.expiresAt = currentExpiry;
      existingSubscription.updatedAt = new Date();
      
      await existingSubscription.save();
      
      return res.status(200).json({ 
        message: 'Subscription extended successfully',
        subscription: existingSubscription
      });
    }

    const subscription = new Subscription({
      userId,
      plan: 'publish',
      duration: `${months}month`,
      status: 'active',
      startDate: new Date(),
      expiresAt,
      price: planPrice
    });

    await subscription.save();

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    // MongoDB storage only
    const subscription = await Subscription.findOneAndUpdate(
      { userId: userId, status: 'active' },
      { status: 'cancelled', updatedAt: new Date() },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    res.json({
      message: 'Subscription cancelled successfully',
      subscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserSubscription,
  getSubscriptionPlans,
  createSubscription,
  cancelSubscription
};
