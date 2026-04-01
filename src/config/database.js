const mongoose = require('mongoose');
const dns = require('dns');

// Force Google DNS to resolve Atlas SRV records (bypasses local DNS issues)
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      tlsAllowInvalidCertificates: true,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('👉 Fix: Go to cloud.mongodb.com → Network Access → Add IP → Allow from Anywhere');
    // Don't exit - let server stay up so you can debug
    setTimeout(connectDB, 5000); // retry every 5 seconds
  }
};

mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));

module.exports = connectDB;
