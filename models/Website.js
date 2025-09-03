const mongoose = require('mongoose');

const websiteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Website', websiteSchema);
