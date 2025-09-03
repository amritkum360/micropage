const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  websiteId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  subdomain: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  customDomain: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  publishedUrl: {
    type: String
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
domainSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Domain', domainSchema);
