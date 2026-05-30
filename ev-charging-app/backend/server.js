require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { Server } = require('socket.io');

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const initializeSocketService = require('./services/socketService');
const { initializeEmailService } = require('./services/emailService');
const { setSocketService, startAvailabilityPolling } = require('./services/notificationService');
const logger = require('./utils/logger');

/**
 * EV Charging Station Finder — Express Server
 * =============================================
 * Production-ready Node.js/Express API server with:
 * - MongoDB database connection
 * - JWT authentication
 * - Socket.IO real-time notifications
 * - Rate limiting & security headers
 * - CORS configuration
 * - Compression & logging
 */

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Make io accessible to controllers
app.set('io', io);

// Initialize Socket.IO service
const socketService = initializeSocketService(io);
app.set('socketService', socketService);

// Give notificationService a reference to socketService so it can push real-time events
setSocketService(socketService);

// ─── Security Middleware ──────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Rate Limiting (Redis-backed, falls back to in-memory) ───
app.use('/api', generalLimiter);

// ─── Body Parsing & Compression ──────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Logging ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EV Charging Station API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────
app.use('/api', routes);

// ─── Error Handling ───────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Server Startup ───────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Connect to Redis (non-blocking — falls back to in-memory if unavailable)
    await connectRedis();

    // Initialize email service
    initializeEmailService();

    // Start availability polling (every 5 min — simulates OCPP status events)
    startAvailabilityPolling(5 * 60 * 1000);

    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`
  
  EV Charging Station API               
  Port: ${PORT}                            
  Environment: ${process.env.NODE_ENV || 'development'}          
  MongoDB: Connected                    
  Socket.IO: Active                     

      `);
    });
  } catch (error) {
    logger.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

startServer();

module.exports = { app, server };
