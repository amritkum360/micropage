const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/config');
const msg91Service = require('../services/msg91Service');

// Register User
const register = async (req, res) => {
  try {
    const { phone, fullName, email, password } = req.body;

    // MongoDB storage only
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this email already exists. Please try logging in instead.' 
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

    // Send welcome email via MSG91
    try {
      console.log('📧 Sending welcome email via MSG91 to:', email);
      const emailResult = await msg91Service.sendWelcomeEmail(email, fullName);
      if (emailResult.success) {
        console.log('✅ Welcome email sent successfully via MSG91 to:', email);
        console.log('📧 Email ID:', emailResult.data?.data?.unique_id);
      } else {
        console.log('⚠️ Welcome email failed to send via MSG91 to:', email);
        console.log('❌ Error details:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error sending welcome email via MSG91:', emailError);
      // Don't fail registration if email fails - user can still use the platform
    }

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
      return res.status(400).json({ 
        message: 'User does not exist. Please check your email or register first.' 
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        message: 'Incorrect password. Please try again.' 
      });
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
    
    // Transform user object to include id field for consistency
    const userData = {
      id: user._id,
      phone: user.phone,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
      resetToken: user.resetToken,
      resetTokenExpiry: user.resetTokenExpiry,
      websites: user.websites,
      onboardingCompleted: user.onboardingCompleted,
      onboardingData: user.onboardingData
    };
    
    res.json(userData);
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
      return res.status(500).json({ message: 'Unable to process password reset request. Please try again.' });
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
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new password reset.' });
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
      return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new password reset.' });
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
      
      // Transform user object to include id field for consistency
      const userData = {
        id: userWithoutPassword._id,
        phone: userWithoutPassword.phone,
        fullName: userWithoutPassword.fullName,
        email: userWithoutPassword.email,
        createdAt: userWithoutPassword.createdAt,
        resetToken: userWithoutPassword.resetToken,
        resetTokenExpiry: userWithoutPassword.resetTokenExpiry,
        websites: userWithoutPassword.websites,
        onboardingCompleted: userWithoutPassword.onboardingCompleted,
        onboardingData: userWithoutPassword.onboardingData
      };
      
      res.json({ 
        message: 'Profile updated successfully',
        user: userData
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

// Complete Onboarding
const completeOnboarding = async (req, res) => {
  try {
    const { websiteName, subdomain, businessDescription, selectedSections, aiGeneratedContent, selectedTheme } = req.body;
    const userId = req.user.userId;

    console.log('🎯 Onboarding completion request:', { websiteName, subdomain, businessDescription, selectedSections, hasAIContent: !!aiGeneratedContent, selectedTheme });

    if (!websiteName || !subdomain || !selectedSections || selectedSections.length === 0) {
      return res.status(400).json({ 
        message: 'Website name, subdomain, and at least one section are required' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user onboarding status
    user.onboardingCompleted = true;
    user.onboardingData = {
      websiteName,
      subdomain,
      businessDescription,
      selectedSections,
      aiGeneratedContent,
      selectedTheme,
      completedAt: new Date()
    };

    // Create initial website data using the exact default structure from defaultData.js
    const initialWebsiteData = {
      name: websiteName,
      data: {
        // Basic Info - exactly as in defaultData.js with AI content
        businessName: websiteName,
        tagline: aiGeneratedContent?.tagline || `Welcome to ${websiteName}`,
        logo: '',
        favicon: '',
        subdomain: subdomain,
        
        // Section Order - all sections in default order, but only selected ones will be visible
        sectionOrder: [
          'header',
          'hero',
          'about',
          'portfolio',
          'services',
          'testimonials',
          'skills',
          'achievements',
          'gallery',
          'stats',
          'blog',
          'downloadables',
          'faq',
          'pricing',
          'cta',
          'social',
          'contact',
          'footer'
        ],
        
        // Header - exact structure from defaultData.js
        header: {
          visible: selectedSections.includes('header'),
          logo: '',
          navigation: [
            { name: 'Home', link: '#home' },
            { name: 'About', link: '#about' },
            { name: 'Services', link: '#services' },
            { name: 'Contact', link: '#contact' }
          ],
          ctaButtons: [
            { text: 'Get Started', link: '#contact', primary: true }
          ]
        },

        // Hero Section - exact structure from defaultData.js with AI content
        hero: {
          visible: selectedSections.includes('hero'),
          template: 1,
          title: aiGeneratedContent?.heroTitle,
          subtitle: aiGeneratedContent?.heroSubtitle,
          description: aiGeneratedContent?.heroDescription ,
          backgroundImage: '',
          imageBorderRadius: 50,
          ctaButtons: [
            { text: 'Get Started', link: '#contact', primary: true },
            { text: 'Learn More', link: '#about', primary: false }
          ]
        },

        // About Me/Us - exact structure from defaultData.js with AI content
        about: {
          visible: selectedSections.includes('about'),
          title: aiGeneratedContent?.aboutTitle || 'About Us',
          subtitle: 'Your Trusted Partner',
          description: aiGeneratedContent?.aboutDescription ,
          image: '',
          features: [
            { title: 'Experience', description: '10+ Years in Industry' },
            { title: 'Quality', description: 'Premium Service Quality' },
            { title: 'Support', description: '24/7 Customer Support' }
          ]
        },

        // Portfolio/Work/Projects - exact structure from defaultData.js
        portfolio: {
          visible: selectedSections.includes('portfolio'),
          title: 'Our Portfolio',
          subtitle: 'Recent Work & Projects',
          projects: [
            { title: 'Project 1', description: 'Description of project 1', image: '', link: '' },
            { title: 'Project 2', description: 'Description of project 2', image: '', link: '' },
            { title: 'Project 3', description: 'Description of project 3', image: '', link: '' }
          ]
        },

        // Products/Services - exact structure from defaultData.js
        services: {
          visible: selectedSections.includes('services'),
          title: 'Our Services',
          subtitle: 'What We Offer',
          items: [
            { title: 'Service 1', description: 'Description of service 1', icon: '🚀', price: '', image: '', buttonText: 'Get Started', buttonLink: '#contact', features: [] },
            { title: 'Service 2', description: 'Description of service 2', icon: '💡', price: '', image: '', buttonText: 'Get Started', buttonLink: '#contact', features: [] },
            { title: 'Service 3', description: 'Description of service 3', icon: '⚡', price: '', image: '', buttonText: 'Get Started', buttonLink: '#contact', features: [] }
          ]
        },

        // Testimonials/Reviews - exact structure from defaultData.js
        testimonials: {
          visible: selectedSections.includes('testimonials'),
          title: 'What Our Clients Say',
          subtitle: 'Customer Reviews',
          items: [
            { name: 'John Doe', role: 'CEO', company: 'Company 1', text: 'Excellent service and great results!', rating: 5, image: '' },
            { name: 'Jane Smith', role: 'Manager', company: 'Company 2', text: 'Highly recommended for quality work.', rating: 5, image: '' },
            { name: 'Mike Johnson', role: 'Director', company: 'Company 3', text: 'Professional team with outstanding results.', rating: 5, image: '' }
          ]
        },

        // Skills/Expertise - exact structure from defaultData.js
        skills: {
          visible: selectedSections.includes('skills'),
          title: 'Our Expertise',
          subtitle: 'Skills & Capabilities',
          items: [
            { name: 'Skill 1', percentage: 90, color: 'blue' },
            { name: 'Skill 2', percentage: 85, color: 'green' },
            { name: 'Skill 3', percentage: 80, color: 'purple' },
            { name: 'Skill 4', percentage: 95, color: 'orange' }
          ]
        },

        // Achievements/Awards - exact structure from defaultData.js
        achievements: {
          visible: selectedSections.includes('achievements'),
          title: 'Achievements & Awards',
          subtitle: 'Recognition & Milestones',
          items: [
            { title: 'Award 1', description: 'Description of award 1', year: '2023', icon: '🏆' },
            { title: 'Award 2', description: 'Description of award 2', year: '2022', icon: '⭐' },
            { title: 'Award 3', description: 'Description of award 3', year: '2021', icon: '🎖️' }
          ]
        },

        // Gallery/Media - exact structure from defaultData.js
        gallery: {
          visible: selectedSections.includes('gallery'),
          title: 'Gallery',
          subtitle: 'Our Work & Photos',
          images: [
            { src: '', alt: 'Gallery Image 1', title: 'Image 1' },
            { src: '', alt: 'Gallery Image 2', title: 'Image 2' },
            { src: '', alt: 'Gallery Image 3', title: 'Image 3' },
            { src: '', alt: 'Gallery Image 4', title: 'Image 4' }
          ]
        },

        // Stats/Numbers - exact structure from defaultData.js
        stats: {
          visible: selectedSections.includes('stats'),
          title: 'Our Numbers',
          subtitle: 'Key Statistics',
          items: [
            { number: '500+', label: 'Happy Clients', icon: '😊' },
            { number: '1000+', label: 'Projects Completed', icon: '📊' },
            { number: '50+', label: 'Team Members', icon: '👥' },
            { number: '10+', label: 'Years Experience', icon: '⏰' }
          ]
        },

        // Blog/Articles - exact structure from defaultData.js
        blog: {
          visible: selectedSections.includes('blog'),
          title: 'Latest Articles',
          subtitle: 'News & Updates',
          posts: [
            { title: 'Article 1', excerpt: 'Brief description of article 1', date: '2024-01-15', image: '', link: '' },
            { title: 'Article 2', excerpt: 'Brief description of article 2', date: '2024-01-10', image: '', link: '' },
            { title: 'Article 3', excerpt: 'Brief description of article 3', date: '2024-01-05', image: '', link: '' }
          ]
        },

        // Downloadables - exact structure from defaultData.js
        downloadables: {
          visible: selectedSections.includes('downloadables'),
          title: 'Resources',
          subtitle: 'Free Downloads',
          items: [
            { title: 'Brochure', description: 'Company brochure in PDF', file: '', type: 'pdf' },
            { title: 'Catalog', description: 'Product catalog', file: '', type: 'pdf' },
            { title: 'Guide', description: 'User guide', file: '', type: 'pdf' }
          ]
        },

        // FAQ - exact structure from defaultData.js
        faq: {
          visible: selectedSections.includes('faq'),
          title: 'Frequently Asked Questions',
          subtitle: 'Common Questions',
          items: [
            { question: 'What services do you offer?', answer: 'We offer a wide range of services including...' },
            { question: 'How can I contact you?', answer: 'You can contact us through phone, email, or our contact form.' },
            { question: 'What are your business hours?', answer: 'We are open Monday to Friday, 9 AM to 6 PM.' }
          ]
        },

        // Pricing/Packages - exact structure from defaultData.js
        pricing: {
          visible: selectedSections.includes('pricing'),
          title: 'Pricing Plans',
          subtitle: 'Choose Your Plan',
          plans: [
            { name: 'Basic', price: '$99', period: 'month', features: ['Feature 1', 'Feature 2', 'Feature 3'], popular: false },
            { name: 'Professional', price: '$199', period: 'month', features: ['All Basic features', 'Feature 4', 'Feature 5'], popular: true },
            { name: 'Enterprise', price: '$299', period: 'month', features: ['All Professional features', 'Feature 6', 'Feature 7'], popular: false }
          ]
        },

        // Call to Action Banner - exact structure from defaultData.js
        cta: {
          visible: selectedSections.includes('cta'),
          title: 'Ready to Get Started?',
          subtitle: 'Contact us today for a free consultation',
          buttonText: 'Get Started Now',
          buttonLink: '#contact',
          backgroundImage: ''
        },

        // Social Media - exact structure from defaultData.js
        social: {
          visible: selectedSections.includes('social'),
          sticky: false,
          title: 'Follow Us',
          subtitle: 'Stay Connected',
          platforms: [
            { name: 'Facebook', url: 'https://facebook.com/your-page', icon: 'facebook', enabled: false },
            { name: 'Instagram', url: 'https://instagram.com/your-profile', icon: 'instagram', enabled: false },
            { name: 'Twitter', url: 'https://twitter.com/your-handle', icon: 'twitter', enabled: false },
            { name: 'LinkedIn', url: 'https://linkedin.com/company/your-company', icon: 'linkedin', enabled: false },
            { name: 'YouTube', url: 'https://youtube.com/your-channel', icon: 'youtube', enabled: false },
            { name: 'WhatsApp', url: 'https://wa.me/1234567890', icon: 'whatsapp', enabled: false },
            { name: 'TikTok', url: 'https://tiktok.com/@your-username', icon: 'tiktok', enabled: false },
            { name: 'Telegram', url: 'https://t.me/your-username', icon: 'telegram', enabled: false },
            { name: 'Discord', url: 'https://discord.gg/your-server', icon: 'discord', enabled: false },
            { name: 'Snapchat', url: 'your-snapchat-username', icon: 'snapchat', enabled: false }
          ]
        },

        // Contact - exact structure from defaultData.js with user data
        contact: {
          visible: selectedSections.includes('contact'),
          title: 'Contact Us',
          subtitle: 'Get In Touch',
          address: 'Your Business Address',
          phone: user.phone,
          whatsapp: user.phone,
          email: user.email,
          hours: 'Monday - Friday: 9:00 AM - 6:00 PM',
          form: {
            name: true,
            email: true,
            phone: true,
            message: true,
            subject: false
          }
        },

        // Footer - exact structure from defaultData.js with user data
        footer: {
          visible: selectedSections.includes('footer'),
          copyright: `© 2024 ${websiteName}. All rights reserved.`,
          description: 'We are dedicated to providing exceptional services and creating meaningful connections with our customers.',
          backgroundColor: 'dark',
          contactTitle: 'Contact Info',
          contactDescription: 'Get in touch with us for any questions or inquiries. We\'re here to help you succeed.',
          links: [
            { name: 'Privacy Policy', url: '#privacy' },
            { name: 'Terms of Service', url: '#terms' },
            { name: 'Cookie Policy', url: '#cookies' }
          ]
        },

        // Theme & Styling - dynamic based on selected theme
        theme: (() => {
          const themes = {
            default: {
              selectedTheme: 'default',
              primaryColor: '#000000',
              secondaryColor: '#ffffff',
              accentColor: '#a540f7',
              backgroundColor: '#FFFFFF',
              textColor: '#1F2937',
              fontFamily: 'Inter',
              borderRadius: '8px'
            },
            yellow: {
              selectedTheme: 'yellow',
              primaryColor: '#F59E0B',
              secondaryColor: '#F97316',
              accentColor: '#EF4444',
              backgroundColor: '#FFFFFF',
              textColor: '#1F2937',
              fontFamily: 'Inter',
              borderRadius: '8px'
            },
            pink: {
              selectedTheme: 'pink',
              primaryColor: '#EC4899',
              secondaryColor: '#8B5CF6',
              accentColor: '#F59E0B',
              backgroundColor: '#FFFFFF',
              textColor: '#1F2937',
              fontFamily: 'Inter',
              borderRadius: '8px'
            },
            green: {
              selectedTheme: 'green',
              primaryColor: '#10B981',
              secondaryColor: '#059669',
              accentColor: '#F59E0B',
              backgroundColor: '#FFFFFF',
              textColor: '#1F2937',
              fontFamily: 'Inter',
              borderRadius: '8px'
            }
          };
          return themes[selectedTheme] || themes.default;
        })()
      }
    };

    // Create website directly for onboarding (bypass limit check)
    const Website = require('../models/Website');
    const website = new Website({
      userId: userId,
      name: initialWebsiteData.name,
      data: initialWebsiteData.data,
      updatedAt: new Date()
    });

    await website.save();
    console.log('✅ Website saved to MongoDB:', website._id);

    // Save user onboarding data
    await user.save();

    console.log('✅ Onboarding completed for user:', userId);
    console.log('✅ Initial website created:', initialWebsiteData.name);
    console.log('✅ Website ID:', website._id);

    res.json({ 
      message: 'Onboarding completed successfully',
      user: {
        id: user._id,
        phone: user.phone,
        fullName: user.fullName,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        onboardingData: user.onboardingData
      },
      website: {
        id: website._id,
        name: website.name
      }
    });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Fix onboarding status for users who already have websites
const fixOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('🔧 Fixing onboarding status for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has websites
    const Website = require('../models/Website');
    const websiteCount = await Website.countDocuments({ userId });
    console.log('📊 User has', websiteCount, 'websites');

    if (websiteCount > 0 && !user.onboardingCompleted) {
      // User has websites but onboarding is not marked as completed
      user.onboardingCompleted = true;
      await user.save();
      console.log('✅ Fixed onboarding status for user:', userId);
      
      return res.json({ 
        message: 'Onboarding status fixed successfully',
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email,
          onboardingCompleted: user.onboardingCompleted
        }
      });
    } else {
      console.log('ℹ️ No fix needed for user:', userId);
      return res.json({ 
        message: 'No fix needed',
        user: {
          id: user._id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email,
          onboardingCompleted: user.onboardingCompleted
        }
      });
    }
  } catch (error) {
    console.error('Fix onboarding status error:', error);
    res.status(500).json({ message: 'Server error' });
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
  completeOnboarding,
  fixOnboardingStatus,
  debugUsers
};
