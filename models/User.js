const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 10,
    match: /^[6-9]\d{9}$/
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  websites: [{
    name: String,
    data: Object,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  onboardingData: {
    websiteName: String,
    subdomain: String,
    businessDescription: String,
    selectedSections: [String],
    aiGeneratedContent: Object,
    selectedTheme: String,
    completedAt: Date
  }
});

module.exports = mongoose.model('User', userSchema);
