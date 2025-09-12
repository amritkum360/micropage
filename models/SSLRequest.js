const mongoose = require('mongoose');

const sslRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
//    required: true
  },
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
  //  required: true
  },
  domain: {
    type: String,
    //required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'applied', 'failed'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  appliedAt: {
    type: Date
  },
  notes: {
    type: String
  }
});

module.exports = mongoose.model('SSLRequest', sslRequestSchema);
