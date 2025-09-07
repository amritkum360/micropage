const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, verifyPassword, resetPassword, forgotPassword, validateResetToken, resetPasswordWithToken, completeOnboarding, fixOnboardingStatus, debugUsers } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Register User
router.post('/register', register);

// Login User
router.post('/login', login);

// Get User Profile
router.get('/profile', authenticateToken, getProfile);

// Update User Profile
router.put('/profile', authenticateToken, updateProfile);

// Verify Password for Profile Updates
router.post('/verify-password', authenticateToken, verifyPassword);

// Reset Password
router.post('/reset-password', authenticateToken, resetPassword);

// Forgot Password
router.post('/forgot-password', forgotPassword);

// Validate Reset Token
router.post('/validate-reset-token', validateResetToken);

// Reset Password with Token
router.post('/reset-password-with-token', resetPasswordWithToken);

// Complete Onboarding
router.post('/complete-onboarding', authenticateToken, completeOnboarding);

// Fix Onboarding Status
router.post('/fix-onboarding-status', authenticateToken, fixOnboardingStatus);

// Debug: List all users (for testing only)
router.get('/debug-users', debugUsers);

module.exports = router;
