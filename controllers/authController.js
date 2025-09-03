const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/config');

// Register User
const register = async (req, res) => {
  try {
    const { phone, fullName, email, password } = req.body;

    // MongoDB storage only
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email already exists' 
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      phone,
      fullName,
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login User
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // MongoDB storage only
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get User Profile
const getProfile = async (req, res) => {
  try {
    // MongoDB storage only
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // MongoDB storage only
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log('📧 Forgot password request for email:', email);

    // MongoDB storage only
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    console.log('🔑 Generated reset token:', resetToken);
    
    // Store reset token with user
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    
    try {
      await user.save();
      console.log('💾 Successfully saved reset token to MongoDB for user ID:', user._id);
      console.log('🔍 Verifying saved token...');
      const savedUser = await User.findById(user._id);
      console.log('✅ Verified saved token:', savedUser.resetToken);
    } catch (saveError) {
      console.error('❌ Failed to save reset token to MongoDB:', saveError);
      return res.status(500).json({ message: 'Failed to save reset token' });
    }
    console.log('💾 Stored reset token for user ID:', user._id);

    // For testing purposes, log the reset URL to console
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    console.log('🔗 Password Reset URL:', resetUrl);
    console.log('📧 Email:', email);
    console.log('🔑 Reset Token:', resetToken);

    res.json({ 
      message: 'Password reset email sent successfully',
      resetUrl: resetUrl // Only for testing
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validate Reset Token
const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    console.log('🔍 Validating token:', token);

    // MongoDB storage only
    console.log('📊 Using MongoDB storage');
    const user = await User.findOne({ resetToken: token });
    console.log('🔍 Found user with token:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('❌ No user found with this reset token');
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    // Check if token is expired
    if (user.resetTokenExpiry && new Date() > new Date(user.resetTokenExpiry)) {
      console.log('⏰ Token has expired');
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    console.log('✅ Token is valid');
    res.json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset Password with Token
const resetPasswordWithToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // MongoDB storage only
    const user = await User.findOne({ resetToken: token });
    if (!user) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    // Check if token is expired
    if (user.resetTokenExpiry && new Date() > new Date(user.resetTokenExpiry)) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    user.password = hashedNewPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset with token error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update User Profile
const updateProfile = async (req, res) => {
  try {
    console.log('🔧 Profile update request received:', req.body);
    console.log('👤 User ID from token:', req.user.userId);
    
    const { phone, fullName, email } = req.body;
    const userId = req.user.userId;

    // Validate input data
    if (!phone || !fullName || !email) {
      console.log('❌ Missing required fields:', { phone: !!phone, fullName: !!fullName, email: !!email });
      return res.status(400).json({ 
        message: 'Phone, fullName, and email are required' 
      });
    }

    console.log('📊 Using MongoDB storage only');
    console.log('🔍 Finding user with ID:', userId, 'Type:', typeof userId);
    console.log('🔍 MongoDB connection status:', mongoose.connection.readyState);
    
    try {
      const user = await User.findById(userId);
      if (!user) {
        console.log('❌ User not found in MongoDB:', userId);
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('👤 Found user:', { 
        id: user._id, 
        currentPhone: user.phone, 
        currentFullName: user.fullName, 
        currentEmail: user.email 
      });

      // Check if email already exists with another user
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        email
      });

      if (existingUser) {
        console.log('❌ Email already exists with another user:', email);
        return res.status(400).json({ 
          message: 'Email already exists with another user' 
        });
      }

      // Update user data
      console.log('📝 Updating user data in MongoDB:', { phone, fullName, email });
      user.phone = phone;
      user.fullName = fullName;
      user.email = email;
      
      console.log('💾 Saving user to MongoDB...');
      await user.save();
      console.log('✅ User saved successfully to MongoDB');

      const userWithoutPassword = await User.findById(userId).select('-password');
      console.log('📤 Sending updated user data:', userWithoutPassword);
      
      res.json({ 
        message: 'Profile updated successfully',
        user: userWithoutPassword
      });
    } catch (dbError) {
      console.error('❌ Database operation error:', dbError);
      return res.status(500).json({ message: 'Database operation failed: ' + dbError.message });
    }
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Verify Password for Profile Updates
const verifyPassword = async (req, res) => {
  try {
    console.log('🔐 Password verification request received');
    console.log('👤 User ID from token:', req.user.userId);
    
    const { password } = req.body;
    const userId = req.user.userId;

    if (!password) {
      console.log('❌ No password provided');
      return res.status(400).json({ message: 'Password is required' });
    }

    // MongoDB storage only
    console.log('📊 Using MongoDB storage for password verification');
    console.log('🔍 Finding user with ID:', userId);
    
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found in MongoDB:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('👤 Found user for password verification');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔍 Password verification result:', isValidPassword);
    
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    console.log('✅ Password verified successfully in MongoDB');
    res.json({ message: 'Password verified successfully' });
  } catch (error) {
    console.error('❌ Password verification error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// Debug: List all users with reset tokens (for testing only)
const debugUsers = async (req, res) => {
  try {
    // MongoDB storage only
    const users = await User.find({}, 'email phone fullName resetToken resetTokenExpiry');
    console.log('👥 All users with reset tokens:', users);
    res.json({ users });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  verifyPassword,
  resetPassword,
  forgotPassword,
  validateResetToken,
  resetPasswordWithToken,
  debugUsers
};
