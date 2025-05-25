/**
 * Utility functions for API responses and error handling
 */

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Success message
 * @param {Object} data - Response data
 */
export const sendSuccess = (res, statusCode = 200, message = 'Success', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Error message
 * @param {Object} error - Error details (only included in development)
 */
export const sendError = (res, statusCode = 500, message = 'Server Error', error = null) => {
  const response = {
    success: false,
    message
  };

  // Include error details in development mode
  if (process.env.NODE_ENV !== 'production' && error) {
    response.error = error.toString();
    response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

/**
 * Async handler to avoid try/catch blocks in route handlers
 * @param {Function} fn - Async function to handle the route
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Format pagination results
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total number of items
 * @param {Array} results - Array of results
 * @returns {Object} Formatted pagination results
 */
export const paginateResults = (page, limit, total, results) => {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    results
  };
};

/**
 * Parse query parameters for pagination
 * @param {Object} query - Express request query object
 * @returns {Object} Pagination parameters
 */
export const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Parse query parameters for sorting
 * @param {Object} query - Express request query object
 * @param {Object} defaultSort - Default sort object
 * @returns {Object} Sort object for MongoDB
 */
export const getSortParams = (query, defaultSort = { createdAt: -1 }) => {
  if (!query.sort) return defaultSort;
  
  const sortField = query.sort.startsWith('-') 
    ? query.sort.substring(1) 
    : query.sort;
    
  const sortDirection = query.sort.startsWith('-') ? -1 : 1;
  
  return { [sortField]: sortDirection };
};

/**
 * Create a filter object from query parameters
 * @param {Object} query - Express request query object
 * @param {Array} allowedFields - Fields allowed for filtering
 * @returns {Object} Filter object for MongoDB
 */
export const createFilterFromQuery = (query, allowedFields = []) => {
  const filter = {};
  
  for (const field of allowedFields) {
    if (query[field] !== undefined) {
      // Handle special case for price ranges
      if (field === 'minPrice' || field === 'maxPrice') {
        if (!filter.price) {
          filter.price = {};
        }
        if (field === 'minPrice') {
          filter.price.$gte = Number(query[field]);
        } else if (field === 'maxPrice') {
          filter.price.$lte = Number(query[field]);
        }
      }
      // Handle array fields with comma-separated values
      else if (query[field].includes(',')) {
        filter[field] = { $in: query[field].split(',') };
      }
      // Handle regex search for string fields
      else if (typeof query[field] === 'string' && !['true', 'false'].includes(query[field].toLowerCase())) {
        filter[field] = { $regex: query[field], $options: 'i' };
      }
      // Handle boolean fields
      else if (['true', 'false'].includes(query[field].toLowerCase())) {
        filter[field] = query[field].toLowerCase() === 'true';
      }
      // Handle numeric fields
      else if (!isNaN(Number(query[field]))) {
        filter[field] = Number(query[field]);
      }
      // Default case
      else {
        filter[field] = query[field];
      }
    }
  }
  
  return filter;
};
