const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Amritkum360:7004343011@cluster0.1bafcyc.mongodb.net/micropage';

// Force MongoDB usage - no in-memory fallback
let useInMemory = false;

const getUseInMemory = () => false; // Always return false to force MongoDB

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
    useInMemory = false;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Cannot proceed without MongoDB connection. Please check your MongoDB setup.');
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

module.exports = { connectDB, useInMemory: getUseInMemory };
