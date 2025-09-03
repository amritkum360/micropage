const express = require('express');
const router = express.Router();
const { 
  getUserSubscription,
  getSubscriptionPlans,
  createSubscription,
  cancelSubscription
} = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middleware/auth');

// Get subscription plans
router.get('/plans', getSubscriptionPlans);

// Get user's subscription
router.get('/', authenticateToken, getUserSubscription);

// Create subscription
router.post('/', authenticateToken, createSubscription);

// Cancel subscription
router.delete('/', authenticateToken, cancelSubscription);

module.exports = router;
