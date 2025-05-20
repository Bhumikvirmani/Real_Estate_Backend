/**
 * Simple in-memory cache middleware
 * 
 * In a production environment, you would want to use a distributed cache like Redis
 * to store cache data across multiple server instances.
 */

// Cache store
const cache = new Map();

/**
 * Cache middleware factory
 * @param {Object} options - Cache options
 * @param {number} options.duration - Cache duration in milliseconds
 * @param {Function} options.key - Function to generate cache key (defaults to URL)
 * @returns {Function} Express middleware function
 */
export const cacheMiddleware = ({
  duration = 5 * 60 * 1000, // 5 minutes by default
  key = req => req.originalUrl
} = {}) => {
  // Clean up expired cache entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [cacheKey, data] of cache.entries()) {
      if (now > data.expiry) {
        cache.delete(cacheKey);
      }
    }
  }, 60 * 1000); // Clean up every minute
  
  return (req, res, next) => {
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip cache for authenticated requests
    if (req.user) {
      return next();
    }
    
    const cacheKey = key(req);
    const cachedData = cache.get(cacheKey);
    
    // Return cached response if available and not expired
    if (cachedData && Date.now() < cachedData.expiry) {
      // Set cache header
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cachedData.data);
    }
    
    // Set cache header
    res.setHeader('X-Cache', 'MISS');
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache the response
    res.json = function(data) {
      // Don't cache error responses
      if (res.statusCode >= 400) {
        return originalJson.call(this, data);
      }
      
      // Cache the response
      cache.set(cacheKey, {
        data,
        expiry: Date.now() + duration
      });
      
      // Call the original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Cache middleware for property listings (longer duration)
 */
export const propertyCacheMiddleware = cacheMiddleware({
  duration: 15 * 60 * 1000 // 15 minutes
});

/**
 * Cache middleware for property details (medium duration)
 */
export const propertyDetailCacheMiddleware = cacheMiddleware({
  duration: 10 * 60 * 1000, // 10 minutes
  key: req => `property:${req.params.id}`
});

/**
 * Cache middleware for categories and locations (longer duration)
 */
export const categoryCacheMiddleware = cacheMiddleware({
  duration: 60 * 60 * 1000 // 1 hour
});

/**
 * Short-lived cache for search results
 */
export const searchCacheMiddleware = cacheMiddleware({
  duration: 2 * 60 * 1000, // 2 minutes
  key: req => `search:${JSON.stringify(req.query)}`
});
