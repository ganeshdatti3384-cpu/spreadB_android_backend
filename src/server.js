require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./services/socketService');

const app = express();
const server = http.createServer(app);

// 🔥 IMPORTANT: Start server FIRST (for Railway health check)
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// 🔥 ROOT ROUTE (prevents 502)
app.get('/', (req, res) => {
  res.status(200).send('Backend is LIVE 🚀');
});

// 🔥 HEALTH CHECK
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
  });
});

// 🔥 Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy (important for Railway)
app.set('trust proxy', 1);

// 🔥 TEMP: Disable rate limit for testing (can re-enable later)
/*
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
}));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
}));
*/

// 🔥 Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/sticks', require('./routes/sticks'));

// 🔥 Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

initSocket(io);

// 🔥 DB CONNECT AFTER SERVER START (prevents startup blocking)
connectDB()
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// 🔥 Error handler
app.use(errorHandler);

module.exports = { app, server };