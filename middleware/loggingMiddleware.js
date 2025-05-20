/**
 * Enhanced logging middleware for API requests
 * Logs request details, response status, and timing information
 */

// Format date for logging
const formatDate = () => {
  return new Date().toISOString();
};

// Get client IP address
const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.connection?.socket?.remoteAddress || 
         'unknown';
};

// Format log message
const formatLogMessage = (req, res, startTime) => {
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  const userId = req.user ? req.user._id : 'anonymous';
  const userRole = req.user ? req.user.role : 'none';
  
  return {
    timestamp: formatDate(),
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: getClientIP(req),
    userId,
    userRole,
    referer: req.headers.referer || 'direct'
  };
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  // Skip logging for static assets
  if (req.originalUrl.startsWith('/static/') || 
      req.originalUrl.startsWith('/assets/') ||
      req.originalUrl.endsWith('.ico') ||
      req.originalUrl.endsWith('.png') ||
      req.originalUrl.endsWith('.jpg') ||
      req.originalUrl.endsWith('.jpeg') ||
      req.originalUrl.endsWith('.css') ||
      req.originalUrl.endsWith('.js')) {
    return next();
  }
  
  // Record start time
  req.startTime = Date.now();
  
  // Log request
  console.log(`[${formatDate()}] ${req.method} ${req.originalUrl} - IP: ${getClientIP(req)}`);
  
  // Capture the original end method
  const originalEnd = res.end;
  
  // Override end method to log response
  res.end = function(chunk, encoding) {
    // Call the original end method
    originalEnd.call(this, chunk, encoding);
    
    // Log response details
    const logData = formatLogMessage(req, res, req.startTime);
    
    // Log different levels based on status code
    if (res.statusCode >= 500) {
      console.error(`[ERROR] ${JSON.stringify(logData)}`);
    } else if (res.statusCode >= 400) {
      console.warn(`[WARN] ${JSON.stringify(logData)}`);
    } else {
      console.log(`[INFO] ${JSON.stringify(logData)}`);
    }
  };
  
  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (err, req, res, next) => {
  console.error(`[${formatDate()}] ERROR:`, {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    params: req.params,
    query: req.query,
    userId: req.user ? req.user._id : 'anonymous',
    ip: getClientIP(req)
  });
  
  next(err);
};
