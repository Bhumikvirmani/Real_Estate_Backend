import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';

// Middleware imports
import { requestLogger, errorLogger } from './middleware/loggingMiddleware.js';
import { apiRateLimit, authRateLimit } from './middleware/rateLimitMiddleware.js';

// Route imports
import userRoutes from './routes/userRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

// Load env vars
dotenv.config();

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// Enhanced CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);

    // Define allowed origins
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:5000',
      'https://real-estate-reimagined.vercel.app'
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked request from:', origin);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('dev')); // HTTP request logger
app.use(requestLogger); // Custom detailed logger

// Apply rate limiting to all routes
app.use(apiRateLimit);

// API Routes with specific rate limits for auth routes
app.use('/api/users/login', authRateLimit);
app.use('/api/users/register', authRateLimit);

// Apply routes
app.use('/api/properties', propertyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Add route for mortgage calculator to prevent 404 errors
app.get('/mortgage', (_req, res) => {
  res.json({
    success: true,
    message: 'Mortgage calculator API endpoint'
  });
});

// Error logging middleware
app.use(errorLogger);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Serve static files with cache control
  app.use(express.static(path.join(__dirname, '../dist'), {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true,
    lastModified: true
  }));

  // Serve index.html for all other routes (SPA support)
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
  });
}

// 404 handler for undefined routes
app.use('*', (req, res) => {
  console.log(`Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Enhanced error handling middleware
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('API Error:', err.stack);

  // Determine if this is a validation error
  const isValidationError = err.name === 'ValidationError';

  // Determine if this is a Mongoose error
  const isMongooseError = err.name === 'MongooseError' ||
                          err.name === 'CastError' ||
                          err.name === 'MongoError';

  // Set appropriate status code based on error type
  const statusCode = err.status ||
                    (isValidationError ? 400 :
                     isMongooseError ? 400 : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Something went wrong on the server',
    errors: isValidationError ? err.errors : undefined,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Connect to MongoDB with enhanced configuration
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Reduced timeout for faster failure detection
  socketTimeoutMS: 45000,
  // Keep Atlas-specific settings if using MongoDB Atlas
  ...(process.env.MONGODB_URI.includes('mongodb+srv') ? {
    replicaSet: 'atlas-viqyk3-shard-0',
    ssl: true,
    authSource: 'admin',
    retryWrites: true,
    w: 'majority'
  } : {})
})
.then(() => {
  console.log('Connected to MongoDB');
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Host: ${mongoose.connection.host}`);

  // Start server with port fallback mechanism and graceful shutdown
  const startServer = (retries = 3) => {
    const PORT = parseInt(process.env.PORT || '5000', 10);
    const server = app.listen(PORT)
      .on('listening', () => {
        console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);

        // Set up graceful shutdown
        const gracefulShutdown = (signal) => {
          console.log(`${signal} received. Shutting down gracefully...`);
          server.close(() => {
            console.log('HTTP server closed');
            mongoose.connection.close(false, () => {
              console.log('MongoDB connection closed');
              process.exit(0);
            });
          });

          // Force close if graceful shutdown takes too long
          setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
          }, 10000);
        };

        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE' && retries > 0) {
          console.log(`Port ${PORT} is busy, trying port ${PORT + 1}...`);
          process.env.PORT = (PORT + 1).toString();
          server.close();
          startServer(retries - 1);
        } else {
          console.error('Server error:', err);
          process.exit(1);
        }
      });

    return server;
  };

  startServer();
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  if (error.reason) {
    console.error('Connection Details:', {
      type: error.reason?.type,
      setName: error.reason?.setName,
      servers: error.reason?.servers ? Array.from(error.reason.servers.keys()) : []
    });
  }
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Log error but don't exit in production to maintain uptime
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Always exit on uncaught exceptions as the application state may be corrupted
  process.exit(1);
});
