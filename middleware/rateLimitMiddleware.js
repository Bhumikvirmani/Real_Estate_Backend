/**
 * Simple in-memory rate limiter middleware
 * 
 * In a production environment, you would want to use a distributed cache like Redis
 * to store rate limiting data across multiple server instances.
 */

// Store for tracking request counts
const requestCounts = new Map();

// Store for tracking blocked IPs
const blockedIPs = new Map();

/**
 * Rate limiter middleware factory
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum number of requests allowed in the time window
 * @param {number} options.blockDuration - Duration in milliseconds to block IPs that exceed the limit
 * @returns {Function} Express middleware function
 */
export const rateLimit = ({ 
  windowMs = 60 * 1000, // 1 minute by default
  maxRequests = 100,    // 100 requests per minute by default
  blockDuration = 15 * 60 * 1000 // 15 minutes block by default
} = {}) => {
  // Clean up old entries periodically
  setInterval(() => {
    const now = Date.now();
    
    // Clean up request counts
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.timestamp > windowMs) {
        requestCounts.delete(key);
      }
    }
    
    // Clean up blocked IPs
    for (const [ip, timestamp] of blockedIPs.entries()) {
      if (now - timestamp > blockDuration) {
        blockedIPs.delete(ip);
      }
    }
  }, windowMs);
  
  return (req, res, next) => {
    // Get client IP
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               req.connection.socket.remoteAddress || 
               'unknown';
    
    // Check if IP is blocked
    if (blockedIPs.has(ip)) {
      const blockedTime = blockedIPs.get(ip);
      const remainingTime = Math.ceil((blockedTime + blockDuration - Date.now()) / 1000 / 60);
      
      return res.status(429).json({
        success: false,
        message: `Too many requests. Please try again in ${remainingTime} minutes.`
      });
    }
    
    // Create a unique key for this IP and endpoint
    const key = `${ip}:${req.method}:${req.originalUrl}`;
    const now = Date.now();
    
    // Get or initialize request count data
    const data = requestCounts.get(key) || { count: 0, timestamp: now };
    
    // Reset count if window has passed
    if (now - data.timestamp > windowMs) {
      data.count = 0;
      data.timestamp = now;
    }
    
    // Increment request count
    data.count++;
    requestCounts.set(key, data);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - data.count));
    res.setHeader('X-RateLimit-Reset', new Date(data.timestamp + windowMs).toISOString());
    
    // Check if rate limit exceeded
    if (data.count > maxRequests) {
      // Block the IP
      blockedIPs.set(ip, now);
      
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again later.'
      });
    }
    
    next();
  };
};

/**
 * Stricter rate limiter for auth endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,          // 10 requests per 15 minutes
  blockDuration: 60 * 60 * 1000 // 1 hour block
});

/**
 * Standard API rate limiter
 */
export const apiRateLimit = rateLimit();

/**
 * Lenient rate limiter for public endpoints
 */
export const publicRateLimit = rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  maxRequests: 200,        // 200 requests per minute
  blockDuration: 5 * 60 * 1000 // 5 minutes block
});
